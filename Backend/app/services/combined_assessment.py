import sys
from typing import Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from ..agent import format_inr


def synthesize_combined_road_assessment(
    tabular_risk: str,
    tabular_risk_score: float,
    image_damage: Optional[str] = None,
    image_confidence: Optional[float] = None,
    road_length: float = 1.0,
    traffic_density: str = "Medium",
    rainfall: str = "Moderate",
    pothole_count: int = 0,
    pothole_depth: float = 0.0,
    crack_length: float = 0.0,
    road_age: float = 1.0
) -> Dict[str, Any]:
    """
    Transparent Decision Layer synthesizing Tabular Random Forest Risk & CNN Image Detection.
    Follows deterministic civil infrastructure maintenance standards (IRC:82 / MoRTH).
    """
    img_dmg = image_damage or "No Image Provided"
    img_conf = float(image_confidence or 0.0)
    length = max(0.5, float(road_length))

    # 1. Deterministic Decision Matrix Evaluation
    reasons = []
    
    if img_dmg == "Severe Road Damage" and img_conf >= 0.55:
        # Visual confirmation of deep multi-void failure overrides lower historical tabular rating
        final_risk = "Critical Risk"
        final_score = max(88.0, tabular_risk_score + 15.0)
        reasons.append(f"Visual CNN Model detected Severe Road Damage with {img_conf*100:.1f}% confidence, indicating acute structural distress")
    elif img_dmg == "Pothole" and img_conf >= 0.55:
        if tabular_risk in ["Critical Risk", "High Risk"]:
            final_risk = tabular_risk
            final_score = max(72.0, tabular_risk_score)
        else:
            final_risk = "High Risk"
            final_score = max(62.0, tabular_risk_score + 12.0)
        reasons.append(f"Visual CNN Model verified localized Pothole cavitation (Confidence: {img_conf*100:.1f}%)")
    elif img_dmg == "Crack" and img_conf >= 0.55:
        if tabular_risk == "Critical Risk":
            final_risk = "Critical Risk"
            final_score = tabular_risk_score
        elif tabular_risk == "High Risk":
            final_risk = "High Risk"
            final_score = tabular_risk_score
        else:
            final_risk = "Medium Risk"
            final_score = max(45.0, tabular_risk_score + 8.0)
        reasons.append(f"Visual CNN Model identified surface Fissure / Cracking patterns (Confidence: {img_conf*100:.1f}%)")
    elif img_dmg == "Normal Road" and img_conf >= 0.60:
        if tabular_risk == "Low Risk":
            final_risk = "Low Risk"
            final_score = min(25.0, tabular_risk_score)
            reasons.append("Visual CNN Model confirmed Optimal Surface Integrity with zero detected craters")
        else:
            # Pavement surface looks intact optically, but tabular model detects high age or sub-base wear
            final_risk = tabular_risk
            final_score = tabular_risk_score
            reasons.append(f"Visual surface appears normal, but tabular telemetry reflects underlying sub-base fatigue ({tabular_risk})")
    else:
        # Image is uncertain, unconfident, or not provided -> pure tabular model authority
        final_risk = tabular_risk
        final_score = tabular_risk_score
        if img_dmg != "No Image Provided":
            reasons.append(f"Image damage detection was uncertain ({img_dmg}); evaluation deferred to verified Tabular Random Forest telemetry")
        else:
            reasons.append(f"Evaluated directly from Tabular Random Forest telemetry ({tabular_risk})")

    final_score = round(min(100.0, max(5.0, final_score)), 1)

    # 2. Priority, Urgency & Safety Hazard
    if final_risk == "Critical Risk":
        priority = "Immediate"
        timeline = "Within 24 - 48 hours"
        safety_hazard = "CRITICAL HAZARD - Severe risk of vehicle tire blowout, axle damage, and traffic disruption."
        actions = ["Full-depth asphalt milling and hot-mix patching (HMA Grade II)", "Sub-base stabilization and urgent warning signage"]
        min_cost = int(length * 450000)
        max_cost = int(length * 950000)
        scope_str = "Deep Mill & Structural Overlay"
    elif final_risk == "High Risk":
        priority = "High"
        timeline = "Within 7 calendar days"
        safety_hazard = "ELEVATED HAZARD - Structural fatigue present; rapid crater expansion likely under monsoon/traffic load."
        actions = ["Targeted infrared pothole compaction and cold-pour bitumen edge-sealing", "Polymer crack routing and injection"]
        min_cost = int(length * 220000)
        max_cost = int(length * 480000)
        scope_str = "Targeted Asphalt Patching & Crack Seal"
    elif final_risk == "Medium Risk":
        priority = "Medium"
        timeline = "Within 30 calendar days"
        safety_hazard = "MODERATE CONCERN - Surface distress detected; ride quality and water resistance compromised."
        actions = ["High-penetration bituminous emulsion crack sealing", "Shoulder runoff channelization"]
        min_cost = int(length * 85000)
        max_cost = int(length * 190000)
        scope_str = "Preventive Crack Injection & Surface Seal"
    else:
        priority = "Routine"
        timeline = "Quarterly routine cycle (90 days)"
        safety_hazard = "MINIMAL HAZARD - Pavement integrity is within standard operational safety tolerances."
        actions = ["Preventive seal coating and standard scheduled monitoring"]
        min_cost = int(length * 25000)
        max_cost = int(length * 60000)
        scope_str = "Routine Preventive Monitoring"

    recommendation_text = " + ".join(actions)
    budget_str = f"{format_inr(min_cost)} - {format_inr(max_cost)} ({scope_str})"

    # 3. Transparent Synthesis Narrative
    synthesis_narrative = (
        f"Multi-Modal Assessment Synthesis: Tabular Random Forest evaluated condition as [{tabular_risk}] (Score: {tabular_risk_score}/100). "
        + f"Image Recognition Model identified [{img_dmg}] (Confidence: {img_conf*100:.1f}%). "
        + "Decision Logic: " + "; ".join(reasons) + ". "
        + f"Final Risk Classification: [{final_risk.upper()}] with [{priority.upper()}] maintenance priority ({timeline})."
    )

    return {
        "tabular_risk": tabular_risk,
        "tabular_risk_score": tabular_risk_score,
        "image_damage": img_dmg,
        "image_confidence": img_conf,
        "final_risk": final_risk,
        "final_risk_score": final_score,
        "priority": priority,
        "inspection_timeline": timeline,
        "recommendation": recommendation_text,
        "safety_hazard": safety_hazard,
        "estimated_budget": budget_str,
        "decision_rationale": synthesis_narrative
    }
