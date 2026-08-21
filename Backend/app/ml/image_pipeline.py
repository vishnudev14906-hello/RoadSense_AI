import os
import io
import sys
import base64
import joblib
import numpy as np
import pandas as pd
from PIL import Image
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from .feature_extraction import (
    decode_and_validate_image,
    compute_laplacian_variance,
    road_feature_extractor,
    FEATURE_COLUMNS
)
from .image_detector import image_detector
from ..agent import format_inr, maintenance_agent

TARGET_CLASSES = ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]


class RoadImageRiskPipelineService:
    """
    End-to-End Production Road Image Risk Prediction Pipeline:

    ROAD IMAGE
        ↓
    IMAGE VALIDATION & OOD / BLURRINESS FILTERING
        ↓
    IMAGE ANALYSIS / DAMAGE DETECTION (CNN & ASPHALT SEGMENTATION)
        ↓
    ROAD DAMAGE FEATURE EXTRACTION (8 STRUCTURED PHYSICAL FEATURES)
        ↓
    XGBOOST RISK CLASSIFIER
        ↓
    RISK LEVEL (LOW / MEDIUM / HIGH / CRITICAL)
        ↓
    IRC:82 MAINTENANCE RECOMMENDATION
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RoadImageRiskPipelineService, cls).__new__(cls)
            cls._instance._load_xgb_model()
        return cls._instance

    def _load_xgb_model(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "saved_models", "image_risk_rf_pipeline.joblib")
        if not os.path.exists(model_path):
            from .train_image_random_forest import train_and_save_image_risk_rf
            print(f"[INFO] Image-feature XGBoost model not found at {model_path}. Training now...")
            train_and_save_image_risk_rf()

        self.pipeline = joblib.load(model_path)
        self.class_names = TARGET_CLASSES
        self.feature_cols = [
            "pothole_count",
            "pothole_area_ratio",
            "crack_area_ratio",
            "damage_area_ratio",
            "damage_severity",
            "pothole_detected",
            "crack_detected",
            "avg_confidence"
        ]
        print(f"[OK] Loaded Image Risk XGBoost Pipeline successfully from {model_path}")

    def run_full_pipeline(
        self,
        image_input: Union[str, bytes],
        road_name: str = "Surveyed Road Corridor",
        location: str = "Field Survey Ingestion",
        road_length_km: float = 1.0
    ) -> Dict[str, Any]:
        """Execute all stages of the Road Image Risk Pipeline."""
        timestamp = datetime.now(timezone.utc).isoformat()

        # Step 1: Decode and Validate Image
        img, decode_err = decode_and_validate_image(image_input)
        if decode_err or img is None:
            return {
                "success": False,
                "is_valid_road": False,
                "error": decode_err or "Unable to decode image.",
                "message": "Unable to reliably analyze this image as a road-condition image.",
                "risk_level": "Low Risk",
                "risk_score": 0.0,
                "confidence": 0.0,
                "confidence_ratio": 0.0,
                "probabilities": {cls: 25.0 for cls in TARGET_CLASSES},
                "damage_type": "Invalid Image",
                "damage_severity": "None",
                "features": {col: 0 for col in self.feature_cols},
                "measurable_features": {col: 0 for col in self.feature_cols},
                "detections": [],
                "recommendation": "Inspection inconclusive: Image format or file corrupted. Please upload a clear photo of the asphalt corridor.",
                "priority": "Routine",
                "estimated_budget": "₹0 (No Action Required)",
                "inspection_timeline": "N/A",
                "timestamp": timestamp,
                "road_name": road_name,
                "location": location
            }

        # Step 2: CNN Damage Classification & Out-of-Domain Check
        cnn_res = image_detector.detect_damage(image_input=image_input, road_name=road_name)
        if not cnn_res.get("is_road_damage", True) and cnn_res.get("detected_class") in ["Uncertain / Non-Road", "Uncertain / Blurry Image", "Invalid Image"]:
            return {
                "success": False,
                "is_valid_road": False,
                "error": cnn_res.get("message", "Unable to reliably analyze this image as a road-condition image."),
                "message": cnn_res.get("message", "Unable to reliably analyze this image as a road-condition image."),
                "risk_level": "Low Risk",
                "risk_score": 0.0,
                "confidence": 0.0,
                "confidence_ratio": 0.0,
                "probabilities": cnn_res.get("probabilities", {cls: 25.0 for cls in TARGET_CLASSES}),
                "damage_type": cnn_res.get("detected_class", "Non-Road Object"),
                "damage_severity": "None",
                "features": {col: 0 for col in self.feature_cols},
                "measurable_features": {col: 0 for col in self.feature_cols},
                "detections": [],
                "recommendation": "Inspection inconclusive: Image does not contain a supported roadway pavement surface. Please upload a clear, focused photo of the road corridor.",
                "priority": "Routine",
                "estimated_budget": "₹0 (No Action Required)",
                "inspection_timeline": "N/A",
                "timestamp": timestamp,
                "road_name": road_name,
                "location": location
            }

        cnn_class = cnn_res.get("detected_class", "Normal Road")
        cnn_conf = cnn_res.get("confidence", 0.95)

        # Step 3: Structured Physical Feature Extraction Layer
        feat_res = road_feature_extractor.extract_features(
            img=img,
            cnn_damage_class=cnn_class,
            cnn_confidence=cnn_conf
        )

        if not feat_res.get("is_valid_road", True):
            rejection_msg = feat_res.get("rejection_reason") or "Unable to reliably analyze this image as a road-condition image."
            return {
                "success": False,
                "is_valid_road": False,
                "error": rejection_msg,
                "message": f"Unable to reliably analyze this image as a road-condition image. {rejection_msg}",
                "risk_level": "Low Risk",
                "risk_score": 0.0,
                "confidence": 0.0,
                "confidence_ratio": 0.0,
                "probabilities": {cls: 25.0 for cls in TARGET_CLASSES},
                "damage_type": "Non-Road Surface",
                "damage_severity": "None",
                "features": feat_res.get("measurable_features", {}),
                "measurable_features": feat_res.get("measurable_features", {}),
                "detections": [],
                "recommendation": "Inspection inconclusive: Image does not contain sufficient pavement surface. Please upload a clear photo of the asphalt corridor.",
                "priority": "Routine",
                "estimated_budget": "₹0 (No Action Required)",
                "inspection_timeline": "N/A",
                "timestamp": timestamp,
                "road_name": road_name,
                "location": location
            }

        measurable_features = feat_res["measurable_features"]
        detections = feat_res["detections"]
        detected_damage_type = feat_res["detected_damage_type"]
        damage_severity_label = feat_res["damage_severity_label"]

        # Step 4: XGBoost Risk Classification
        if self.pipeline is None:
            self._load_xgb_model()

        feature_df = pd.DataFrame([measurable_features])
        xgb_probs_arr = self.pipeline.predict_proba(feature_df)[0]
        xgb_classes = list(self.pipeline.classes_)

        probabilities = {}
        for c in TARGET_CLASSES:
            if c in xgb_classes:
                idx = xgb_classes.index(c)
                probabilities[c] = round(float(xgb_probs_arr[idx] * 100), 1)
            else:
                probabilities[c] = 0.0

        # Predicted Winning Class
        pred_class = TARGET_CLASSES[int(np.argmax([probabilities.get(c, 0.0) for c in TARGET_CLASSES]))]
        top_prob = float(np.max(xgb_probs_arr))
        confidence_ratio = round(top_prob, 2)
        confidence_percentage = round(top_prob * 100, 1)

        # Step 5: Continuous Risk Score Calibration (0 to 100)
        p_cnt = measurable_features["pothole_count"]
        d_area_pct = measurable_features["damage_area_ratio"] * 100
        p_area_pct = measurable_features["pothole_area_ratio"] * 100
        severity_score = measurable_features["damage_severity"]

        if pred_class == "Critical Risk":
            base_score = 80.0 + min(18.5, (p_cnt * 0.5) + (p_area_pct * 0.3) + (d_area_pct * 0.2) + (severity_score * 8.0))
        elif pred_class == "High Risk":
            base_score = 56.0 + min(22.0, (p_cnt * 1.8) + (d_area_pct * 0.8) + (severity_score * 15.0))
        elif pred_class == "Medium Risk":
            base_score = 30.0 + min(24.0, (p_cnt * 3.0) + (d_area_pct * 1.5) + (severity_score * 20.0))
        else:  # Low Risk
            base_score = 5.0 + min(22.0, (d_area_pct * 3.0) + (severity_score * 35.0))

        risk_score = round(float(min(98.8, max(5.0, base_score))), 1)

        # Step 6: Maintenance Recommendation Synthesis (IRC:82-2015 & MoRTH Standards)
        length = max(0.5, float(road_length_km))
        if pred_class == "Critical Risk":
            priority = "Immediate"
            timeline = "Within 24 - 48 hours"
            remediation = "Full-depth asphalt milling and hot-mix patching (HMA Grade I/II) + sub-base reconstruction"
            safety_hazard = "CRITICAL HAZARD - Severe risk of vehicle tire blowout, rim cracking, axle damage, and catastrophic traffic disruption."
            min_cost = int(length * 450000)
            max_cost = int(length * 950000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)}"
            rationale = f"XGBoost classified Critical Risk ({probabilities['Critical Risk']}%) based on {p_cnt} detected cavitation craters, {d_area_pct:.1f}% damaged pavement area, and {damage_severity_label} visible damage severity."
        elif pred_class == "High Risk":
            priority = "High"
            timeline = "Within 7 calendar days"
            remediation = "Targeted infrared pothole compaction and cold-pour bitumen edge-sealing + polymer crack routing"
            safety_hazard = "ELEVATED HAZARD - Structural fatigue present; rapid crater cavitation expansion expected during monsoon or heavy vehicle loading."
            min_cost = int(length * 220000)
            max_cost = int(length * 480000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)}"
            rationale = f"XGBoost classified High Risk ({probabilities['High Risk']}%) based on {p_cnt} potholes, {d_area_pct:.1f}% defect coverage, and {damage_severity_label} damage severity."
        elif pred_class == "Medium Risk":
            priority = "Medium"
            timeline = "Within 30 calendar days"
            remediation = "Polymer-modified asphalt crack routing, injection sealing, and 20mm bituminous micro-surfacing"
            safety_hazard = "MODERATE WEAR - Initial water ingress pathway detected; risk of pothole formation if cracks remain unsealed."
            min_cost = int(length * 110000)
            max_cost = int(length * 240000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)}"
            rationale = f"XGBoost classified Medium Risk ({probabilities['Medium Risk']}%) based on surface fissures with {d_area_pct:.1f}% defect density."
        else:  # Low Risk
            priority = "Routine"
            timeline = "Routine Annual Survey (90 - 180 days)"
            remediation = "Routine drainage channel clearing, shoulder vegetation trimming, and preventive seal-coat inspection"
            safety_hazard = "LOW HAZARD - Pavement wearing course exhibits optimal surface friction and structural integrity."
            min_cost = int(length * 35000)
            max_cost = int(length * 80000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)}"
            rationale = f"XGBoost verified Low Risk ({probabilities['Low Risk']}%) with 0 structural cavities and optimal pavement surface integrity."

        return {
            "success": True,
            "is_valid_road": True,
            "pipeline_stages": [
                "1. Uploaded Road Image Ingested & Validated",
                "2. Image Preprocessing & Asphalt Isolation Completed",
                "3. Image Analysis & Damage Classification Completed",
                "4. 8 Structured Physical Features Extracted",
                "5. XGBoost Classifier Risk Evaluation Completed",
                "6. 4-Tier Risk Probability Distribution Synthesized",
                "7. IRC:82 Maintenance Action Prescribed"
            ],
            "risk_level": pred_class,
            "risk_score": risk_score,
            "confidence": confidence_ratio,
            "confidence_percentage": confidence_percentage,
            "damage_type": detected_damage_type,
            "damage_severity": damage_severity_label,
            "damage_severity_score": measurable_features["damage_severity"],
            "features": measurable_features,
            "measurable_features": measurable_features,
            "probabilities": probabilities,
            "recommendation": remediation,
            "priority": priority,
            "inspection_timeline": timeline,
            "estimated_budget": budget_str,
            "safety_hazard": safety_hazard,
            "ai_reasoning": rationale,
            "detections": detections,
            "detection_count": len(detections),
            "pothole_count": p_cnt,
            "crack_count": 1 if measurable_features["crack_detected"] else 0,
            "damaged_area_percentage": round(d_area_pct, 2),
            "asphalt_coverage_pct": feat_res.get("asphalt_coverage_pct", 85.0),
            "road_name": road_name,
            "location": location,
            "road_length_km": road_length_km,
            "timestamp": timestamp,
            "data_source_type": "AI Model-Detected Data"
        }

image_pipeline_service = RoadImageRiskPipelineService()
