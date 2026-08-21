import sys
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models import Road, Prediction
from ..schemas import (
    SurveyDataEntry, BatchDataCollectionRequest, IoTSimulationRequest,
    ImageScanRequest, ImageScanOut, RoadOut
)
from ..vision_engine import analyze_road_image
from ..ml_engine import ml_engine
from ..agent import maintenance_agent

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

router = APIRouter(prefix="/api/modules/data-collection", tags=["1. Road Data Collection Module"])

@router.get("/summary")
def get_collection_summary(db: Session = Depends(get_db)):
    """Summary of data collection telemetry stored in SQLite with provenance metadata."""
    total_records = db.query(Road).count()
    verified_count = db.query(Road).filter(Road.verification_status == "Verified").count()
    derived_count = db.query(Road).filter(Road.verification_status == "Derived from Source").count()
    sources_available = db.query(Road).filter(Road.verification_status == "Source Available").count()
    
    cities = db.query(Road.city, func.count(Road.id)).group_by(Road.city).all()
    avg_potholes = db.query(func.avg(Road.pothole_count)).scalar() or 0.0
    avg_cracks = db.query(func.avg(Road.total_crack_length_m)).scalar() or 0.0
    
    return {
        "module": "1. Road Data Collection Module",
        "storage_engine": "SQLite (roadsense.db)",
        "total_collected_corridors": total_records,
        "verified_records_count": verified_count,
        "derived_records_count": derived_count,
        "source_available_count": sources_available,
        "average_pothole_count": round(float(avg_potholes), 1),
        "average_crack_length_m": round(float(avg_cracks), 1),
        "cities_surveyed": [{"city": c or "Not Specified", "count": cnt} for c, cnt in cities],
        "supported_provenance_methods": [
            "Official PWD / Municipal Asset Registers",
            "Automated Road Inspection Vehicle (ARIV) Profilometry",
            "PMGSY OMMAS Quality Monitoring Surveys",
            "RDD2022 Ground-Truth Image Benchmark",
            "Verified Manual Inspector Surveys"
        ]
    }

@router.post("/manual")
def collect_manual_survey(data: SurveyDataEntry, db: Session = Depends(get_db)):
    """Ingest a verified manual field survey into SQLite database and run automated assessment."""
    road = Road(
        road_name=data.road_name.strip(),
        state=data.state,
        district=data.district,
        city=data.city or data.location,
        road_length_km=max(0.1, data.road_length_km or data.road_length or 1.0),
        pavement_age_years=max(0.0, data.pavement_age_years or data.road_age or 1.0),
        pothole_count=max(0, data.pothole_count or 0),
        average_pothole_depth_cm=max(0.0, data.average_pothole_depth_cm or data.pothole_depth or 0.0),
        total_crack_length_m=max(0.0, data.total_crack_length_m or data.crack_length or 0.0),
        surface_type=data.surface_type or "Bituminous Concrete",
        traffic_volume=data.traffic_volume or data.traffic_density or "Medium",
        rainfall=data.rainfall or "Moderate",
        damage_type=data.damage_type,
        latitude=data.latitude,
        longitude=data.longitude,
        source_name=data.source_name or "Manual Field Inspector Survey",
        source_url=data.source_url,
        source_date=data.source_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        data_collection_method=data.data_collection_method or "Field Inspector Visual Audit",
        verification_status=data.verification_status or "Verified"
    )
    db.add(road)
    db.commit()
    db.refresh(road)

    # Automatically predict condition for newly collected road
    ml_res = ml_engine.predict(
        pothole_count=road.pothole_count or 0,
        pothole_depth=road.average_pothole_depth_cm or 0.0,
        crack_length=road.total_crack_length_m or 0.0,
        road_age=road.pavement_age_years or 1.0,
        road_length=road.road_length_km or 1.0,
        traffic_density=road.traffic_volume or "Medium",
        rainfall=road.rainfall or "Moderate"
    )
    agent_res = maintenance_agent.analyze(
        risk_level=ml_res["risk_level"],
        risk_score=ml_res["risk_score"],
        pothole_count=road.pothole_count or 0,
        pothole_depth=road.average_pothole_depth_cm or 0.0,
        crack_length=road.total_crack_length_m or 0.0,
        road_age=road.pavement_age_years or 1.0,
        traffic_density=road.traffic_volume or "Medium",
        rainfall=road.rainfall or "Moderate",
        road_length=road.road_length_km or 1.0
    )

    pred = Prediction(
        road_id=road.id,
        road_name=road.road_name,
        state=road.state,
        district=road.district,
        city=road.city,
        location=road.city or road.district or road.state,
        latitude=road.latitude,
        longitude=road.longitude,
        road_length_km=road.road_length_km or 1.0,
        pothole_count=road.pothole_count or 0,
        average_pothole_depth_cm=road.average_pothole_depth_cm or 0.0,
        total_crack_length_m=road.total_crack_length_m or 0.0,
        pavement_age_years=road.pavement_age_years or 1.0,
        traffic_volume=road.traffic_volume or "Medium",
        rainfall=road.rainfall or "Moderate",
        pothole_depth=road.average_pothole_depth_cm or 0.0,
        crack_length=road.total_crack_length_m or 0.0,
        road_age=road.pavement_age_years or 1.0,
        traffic_density=road.traffic_volume or "Medium",
        road_length=road.road_length_km or 1.0,
        risk_level=ml_res["risk_level"],
        risk_score=ml_res["risk_score"],
        confidence=ml_res["confidence"],
        recommendation=agent_res["action"],
        priority=agent_res["priority"],
        urgency_score=agent_res["urgency_score"],
        ai_reasoning=agent_res["reason"],
        estimated_budget=agent_res["estimated_budget"]
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)

    return {
        "status": "success",
        "message": f"Successfully collected and verified road survey for '{road.road_name}' in SQLite.",
        "road_id": road.id,
        "prediction_id": pred.id,
        "risk_level": pred.risk_level,
        "risk_score": pred.risk_score,
        "verification_status": road.verification_status,
        "provenance": {
            "source_name": road.source_name,
            "source_url": road.source_url,
            "data_collection_method": road.data_collection_method
        }
    }

@router.post("/batch")
def collect_batch_surveys(req: BatchDataCollectionRequest, db: Session = Depends(get_db)):
    """Ingest multiple survey records in batch into SQLite with verification status."""
    inserted = 0
    for item in req.entries:
        road = Road(
            road_name=item.road_name.strip(),
            state=item.state,
            district=item.district,
            city=item.city or item.location,
            road_length_km=max(0.1, item.road_length_km or item.road_length or 1.0),
            pavement_age_years=max(0.0, item.pavement_age_years or item.road_age or 1.0),
            pothole_count=max(0, item.pothole_count or 0),
            average_pothole_depth_cm=max(0.0, item.average_pothole_depth_cm or item.pothole_depth or 0.0),
            total_crack_length_m=max(0.0, item.total_crack_length_m or item.crack_length or 0.0),
            surface_type=item.surface_type or "Bituminous Concrete",
            traffic_volume=item.traffic_volume or item.traffic_density or "Medium",
            rainfall=item.rainfall or "Moderate",
            damage_type=item.damage_type,
            latitude=item.latitude,
            longitude=item.longitude,
            source_name=item.source_name or "Batch Ingestion",
            source_url=item.source_url,
            source_date=item.source_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            data_collection_method=item.data_collection_method or "Batch CSV/Survey Feed",
            verification_status=item.verification_status or "Verified"
        )
        db.add(road)
        inserted += 1
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully ingested batch of {inserted} verified road condition records into SQLite.",
        "count": inserted
    }
