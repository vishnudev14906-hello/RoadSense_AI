import sys
from typing import Dict, Any, List
from fastapi import APIRouter
from ..schemas import PreprocessInspectRequest, PreprocessInspectionResponse
from ..train_model import TRAFFIC_MAP, RAINFALL_MAP

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

router = APIRouter(prefix="/api/modules/preprocessing", tags=["2. Data Preprocessing Module"])

def calculate_pdi(potholes: int, depth: float, cracks: float, age: float, length: float) -> float:
    """
    Calculate Pavement Distress Index (PDI) [0 - 100].
    Higher PDI = greater structural damage.
    """
    safe_len = max(0.5, length)
    pothole_penalty = min(40.0, (potholes / safe_len) * 3.5 + (depth * 1.8))
    crack_penalty = min(35.0, (cracks / safe_len) * 0.8)
    age_penalty = min(25.0, age * 1.7)
    
    pdi = round(min(100.0, pothole_penalty + crack_penalty + age_penalty), 2)
    return pdi

def calculate_damage_density(potholes: int, cracks: float, length: float) -> float:
    """Defects per kilometer."""
    safe_len = max(0.1, length)
    return round((potholes + (cracks / 10.0)) / safe_len, 2)

def calculate_environmental_factor(traffic_num: int, rain_num: int) -> float:
    """Multiplier for environmental stress [1.0 - 2.0]."""
    return round(1.0 + ((traffic_num - 1) * 0.15) + ((rain_num - 1) * 0.18), 2)

@router.get("/pipeline-info")
def get_preprocessing_pipeline_info():
    """Returns documentation and mathematical rules of the Data Preprocessing Pipeline."""
    return {
        "module": "2. Data Preprocessing Module",
        "pipeline_stages": [
            {
                "step": 1,
                "name": "Data Validation & Missing Value Imputation",
                "description": "Clamps negative numbers to zero, sets default corridor lengths, fills empty categorical entries with median baselines."
            },
            {
                "step": 2,
                "name": "Categorical Ordinal Encoding",
                "traffic_mapping": TRAFFIC_MAP,
                "rainfall_mapping": RAINFALL_MAP
            },
            {
                "step": 3,
                "name": "Composite Feature Engineering",
                "features": [
                    "Pavement Distress Index (PDI: 0 - 100)",
                    "Surface Damage Density (Defects / km)",
                    "Environmental Severity Factor (Stress Multiplier 1.0 - 2.0)",
                    "Structural Fatigue Ratio (Crack-to-Age Ratio)"
                ]
            },
            {
                "step": 4,
                "name": "Feature Scaling & Vector Assembly",
                "description": "Standardizes feature distributions for Random Forest and regression models."
            }
        ]
    }

@router.post("/inspect", response_model=PreprocessInspectionResponse)
def inspect_preprocessing_transformation(req: PreprocessInspectRequest):
    """
    Simulates the exact step-by-step mathematical preprocessing pipeline on any input.
    """
    log = []
    log.append("Step 1: Ingested raw telemetry.")

    # 1. Cleaning & Clamping
    potholes_clean = max(0, int(req.pothole_count))
    depth_clean = max(0.0, float(req.pothole_depth))
    cracks_clean = max(0.0, float(req.crack_length))
    age_clean = max(0.1, float(req.road_age))
    length_clean = max(0.1, float(req.road_length))

    if req.pothole_count < 0 or req.pothole_depth < 0 or req.crack_length < 0:
        log.append("Warning: Negative values detected in raw telemetry; clamped to 0.0.")
    else:
        log.append("Passed sanity range validation checks.")

    # 2. Categorical Encodings
    t_num = TRAFFIC_MAP.get(req.traffic_density, 2)
    r_num = RAINFALL_MAP.get(req.rainfall, 2)
    log.append(f"Encoded Traffic '{req.traffic_density}' -> {t_num}, Rainfall '{req.rainfall}' -> {r_num}.")

    # 3. Feature Engineering
    pdi = calculate_pdi(potholes_clean, depth_clean, cracks_clean, age_clean, length_clean)
    damage_density = calculate_damage_density(potholes_clean, cracks_clean, length_clean)
    env_factor = calculate_environmental_factor(t_num, r_num)
    fatigue_ratio = round(cracks_clean / max(1.0, age_clean), 2)
    log.append(f"Engineered PDI: {pdi}, Damage Density: {damage_density} def/km, Env Multiplier: {env_factor}x.")

    # 4. Normalized Feature Vector (Min-Max scaled representations)
    norm_vector = {
        "norm_pothole_count": round(min(1.0, potholes_clean / 50.0), 3),
        "norm_pothole_depth": round(min(1.0, depth_clean / 25.0), 3),
        "norm_crack_length": round(min(1.0, cracks_clean / 150.0), 3),
        "norm_road_age": round(min(1.0, age_clean / 20.0), 3),
        "norm_traffic": round((t_num - 1) / 3.0, 3),
        "norm_rainfall": round((r_num - 1) / 3.0, 3),
        "composite_pdi": pdi
    }
    log.append("Assembled sanitized ML feature vector ready for inference.")

    return {
        "raw_input": {
            "pothole_count": req.pothole_count,
            "pothole_depth": req.pothole_depth,
            "crack_length": req.crack_length,
            "road_age": req.road_age,
            "road_length": req.road_length,
            "traffic_density": req.traffic_density,
            "rainfall": req.rainfall
        },
        "cleaned_input": {
            "pothole_count_clean": potholes_clean,
            "pothole_depth_clean": depth_clean,
            "crack_length_clean": cracks_clean,
            "road_age_clean": age_clean,
            "road_length_clean": length_clean,
            "traffic_density": req.traffic_density,
            "rainfall": req.rainfall
        },
        "numerical_encodings": {
            "traffic_num": t_num,
            "rain_num": r_num
        },
        "engineered_features": {
            "pavement_distress_index_pdi": pdi,
            "surface_damage_density_per_km": damage_density,
            "environmental_stress_factor": env_factor,
            "structural_fatigue_ratio": fatigue_ratio
        },
        "normalized_feature_vector": norm_vector,
        "validation_status": "Valid - Cleaned & Engineered",
        "preprocessing_log": log
    }
