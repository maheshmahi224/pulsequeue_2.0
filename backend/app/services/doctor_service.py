import logging
from app.database.repositories import (
    get_active_queue, get_report, get_patient, get_patient_reports,
    update_report, get_patient_notes, get_report_notes, add_note,
    get_daily_stats, get_doctor, get_queue_entry, get_resolved_reports
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

async def get_resolved_patients() -> list:
    reports = await get_resolved_reports()
    enriched = []
    for report in reports:
        patient = await get_patient(report.get("patient_id"))
        enriched.append({
            "report_id": report.get("report_id"),
            "patient_id": report.get("patient_id"),
            "name": patient.get("name", "Unknown") if patient else "Unknown",
            "age": patient.get("age") if patient else None,
            "status": report.get("status"),
            "priority": report.get("priority"),
            "risk_score": report.get("risk_score"),
            "symptoms": (report.get("symptoms") or "")[:80],
            "resolved_at": report.get("admitted_at") or report.get("referred_at") or report.get("last_updated"),
            "reject_reason": report.get("reject_reason", "")
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

async def get_patient_full_history(patient_id: str) -> dict:
    """Return patient profile + all reports (with PDF flags) for doctor's history view."""
    patient = await get_patient(patient_id)
    reports = await get_patient_reports(patient_id)
    # Summarise each report for the timeline list
    summaries = []
    for r in reports:
        summaries.append({
            "report_id":    r.get("report_id"),
            "created_at":   r.get("created_at"),
            "priority":     r.get("priority"),
            "risk_score":   r.get("risk_score"),
            "status":       r.get("status"),
            "symptoms":     (r.get("symptoms") or "")[:120],
            "has_pdf":      bool(r.get("pdf_analysis")),
            "pdf_filename": (r.get("pdf_analysis") or {}).get("filename"),
            "prediction":   r.get("prediction", []),
            "ai_reasoning": r.get("ai_reasoning", {}),
            "vitals":       r.get("vitals", {}),
            "pdf_analysis": r.get("pdf_analysis"),   # full for PDF viewer
        })
    return {
        "patient":  patient or {},
        "reports":  summaries,
        "total":    len(summaries),
        "pdf_count": sum(1 for s in summaries if s["has_pdf"]),
    }

async def get_analytics() -> dict:
    stats = await get_daily_stats()
    return stats

async def doctor_admit_patient(report_id: str, doctor_id: str, note: str) -> dict:
    """Doctor marks patient as admitted — removes from queue, recalculates positions."""
    import uuid
    from app.services.queue_service import recalculate_queue
    report = await get_report(report_id)
    doctor = await get_doctor(doctor_id)
    doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"

    # Mark report as admitted
    await update_report(report_id, {"status": "admitted", "admitted_at": utcnow().isoformat()})

    # Remove from active queue
    from app.database.repositories import remove_queue_entry
    await remove_queue_entry(report_id)

    # Recalculate remaining positions
    await recalculate_queue()

    # Add a clinical note
    note_data = {
        "note_id": str(uuid.uuid4()),
        "patient_id": report.get("patient_id") if report else "",
        "report_id": report_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "message": note or f"Patient admitted by Dr. {doctor_name}",
        "priority_change": "ADMITTED",
        "created_at": utcnow().isoformat(),
    }
    await add_note(note_data)
    return {"admitted": True, "report_id": report_id}

async def doctor_reject_patient(report_id: str, doctor_id: str, reason: str, note: str) -> dict:
    """Doctor rejects / refers patient — removes from queue, marks as referred."""
    import uuid
    from app.services.queue_service import recalculate_queue
    report = await get_report(report_id)
    doctor = await get_doctor(doctor_id)
    doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"

    # Mark report as referred/rejected
    await update_report(report_id, {
        "status": "referred",
        "referred_at": utcnow().isoformat(),
        "reject_reason": reason,
    })

    # Remove from active queue
    from app.database.repositories import remove_queue_entry
    await remove_queue_entry(report_id)

    # Recalculate remaining positions
    await recalculate_queue()

    # Add a clinical note
    note_data = {
        "note_id": str(uuid.uuid4()),
        "patient_id": report.get("patient_id") if report else "",
        "report_id": report_id,
        "doctor_id": doctor_id,
        "doctor_name": doctor_name,
        "message": note or f"Patient referred/rejected by Dr. {doctor_name}. Reason: {reason}",
        "priority_change": "REFERRED",
        "created_at": utcnow().isoformat(),
    }
    await add_note(note_data)
    return {"rejected": True, "report_id": report_id}
