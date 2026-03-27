from typing import List, Dict
import logging

logger = logging.getLogger("pulsequeue")

EMERGENCY_WEIGHT = 35
SYMPTOM_WEIGHTS = {
    "chest pain": 30, "chest_pain": 30,
    "breathing difficulty": 28, "shortness of breath": 28,
    "loss of consciousness": 35,
    "severe headache": 20, "stroke": 35,
    "unconscious": 35, "seizure": 30,
    "high fever": 15, "fever": 8,
    "vomiting": 8, "nausea": 5,
    "dizziness": 10, "fatigue": 5,
    "swelling": 10, "edema": 10,
    "blurred vision": 12, "numbness": 12,
    "palpitations": 15, "heart": 20,
    "cough": 5, "cold": 3
}

DISEASE_RULES = [
    {
        "name": "Hypertensive Crisis",
        "conditions": lambda s, v, h: (
            (v.get("bp_systolic", 0) or 0) > 180 or (v.get("bp_diastolic", 0) or 0) > 120
        ),
        "confidence": lambda s, v, h: min(0.95, 0.6 + ((v.get("bp_systolic", 120) or 120) - 120) / 200)
    },
    {
        "name": "Cardiac Emergency",
        "conditions": lambda s, v, h: (
            any(k in s.lower() for k in ["chest pain", "chest_pain", "palpitation", "heart"]) and
            ((v.get("bp_systolic", 0) or 0) > 150 or (v.get("pulse", 0) or 0) > 100)
        ),
        "confidence": lambda s, v, h: 0.82
    },
    {
        "name": "Respiratory Distress",
        "conditions": lambda s, v, h: (
            any(k in s.lower() for k in ["breath", "breathing", "oxygen", "wheez"]) or
            (v.get("oxygen", 100) or 100) < 92
        ),
        "confidence": lambda s, v, h: min(0.88, 0.55 + max(0, (92 - (v.get("oxygen", 92) or 92)) / 30))
    },
    {
        "name": "Diabetic Emergency",
        "conditions": lambda s, v, h: (
            (v.get("blood_sugar", 0) or 0) > 300 or (v.get("blood_sugar", 999) or 999) < 60
        ),
        "confidence": lambda s, v, h: 0.85
    },
    {
        "name": "Fever / Infection",
        "conditions": lambda s, v, h: (
            (v.get("temperature", 0) or 0) > 101 or
            any(k in s.lower() for k in ["fever", "infection", "chills"])
        ),
        "confidence": lambda s, v, h: min(0.75, 0.45 + ((v.get("temperature", 99) or 99) - 99) / 20)
    },
    {
        "name": "Neurological Event",
        "conditions": lambda s, v, h: any(
            k in s.lower() for k in ["headache", "seizure", "numbness", "blurred", "stroke", "unconscious"]
        ),
        "confidence": lambda s, v, h: 0.70
    },
    {
        "name": "Musculoskeletal Pain",
        "conditions": lambda s, v, h: any(
            k in s.lower() for k in ["pain", "ache", "joint", "back", "muscle"]
        ) and not any(k in s.lower() for k in ["chest", "heart"]),
        "confidence": lambda s, v, h: 0.60
    },
    {
        "name": "General Assessment",
        "conditions": lambda s, v, h: True,
        "confidence": lambda s, v, h: 0.40
    }
]

def predict_diseases(symptoms: str, vitals: dict, medical_history: dict) -> List[dict]:
    results = []
    for rule in DISEASE_RULES:
        try:
            if rule["conditions"](symptoms, vitals, medical_history):
                conf = rule["confidence"](symptoms, vitals, medical_history)
                results.append({"name": rule["name"], "confidence": round(conf, 2)})
                if len(results) >= 3:
                    break
        except Exception as e:
            logger.warning(f"ML rule error: {e}")
    if not results:
        results.append({"name": "General Assessment", "confidence": 0.40})
    return sorted(results, key=lambda x: x["confidence"], reverse=True)[:3]
