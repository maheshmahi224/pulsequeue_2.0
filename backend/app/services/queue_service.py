import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.database.repositories import (
    upsert_queue_entry, get_active_queue, update_queue_entry,
    remove_queue_entry, bulk_update_positions, get_queue_entry
)

logger = logging.getLogger("pulsequeue")

PRIORITY_WEIGHT = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

def utcnow():
    return datetime.now(timezone.utc)

async def add_to_queue(patient_id: str, report_id: str, priority: str, risk_score: float) -> int:
    entry = {
        "patient_id": patient_id,
        "report_id": report_id,
        "priority": priority,
        "priority_weight": PRIORITY_WEIGHT.get(priority, 2),
        "risk_score": risk_score,
        "queue_position": 0,
        "arrival_time": utcnow(),
        "status": "waiting"
    }
    await upsert_queue_entry(entry)
    position = await recalculate_queue()
    entry_updated = await get_queue_entry(report_id)
    return entry_updated.get("queue_position", 1) if entry_updated else 1

async def recalculate_queue() -> int:
    try:
        queue = await get_active_queue()
        await bulk_update_positions(queue)
        return len(queue)
    except Exception as e:
        logger.error(f"Queue recalculation failed: {e}")
        return 0

async def update_priority(report_id: str, new_priority: str) -> bool:
    try:
        await update_queue_entry(report_id, {
            "priority": new_priority,
            "priority_weight": PRIORITY_WEIGHT.get(new_priority, 2)
        })
        await recalculate_queue()
        return True
    except Exception as e:
        logger.error(f"Priority update failed: {e}")
        return False

async def get_queue() -> List[dict]:
    return await get_active_queue()

async def get_queue_snapshot() -> List[dict]:
    queue = await get_active_queue()
    now = utcnow()
    result = []
    for item in queue:
        arrival = item.get("arrival_time", now)
        if isinstance(arrival, str):
            try:
                arrival = datetime.fromisoformat(arrival.replace("Z", "+00:00"))
            except Exception:
                arrival = now
        if arrival.tzinfo is None:
            arrival = arrival.replace(tzinfo=timezone.utc)
        wait_min = max(0, int((now - arrival).total_seconds() / 60))
        item["waiting_minutes"] = wait_min
        item["estimated_wait"] = f"{wait_min} min"
        result.append(item)
    return result

async def complete_patient(report_id: str) -> bool:
    try:
        await remove_queue_entry(report_id)
        await recalculate_queue()
        return True
    except Exception as e:
        logger.error(f"Complete patient error: {e}")
        return False

async def check_escalations():
    from app.ai import monitor_agent
    return await monitor_agent.check_escalations()
