"""
RoadSense AI - 6 Core Modules Architecture
1. Road Data Collection Module
2. Data Preprocessing Module
3. Road Risk Prediction Module
4. Risk Classification Module
5. AI Maintenance Recommendation Module
6. Road Risk Monitoring & Reporting Module
"""

from .road_data_collection import router as data_collection_router
from .data_preprocessing import router as preprocessing_router
from .road_risk_prediction import router as risk_prediction_router
from .risk_classification import router as risk_classification_router
from .ai_maintenance_recommendation import router as maintenance_recommendation_router
from .road_risk_monitoring_reporting import router as monitoring_reporting_router

__all__ = [
    "data_collection_router",
    "preprocessing_router",
    "risk_prediction_router",
    "risk_classification_router",
    "maintenance_recommendation_router",
    "monitoring_reporting_router",
]
