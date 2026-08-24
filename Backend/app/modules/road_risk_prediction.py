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
    """Information on the XGBoost risk prediction model."""
    artifact = ml_engine.model_artifact or {}
    return {
        "module": "3. Road Risk Prediction Module",
        "algorithm": "XGBoost Classifier & Continuous Risk Regressor",
        "n_estimators": 220,
        "feature_columns": artifact.get("feature_cols", []),
        "test_accuracy": round(float(artifact.get("accuracy", 0.98)) * 100, 2),
        "classes": artifact.get("classes", ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]),
        "feature_importances": artifact.get("feature_importances", {})
    }

@router.post("/predict")
def predict_road_risk(req: PredictRequest):
    """Run XGBoost ML predictive assessment for road condition parameters."""
    p_cnt = int(req.pothole_count if req.pothole_count is not None else 0)
    p_dep = float(req.pothole_depth if req.pothole_depth is not None else (req.average_pothole_depth_cm if req.average_pothole_depth_cm is not None else 0.0))
    c_len = float(req.crack_length if req.crack_length is not None else (req.total_crack_length_m if req.total_crack_length_m is not None else 0.0))
    r_age = float(req.road_age if req.road_age is not None else (req.pavement_age_years if req.pavement_age_years is not None else 1.0))
    r_len = float(req.road_length if req.road_length is not None else (req.road_length_km if req.road_length_km is not None else 1.0))
    t_vol = req.traffic_density or req.traffic_volume or "Medium"
    rain = req.rainfall or "Moderate"

    res = ml_engine.predict(
        pothole_count=p_cnt,
        pothole_depth=p_dep,
        crack_length=c_len,
        road_age=r_age,
        road_length=r_len,
        traffic_density=t_vol,
        rainfall=rain
    )
    return res

@router.post("/what-if", response_model=WhatIfSimulateResponse)
def simulate_what_if_scenario(req: WhatIfSimulateRequest):
    """
    Simulate 'What-If' sensitivity scenarios to forecast risk progression under changing traffic, weather, or degradation.
    """
    p_cnt = int(req.pothole_count if req.pothole_count is not None else 0)
    p_dep = float(req.pothole_depth if req.pothole_depth is not None else (req.average_pothole_depth_cm if req.average_pothole_depth_cm is not None else 0.0))
    c_len = float(req.crack_length if req.crack_length is not None else (req.total_crack_length_m if req.total_crack_length_m is not None else 0.0))
    r_age = float(req.road_age if req.road_age is not None else (req.pavement_age_years if req.pavement_age_years is not None else 1.0))
    r_len = float(req.road_length if req.road_length is not None else (req.road_length_km if req.road_length_km is not None else 1.0))
    t_vol = req.traffic_density or req.traffic_volume or "Medium"
    rain = req.rainfall or "Moderate"

    # 1. Baseline Assessment
    base_res = ml_engine.predict(
        pothole_count=p_cnt,
        pothole_depth=p_dep,
        crack_length=c_len,
        road_age=r_age,
        road_length=r_len,
        traffic_density=t_vol,
        rainfall=rain
    )

    # 2. Simulated Alterations
    sim_traffic = req.delta_traffic or t_vol
    sim_rainfall = req.delta_rainfall or rain
    
    pothole_mult = 1.0 + ((req.delta_potholes_pct or 0.0) / 100.0)
    crack_mult = 1.0 + ((req.delta_cracks_pct or 0.0) / 100.0)

    sim_potholes = max(0, int(p_cnt * pothole_mult))
    sim_cracks = max(0.0, round(c_len * crack_mult, 1))

    sim_res = ml_engine.predict(
        pothole_count=sim_potholes,
        pothole_depth=p_dep,
        crack_length=sim_cracks,
        road_age=r_age,
        road_length=r_len,
        traffic_density=sim_traffic,
        rainfall=sim_rainfall
    )

    risk_delta = round(sim_res["risk_score"] - base_res["risk_score"], 1)
    conf_delta = round(sim_res["confidence"] - base_res["confidence"], 1)

    # Identify primary driver
    if (req.delta_potholes_pct or 0.0) > 30.0:
        driver = "Accelerated Pothole Formation"
    elif sim_traffic != t_vol and sim_traffic in ["High", "Very High"]:
        driver = "Increased Heavy Vehicle Commuter Volume"
    elif sim_rainfall != rain and sim_rainfall in ["Heavy", "Torrential"]:
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
            "pothole_count": p_cnt,
            "crack_length": c_len,
            "traffic_density": t_vol,
            "rainfall": rain,
            "risk_score": base_res["risk_score"],
            "risk_level": base_res["risk_level"],
            "confidence": base_res["confidence"]
        },
        "simulated": {
            "pothole_count": sim_potholes,
            "crack_length": sim_cracks,
            "traffic_density": sim_traffic,
            "rainfall": sim_rainfall,
            "risk_score": sim_res["risk_score"],
            "risk_level": sim_res["risk_level"],
            "confidence": sim_res["confidence"]
        },
        "deltas": {
            "risk_score_delta": risk_delta,
            "confidence_delta": conf_delta,
            "potholes_delta_pct": req.delta_potholes_pct or 0.0,
            "cracks_delta_pct": req.delta_cracks_pct or 0.0
        },
        "sensitivity_driver": driver,
        "narrative": narrative
    }
