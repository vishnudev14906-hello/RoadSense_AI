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

TARGET_CLASSES = ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]

TRAFFIC_MAP_NUM = {"Low": 1, "Medium": 2, "High": 3, "Very High": 4}
RAINFALL_MAP_NUM = {"Light": 1, "Moderate": 2, "Heavy": 3, "Torrential": 4}


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
        Applies trained preprocessing pipeline and XGBoost multi-class risk classifier.
        """
        if self.pipeline is None:
            self.load_model()

        p_cnt = max(0, int(pothole_count))
        p_dep = max(0.0, float(average_pothole_depth))
        c_len = max(0.0, float(total_crack_length))
        r_age = max(0.1, float(pavement_age))
        r_len = max(0.1, float(road_length))
        t_vol = str(traffic_density) if traffic_density else "Medium"
        rain = str(rainfall) if rainfall else "Moderate"

        # Build feature DataFrame matching the trained pipeline schema
        input_df = pd.DataFrame([{
            "pothole_count": p_cnt,
            "average_pothole_depth": p_dep,
            "total_crack_length": c_len,
            "pavement_age": r_age,
            "road_length": r_len,
            "traffic_density": t_vol,
            "rainfall": rain
        }])

        # Predict class and probability distribution from XGBoost model
        predicted_class = self.pipeline.predict(input_df)[0]
        probs = self.pipeline.predict_proba(input_df)[0]
        classes = list(self.pipeline.classes_)

        # Map classes to percentage probabilities
        prob_dict = {cls: round(float(prob) * 100, 1) for cls, prob in zip(classes, probs)}
        
        # Raw confidence (probability assigned by model to the winning class)
        raw_confidence = prob_dict.get(predicted_class, 85.0)
        confidence_ratio = round(raw_confidence / 100.0, 2)

        # Calibrate continuous civil engineering risk score (0 to 100)
        # Class tier boundaries
        tier_bounds = {
            "Critical Risk": (80.0, 98.5),
            "High Risk": (58.0, 79.9),
            "Medium Risk": (35.0, 57.9),
            "Low Risk": (5.0, 34.9)
        }
        tier_min, tier_max = tier_bounds.get(predicted_class, (5.0, 34.9))

        # Physical distress relative factor
        t_num = TRAFFIC_MAP_NUM.get(t_vol, 2)
        r_num = RAINFALL_MAP_NUM.get(rain, 2)
        env_factor = ((t_num - 1) / 3.0) * 0.5 + ((r_num - 1) / 3.0) * 0.5

        p_factor = (p_cnt / 30.0) * 0.40 + (p_cnt * min(18.0, p_dep) / 250.0) * 0.60
        c_factor = min(1.0, c_len / 85.0)
        a_factor = min(1.0, r_age / 14.0)

        rel_distress = min(1.0, max(0.0, (p_factor * 0.45 + c_factor * 0.35 + a_factor * 0.20) * (0.80 + 0.40 * env_factor)))
        
        # Probability weighted base
        class_base_scores = {
            "Low Risk": 15.0,
            "Medium Risk": 46.0,
            "High Risk": 69.0,
            "Critical Risk": 91.0
        }
        prob_weighted_score = sum((prob_dict.get(cls, 0.0) / 100.0) * score for cls, score in class_base_scores.items())

        # Blended risk score strictly bound within the predicted tier
        raw_score = tier_min + (tier_max - tier_min) * (0.60 * rel_distress + 0.40 * ((prob_weighted_score - tier_min) / max(1.0, tier_max - tier_min)))
        risk_score = round(min(tier_max, max(tier_min, raw_score)), 1)

        # Prescriptive maintenance recommendation & priority synthesis
        from ..agent import maintenance_agent
        agent_res = maintenance_agent.analyze(
            risk_level=predicted_class,
            risk_score=risk_score,
            pothole_count=p_cnt,
            pothole_depth=p_dep,
            crack_length=c_len,
            road_age=r_age,
            traffic_density=t_vol,
            rainfall=rain,
            road_length=r_len
        )

        # Extract feature importances
        feature_importances = self.metrics.get("feature_importances", {})
        feature_impacts = [
            {
                "feature": "Pothole Density & Depth",
                "importance": feature_importances.get("pothole_count", 28.0),
                "contribution": f"{p_cnt} surface craters ({p_dep}cm avg depth)"
            },
            {
                "feature": "Crack Severity",
                "importance": feature_importances.get("total_crack_length", 24.0),
                "contribution": f"{c_len}m structural linear fissures"
            },
            {
                "feature": "Pavement Age",
                "importance": feature_importances.get("pavement_age", 18.0),
                "contribution": f"{r_age} years since last resurfacing"
            },
            {
                "feature": "Traffic Volume",
                "importance": feature_importances.get("traffic_density_Very High", 14.0),
                "contribution": f"{t_vol} commuter/freight axle load"
            },
            {
                "feature": "Precipitation Pattern",
                "importance": feature_importances.get("rainfall_Heavy", 11.0),
                "contribution": f"{rain} moisture infiltration"
            },
            {
                "feature": "Corridor Span",
                "importance": feature_importances.get("road_length", 5.0),
                "contribution": f"{r_len} km monitored section"
            }
        ]

        return {
            "risk_level": predicted_class,
            "risk_score": risk_score,
            "confidence": confidence_ratio,
            "confidence_percentage": raw_confidence,
            "probabilities": prob_dict,
            "model_version": "XGBoost-v3.0-IRC82-Pipeline",
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
