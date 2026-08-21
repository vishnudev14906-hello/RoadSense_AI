from pydantic import BaseModel, EmailStr, Field, field_serializer, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

def ensure_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

# --- Auth Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "Inspector"
    auth_provider: Optional[str] = "local"
    profile_image: Optional[str] = None
    account_status: Optional[str] = "active"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "Inspector"

class UserLogin(BaseModel):
    email: str  # Accepts either email address or username
    password: str
    remember_me: Optional[bool] = False

class UserOut(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None

    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

    @field_serializer('last_login')
    def serialize_last_login(self, dt: Optional[datetime], _info):
        return ensure_utc_iso(dt)

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    reset_token: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    google_id: Optional[str] = None
    picture: Optional[str] = None
    role: Optional[str] = "Inspector"

# --- Road Schemas ---
class RoadBase(BaseModel):
    road_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    road_length_km: Optional[float] = None
    pothole_count: Optional[int] = None
    average_pothole_depth_cm: Optional[float] = None
    total_crack_length_m: Optional[float] = None
    pavement_age_years: Optional[float] = None
    surface_type: Optional[str] = None
    traffic_volume: Optional[str] = None
    rainfall: Optional[str] = None
    damage_type: Optional[str] = None
    risk_level: Optional[str] = None

    # Provenance fields
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_date: Optional[str] = None
    data_collection_method: Optional[str] = None
    verification_status: Optional[str] = "Verified"

    # Backward compatibility aliases
    road_length: Optional[float] = None
    road_age: Optional[float] = None
    pothole_depth: Optional[float] = None
    crack_length: Optional[float] = None
    traffic_density: Optional[str] = None

    @field_validator('latitude')
    def validate_latitude(cls, v):
        if v is not None and not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90.0 and 90.0 degrees")
        return v

    @field_validator('longitude')
    def validate_longitude(cls, v):
        if v is not None and not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180.0 and 180.0 degrees")
        return v

    @field_validator('road_length_km', 'road_length')
    def validate_road_length(cls, v):
        if v is not None and v <= 0.0:
            raise ValueError("Road length must be greater than 0 km")
        return v

    @field_validator('pothole_count')
    def validate_pothole_count(cls, v):
        if v is not None and v < 0:
            raise ValueError("Pothole count cannot be negative")
        return v

    @field_validator('average_pothole_depth_cm', 'pothole_depth')
    def validate_pothole_depth(cls, v):
        if v is not None and v < 0.0:
            raise ValueError("Pothole depth cannot be negative")
        return v

    @field_validator('total_crack_length_m', 'crack_length')
    def validate_crack_length(cls, v):
        if v is not None and v < 0.0:
            raise ValueError("Crack length cannot be negative")
        return v

    @field_validator('pavement_age_years', 'road_age')
    def validate_pavement_age(cls, v):
        if v is not None and v < 0.0:
            raise ValueError("Pavement age cannot be negative")
        return v

class RoadCreate(RoadBase):
    pass

class RoadUpdate(BaseModel):
    road_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    road_length_km: Optional[float] = None
    pothole_count: Optional[int] = None
    average_pothole_depth_cm: Optional[float] = None
    total_crack_length_m: Optional[float] = None
    pavement_age_years: Optional[float] = None
    surface_type: Optional[str] = None
    traffic_volume: Optional[str] = None
    rainfall: Optional[str] = None
    damage_type: Optional[str] = None
    risk_level: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_date: Optional[str] = None
    data_collection_method: Optional[str] = None
    verification_status: Optional[str] = None

    # Backward compat
    road_length: Optional[float] = None
    road_age: Optional[float] = None
    pothole_depth: Optional[float] = None
    crack_length: Optional[float] = None
    traffic_density: Optional[str] = None

class RoadImageOut(BaseModel):
    id: int
    road_id: Optional[int] = None
    image_path: str
    image_source: str
    annotation_path: Optional[str] = None
    damage_type: str
    annotation_status: str
    source_url: Optional[str] = None
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

    class Config:
        from_attributes = True

# --- Prediction & AI Schemas ---
class PredictRequest(BaseModel):
    road_id: Optional[int] = None
    road_name: Optional[str] = "Unnamed Road"
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    road_length_km: Optional[float] = None
    pothole_count: Optional[int] = None
    average_pothole_depth_cm: Optional[float] = None
    total_crack_length_m: Optional[float] = None
    pavement_age_years: Optional[float] = None
    traffic_volume: Optional[str] = None
    rainfall: Optional[str] = None
    surface_type: Optional[str] = "Asphalt Concrete"
    damage_type: Optional[str] = None
    save_prediction: bool = True

    # Backward compatibility aliases
    road_length: Optional[float] = None
    pothole_depth: Optional[float] = None
    crack_length: Optional[float] = None
    road_age: Optional[float] = None
    traffic_density: Optional[str] = None

class FeatureImpact(BaseModel):
    feature: str
    importance: float
    contribution: str

class AgentRecommendation(BaseModel):
    priority: str # Immediate, High, Medium, Routine
    urgency_score: float
    action: str
    reason: str
    safety_hazard: str
    estimated_budget: str
    inspection_timeline: str

class PredictionOut(BaseModel):
    id: Optional[int] = None
    road_id: Optional[int] = None
    road_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    road_length_km: float = 1.0
    pothole_count: int = 0
    average_pothole_depth_cm: float = 0.0
    total_crack_length_m: float = 0.0
    pavement_age_years: float = 0.0
    traffic_volume: str = "Medium"
    rainfall: str = "Moderate"
    damage_type: Optional[str] = None

    # Backward compat aliases
    pothole_depth: float = 0.0
    crack_length: float = 0.0
    road_age: float = 0.0
    traffic_density: str = "Medium"
    road_length: float = 1.0

    # ML Output
    risk_level: str
    risk_score: float
    confidence: float
    probabilities: Optional[Dict[str, float]] = None
    feature_impacts: Optional[List[FeatureImpact]] = None
    agent_recommendation: Optional[AgentRecommendation] = None
    recommendation: str
    priority: str
    urgency_score: float
    ai_reasoning: Optional[str] = None
    estimated_budget: Optional[str] = None
    prediction_date: datetime

    @field_serializer('prediction_date')
    def serialize_prediction_date(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

    class Config:
        from_attributes = True

class DetectionBox(BaseModel):
    id: int
    label: str
    confidence: float
    x: float
    y: float
    w: float
    h: float
    color: str

class ImageScanRequest(BaseModel):
    image_base64: str
    road_name: Optional[str] = "Uploaded Road Photo"
    location: Optional[str] = "Field Survey Ingestion"
    traffic_density: Optional[str] = None
    rainfall: Optional[str] = None
    save_prediction: bool = False
    road_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ImageScanOut(PredictionOut):
    is_valid_road: bool = True
    scene_type: str = "Roadway Corridor"
    detections: List[DetectionBox] = []
    defect_density_pct: float = 0.0
    surface_condition_summary: str = ""
    data_source_type: str = "AI Model-Detected Data"

class ImageDistressFeatures(BaseModel):
    pothole_count: int = 0
    pothole_area_ratio: float = 0.0
    crack_area_ratio: float = 0.0
    damage_area_ratio: float = 0.0
    damage_severity: float = 0.0
    pothole_detected: int = 0
    crack_detected: int = 0
    avg_confidence: float = 0.0

class DetectRoadImageResponse(BaseModel):
    risk_level: str
    confidence: float
    damage_type: str
    damage_severity: str
    features: Dict[str, Any]
    recommendation: str
    priority: str
    is_valid_road: bool = True
    risk_score: Optional[float] = None
    probabilities: Optional[Dict[str, float]] = None
    detections: Optional[List[DetectionBox]] = None
    message: Optional[str] = None
    safety_hazard: Optional[str] = None
    estimated_budget: Optional[str] = None
    inspection_timeline: Optional[str] = None
    ai_reasoning: Optional[str] = None

class DetectImageRequest(BaseModel):
    image_base64: str
    road_name: Optional[str] = None

class DetectImageResponse(BaseModel):
    detected_class: str
    confidence: float
    confidence_percentage: Optional[float] = None
    is_road_damage: bool
    message: str
    probabilities: Dict[str, float] = {}
    model_version: str = "Custom-CNN-Scratch-v1.0"
    derived_risk_level: Optional[str] = None
    derived_telemetry: Optional[Dict[str, Any]] = None

class CombinedAssessmentRequest(BaseModel):
    tabular_risk: str
    tabular_risk_score: float = 50.0
    image_damage: Optional[str] = None
    image_confidence: Optional[float] = None
    road_length: float = 1.0
    traffic_density: str = "Medium"
    rainfall: str = "Moderate"
    pothole_count: int = 0
    pothole_depth: float = 0.0
    crack_length: float = 0.0
    road_age: float = 1.0

class CombinedAssessmentResponse(BaseModel):
    tabular_risk: str
    tabular_risk_score: float
    image_damage: str
    image_confidence: float
    final_risk: str
    final_risk_score: float
    priority: str
    inspection_timeline: str
    recommendation: str
    safety_hazard: str
    estimated_budget: str
    decision_rationale: str

class ModelEvaluationResponse(BaseModel):
    random_forest: Dict[str, Any]
    custom_cnn: Dict[str, Any]
    zero_fabrication_guarantee: str = "Verified strictly on authentic held-out test splits without pre-trained weights."


class RoadOut(RoadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    latest_prediction: Optional[PredictionOut] = None

    @field_serializer('created_at')
    def serialize_created_at(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

    @field_serializer('updated_at')
    def serialize_updated_at(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

    class Config:
        from_attributes = True

class RoadFilterOptions(BaseModel):
    states: List[str]
    districts: List[str]
    cities: List[str]
    surface_types: List[str]
    verification_statuses: List[str]
    risk_levels: List[str]

# --- Dashboard & Prioritization Schemas ---
class DashboardStats(BaseModel):
    total_roads: int
    verified_roads_count: int
    source_available_count: int
    derived_count: int
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int
    total_predictions: int
    urgent_actions_required: int
    avg_network_health_score: float

class PriorityRoadItem(BaseModel):
    rank: int
    road_id: Optional[int]
    road_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: str
    road_length: float = 1.0
    road_length_km: float = 1.0
    road_age: float = 0.0
    pavement_age_years: float = 0.0
    pothole_count: Optional[int] = 0
    pothole_depth: Optional[float] = 0.0
    average_pothole_depth_cm: Optional[float] = 0.0
    crack_length: Optional[float] = 0.0
    total_crack_length_m: Optional[float] = 0.0
    surface_type: Optional[str] = None
    traffic_density: str = "Medium"
    traffic_volume: str = "Medium"
    rainfall: str = "Moderate"
    risk_level: str
    risk_score: float
    confidence: float = 0.0
    urgency_score: float
    priority: str
    action: str
    recommendation: Optional[str] = None
    estimated_budget: str
    ai_reasoning: Optional[str] = None
    verification_status: str = "Verified"
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    last_assessed: datetime

    @field_serializer('last_assessed')
    def serialize_last_assessed(self, dt: datetime, _info):
        return ensure_utc_iso(dt)

# ==========================================
# --- SCHEMAS FOR THE 6 CORE MODULES ---
# ==========================================

# 1. Road Data Collection Module Schemas
class SurveyDataEntry(BaseModel):
    road_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: str = "India"
    road_length_km: float = 1.0
    pavement_age_years: float = 1.0
    pothole_count: Optional[int] = 0
    average_pothole_depth_cm: Optional[float] = 0.0
    total_crack_length_m: Optional[float] = 0.0
    surface_type: Optional[str] = "Asphalt Concrete"
    traffic_volume: str = "Medium"
    rainfall: str = "Moderate"
    damage_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_name: Optional[str] = "Manual Field Survey"
    source_url: Optional[str] = None
    source_date: Optional[str] = None
    data_collection_method: Optional[str] = "Field Inspector Visual Audit"
    verification_status: Optional[str] = "Verified"

    # Backward compat
    road_length: Optional[float] = 1.0
    road_age: Optional[float] = 1.0
    pothole_depth: Optional[float] = 0.0
    crack_length: Optional[float] = 0.0
    traffic_density: Optional[str] = "Medium"

class BatchDataCollectionRequest(BaseModel):
    entries: List[SurveyDataEntry]

class IoTSimulationRequest(BaseModel):
    corridor_name: str
    location: str
    sensor_sample_rate_hz: int = 100
    vibration_amplitude_g: float = 1.2
    surface_acoustic_db: float = 68.0
    estimated_potholes: int = 4
    estimated_depth_cm: float = 4.5
    estimated_cracks_m: float = 18.0
    traffic_density: str = "Medium"
    rainfall: str = "Moderate"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

# 2. Data Preprocessing Module Schemas
class PreprocessInspectRequest(BaseModel):
    pothole_count: Optional[int] = 0
    pothole_depth: Optional[float] = 0.0
    crack_length: Optional[float] = 0.0
    road_age: Optional[float] = 1.0
    road_length: Optional[float] = 1.0
    traffic_density: str = "Medium"
    rainfall: str = "Moderate"

class PreprocessedFeatureVector(BaseModel):
    pothole_count_clean: int
    pothole_depth_clean: float
    crack_length_clean: float
    road_age_clean: float
    road_length_clean: float
    traffic_num: int
    rain_num: int
    pavement_distress_index: float # 0 to 100
    surface_damage_density: float # defects / km
    environmental_stress_factor: float # multiplier

class PreprocessInspectionResponse(BaseModel):
    raw_input: Dict[str, Any]
    cleaned_input: Dict[str, Any]
    numerical_encodings: Dict[str, int]
    engineered_features: Dict[str, float]
    normalized_feature_vector: Dict[str, float]
    validation_status: str
    preprocessing_log: List[str]

# 3. Road Risk Prediction Module Schemas
class WhatIfSimulateRequest(BaseModel):
    pothole_count: int
    pothole_depth: float
    crack_length: float
    road_age: float
    road_length: float = 1.0
    traffic_density: str = "Medium"
    rainfall: str = "Moderate"
    delta_traffic: Optional[str] = None
    delta_rainfall: Optional[str] = None
    delta_potholes_pct: Optional[float] = 0.0
    delta_cracks_pct: Optional[float] = 0.0

class WhatIfSimulateResponse(BaseModel):
    baseline: Dict[str, Any]
    simulated: Dict[str, Any]
    risk_delta: float
    confidence_delta: float
    primary_sensitivity_driver: str
    analysis_narrative: str

# 4. Risk Classification Module Schemas
class ClassificationTierInfo(BaseModel):
    tier: str
    name: str
    score_range: str
    hazard_level: str
    color_hex: str
    description: str
    standard_action: str

class ConfusionMatrixItem(BaseModel):
    actual: str
    predicted_low: int
    predicted_medium: int
    predicted_high: int
    predicted_critical: int

class ClassificationMetricsResponse(BaseModel):
    model_name: str
    test_accuracy: float
    precision_macro: float
    recall_macro: float
    f1_score_macro: float
    total_training_samples: int
    tiers: List[ClassificationTierInfo]
    confusion_matrix: List[ConfusionMatrixItem]
    tier_distribution: Dict[str, int]

# 5. AI Maintenance Recommendation Module Schemas
class MaintenanceActionPlan(BaseModel):
    action_type: str
    engineering_spec: str
    priority_level: str
    urgency_score: float
    inspection_timeline: str
    estimated_cost_inr: str
    cost_breakdown: Dict[str, str]
    safety_hazard: str
    ai_reasoning: str

# 6. Road Risk Monitoring & Reporting Module Schemas
class MonitoringGISFeature(BaseModel):
    road_id: int
    road_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: str
    latitude: float
    longitude: float
    risk_level: str
    risk_score: float
    priority: str
    recommendation: str
    pothole_count: Optional[int] = None
    average_pothole_depth_cm: Optional[float] = None
    total_crack_length_m: Optional[float] = None
    pothole_depth: Optional[float] = None
    crack_length: Optional[float] = None
    verification_status: str = "Verified"
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    updated_at: str

class AuditReportSummary(BaseModel):
    report_id: str
    generation_date: str
    inspector_name: str
    road_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    location: str
    coordinates: str
    corridor_length_km: float
    pavement_age_years: float
    surface_type: Optional[str] = None
    risk_level: str
    risk_score: float
    confidence_pct: float
    condition_summary: str
    engineering_recommendation: str
    urgency_priority: str
    inspection_deadline: str
    estimated_budget_inr: str
    distress_breakdown: Dict[str, Any]
    data_provenance: Dict[str, Any]
    ai_audit_signoff: str
