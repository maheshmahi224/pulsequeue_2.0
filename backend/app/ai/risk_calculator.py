import logging

logger = logging.getLogger("pulsequeue")

def calculate_risk_score(age: int, vitals: dict, symptoms: str, emergency_flags: dict, medical_history: dict) -> float:
    score = 0.0

    # Emergency flags
    if emergency_flags.get("chest_pain") or emergency_flags.get("loss_of_consciousness"):
        score += 35
    if emergency_flags.get("breathing_difficulty"):
        score += 28

    # Vitals scoring
    bp_sys = vitals.get("bp_systolic") or 0
    bp_dia = vitals.get("bp_diastolic") or 0
    sugar = vitals.get("blood_sugar") or 0
    pulse = vitals.get("pulse") or 0
    temp = vitals.get("temperature") or 0
    oxygen = vitals.get("oxygen") or 100

    if bp_sys > 180:
        score += 25
    elif bp_sys > 160:
        score += 20
    elif bp_sys > 140:
        score += 10

    if bp_dia > 120:
        score += 15
    elif bp_dia > 100:
        score += 8

    if sugar > 400:
        score += 20
    elif sugar > 300:
        score += 15
    elif sugar < 60 and sugar > 0:
        score += 20

    if oxygen < 88:
        score += 20
    elif oxygen < 92:
        score += 15
    elif oxygen < 95:
        score += 8

    if pulse > 150 or pulse < 40:
        score += 15
    elif pulse > 120 or pulse < 50:
        score += 8

    if temp > 104:
        score += 15
    elif temp > 102:
        score += 8
    elif temp > 101:
        score += 4

    # Age risk
    if age > 70:
        score += 10
    elif age > 60:
        score += 7
    elif age > 50:
        score += 4

    # Medical history
    if medical_history.get("heart_disease"):
        score += 10
    if medical_history.get("hypertension"):
        score += 6
    if medical_history.get("diabetes"):
        score += 5
    if medical_history.get("asthma"):
        score += 4

    # Symptoms keywords
    sym_lower = symptoms.lower()
    if "chest pain" in sym_lower or "chest_pain" in sym_lower:
        score += 20
    if "unconscious" in sym_lower or "seizure" in sym_lower:
        score += 25
    if "severe" in sym_lower:
        score += 8

    return min(round(score, 1), 100.0)
