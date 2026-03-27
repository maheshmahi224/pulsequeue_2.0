import asyncio
import logging
from typing import Optional
from app.database.repositories import (
    create_report, get_report, get_patient_reports, update_report,
    create_patient, get_patient
)
from app.services.queue_service import add_to_queue, get_queue_snapshot
from app.ai import triage_agent
from app.database.schemas import ReportSchema, PatientSchema
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("pulsequeue")

def utcnow():
    return datetime.now(timezone.utc)

async def process_patient_report(patient_id: str, report_data: dict, patient_age: int = 30) -> dict:
    report_id = str(uuid.uuid4())
    report_doc = {
        "report_id": report_id,
        "patient_id": patient_id,
        "symptoms": report_data.get("symptoms", ""),
        "vitals": report_data.get("vitals", {}),
        "medical_history": report_data.get("medical_history", {}),
        "emergency_flags": report_data.get("emergency_flags", {}),
        "prediction": [],
        "risk_score": 0.0,
        "priority": "MEDIUM",
        "ai_reasoning": {},
        "status": "processing"
    }
    await create_report(report_doc)

    try:
        triage_input = dict(report_data)
        triage_input["age"] = patient_age
        ai_result = await asyncio.wait_for(
            triage_agent.process_patient(triage_input),
            timeout=10.0
        )
    except asyncio.TimeoutError:
        logger.warning(f"AI triage timeout for report {report_id}")
        ai_result = {
            "prediction": [{"name": "General Assessment", "confidence": 0.40}],
            "risk_score": 40.0,
            "priority": "MEDIUM",
            "reasoning": {"risk_reason": "AI triage timed out. Default priority assigned.", "supporting_factors": [], "sources": []}
        }
    except Exception as e:
        logger.error(f"AI triage error: {e}")
        ai_result = {
            "prediction": [{"name": "General Assessment", "confidence": 0.40}],
            "risk_score": 40.0,
            "priority": "MEDIUM",
            "reasoning": {"risk_reason": "AI triage unavailable.", "supporting_factors": [], "sources": []}
        }

    await update_report(report_id, {
        "prediction": ai_result["prediction"],
        "risk_score": ai_result["risk_score"],
        "priority": ai_result["priority"],
        "ai_reasoning": ai_result["reasoning"],
        "status": "completed"
    })

    queue_pos = await add_to_queue(
        patient_id=patient_id,
        report_id=report_id,
        priority=ai_result["priority"],
        risk_score=ai_result["risk_score"]
    )

    return {
        "report_id": report_id,
        "prediction": ai_result["prediction"],
        "risk_score": ai_result["risk_score"],
        "priority": ai_result["priority"],
        "reasoning": ai_result["reasoning"],
        "queue_position": queue_pos
    }

async def get_patient_profile(patient_id: str) -> Optional[dict]:
    patient = await get_patient(patient_id)
    if not patient:
        return None
    reports = await get_patient_reports(patient_id)
    latest = reports[0] if reports else {}
    queue_items = await get_queue_snapshot()
    queue_item = next((q for q in queue_items if q.get("patient_id") == patient_id), None)
    return {
        "patient": patient,
        "latest_report": latest,
        "queue_status": queue_item,
        "report_count": len(reports)
    }

async def get_queue_status(patient_id: str) -> dict:
    reports = await get_patient_reports(patient_id)
    if not reports:
        return {"queue_position": None, "priority": None, "status": "no_reports"}
    latest = reports[0]
    report_id = latest.get("report_id")
    queue = await get_queue_snapshot()
    item = next((q for q in queue if q.get("report_id") == report_id), None)
    if not item:
        return {"queue_position": None, "priority": latest.get("priority"), "status": "completed"}
    return {
        "queue_position": item.get("queue_position"),
        "priority": item.get("priority"),
        "waiting_minutes": item.get("waiting_minutes", 0),
        "estimated_wait": item.get("estimated_wait", "N/A"),
        "status": "waiting",
        "report_id": report_id
    }
