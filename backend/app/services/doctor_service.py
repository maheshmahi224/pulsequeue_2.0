import logging
from app.database.repositories import (
    get_active_queue, get_report, get_patient, get_patient_reports,
    update_report, get_patient_notes, get_report_notes, add_note,
    get_daily_stats, get_doctor, get_queue_entry
)
from app.services.queue_service import update_priority, get_queue_snapshot
from datetime import datetime, timezone

logger = logging.getLogger("pulsequeue")

def utcnow():
    return datetime.now(timezone.utc)

async def get_doctor_queue() -> list:
    queue = await get_queue_snapshot()
    enriched = []
    for item in queue:
        patient = await get_patient(item["patient_id"])
        report = await get_report(item.get("report_id", ""))
        enriched.append({
            "patient_id": item.get("patient_id"),
            "report_id": item.get("report_id"),
            "name": patient.get("name", "Unknown") if patient else "Unknown",
            "age": patient.get("age") if patient else None,
            "priority": item.get("priority"),
            "risk_score": item.get("risk_score"),
            "queue_position": item.get("queue_position"),
            "waiting_minutes": item.get("waiting_minutes", 0),
            "estimated_wait": item.get("estimated_wait", "N/A"),
            "symptoms": report.get("symptoms", "")[:80] if report else "",
            "status": item.get("status", "waiting")
        })
    return enriched

async def get_patient_detail(report_id: str) -> dict:
    report = await get_report(report_id)
    if not report:
        return {}
    patient = await get_patient(report.get("patient_id", ""))
    notes = await get_report_notes(report_id)
    queue_item = await get_queue_entry(report_id)
    return {
        "report": report,
        "patient": patient or {},
        "notes": notes,
        "queue": queue_item or {}
    }

async def doctor_update_priority(report_id: str, new_priority: str, doctor_id: str, reason: str) -> dict:
    doctor = await get_doctor(doctor_id)
    doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"
    old_report = await get_report(report_id)
    old_priority = old_report.get("priority", "MEDIUM") if old_report else "MEDIUM"
    await update_report(report_id, {"priority": new_priority})
    await update_priority(report_id, new_priority)
    note_data = {
        "note_id": __import__("uuid").uuid4().__str__(),
        "patient_id": old_report.get("patient_id") if old_report else "",
        "report_id": report_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "message": reason or f"Priority updated by {doctor_name}",
        "priority_change": f"{old_priority} → {new_priority}"
    }
    await add_note(note_data)
    return {"updated": True, "old_priority": old_priority, "new_priority": new_priority}

async def doctor_add_note(report_id: str, doctor_id: str, message: str) -> dict:
    report = await get_report(report_id)
    doctor = await get_doctor(doctor_id)
    doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"
    note_data = {
        "note_id": __import__("uuid").uuid4().__str__(),
        "patient_id": report.get("patient_id") if report else "",
        "report_id": report_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "message": message,
        "priority_change": None
    }
    await add_note(note_data)
    notes = await get_report_notes(report_id)
    return {"notes": notes}

async def get_analytics() -> dict:
    stats = await get_daily_stats()
    return stats
