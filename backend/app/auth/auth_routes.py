from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from app.auth.auth_service import login_patient, login_doctor, register_patient
from app.middleware.error_handler import success_response

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: str
    password: str

@router.post("/patient/login")
async def patient_login(body: LoginRequest):
    data = await login_patient(body.email, body.password)
    return success_response(data, "Login successful")

@router.post("/doctor/login")
async def doctor_login(body: LoginRequest):
    data = await login_doctor(body.email, body.password)
    return success_response(data, "Login successful")

@router.post("/patient/register")
async def patient_register(body: RegisterRequest):
    data = await register_patient(
        body.name, body.age, body.gender, body.phone, body.email, body.password
    )
    return success_response(data, "Registration successful")
