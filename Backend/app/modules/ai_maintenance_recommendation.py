import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Road, Prediction
from ..schemas import PriorityRoadItem
from ..agent import maintenance_agent, format_inr
from ..ml_engine import ml_engine

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

router = APIRouter(prefix="/api/modules/maintenance-recommendation", tags=["5. AI Maintenance Recommendation Module"])

@router.get("/rules")
def get_recommendation_rules():
    """Returns the expert engineering rule base used by the AI Maintenance Recommendation Module."""
    return {
        "module": "5. AI Maintenance Recommendation Module",
        "engineering_standards": "IRC (Indian Roads Congress) & MoRTH Civil Engineering Maintenance Standards",
        "intervention_matrix": [
            {
                "condition": "Potholes >= 15 OR Depth >= 8cm",
                "prescribed_action": "Full-depth asphalt milling and hot-mix patching (HMA Grade II)",
                "urgency_class": "Immediate (24-48 hours)"
            },
            {
                "condition": "Linear Cracks >= 50m",
                "prescribed_action": "Polymer-modified asphalt crack routing, injection sealing, and micro-surfacing",
                "urgency_class": "High Priority (Within 7 days)"
            },
            {
                "condition": "Pavement Age >= 10 years",
                "prescribed_action": "Sub-base core sampling and structural overlay reinforcement",
                "urgency_class": "High Priority (Within 7-14 days)"
            },
            {
                "condition": "Heavy / Torrential Rainfall",
                "prescribed_action": "Shoulder drainage clearing and storm runoff channelization",
                "urgency_class": "Medium Priority (Within 30 days)"
            },
            {
                "condition": "Minor surface wear",
                "prescribed_action": "Preventive seal coating and routine monitoring",
                "urgency_class": "Routine (Quarterly 90 days)"
            }
        ]
    }

@router.post("/recommend")
def generate_maintenance_recommendation(
    risk_level: str,
    risk_score: float,
    pothole_count: int,
    pothole_depth: float,
    crack_length: float,
    road_age: float,
    traffic_density: str = "Medium",
    rainfall: str = "Moderate",
    road_length: float = 1.0
):
    """Generate prescriptive AI civil engineering maintenance recommendation."""
    rec = maintenance_agent.analyze(
        risk_level=risk_level,
        risk_score=risk_score,
        pothole_count=pothole_count,
        pothole_depth=pothole_depth,
        crack_length=crack_length,
        road_age=road_age,
        traffic_density=traffic_density,
        rainfall=rainfall,
        road_length=road_length
    )
    return rec

@router.get("/prioritized-queue", response_model=List[PriorityRoadItem])
def get_maintenance_queue(
    location: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Ranks all road network corridors in SQLite descending by urgency score and risk score.
    """
    roads = db.query(Road).all()
    queue = []
    
    for road in roads:
        loc_str = road.city or road.district or road.state or "India"
        if location and location != "All" and location.lower() not in (road.city or "").lower() and location.lower() not in (road.state or "").lower():
            continue

        latest_pred = db.query(Prediction).filter(Prediction.road_id == road.id).order_by(desc(Prediction.prediction_date)).first()
        
        risk_lvl = latest_pred.risk_level if latest_pred else (road.risk_level or "Medium Risk")
        risk_scr = latest_pred.risk_score if latest_pred else 50.0
        urgency_scr = latest_pred.urgency_score if latest_pred else 50.0
        prio = latest_pred.priority if latest_pred else "Routine"
        action = latest_pred.recommendation if latest_pred else "Inspection Recommended"
        budget = latest_pred.estimated_budget if latest_pred else "₹1,50,000 - ₹3,50,000"
        last_dt = latest_pred.prediction_date if latest_pred else (road.updated_at or datetime.now(timezone.utc))
        confidence = latest_pred.confidence if latest_pred else 85.0
        ai_reason = latest_pred.ai_reasoning if latest_pred else None
        
        potholes = latest_pred.pothole_count if latest_pred else (road.pothole_count or 0)
        depth = latest_pred.average_pothole_depth_cm if (latest_pred and latest_pred.average_pothole_depth_cm is not None) else (road.average_pothole_depth_cm or 0.0)
        cracks = latest_pred.total_crack_length_m if (latest_pred and latest_pred.total_crack_length_m is not None) else (road.total_crack_length_m or 0.0)
        age = latest_pred.pavement_age_years if (latest_pred and latest_pred.pavement_age_years is not None) else (road.pavement_age_years or 1.0)
        traffic = latest_pred.traffic_volume if latest_pred else (road.traffic_volume or "Medium")
        rain = latest_pred.rainfall if latest_pred else (road.rainfall or "Moderate")

        if priority and priority != "All" and prio != priority:
            continue

        queue.append({
            "road_id": road.id,
            "road_name": road.road_name,
            "state": road.state,
            "district": road.district,
            "city": road.city,
            "location": loc_str,
            "road_length": road.road_length_km or 1.0,
            "road_length_km": road.road_length_km or 1.0,
            "road_age": age,
            "pavement_age_years": age,
            "pothole_count": potholes,
            "pothole_depth": depth,
            "average_pothole_depth_cm": depth,
            "crack_length": cracks,
            "total_crack_length_m": cracks,
            "surface_type": road.surface_type,
            "traffic_density": traffic,
            "traffic_volume": traffic,
            "rainfall": rain,
            "risk_level": risk_lvl,
            "risk_score": risk_scr,
            "confidence": confidence,
            "urgency_score": urgency_scr,
            "priority": prio,
            "action": action,
            "recommendation": action,
            "estimated_budget": budget,
            "ai_reasoning": ai_reason,
            "verification_status": road.verification_status or "Verified",
            "source_name": road.source_name,
            "source_url": road.source_url,
            "last_assessed": last_dt
        })

    # Sort descending by Urgency Score and Risk Score
    queue.sort(key=lambda x: (x["urgency_score"], x["risk_score"]), reverse=True)

    ranked_queue = []
    for idx, item in enumerate(queue, start=1):
        item["rank"] = idx
        ranked_queue.append(item)

    return ranked_queue

@router.post("/budget-optimizer")
def optimize_maintenance_budget(
    total_budget_lakhs: float = 50.0,
    db: Session = Depends(get_db)
):
    """
    Optimizes allocation of municipal maintenance budget to maximize road network safety index.
    """
    queue = get_maintenance_queue(None, None, db)
    total_budget_inr = total_budget_lakhs * 100000
    allocated = 0
    selected_corridors = []
    deferred_corridors = []

    for item in queue:
        approx_cost = 250000
        length = item.get("road_length_km") or 1.0
        if "Critical" in item["risk_level"]:
            approx_cost = int(length * 650000)
        elif "High" in item["risk_level"]:
            approx_cost = int(length * 350000)
        elif "Medium" in item["risk_level"]:
            approx_cost = int(length * 120000)
        else:
            approx_cost = int(length * 40000)

        if allocated + approx_cost <= total_budget_inr:
            allocated += approx_cost
            selected_corridors.append({
                **item,
                "allocated_cost_inr": format_inr(approx_cost),
                "funding_status": "Funded - Immediate Dispatch"
            })
        else:
            deferred_corridors.append({
                **item,
                "estimated_cost_inr": format_inr(approx_cost),
                "funding_status": "Deferred to Next Fiscal Cycle"
            })

    return {
        "total_budget_limit": format_inr(int(total_budget_inr)),
        "total_allocated": format_inr(int(allocated)),
        "remaining_surplus": format_inr(int(total_budget_inr - allocated)),
        "funded_count": len(selected_corridors),
        "deferred_count": len(deferred_corridors),
        "funded_corridors": selected_corridors,
        "deferred_corridors": deferred_corridors
    }
