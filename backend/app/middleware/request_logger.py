import logging
import json
import time
from fastapi import Request

logger = logging.getLogger("pulsequeue")

async def request_logger_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(json.dumps({
        "method": request.method,
        "path": str(request.url.path),
        "status": response.status_code,
        "duration_ms": duration
    }))
    return response
