from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, MONGO_DB
import logging

logger = logging.getLogger("pulsequeue")

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[MONGO_DB]
        await client.admin.command("ping")
        logger.info("MongoDB connected successfully")
        await create_indexes()
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise

async def disconnect_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB disconnected")

def get_db():
    return db

async def create_indexes():
    try:
        await db.patients.create_index("patient_id", unique=True)
        await db.patients.create_index("phone")
        await db.patients.create_index("email", unique=True, sparse=True)
        await db.reports.create_index("report_id", unique=True)
        await db.reports.create_index("patient_id")
        await db.reports.create_index([("priority", -1), ("risk_score", -1)])
        await db.queue.create_index("report_id", unique=True, sparse=True)
        await db.queue.create_index([("priority_weight", -1), ("risk_score", -1), ("arrival_time", 1)])
        await db.doctors.create_index("doctor_id", unique=True)
        await db.doctors.create_index("email", unique=True)
        await db.notes.create_index("patient_id")
        await db.notes.create_index("doctor_id")
        logger.info("Database indexes created")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

async def check_db_health():
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
