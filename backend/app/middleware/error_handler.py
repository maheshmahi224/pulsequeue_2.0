from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("pulsequeue")

def success_response(data=None, message: str = "Success") -> dict:
    return {"status": "success", "message": message, "data": data or {}}

def error_response(message: str, code: str = "SERVER_ERROR", status_code: int = 500) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": "error", "message": message, "error_code": code}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = [f"{e['loc'][-1]}: {e['msg']}" for e in errors]
    return JSONResponse(
        status_code=422,
        content={"status": "error", "message": "; ".join(messages), "error_code": "VALIDATION_ERROR"}
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "An internal error occurred", "error_code": "SERVER_ERROR"}
    )

async def http_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"status": "error", "message": exc.detail, "error_code": "HTTP_ERROR"}
    )
