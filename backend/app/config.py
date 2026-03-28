import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "pulsequeue")
LLM_API_KEY = os.getenv("LLM_API_KEY", "rc_510fa636d0ce4f52991d44b0f3276d2227d749d280ca2dcabc6e783a5d3088d6")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.featherless.ai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "mistralai/Mistral-Small-3.2-24B-Instruct-2506")
JWT_SECRET = os.getenv("JWT_SECRET", "pulsequeue-super-secret-jwt-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24
PATIENT_PANEL_ORIGIN = os.getenv("PATIENT_PANEL_ORIGIN", "http://localhost:3001")
DOCTOR_PANEL_ORIGIN = os.getenv("DOCTOR_PANEL_ORIGIN", "http://localhost:3002")
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "15"))
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "10"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
RAG_DOCS_PATH = os.getenv("RAG_DOCS_PATH", "rag-knowledge/medical_docs")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "rag-knowledge/faiss_index")

# Bright Data — Web Unlocker for live medical reference enrichment
BRIGHTDATA_API_KEY = os.getenv("BRIGHTDATA_API_KEY", "741b4eab-6c2e-4c6d-9f00-bcbfb8a9dd2f")
BRIGHTDATA_ENABLED = os.getenv("BRIGHTDATA_ENABLED", "true").lower() == "true"
BRIGHTDATA_CACHE_TTL_HOURS = int(os.getenv("BRIGHTDATA_CACHE_TTL_HOURS", "24"))
