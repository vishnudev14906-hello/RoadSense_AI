from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True) # Nullable for Google-only authentication
    auth_provider = Column(String(50), default="local") # "local", "google"
    google_id = Column(String(100), nullable=True, index=True)
    profile_image = Column(String(500), nullable=True)
    role = Column(String(50), default="Inspector") # Admin, Inspector, User
    account_status = Column(String(50), default="active") # active, suspended
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    last_login = Column(DateTime(timezone=True), default=get_utc_now)

    @property
    def full_name(self) -> str:
        return self.name

class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    road_name = Column(String(200), nullable=False, index=True)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    road_length_km = Column(Float, nullable=True) # km
    pothole_count = Column(Integer, nullable=True)
    average_pothole_depth_cm = Column(Float, nullable=True) # cm
    total_crack_length_m = Column(Float, nullable=True) # m
    pavement_age_years = Column(Float, nullable=True) # years
    surface_type = Column(String(100), nullable=True) # Asphalt Concrete, Bituminous, Rigid Concrete, etc.
    traffic_volume = Column(String(50), nullable=True) # Low, Medium, High, Very High
    rainfall = Column(String(50), nullable=True) # Light, Moderate, Heavy, Torrential
    damage_type = Column(String(100), nullable=True) # Potholes, Longitudinal Cracks, Transverse Cracks, Alligator Cracks, etc.
    risk_level = Column(String(50), nullable=True) # Low Risk, Medium Risk, High Risk, Critical Risk

    # Data Provenance & Verification
    source_name = Column(String(255), nullable=True)
    source_url = Column(String(500), nullable=True)
    source_date = Column(String(50), nullable=True)
    data_collection_method = Column(String(200), nullable=True)
    verification_status = Column(String(50), default="Verified") # Verified, Source Available, Derived from Source, Not Available

    created_at = Column(DateTime(timezone=True), default=get_utc_now)
    updated_at = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    # Relationships
    predictions = relationship("Prediction", back_populates="road", cascade="all, delete-orphan")
    images = relationship("RoadImage", back_populates="road", cascade="all, delete-orphan")

    # Backward compatibility properties
    @property
    def location(self) -> str:
        return self.city or self.district or self.state or "India"

    @location.setter
    def location(self, val: str):
        self.city = val

    @property
    def road_length(self) -> float:
        return self.road_length_km if self.road_length_km is not None else 1.0

    @road_length.setter
    def road_length(self, val: float):
        self.road_length_km = val

    @property
    def road_age(self) -> float:
        return self.pavement_age_years if self.pavement_age_years is not None else 1.0

    @road_age.setter
    def road_age(self, val: float):
        self.pavement_age_years = val

    @property
    def pothole_depth(self) -> float:
        return self.average_pothole_depth_cm if self.average_pothole_depth_cm is not None else 0.0

    @pothole_depth.setter
    def pothole_depth(self, val: float):
        self.average_pothole_depth_cm = val

    @property
    def crack_length(self) -> float:
        return self.total_crack_length_m if self.total_crack_length_m is not None else 0.0

    @crack_length.setter
    def crack_length(self, val: float):
        self.total_crack_length_m = val

    @property
    def traffic_density(self) -> str:
        return self.traffic_volume or "Medium"

    @traffic_density.setter
    def traffic_density(self, val: str):
        self.traffic_volume = val


class RoadImage(Base):
    __tablename__ = "road_images"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id", ondelete="SET NULL"), nullable=True)
    image_path = Column(String(500), nullable=False)
    image_source = Column(String(255), nullable=False)
    annotation_path = Column(String(500), nullable=True)
    damage_type = Column(String(100), nullable=False) # Pothole, Longitudinal Crack, Transverse Crack, Alligator Crack, Other Road Damage
    annotation_status = Column(String(50), default="Ground Truth (RDD2022)") # Ground Truth (RDD2022), Model-Detected
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    road = relationship("Road", back_populates="images")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(Integer, ForeignKey("roads.id", ondelete="SET NULL"), nullable=True)
    road_name = Column(String(200), nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    location = Column(String(150), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Input snapshots
    road_length_km = Column(Float, default=1.0)
    road_length = Column(Float, default=1.0)
    pothole_count = Column(Integer, default=0)
    average_pothole_depth_cm = Column(Float, default=0.0)
    total_crack_length_m = Column(Float, default=0.0)
    pavement_age_years = Column(Float, default=0.0)
    traffic_volume = Column(String(50), default="Medium")
    rainfall = Column(String(50), default="Moderate")
    damage_type = Column(String(100), nullable=True)
    
    # Backward compat aliases
    pothole_depth = Column(Float, default=0.0)
    crack_length = Column(Float, default=0.0)
    road_age = Column(Float, default=0.0)
    traffic_density = Column(String(50), default="Medium")

    # ML Output
    risk_level = Column(String(50), nullable=False) # Low Risk, Medium Risk, High Risk, Critical Risk
    risk_score = Column(Float, default=0.0) # 0 to 100
    confidence = Column(Float, default=0.0) # 0 to 100 %
    
    # Agentic Recommendation
    recommendation = Column(Text, nullable=False)
    priority = Column(String(50), default="Routine") # Immediate, High, Medium, Low / Routine
    urgency_score = Column(Float, default=0.0) # 0 to 100 for ranking
    ai_reasoning = Column(Text, nullable=True)
    estimated_budget = Column(String(100), nullable=True)
    
    prediction_date = Column(DateTime(timezone=True), default=get_utc_now)

    road = relationship("Road", back_populates="predictions")
