def decide_priority(risk_score: float, emergency_flags: dict) -> str:
    if (emergency_flags.get("chest_pain") or
        emergency_flags.get("breathing_difficulty") or
        emergency_flags.get("loss_of_consciousness")):
        return "HIGH"
    if risk_score >= 70:
        return "HIGH"
    elif risk_score >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def get_rule_reasoning(risk_score: float, priority: str, vitals: dict, emergency_flags: dict, medical_history: dict) -> list:
    factors = []
    if emergency_flags.get("chest_pain"):
        factors.append("Emergency: Chest pain reported")
    if emergency_flags.get("breathing_difficulty"):
        factors.append("Emergency: Breathing difficulty reported")
    if emergency_flags.get("loss_of_consciousness"):
        factors.append("Emergency: Loss of consciousness reported")
    bp_sys = vitals.get("bp_systolic") or 0
    if bp_sys > 180:
        factors.append(f"Critical hypertension: BP {bp_sys} mmHg")
    elif bp_sys > 160:
        factors.append(f"Elevated blood pressure: {bp_sys} mmHg")
    sugar = vitals.get("blood_sugar") or 0
    if sugar > 300:
        factors.append(f"Dangerously high blood sugar: {sugar} mg/dL")
    elif sugar < 60 and sugar > 0:
        factors.append(f"Critically low blood sugar: {sugar} mg/dL")
    oxygen = vitals.get("oxygen") or 100
    if oxygen < 92:
        factors.append(f"Low oxygen saturation: {oxygen}%")
    if medical_history.get("heart_disease"):
        factors.append("Pre-existing heart disease increases risk")
    if medical_history.get("diabetes"):
        factors.append("Diabetic history noted")
    if not factors:
        factors.append(f"Risk score {risk_score} indicates {priority.lower()} priority")
    return factors
