import os
import sys
import json
import joblib
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

CURRENT_DIR = Path(__file__).resolve().parent
APP_DIR = CURRENT_DIR.parent
SAVED_MODELS_DIR = APP_DIR / "saved_models"
PIPELINE_JOB_PATH = SAVED_MODELS_DIR / "road_risk_pipeline.joblib"
METRICS_JSON_PATH = SAVED_MODELS_DIR / "rf_evaluation_metrics.json"

class RoadRiskPredictorService:
    """
    Production Tabular XGBoost Inference Service for Road Risk Prediction.
    Loads serialized preprocessing pipeline and trained XGBoost model.
    """
    _instance = None

    def __init__(self):
        self.pipeline = None
        self.metrics = {}
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = RoadRiskPredictorService()
        return cls._instance

    def load_model(self):
        if not PIPELINE_JOB_PATH.exists():
            print("[INFO] Model pipeline not found. Triggering automated training...")
            from .train_random_forest import train_random_forest_pipeline
            self.pipeline, self.metrics = train_random_forest_pipeline()
        else:
            try:
                self.pipeline = joblib.load(PIPELINE_JOB_PATH)
                if METRICS_JSON_PATH.exists():
                    with open(METRICS_JSON_PATH, "r", encoding="utf-8") as f:
                        self.metrics = json.load(f)
                print(f"[OK] XGBoost Pipeline loaded successfully from {PIPELINE_JOB_PATH}")
            except Exception as e:
                print(f"[WARN] Error loading model pipeline ({e}). Retraining...")
                from .train_random_forest import train_random_forest_pipeline
                self.pipeline, self.metrics = train_random_forest_pipeline()

    def predict_risk(
        self,
        pothole_count: int,
        average_pothole_depth: float,
        total_crack_length: float,
        pavement_age: float,
        road_length: float = 1.0,
        traffic_density: str = "Medium",
        rainfall: str = "Moderate",
        road_name: Optional[str] = None,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes real-time inference on input road condition parameters.
        Applies identical preprocessing pipeline (imputation, scaling, one-hot encoding).
        """
        if self.pipeline is None:
            self.load_model()

        # Build feature DataFrame matching the trained pipeline schema
        input_df = pd.DataFrame([{
            "pothole_count": max(0, int(pothole_count)),
            "average_pothole_depth": max(0.0, float(average_pothole_depth)),
            "total_crack_length": max(0.0, float(total_crack_length)),
            "pavement_age": max(0.1, float(pavement_age)),
            "road_length": max(0.1, float(road_length)),
            "traffic_density": str(traffic_density) if traffic_density else "Medium",
            "rainfall": str(rainfall) if rainfall else "Moderate"
        }])

        # Predict class and probability distribution
        predicted_class = self.pipeline.predict(input_df)[0]
        probs = self.pipeline.predict_proba(input_df)[0]
        classes = list(self.pipeline.classes_)

        # Map classes to percentage probabilities
        prob_dict = {cls: round(float(prob) * 100, 1) for cls, prob in zip(classes, probs)}
        
        # Raw confidence (probability assigned by model to the winning class)
        raw_confidence = prob_dict.get(predicted_class, 85.0)
        confidence_ratio = round(raw_confidence / 100.0, 2)

        # Calibrate continuous risk score (0 to 100) strictly aligned with predicted class tier
        if predicted_class == "Critical Risk":
            tier_min, tier_max = 80.0, 98.0
        elif predicted_class == "High Risk":
            tier_min, tier_max = 60.0, 79.0
        elif predicted_class == "Medium Risk":
            tier_min, tier_max = 35.0, 59.0
        else:  # Low Risk
            tier_min, tier_max = 5.0, 34.0

        p_c = float(pothole_count)
        p_d = float(average_pothole_depth)
        c_l = float(total_crack_length)
        r_a = float(pavement_age)
        
        # Relative physical distress factor within tier
        rel_distress = min(1.0, (p_c / 35.0) * 0.35 + (p_d / 15.0) * 0.30 + (c_l / 100.0) * 0.25 + (r_a / 15.0) * 0.10)
        risk_score = round(tier_min + (tier_max - tier_min) * rel_distress, 1)
        risk_score = min(100.0, max(5.0, risk_score))

        # Prescriptive maintenance recommendation & priority synthesis
        from ..agent import maintenance_agent
        agent_res = maintenance_agent.analyze(
            risk_level=predicted_class,
            risk_score=risk_score,
            pothole_count=int(pothole_count),
            pothole_depth=float(average_pothole_depth),
            crack_length=float(total_crack_length),
            road_age=float(pavement_age),
            traffic_density=traffic_density,
            rainfall=rainfall,
            road_length=float(road_length)
        )

        # Extract feature importances
        feature_importances = self.metrics.get("feature_importances", {})
        feature_impacts = [
            {
                "feature": "Pothole Density",
                "importance": feature_importances.get("pothole_count", 25.0),
                "contribution": f"{pothole_count} surface craters ({average_pothole_depth}cm avg depth)"
            },
            {
                "feature": "Crack Severity",
                "importance": feature_importances.get("total_crack_length", 22.0),
                "contribution": f"{total_crack_length}m structural linear fissures"
            },
            {
                "feature": "Pavement Age",
                "importance": feature_importances.get("pavement_age", 20.0),
                "contribution": f"{pavement_age} years since last resurfacing"
            },
            {
                "feature": "Traffic Volume",
                "importance": feature_importances.get("traffic_density_Very High", 12.0),
                "contribution": f"{traffic_density} commuter/freight axle load"
            },
            {
                "feature": "Precipitation Pattern",
                "importance": feature_importances.get("rainfall_Heavy", 10.0),
                "contribution": f"{rainfall} moisture infiltration"
            },
            {
                "feature": "Corridor Span",
                "importance": feature_importances.get("road_length", 5.0),
                "contribution": f"{road_length} km monitored section"
            }
        ]

        return {
            "risk_level": predicted_class,
            "risk_score": risk_score,
            "confidence": confidence_ratio,
            "confidence_percentage": raw_confidence,
            "probabilities": prob_dict,
            "model_version": "RandomForest-v2.5-IRC82-Pipeline",
            "recommendation": agent_res["action"],
            "priority": agent_res["priority"],
            "urgency_score": agent_res["urgency_score"],
            "ai_reasoning": agent_res["reason"],
            "safety_hazard": agent_res["safety_hazard"],
            "estimated_budget": agent_res["estimated_budget"],
            "inspection_timeline": agent_res["inspection_timeline"],
            "feature_impacts": feature_impacts,
            "road_name": road_name or "Custom Road Corridor",
            "location": location or "India"
        }

risk_predictor = RoadRiskPredictorService.get_instance()
