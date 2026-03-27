import asyncio
import logging
from datetime import datetime, timezone, timedelta
from app.database.repositories import get_active_queue, update_queue_entry, bulk_update_positions

logger = logging.getLogger("pulsequeue")

PRIORITY_WEIGHT = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
_monitor_running = False
_last_run = None

def utcnow():
    return datetime.now(timezone.utc)

async def check_escalations():
    try:
        queue = await get_active_queue()
        now = utcnow()
        escalated = 0
        for entry in queue:
            try:
                arrival = entry.get("arrival_time")
                if not arrival:
                    continue
                if isinstance(arrival, str):
                    arrival = datetime.fromisoformat(arrival.replace("Z", "+00:00"))
                if arrival.tzinfo is None:
                    arrival = arrival.replace(tzinfo=timezone.utc)
                wait_minutes = (now - arrival).total_seconds() / 60
                priority = entry.get("priority", "LOW")
                new_priority = priority
                if priority == "MEDIUM" and wait_minutes > 30:
                    new_priority = "HIGH"
                elif priority == "LOW" and wait_minutes > 60:
                    new_priority = "MEDIUM"
                if new_priority != priority:
                    await update_queue_entry(entry["report_id"], {
                        "priority": new_priority,
                        "priority_weight": PRIORITY_WEIGHT[new_priority]
                    })
                    escalated += 1
                    logger.info(f"Escalated {entry['report_id']}: {priority} → {new_priority} (wait: {wait_minutes:.0f}min)")
            except Exception as e:
                logger.error(f"Escalation error for entry: {e}")
        if escalated > 0:
            await recalculate_positions()
        return escalated
    except Exception as e:
        logger.error(f"check_escalations failed: {e}")
        return 0

async def recalculate_positions():
    try:
        queue = await get_active_queue()
        await bulk_update_positions(queue)
    except Exception as e:
        logger.error(f"Position recalculation failed: {e}")

async def monitor_loop():
    global _monitor_running, _last_run
    _monitor_running = True
    logger.info("Monitor agent started")
    while True:
        try:
            await asyncio.sleep(60)
            _last_run = utcnow()
            escalated = await check_escalations()
            logger.info(f"Monitor run complete. Escalations: {escalated}")
        except asyncio.CancelledError:
            logger.info("Monitor agent stopped")
            _monitor_running = False
            break
        except Exception as e:
            logger.error(f"Monitor loop error: {e}")
            await asyncio.sleep(30)

async def start():
    asyncio.create_task(monitor_loop())

def get_status():
    return {
        "running": _monitor_running,
        "last_run": _last_run.isoformat() if _last_run else None
    }
