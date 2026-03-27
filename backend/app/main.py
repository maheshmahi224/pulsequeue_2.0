from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from contextlib import asynccontextmanager
import logging

from app.utils.logger import setup_logging
from app.config import PATIENT_PANEL_ORIGIN, DOCTOR_PANEL_ORIGIN
from app.database.mongodb import connect_db, disconnect_db, check_db_health
from app.ai import rag_engine, monitor_agent
from app.config import RAG_DOCS_PATH

from app.auth.auth_routes import router as auth_router
from app.api.patient_routes import router as patient_router
from app.api.doctor_routes import router as doctor_router
from app.api.queue_routes import router as queue_router
from app.middleware.error_handler import (
    validation_exception_handler, generic_exception_handler,
    http_exception_handler, success_response
)
from app.middleware.request_logger import request_logger_middleware

setup_logging()
logger = logging.getLogger("pulsequeue")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PulseQueue starting up...")
    await connect_db()
    await rag_engine.init_rag(RAG_DOCS_PATH)
    await monitor_agent.start()
    logger.info("PulseQueue ready")
    yield
    await disconnect_db()
    logger.info("PulseQueue shut down")

app = FastAPI(
    title="PulseQueue API",
    description="AI Triage and Queue Management System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        PATIENT_PANEL_ORIGIN,
        DOCTOR_PANEL_ORIGIN,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.middleware("http")(request_logger_middleware)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth_router)
app.include_router(patient_router)
app.include_router(doctor_router)
app.include_router(queue_router)

@app.get("/health")
async def health():
    db_ok = await check_db_health()
    agent_status = monitor_agent.get_status()
    return success_response({
        "api": "ok",
        "database": "ok" if db_ok else "error",
        "monitor_agent": agent_status,
        "ai": "ok"
    }, "PulseQueue is running")
