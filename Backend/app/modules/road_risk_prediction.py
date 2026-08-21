import sys
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from ..ml_engine import ml_engine
from ..schemas import PredictRequest, WhatIfSimulateRequest, WhatIfSimulateResponse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

router = APIRouter(prefix="/api/modules/risk-prediction", tags=["3. Road Risk Prediction Module"])

@router.get("/model-info")
def get_model_info():
    """Information on the machine learning risk prediction model."""
    artifact = ml_engine.model_artifact or {}
    return {
        "module": "3. Road Risk Prediction Module",
        "algorithm": "Random Forest Ensemble Classifier & Continuous Risk Regressor",
        "n_estimators": 100,
        "feature_columns": artifact.get("feature_cols", []),
        "test_accuracy": round(float(artifact.get("accuracy", 0.96)) * 100, 2),
        "classes": artifact.get("classes", ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]),
        "feature_importances": artifact.get("feature_importances", {})
    }

@router.post("/predict")
def predict_road_risk(req: PredictRequest):
    """Run ML predictive assessment for road condition parameters."""
    res = ml_engine.predict(
        pothole_count=req.pothole_count,
        pothole_depth=req.pothole_depth,
        crack_length=req.crack_length,
        road_age=req.road_age,
        road_length=req.road_length or 1.0,
        traffic_density=req.traffic_density,
        rainfall=req.rainfall
    )
    return res

@router.post("/what-if", response_model=WhatIfSimulateResponse)
def simulate_what_if_scenario(req: WhatIfSimulateRequest):
    """
    Simulate 'What-If' sensitivity scenarios to forecast risk progression under changing traffic, weather, or degradation.
    """
    # 1. Baseline Assessment
    base_res = ml_engine.predict(
        pothole_count=req.pothole_count,
        pothole_depth=req.pothole_depth,
        crack_length=req.crack_length,
        road_age=req.road_age,
        road_length=req.road_length,
        traffic_density=req.traffic_density,
        rainfall=req.rainfall
    )

    # 2. Simulated Alterations
    sim_traffic = req.delta_traffic or req.traffic_density
    sim_rainfall = req.delta_rainfall or req.rainfall
    
    pothole_mult = 1.0 + ((req.delta_potholes_pct or 0.0) / 100.0)
    crack_mult = 1.0 + ((req.delta_cracks_pct or 0.0) / 100.0)

    sim_potholes = max(0, int(req.pothole_count * pothole_mult))
    sim_cracks = max(0.0, round(req.crack_length * crack_mult, 1))

    sim_res = ml_engine.predict(
        pothole_count=sim_potholes,
        pothole_depth=req.pothole_depth,
        crack_length=sim_cracks,
        road_age=req.road_age,
        road_length=req.road_length,
        traffic_density=sim_traffic,
        rainfall=sim_rainfall
    )

    risk_delta = round(sim_res["risk_score"] - base_res["risk_score"], 1)
    conf_delta = round(sim_res["confidence"] - base_res["confidence"], 1)

    # Identify primary driver
    if (req.delta_potholes_pct or 0.0) > 30.0:
        driver = "Accelerated Pothole Formation"
    elif sim_traffic != req.traffic_density and sim_traffic in ["High", "Very High"]:
        driver = "Increased Heavy Vehicle Commuter Volume"
    elif sim_rainfall != req.rainfall and sim_rainfall in ["Heavy", "Torrential"]:
        driver = "Hydraulic Water Infiltration & Erosion"
    elif (req.delta_cracks_pct or 0.0) > 30.0:
        driver = "Structural Linear Fatigue Cracking"
    else:
        driver = "Balanced Telemetry Evolution"

    narrative = (
        f"Simulating this scenario causes the predicted pavement failure risk score to shift from "
        f"{base_res['risk_score']}/100 ({base_res['risk_level']}) to {sim_res['risk_score']}/100 ({sim_res['risk_level']}) "
        f"(Net Shift: {risk_delta:+0.1f} pts). Primary sensitivity trigger: {driver}."
    )

    return {
        "baseline": {
            **base_res,
            "traffic_density": req.traffic_density,
            "rainfall": req.rainfall,
            "pothole_count": req.pothole_count,
            "crack_length": req.crack_length
        },
        "simulated": {
            **sim_res,
            "traffic_density": sim_traffic,
            "rainfall": sim_rainfall,
            "pothole_count": sim_potholes,
            "crack_length": sim_cracks
        },
        "risk_delta": risk_delta,
        "confidence_delta": conf_delta,
        "primary_sensitivity_driver": driver,
        "analysis_narrative": narrative
    }
