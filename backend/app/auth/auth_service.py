from app.database.repositories import get_patient_by_email, get_doctor_by_email, create_patient
from app.auth.password import verify_password, hash_password
from app.auth.jwt_handler import create_token
from fastapi import HTTPException, status
import uuid

async def login_patient(email: str, password: str) -> dict:
    patient = await get_patient_by_email(email)
    if not patient:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    stored_hash = patient.get("password_hash", "")
    if not stored_hash or not verify_password(password, stored_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(patient["patient_id"], "patient")
    return {"token": token, "role": "patient", "user_id": patient["patient_id"], "name": patient.get("name", "")}

async def login_doctor(email: str, password: str) -> dict:
    doctor = await get_doctor_by_email(email)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    stored_hash = doctor.get("password_hash", "")
    if not stored_hash or not verify_password(password, stored_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(doctor["doctor_id"], "doctor")
    return {"token": token, "role": "doctor", "user_id": doctor["doctor_id"], "name": doctor.get("name", "")}

async def register_patient(name: str, age: int, gender: str, phone: str, email: str, password: str) -> dict:
    existing = await get_patient_by_email(email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    patient_data = {
        "patient_id": str(uuid.uuid4()),
        "name": name,
        "age": age,
        "gender": gender,
        "phone": phone,
        "email": email,
        "password_hash": hash_password(password),
        "medical_history": {"diabetes": False, "hypertension": False, "heart_disease": False, "asthma": False}
    }
    await create_patient(patient_data)
    token = create_token(patient_data["patient_id"], "patient")
    return {"token": token, "role": "patient", "user_id": patient_data["patient_id"], "name": name}
