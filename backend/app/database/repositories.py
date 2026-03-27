from app.database.mongodb import get_db
from app.database.schemas import (
    PatientSchema, ReportSchema, QueueSchema, DoctorSchema, NoteSchema
)
from datetime import datetime, timezone
from typing import Optional, List
import logging

logger = logging.getLogger("pulsequeue")

def utcnow():
    return datetime.now(timezone.utc)

# ─── Patient ─────────────────────────────────────────────────────────────────

async def create_patient(data: dict) -> dict:
    db = get_db()
    data["created_at"] = utcnow()
    data["updated_at"] = utcnow()
    await db.patients.insert_one(data)
    data.pop("_id", None)
    return data

async def get_patient(patient_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.patients.find_one({"patient_id": patient_id})
    if doc:
        doc.pop("_id", None)
        doc.pop("password_hash", None)
    return doc

async def get_patient_by_email(email: str) -> Optional[dict]:
    db = get_db()
    doc = await db.patients.find_one({"email": email})
    if doc:
        doc.pop("_id", None)
    return doc

async def update_patient(patient_id: str, update: dict) -> bool:
    db = get_db()
    update["updated_at"] = utcnow()
    result = await db.patients.update_one({"patient_id": patient_id}, {"$set": update})
    return result.modified_count > 0

# ─── Report ──────────────────────────────────────────────────────────────────

async def create_report(data: dict) -> dict:
    db = get_db()
    data["created_at"] = utcnow()
    data["updated_at"] = utcnow()
    await db.reports.insert_one(data)
    data.pop("_id", None)
    return data

async def get_report(report_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.reports.find_one({"report_id": report_id})
    if doc:
        doc.pop("_id", None)
    return doc

async def get_patient_reports(patient_id: str) -> List[dict]:
    db = get_db()
    cursor = db.reports.find({"patient_id": patient_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    for d in docs:
        d.pop("_id", None)
    return docs

async def get_resolved_reports() -> List[dict]:
    db = get_db()
    cursor = db.reports.find({"status": {"$in": ["admitted", "referred", "completed"]}}).sort("last_updated", -1)
    docs = await cursor.to_list(length=200)
    for d in docs:
        d.pop("_id", None)
    return docs

async def update_report(report_id: str, update: dict) -> bool:
    db = get_db()
    update["updated_at"] = utcnow()
    result = await db.reports.update_one({"report_id": report_id}, {"$set": update})
    return result.modified_count > 0

# ─── Queue ───────────────────────────────────────────────────────────────────

PRIORITY_WEIGHT = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

async def upsert_queue_entry(data: dict) -> dict:
    db = get_db()
    data["last_updated"] = utcnow()
    data["priority_weight"] = PRIORITY_WEIGHT.get(data.get("priority", "MEDIUM"), 2)
    await db.queue.update_one(
        {"report_id": data["report_id"]},
        {"$set": data},
        upsert=True
    )
    return data

async def get_queue_entry(report_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.queue.find_one({"report_id": report_id})
    if doc:
        doc.pop("_id", None)
    return doc

async def get_active_queue() -> List[dict]:
    db = get_db()
    cursor = db.queue.find({"status": "waiting"}).sort([
        ("priority_weight", -1), ("risk_score", -1), ("arrival_time", 1)
    ])
    docs = await cursor.to_list(length=200)
    for d in docs:
        d.pop("_id", None)
    return docs

async def update_queue_entry(report_id: str, update: dict) -> bool:
    db = get_db()
    update["last_updated"] = utcnow()
    if "priority" in update:
        update["priority_weight"] = PRIORITY_WEIGHT.get(update["priority"], 2)
    result = await db.queue.update_one({"report_id": report_id}, {"$set": update})
    return result.modified_count > 0

async def remove_queue_entry(report_id: str) -> bool:
    db = get_db()
    result = await db.queue.update_one(
        {"report_id": report_id},
        {"$set": {"status": "completed", "last_updated": utcnow()}}
    )
    return result.modified_count > 0

async def bulk_update_positions(entries: List[dict]) -> None:
    db = get_db()
    from motor.motor_asyncio import AsyncIOMotorCollection
    for i, entry in enumerate(entries):
        await db.queue.update_one(
            {"report_id": entry["report_id"]},
            {"$set": {"queue_position": i + 1, "last_updated": utcnow()}}
        )

# ─── Doctor ──────────────────────────────────────────────────────────────────

async def create_doctor(data: dict) -> dict:
    db = get_db()
    data["created_at"] = utcnow()
    await db.doctors.insert_one(data)
    data.pop("_id", None)
    return data

async def get_doctor_by_email(email: str) -> Optional[dict]:
    db = get_db()
    doc = await db.doctors.find_one({"email": email})
    if doc:
        doc.pop("_id", None)
    return doc

async def get_doctor(doctor_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.doctors.find_one({"doctor_id": doctor_id})
    if doc:
        doc.pop("_id", None)
        doc.pop("password_hash", None)
    return doc

# ─── Notes ───────────────────────────────────────────────────────────────────

async def add_note(data: dict) -> dict:
    db = get_db()
    data["created_at"] = utcnow()
    await db.notes.insert_one(data)
    data.pop("_id", None)
    return data

async def get_patient_notes(patient_id: str) -> List[dict]:
    db = get_db()
    cursor = db.notes.find({"patient_id": patient_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    for d in docs:
        d.pop("_id", None)
    return docs

async def get_report_notes(report_id: str) -> List[dict]:
    db = get_db()
    cursor = db.notes.find({"report_id": report_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    for d in docs:
        d.pop("_id", None)
    return docs

# ─── Analytics ───────────────────────────────────────────────────────────────

async def get_daily_stats() -> dict:
    db = get_db()
    from datetime import timedelta
    today_start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total = await db.reports.count_documents({"created_at": {"$gte": today_start}})
    high = await db.reports.count_documents({"created_at": {"$gte": today_start}, "priority": "HIGH"})
    medium = await db.reports.count_documents({"created_at": {"$gte": today_start}, "priority": "MEDIUM"})
    low = await db.reports.count_documents({"created_at": {"$gte": today_start}, "priority": "LOW"})
    queue_size = await db.queue.count_documents({"status": "waiting"})
    return {
        "total_patients": total,
        "high_risk": high,
        "medium_risk": medium,
        "low_risk": low,
        "queue_size": queue_size
    }
