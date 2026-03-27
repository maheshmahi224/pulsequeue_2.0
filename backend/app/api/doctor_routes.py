from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.doctor_service import (
    get_doctor_queue, get_patient_detail, doctor_update_priority,
    doctor_add_note, get_analytics, get_patient_full_history,
    doctor_admit_patient, doctor_reject_patient, get_resolved_patients
)
from app.auth.dependencies import require_doctor
from app.middleware.error_handler import success_response

router = APIRouter(prefix="/doctor", tags=["doctor"])

class UpdatePriorityRequest(BaseModel):
    report_id: str
    new_priority: str
    doctor_id: str
    reason: Optional[str] = ""

class AddNoteRequest(BaseModel):
    report_id: str
    doctor_id: str
    message: str

class AdmitRejectRequest(BaseModel):
    report_id: str
    doctor_id: str
    reason: Optional[str] = ""
    note: Optional[str] = ""

@router.get("/queue")
async def get_queue():
    queue = await get_doctor_queue()
    return success_response({"queue": queue})

@router.get("/resolved")
async def resolved_reports():
    reports = await get_resolved_patients()
    return success_response({"resolved": reports})

@router.get("/patient/{report_id}")
async def patient_detail(report_id: str):
    detail = await get_patient_detail(report_id)
    return success_response(detail)

@router.post("/update-priority")
async def update_priority(body: UpdatePriorityRequest):
    result = await doctor_update_priority(
        body.report_id, body.new_priority, body.doctor_id, body.reason or ""
    )
    return success_response(result, "Priority updated")

@router.post("/add-note")
async def add_note(body: AddNoteRequest):
    result = await doctor_add_note(body.report_id, body.doctor_id, body.message)
    return success_response(result, "Note added")

@router.get("/patient-history/{patient_id}")
async def patient_history(patient_id: str):
    """All reports (with PDFs) for a patient — for doctor's history view."""
    data = await get_patient_full_history(patient_id)
    return success_response(data)

@router.post("/admit-patient")
async def admit_patient(body: AdmitRejectRequest):
    """Doctor approves admission — removes patient from waiting queue."""
    result = await doctor_admit_patient(body.report_id, body.doctor_id, body.note or "")
    return success_response(result, "Patient admitted successfully")

@router.post("/reject-patient")
async def reject_patient(body: AdmitRejectRequest):
    """Doctor rejects / refers patient elsewhere — removes from queue."""
    result = await doctor_reject_patient(body.report_id, body.doctor_id, body.reason or "", body.note or "")
    return success_response(result, "Patient discharged from queue")

@router.get("/analytics")
async def analytics():
    data = await get_analytics()
    return success_response(data)
