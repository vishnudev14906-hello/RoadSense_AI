import os
import sys
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from .ml.predict_risk import risk_predictor

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

class MLEngine:
    """
    Unified ML Engine interface delegating to the production XGBoost Road Risk Classifier.
    """
    def __init__(self):
        self.predictor = risk_predictor
        self.model_artifact = {
            "model_name": "XGBoost Road Condition Risk Classifier",
            "feature_cols": ["pothole_count", "average_pothole_depth", "total_crack_length", "pavement_age", "road_length", "traffic_density", "rainfall"],
            "accuracy": 0.98,
            "classes": ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]
        }

    def predict(
        self,
        pothole_count: int,
        pothole_depth: float,
        crack_length: float,
        road_age: float,
        road_length: float = 1.0,
        traffic_density: str = "Medium",
        rainfall: str = "Moderate"
    ) -> Dict[str, Any]:
        """
        Executes prediction via the trained XGBoost Road Risk Pipeline.
        """
        res = self.predictor.predict_risk(
            pothole_count=pothole_count,
            average_pothole_depth=pothole_depth,
            total_crack_length=crack_length,
            pavement_age=road_age,
            road_length=road_length,
            traffic_density=traffic_density,
            rainfall=rainfall
        )

        return {
            "risk_level": res["risk_level"],
            "risk_score": res["risk_score"],
            "confidence": res["confidence_percentage"],
            "probabilities": res["probabilities"],
            "feature_impacts": res["feature_impacts"],
            "recommendation": res["recommendation"],
            "priority": res["priority"],
            "urgency_score": res["urgency_score"],
            "ai_reasoning": res["ai_reasoning"],
            "safety_hazard": res["safety_hazard"],
            "estimated_budget": res["estimated_budget"],
            "inspection_timeline": res["inspection_timeline"]
        }

ml_engine = MLEngine()
