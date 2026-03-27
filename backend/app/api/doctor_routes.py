from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.doctor_service import (
    get_doctor_queue, get_patient_detail, doctor_update_priority,
    doctor_add_note, get_analytics
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

@router.get("/queue")
async def get_queue():
    queue = await get_doctor_queue()
    return success_response({"queue": queue})

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

@router.get("/analytics")
async def analytics():
    data = await get_analytics()
    return success_response(data)
