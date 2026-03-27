from fastapi import APIRouter
from app.services.queue_service import get_queue_snapshot, check_escalations
from app.middleware.error_handler import success_response

router = APIRouter(prefix="/queue", tags=["queue"])

@router.get("/snapshot")
async def queue_snapshot():
    queue = await get_queue_snapshot()
    return success_response({"queue": queue, "total": len(queue)})

@router.post("/escalate")
async def trigger_escalation():
    count = await check_escalations()
    return success_response({"escalated": count})
