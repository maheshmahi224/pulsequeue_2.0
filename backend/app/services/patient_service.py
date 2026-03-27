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

# ── Fast rule-based scoring (instant, no LLM) ─────────────────────────────
def _quick_risk(data: dict, age: int) -> dict:
    """Synchronous rule-based triage — runs in <1ms, used immediately."""
    symptoms = (data.get("symptoms") or "").lower()
    vitals   = data.get("vitals") or {}
    flags    = data.get("emergency_flags") or {}
    history  = data.get("medical_history") or {}

    score = 0
    factors = []

    # Emergency flags (highest weight)
    if flags.get("chest_pain"):          score += 35; factors.append("Chest pain reported")
    if flags.get("breathing_difficulty"):score += 28; factors.append("Breathing difficulty")
    if flags.get("loss_of_consciousness"):score += 35;factors.append("Loss of consciousness")
    if flags.get("severe_allergic_reaction"):score += 30; factors.append("Severe allergic reaction")

    # Vitals
    bp = vitals.get("bp_systolic") or 0
    if bp > 180:   score += 25; factors.append(f"Critical BP {bp} mmHg")
    elif bp > 160: score += 15; factors.append(f"High BP {bp} mmHg")
    elif bp > 140: score += 8

    ox = vitals.get("oxygen") or 100
    if ox < 88:    score += 25; factors.append(f"Critical SpO2 {ox}%")
    elif ox < 92:  score += 15; factors.append(f"Low SpO2 {ox}%")

    sugar = vitals.get("blood_sugar") or 0
    if sugar > 400: score += 20; factors.append(f"Critical glucose {sugar}")
    elif sugar > 280: score += 12; factors.append(f"High glucose {sugar}")

    pulse = vitals.get("pulse") or 0
    if pulse > 130: score += 15; factors.append(f"Tachycardia {pulse} bpm")
    elif pulse < 45: score += 15; factors.append(f"Bradycardia {pulse} bpm")

    # Keyword symptoms
    for kw, pts in [("chest", 10), ("breath", 8), ("unconsci", 15),
                    ("seizure", 15), ("stroke", 15), ("heart attack", 20)]:
        if kw in symptoms: score += pts

    # Age + history
    if age > 70:   score += 10
    elif age > 60: score += 6
    if history.get("heart_disease"): score += 10
    if history.get("hypertension"):  score += 5
    if history.get("diabetes"):      score += 4

    score = min(int(score), 100)
    if score >= 70 or any(flags.values()):
        priority = "HIGH"
    elif score >= 35:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    if not factors:
        factors = [f"Rule-based risk score: {score}/100"]

    return {
        "prediction": [{"name": "Rule-based Assessment", "confidence": round(score / 100, 2)}],
        "risk_score":  float(score),
        "priority":    priority,
        "reasoning": {
            "risk_reason": f"Instant risk assessment: {score}/100. AI analysis enhancing in background.",
            "supporting_factors": factors[:5],
            "sources": [],
        },
    }

async def _run_ai_enhancement(report_id: str, report_data: dict, age: int):
    """Background task: run full AI triage and update the report silently."""
    try:
        triage_input = dict(report_data)
        triage_input["age"] = age
        ai_result = await asyncio.wait_for(
            triage_agent.process_patient(triage_input),
            timeout=18.0
        )
        update_fields = {
            "prediction":  ai_result["prediction"],
            "risk_score":  ai_result["risk_score"],
            "priority":    ai_result["priority"],
            "ai_reasoning":ai_result["reasoning"],
            "status":      "completed",
            "ai_enhanced": True,
        }
        if report_data.get("pdf_analysis"):
            update_fields["pdf_analysis"] = report_data["pdf_analysis"]
        await update_report(report_id, update_fields)
        # Update queue entry with better score
        await add_to_queue(
            patient_id=report_data.get("patient_id", ""),
            report_id=report_id,
            priority=ai_result["priority"],
            risk_score=ai_result["risk_score"],
        )
        logger.info(f"AI enhancement done for {report_id}: score={ai_result['risk_score']} pri={ai_result['priority']}")
    except Exception as e:
        logger.warning(f"AI enhancement failed for {report_id}: {e}")
        await update_report(report_id, {"status": "completed"})


async def process_patient_report(patient_id: str, report_data: dict, patient_age: int = 30) -> dict:
    report_id = str(uuid.uuid4())

    # ── Step 1: instant rule-based result (<1ms) ──────────────────────────
    quick = _quick_risk(report_data, patient_age)

    report_doc = {
        "report_id":      report_id,
        "patient_id":     patient_id,
        "symptoms":       report_data.get("symptoms", ""),
        "vitals":         report_data.get("vitals", {}),
        "medical_history":report_data.get("medical_history", {}),
        "emergency_flags":report_data.get("emergency_flags", {}),
        "pdf_analysis":   report_data.get("pdf_analysis"),
        "prediction":     quick["prediction"],
        "risk_score":     quick["risk_score"],
        "priority":       quick["priority"],
        "ai_reasoning":   quick["reasoning"],
        "status":         "processing",   # will update to "completed" in background
    }
    await create_report(report_doc)

    # ── Step 2: add to queue instantly with rule-based score ──────────────
    queue_pos = await add_to_queue(
        patient_id=patient_id,
        report_id=report_id,
        priority=quick["priority"],
        risk_score=quick["risk_score"],
    )

    # ── Step 3: fire AI enhancement in background (non-blocking) ─────────
    report_data["patient_id"] = patient_id
    asyncio.create_task(_run_ai_enhancement(report_id, report_data, patient_age))

    # ── Return immediately with rule-based result ─────────────────────────
    return {
        "report_id":    report_id,
        "prediction":   quick["prediction"],
        "risk_score":   quick["risk_score"],
        "priority":     quick["priority"],
        "reasoning":    quick["reasoning"],
        "queue_position": queue_pos,
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
        "patient":      patient,
        "latest_report":latest,
        "queue_status": queue_item,
        "report_count": len(reports)
    }


async def get_queue_status(patient_id: str) -> dict:
    reports = await get_patient_reports(patient_id)
    if not reports:
        return {"queue_position": None, "priority": None, "status": "no_reports"}
    latest    = reports[0]
    report_id = latest.get("report_id")
    queue     = await get_queue_snapshot()
    item      = next((q for q in queue if q.get("report_id") == report_id), None)
    if not item:
        return {"queue_position": None, "priority": latest.get("priority"), "status": "completed"}
    return {
        "queue_position":  item.get("queue_position"),
        "priority":        item.get("priority"),
        "waiting_minutes": item.get("waiting_minutes", 0),
        "estimated_wait":  item.get("estimated_wait", "N/A"),
        "status":          "waiting",
        "report_id":       report_id,
    }
