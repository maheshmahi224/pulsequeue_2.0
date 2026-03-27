from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.services.patient_service import process_patient_report, get_patient_profile, get_queue_status
from app.database.repositories import get_patient_notes, get_report
from app.auth.dependencies import get_current_user, optional_auth
from app.middleware.error_handler import success_response

router = APIRouter(prefix="/patients", tags=["patients"])

class VitalsModel(BaseModel):
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    pulse: Optional[float] = None
    oxygen: Optional[float] = None

class MedHistoryModel(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    asthma: bool = False

class EmergencyModel(BaseModel):
    chest_pain: bool = False
    breathing_difficulty: bool = False
    loss_of_consciousness: bool = False

class ReportRequest(BaseModel):
    patient_id: str
    symptoms: str
    vitals: VitalsModel = VitalsModel()
    medical_history: MedHistoryModel = MedHistoryModel()
    emergency_flags: EmergencyModel = EmergencyModel()
    age: int = 30

@router.post("/report")
async def submit_report(body: ReportRequest):
    result = await process_patient_report(
        patient_id=body.patient_id,
        report_data={
            "symptoms": body.symptoms,
            "vitals": body.vitals.model_dump(),
            "medical_history": body.medical_history.model_dump(),
            "emergency_flags": body.emergency_flags.model_dump()
        },
        patient_age=body.age
    )
    return success_response(result, "Report submitted successfully")

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    profile = await get_patient_profile(patient_id)
    if not profile:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Patient not found")
    return success_response(profile)

@router.get("/queue-status/{patient_id}")
async def queue_status(patient_id: str):
    status = await get_queue_status(patient_id)
    return success_response(status)

@router.get("/{patient_id}/notes")
async def patient_notes(patient_id: str):
    notes = await get_patient_notes(patient_id)
    return success_response({"notes": notes})

@router.get("/report/{report_id}")
async def get_report_detail(report_id: str):
    report = await get_report(report_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return success_response(report)
