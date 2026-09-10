"""
GlucoSense: Insulin-Aware Glycemic Risk Assessment Engine
Combines published clinical biometric indices (LBGI, HBGI, Kovatchev et al.)
with glucose rate-of-change and optional insulin telemetry to compute
a transparent glycemic risk indicator.

IMPORTANT MEDICAL DISCLAIMER:
Research prototype / decision-support indicator; not a certified medical diagnosis.
Do not use to adjust insulin dosages or replace physician guidance.
"""

import math
import numpy as np
from typing import Dict, Any, List, Optional, Union


def kovatchev_risk(glucose_mg_dl: float) -> tuple:
    """
    Computes Kovatchev symmetric transformation and directional risk components:
    f(G) = 1.509 * ((ln(G))^1.084 - 5.381)
    r(G) = 10 * (f(G))^2
    Returns: (f_G, rl_G, rh_G)
    """
    g = max(20.0, min(600.0, float(glucose_mg_dl)))
    try:
        f_g = 1.509 * (math.pow(math.log(g), 1.084) - 5.381)
        r_g = 10.0 * math.pow(f_g, 2)
    except Exception:
        f_g = 0.0
        r_g = 0.0

    rl_g = r_g if f_g < 0 else 0.0 # Hypoglycemia component
    rh_g = r_g if f_g > 0 else 0.0 # Hyperglycemia component
    return f_g, rl_g, rh_g


def compute_lbgi_hbgi(readings: List[float]) -> Dict[str, float]:
    """
    Computes Low Blood Glucose Index (LBGI) and High Blood Glucose Index (HBGI)
    across a sequence of CGM readings.
    """
    if not readings:
        return {"lbgi": 0.0, "hbgi": 0.0, "mean": 100.0, "std": 0.0, "cv": 0.0}

    valid_vals = [float(v) for v in readings if v is not None and not np.isnan(v)]
    if not valid_vals:
        return {"lbgi": 0.0, "hbgi": 0.0, "mean": 100.0, "std": 0.0, "cv": 0.0}

    rl_list = []
    rh_list = []
    for g in valid_vals:
        _, rl, rh = kovatchev_risk(g)
        rl_list.append(rl)
        rh_list.append(rh)

    lbgi = float(np.mean(rl_list))
    hbgi = float(np.mean(rh_list))
    mean_g = float(np.mean(valid_vals))
    std_g = float(np.std(valid_vals))
    cv = float((std_g / mean_g * 100.0) if mean_g > 0 else 0.0)

    return {
        "lbgi": round(lbgi, 2),
        "hbgi": round(hbgi, 2),
        "mean": round(mean_g, 1),
        "std": round(std_g, 1),
        "cv": round(cv, 1)
    }


def assess_glycemic_risk(
    glucose_readings: List[float],
    fasting_insulin_uU_ml: Optional[float] = None,
    hba1c: Optional[float] = None,
    bmi: Optional[float] = None,
    current_glucose: Optional[float] = None,
    blood_pressure_systolic: Optional[float] = None,
    blood_pressure_diastolic: Optional[float] = None,
    physical_activity: Optional[str] = None,
    dietary_habit: Optional[str] = None,
    carb_intake_g: Optional[float] = None
) -> Dict[str, Any]:
    """
    Evaluates multi-factor insulin-aware glycemic risk integrating:
    1. LBGI / HBGI indices (Kovatchev et al.)
    2. Rate of glucose change
    3. Insulin concentration & resistance modifier
    4. Blood pressure & cardiovascular metabolic strain
    5. Physical activity level & individualized dietary behavior (Paper Sec. IV.A & IV.F)
    """
    if not glucose_readings and current_glucose is not None:
        glucose_readings = [current_glucose]

    if not glucose_readings:
        return {
            "risk_level": "Unknown",
            "risk_score": 0.0,
            "lbgi": 0.0,
            "hbgi": 0.0,
            "hypo_risk": "Low",
            "hyper_risk": "Low",
            "insulin_aware": False,
            "clinical_notes": ["Insufficient CGM data provided."],
            "disclaimer": "Research prototype / decision-support indicator; not a medical diagnosis."
        }

    cgm_stats = compute_lbgi_hbgi(glucose_readings)
    lbgi = cgm_stats["lbgi"]
    hbgi = cgm_stats["hbgi"]
    mean_g = cgm_stats["mean"]
    std_g = cgm_stats["std"]
    cv = cgm_stats["cv"]

    # Rate of change over recent points
    rate_of_change = 0.0
    if len(glucose_readings) >= 2:
        # Assuming 5-minute intervals between consecutive readings
        rate_of_change = (glucose_readings[-1] - glucose_readings[-2]) / 5.0 # mg/dL per min

    # Baseline risk score from LBGI and HBGI
    # LBGI heavily weighted as hypoglycemia represents immediate clinical hazard
    base_score = (lbgi * 7.5) + (hbgi * 4.5)

    # Hypoglycemia sub-risk category (Kovatchev criteria)
    if lbgi > 5.0 or (glucose_readings and glucose_readings[-1] < 70):
        hypo_risk = "High"
        base_score += 15.0
    elif lbgi > 2.5 or (rate_of_change < -1.5 and glucose_readings[-1] < 90):
        hypo_risk = "Moderate"
        base_score += 8.0
    else:
        hypo_risk = "Low"

    # Hyperglycemia sub-risk category
    if hbgi > 9.0 or (glucose_readings and glucose_readings[-1] > 250):
        hyper_risk = "High"
        base_score += 12.0
    elif hbgi > 4.5 or (rate_of_change > 1.5 and glucose_readings[-1] > 180):
        hyper_risk = "Moderate"
        base_score += 6.0
    else:
        hyper_risk = "Low"

    # Insulin modifier
    insulin_aware = False
    insulin_notes = []
    if fasting_insulin_uU_ml is not None and fasting_insulin_uU_ml > 0:
        insulin_aware = True
        # Reference normal fasting insulin: 2.6 - 24.9 uIU/mL
        if fasting_insulin_uU_ml > 25.0:
            base_score += 10.0
            insulin_notes.append(f"Elevated fasting insulin ({fasting_insulin_uU_ml} uIU/mL) indicates metabolic insulin resistance.")
        elif fasting_insulin_uU_ml < 3.0 and mean_g > 140:
            base_score += 15.0
            insulin_notes.append(f"Hypoinsulinemia ({fasting_insulin_uU_ml} uIU/mL) relative to elevated glucose signals impaired beta-cell secretion.")
        else:
            insulin_notes.append(f"Fasting insulin within standard baseline range ({fasting_insulin_uU_ml} uIU/mL).")

    # Glycemic variability modifier
    if cv > 36.0: # Consensus guideline: CV > 36% indicates unstable glycemic control
        base_score += 8.0
        insulin_notes.append(f"High glycemic coefficient of variation ({cv}%) indicates elevated glucose instability.")

    # Blood Pressure / Cardiovascular Modifier (Paper Section I, IV.A)
    bp_notes = []
    if blood_pressure_systolic is not None and blood_pressure_diastolic is not None:
        if blood_pressure_systolic >= 140 or blood_pressure_diastolic >= 90:
            base_score += 8.0
            bp_notes.append(f"Stage 2 Hypertension ({int(blood_pressure_systolic)}/{int(blood_pressure_diastolic)} mmHg) exacerbates diabetic vascular risk.")
        elif blood_pressure_systolic >= 130 or blood_pressure_diastolic >= 80:
            base_score += 4.0
            bp_notes.append(f"Stage 1 Hypertension ({int(blood_pressure_systolic)}/{int(blood_pressure_diastolic)} mmHg) signals vascular metabolic strain.")
        else:
            bp_notes.append(f"Blood pressure ({int(blood_pressure_systolic)}/{int(blood_pressure_diastolic)} mmHg) within healthy clinical limits.")

    # Lifestyle & Physical Activity Modifier (Paper Section IV.A & IV.F)
    lifestyle_notes = []
    if physical_activity:
        act = physical_activity.lower()
        if act == "sedentary":
            base_score += 6.0
            lifestyle_notes.append("Sedentary physical activity level compounds peripheral insulin resistance.")
        elif act in ["active", "vigorous"]:
            base_score = max(0.0, base_score - 4.0)
            lifestyle_notes.append("Regular physical activity promotes muscle GLUT4 translocation and glycemic clearance.")
        elif act == "light":
            base_score += 2.0
            lifestyle_notes.append("Light activity detected; recommend progressing to 150 min/week moderate aerobic training.")

    # Individualized Dietary Habit Modifier (Paper Section IV.A & IV.F)
    diet_notes = []
    if dietary_habit:
        d = dietary_habit.lower()
        if d in ["high_carb", "processed"]:
            base_score += 6.0
            diet_notes.append("High-carbohydrate / high-glycemic dietary habit exacerbates post-meal excursions.")
        elif d in ["low_carb", "mediterranean", "balanced"]:
            base_score = max(0.0, base_score - 3.0)
            diet_notes.append(f"{dietary_habit.replace('_', ' ').title()} dietary pattern provides favorable glycemic buffering.")

    final_score = max(0.0, min(100.0, round(base_score, 1)))

    if final_score >= 50.0:
        risk_level = "High Risk"
    elif final_score >= 25.0:
        risk_level = "Moderate Risk"
    else:
        risk_level = "Low Risk"

    clinical_notes = []
    if hypo_risk == "High":
        clinical_notes.append("Acute hypoglycemia risk detected. Consider rapid-acting carbohydrate ingestion.")
    if hyper_risk == "High":
        clinical_notes.append("Marked hyperglycemia trajectory observed. Review postprandial protocols.")
    clinical_notes.extend(insulin_notes)
    clinical_notes.extend(bp_notes)
    clinical_notes.extend(lifestyle_notes)
    clinical_notes.extend(diet_notes)
    if not clinical_notes:
        clinical_notes.append("Glycemic telemetry stable within normal physiological boundaries.")

    return {
        "risk_level": risk_level,
        "risk_score": final_score,
        "lbgi": lbgi,
        "hbgi": hbgi,
        "mean_glucose": mean_g,
        "std_dev": std_g,
        "coefficient_variation": cv,
        "rate_of_change": round(rate_of_change, 2),
        "hypo_risk": hypo_risk,
        "hyper_risk": hyper_risk,
        "insulin_aware": insulin_aware,
        "fasting_insulin": fasting_insulin_uU_ml,
        "clinical_notes": clinical_notes,
        "disclaimer": "Research prototype / decision-support indicator; not a medical diagnosis."
    }
