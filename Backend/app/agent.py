from typing import Dict, Any

def format_inr(number: int) -> str:
    s = str(int(number))
    if len(s) <= 3:
        return f"₹{s}"
    last_three = s[-3:]
    remaining = s[:-3]
    parts = []
    while len(remaining) > 2:
        parts.insert(0, remaining[-2:])
        remaining = remaining[:-2]
    if remaining:
        parts.insert(0, remaining)
    return f"₹{','.join(parts)},{last_three}"

class MaintenanceAgent:
    """
    Agentic AI Decision Engine for Civil Infrastructure Maintenance.
    Evaluates multi-modal damage telemetry, traffic degradation risk, and weather patterns
    to synthesize prescriptive engineering repairs, urgency rankings, and budgetary estimates.
    """

    def analyze(
        self,
        risk_level: str,
        risk_score: float,
        pothole_count: int,
        pothole_depth: float,
        crack_length: float,
        road_age: float,
        traffic_density: str,
        rainfall: str,
        road_length: float = 1.0
    ) -> Dict[str, Any]:
        
        # 1. Determine Urgency and Priority
        if risk_level == "Critical Risk" or risk_score >= 85:
            priority = "Immediate"
            inspection_timeline = "Within 24 - 48 hours"
            base_urgency = 90.0 + min(10.0, (risk_score - 85) * 0.6)
            safety_hazard = "CRITICAL HAZARD - Severe risk of vehicle tire blowout, axle fracture, and accident escalation."
        elif risk_level == "High Risk" or risk_score >= 60:
            priority = "High"
            inspection_timeline = "Within 7 calendar days"
            base_urgency = 65.0 + min(20.0, (risk_score - 60) * 0.8)
            safety_hazard = "ELEVATED HAZARD - Structural fatigue present; high probability of rapid damage spread."
        elif risk_level == "Medium Risk" or risk_score >= 35:
            priority = "Medium"
            inspection_timeline = "Within 30 calendar days"
            base_urgency = 35.0 + (risk_score - 35) * 0.8
            safety_hazard = "MODERATE CONCERN - Surface distress detected; ride quality and water resistance compromised."
        else:
            priority = "Routine"
            inspection_timeline = "Quarterly routine cycle (90 days)"
            base_urgency = max(5.0, risk_score * 0.8)
            safety_hazard = "MINIMAL HAZARD - Pavement integrity is within standard operational safety tolerances."

        # Urgency adjustment based on traffic exposure
        traffic_boost = {"Low": -5.0, "Medium": 0.0, "High": 5.0, "Very High": 10.0}.get(traffic_density, 0.0)
        rain_boost = {"Light": -2.0, "Moderate": 0.0, "Heavy": 4.0, "Torrential": 8.0}.get(rainfall, 0.0)
        
        urgency_score = round(min(100.0, max(5.0, base_urgency + traffic_boost + rain_boost)), 1)

        # 2. Prescribe Specific Engineering Action
        actions = []
        if pothole_count >= 15 or pothole_depth >= 8.0:
            actions.append("Full-depth asphalt milling and hot-mix patching (HMA Grade II)")
        elif pothole_count > 0:
            actions.append("Cold-pour bitumen edge-seal and infrared pothole compaction")
            
        if crack_length >= 50.0:
            actions.append("Polymer-modified asphalt crack routing, injection sealing, and micro-surfacing")
        elif crack_length > 10.0:
            actions.append("High-penetration bituminous emulsion crack sealing")
            
        if road_age >= 10.0:
            actions.append("Sub-base core sampling and structural overlay reinforcement")
            
        if rainfall in ["Heavy", "Torrential"]:
            actions.append("Shoulder drainage clearing and storm runoff channelization")
            
        if not actions:
            actions.append("Preventive seal coating and standard scheduled monitoring")

        action_summary = " + ".join(actions)

        # 3. Transparent Step-by-Step AI Reasoning Synthesis
        reason_clauses = []
        if pothole_count > 0:
            reason_clauses.append(f"{pothole_count} surface craters with depths reaching {pothole_depth} cm")
        if crack_length > 0:
            reason_clauses.append(f"{crack_length} m of interconnected linear fatigue cracking")
        if road_age > 5:
            reason_clauses.append(f"pavement age of {road_age} years exceeding mid-life threshold")
        if traffic_density in ["High", "Very High"]:
            reason_clauses.append(f"{traffic_density.lower()} vehicular load amplifying axle impact stresses")
        if rainfall in ["Heavy", "Torrential"]:
            reason_clauses.append(f"{rainfall.lower()} precipitation accelerating sub-surface water infiltration and hydraulic erosion")

        reasoning_text = (
            f"Road evaluated at {risk_level} (Score: {risk_score}/100). Primary distress drivers include: "
            + "; ".join(reason_clauses) + ". "
            + f"AI Recommendation: Prioritize as [{priority.upper()}] with {inspection_timeline} due to risk of accelerated sub-grade failure under {traffic_density.lower()} traffic conditions."
        )

        # 4. Budget Estimation in Indian Rupees (INR ₹)
        length = max(0.5, road_length)
        if risk_level == "Critical Risk":
            min_cost = int(length * 450000)
            max_cost = int(length * 950000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)} (Deep Mill & Overlay)"
        elif risk_level == "High Risk":
            min_cost = int(length * 220000)
            max_cost = int(length * 480000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)} (Targeted Asphalt Patching)"
        elif risk_level == "Medium Risk":
            min_cost = int(length * 85000)
            max_cost = int(length * 190000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)} (Crack Injection & Seal)"
        else:
            min_cost = int(length * 25000)
            max_cost = int(length * 60000)
            budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)} (Preventive Maintenance)"

        return {
            "priority": priority,
            "urgency_score": urgency_score,
            "action": action_summary,
            "reason": reasoning_text,
            "safety_hazard": safety_hazard,
            "estimated_budget": budget_str,
            "inspection_timeline": inspection_timeline
        }

maintenance_agent = MaintenanceAgent()
