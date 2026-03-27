"""
Seed demo data for PulseQueue - Telugu/Indian patient names
Run: python seed_data.py (from backend/ directory)
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import uuid
import random

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "pulsequeue")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def utcnow():
    return datetime.now(timezone.utc)

PATIENTS = [
    {"name": "Venkata Ramaiah Naidu", "age": 65, "gender": "male", "phone": "9848012345", "email": "vramaiah@mail.com",
     "symptoms": "Severe chest pain radiating to left arm, shortness of breath, sweating",
     "emergency": {"chest_pain": True, "breathing_difficulty": True, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 185, "bp_diastolic": 115, "blood_sugar": 180, "temperature": 98.6, "pulse": 118, "oxygen": 89},
     "history": {"diabetes": True, "hypertension": True, "heart_disease": True, "asthma": False}},

    {"name": "Lakshmi Devi Reddy", "age": 52, "gender": "female", "phone": "9848023456", "email": "ldreddy@mail.com",
     "symptoms": "Severe headache, blurred vision, nausea, dizziness",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 175, "bp_diastolic": 108, "blood_sugar": 220, "temperature": 99.1, "pulse": 95, "oxygen": 96},
     "history": {"diabetes": True, "hypertension": True, "heart_disease": False, "asthma": False}},

    {"name": "Subrahmanyam Rao Pillai", "age": 70, "gender": "male", "phone": "9848034567", "email": "srao@mail.com",
     "symptoms": "Difficulty breathing, wheezing, chest tightness",
     "emergency": {"chest_pain": False, "breathing_difficulty": True, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 145, "bp_diastolic": 92, "blood_sugar": 140, "temperature": 100.2, "pulse": 105, "oxygen": 91},
     "history": {"diabetes": False, "hypertension": True, "heart_disease": False, "asthma": True}},

    {"name": "Padmavathi Krishnamurthy", "age": 45, "gender": "female", "phone": "9848045678", "email": "padmak@mail.com",
     "symptoms": "High fever, body aches, severe fatigue, headache",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 118, "bp_diastolic": 78, "blood_sugar": 95, "temperature": 103.5, "pulse": 102, "oxygen": 97},
     "history": {"diabetes": False, "hypertension": False, "heart_disease": False, "asthma": False}},

    {"name": "Hanumantha Reddy Goud", "age": 58, "gender": "male", "phone": "9848056789", "email": "hgoud@mail.com",
     "symptoms": "Sudden loss of consciousness briefly, confusion, slurred speech",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": True},
     "vitals": {"bp_systolic": 168, "bp_diastolic": 102, "blood_sugar": 380, "temperature": 98.8, "pulse": 88, "oxygen": 95},
     "history": {"diabetes": True, "hypertension": True, "heart_disease": False, "asthma": False}},

    {"name": "Saraswathi Ananthakrishnan", "age": 38, "gender": "female", "phone": "9848067890", "email": "santha@mail.com",
     "symptoms": "Mild fever, sore throat, runny nose, mild cough",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 112, "bp_diastolic": 72, "blood_sugar": 88, "temperature": 100.8, "pulse": 82, "oxygen": 98},
     "history": {"diabetes": False, "hypertension": False, "heart_disease": False, "asthma": False}},

    {"name": "Narasimha Murthy Vemula", "age": 72, "gender": "male", "phone": "9848078901", "email": "nmvemula@mail.com",
     "symptoms": "Swollen ankles, difficulty walking, fatigue, shortness of breath on exertion",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 155, "bp_diastolic": 95, "blood_sugar": 165, "temperature": 98.4, "pulse": 92, "oxygen": 93},
     "history": {"diabetes": True, "hypertension": True, "heart_disease": True, "asthma": False}},

    {"name": "Bharathi Sundararajan", "age": 29, "gender": "female", "phone": "9848089012", "email": "bsundar@mail.com",
     "symptoms": "Stomach pain, vomiting, diarrhea, mild dehydration",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 108, "bp_diastolic": 68, "blood_sugar": 82, "temperature": 101.2, "pulse": 96, "oxygen": 99},
     "history": {"diabetes": False, "hypertension": False, "heart_disease": False, "asthma": False}},

    {"name": "Ramakrishna Swamy Bobbili", "age": 62, "gender": "male", "phone": "9848090123", "email": "rkswamy@mail.com",
     "symptoms": "Chest heaviness, arm pain, jaw pain, cold sweat",
     "emergency": {"chest_pain": True, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 192, "bp_diastolic": 118, "blood_sugar": 210, "temperature": 98.2, "pulse": 122, "oxygen": 92},
     "history": {"diabetes": True, "hypertension": True, "heart_disease": True, "asthma": False}},

    {"name": "Visalakshi Narasimhan", "age": 41, "gender": "female", "phone": "9848001234", "email": "vnnarasimhan@mail.com",
     "symptoms": "Back pain, muscle weakness, joint stiffness",
     "emergency": {"chest_pain": False, "breathing_difficulty": False, "loss_of_consciousness": False},
     "vitals": {"bp_systolic": 122, "bp_diastolic": 80, "blood_sugar": 92, "temperature": 98.9, "pulse": 75, "oxygen": 99},
     "history": {"diabetes": False, "hypertension": False, "heart_disease": False, "asthma": False}},
]

DOCTORS = [
    {"name": "Dr. Srinivasa Rao Chellapathy", "department": "Emergency Medicine", "email": "dr.srinivasa@pulsequeue.health"},
    {"name": "Dr. Meenakshi Subramaniam", "department": "Cardiology", "email": "dr.meenakshi@pulsequeue.health"},
    {"name": "Dr. Venkatesh Iyer", "department": "Internal Medicine", "email": "dr.venkatesh@pulsequeue.health"},
]

PRIORITY_WEIGHT = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

def calc_risk(age, vitals, symptoms, emergency, history):
    score = 0
    if emergency.get("chest_pain"): score += 35
    if emergency.get("breathing_difficulty"): score += 28
    if emergency.get("loss_of_consciousness"): score += 35
    bp = vitals.get("bp_systolic", 0) or 0
    if bp > 180: score += 25
    elif bp > 160: score += 20
    elif bp > 140: score += 10
    sugar = vitals.get("blood_sugar", 0) or 0
    if sugar > 350: score += 20
    elif sugar > 250: score += 12
    ox = vitals.get("oxygen", 100) or 100
    if ox < 88: score += 20
    elif ox < 92: score += 15
    if age > 70: score += 10
    elif age > 60: score += 7
    if history.get("heart_disease"): score += 10
    if history.get("hypertension"): score += 6
    if history.get("diabetes"): score += 5
    return min(int(round(score)), 100)

def get_priority(score, emergency):
    if any(emergency.values()): return "HIGH"
    if score >= 70: return "HIGH"
    elif score >= 40: return "MEDIUM"
    return "LOW"

async def seed():
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGO_DB]
    print("Clearing existing demo data...")
    await db.patients.delete_many({})
    await db.reports.delete_many({})
    await db.queue.delete_many({})
    await db.doctors.delete_many({})
    await db.notes.delete_many({})

    print("Seeding doctors...")
    for doc in DOCTORS:
        doc_id = str(uuid.uuid4())
        await db.doctors.insert_one({
            "doctor_id": doc_id,
            "name": doc["name"],
            "department": doc["department"],
            "email": doc["email"],
            "password_hash": pwd_context.hash("doctor123"),
            "role": "doctor",
            "created_at": utcnow()
        })
        print(f"  [OK] {doc['name']} | email: {doc['email']} | password: doctor123")

    print("\nSeeding patients and queue...")
    for i, p in enumerate(PATIENTS):
        patient_id = str(uuid.uuid4())
        report_id = str(uuid.uuid4())
        arrival = utcnow() - timedelta(minutes=random.randint(5, 90))

        risk_score = calc_risk(p["age"], p["vitals"], p["symptoms"], p["emergency"], p["history"])
        priority = get_priority(risk_score, p["emergency"])

        patient_doc = {
            "patient_id": patient_id,
            "name": p["name"],
            "age": p["age"],
            "gender": p["gender"],
            "phone": p["phone"],
            "email": p["email"],
            "password_hash": pwd_context.hash("patient123"),
            "medical_history": p["history"],
            "created_at": utcnow(),
            "updated_at": utcnow()
        }
        await db.patients.insert_one(patient_doc)

        report_doc = {
            "report_id": report_id,
            "patient_id": patient_id,
            "symptoms": p["symptoms"],
            "vitals": p["vitals"],
            "medical_history": p["history"],
            "emergency_flags": p["emergency"],
            "prediction": [{"name": "Assessment", "confidence": 0.75}],
            "risk_score": risk_score,
            "priority": priority,
            "ai_reasoning": {
                "risk_reason": f"Risk score {risk_score} based on vitals and symptoms.",
                "supporting_factors": ["Auto-seeded demo data"],
                "sources": []
            },
            "status": "completed",
            "created_at": arrival,
            "updated_at": utcnow()
        }
        await db.reports.insert_one(report_doc)

        queue_doc = {
            "patient_id": patient_id,
            "report_id": report_id,
            "priority": priority,
            "priority_weight": PRIORITY_WEIGHT[priority],
            "risk_score": risk_score,
            "queue_position": i + 1,
            "arrival_time": arrival,
            "last_updated": utcnow(),
            "status": "waiting"
        }
        await db.queue.insert_one(queue_doc)
        print(f"  [OK] {p['name']} | {priority} | Risk: {risk_score} | email: {p['email']} | password: patient123")

    # Recalculate positions
    docs = []
    async for doc in db.queue.find({"status": "waiting"}).sort([("priority_weight", -1), ("risk_score", -1), ("arrival_time", 1)]):
        docs.append(doc)
    for pos, doc in enumerate(docs, 1):
        await db.queue.update_one({"_id": doc["_id"]}, {"$set": {"queue_position": pos}})

    print(f"\n✅ Seeded {len(PATIENTS)} patients + {len(DOCTORS)} doctors")
    print("\nDoctor login credentials:")
    for doc in DOCTORS:
        print(f"  Email: {doc['email']} | Password: doctor123")
    print("\nSample patient credentials:")
    print(f"  Email: {PATIENTS[0]['email']} | Password: patient123")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
