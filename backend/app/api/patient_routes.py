from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.services.patient_service import process_patient_report, get_patient_profile, get_queue_status
from app.database.repositories import get_patient_notes, get_report, get_patient_reports
from app.auth.dependencies import get_current_user, optional_auth
from app.middleware.error_handler import success_response
import logging

logger = logging.getLogger("pulsequeue")

router = APIRouter(prefix="/patients", tags=["patients"])

class VitalsModel(BaseModel):
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    blood_sugar: Optional[float] = None
    temperature: Optional[float] = None
    pulse: Optional[float] = None
    oxygen: Optional[float] = None

class MedHistoryModel(BaseModel):
    diabetes: bool = False
    hypertension: bool = False
    heart_disease: bool = False
    asthma: bool = False
    kidney_disease: bool = False
    thyroid: bool = False
    cancer: bool = False
    stroke_history: bool = False

class EmergencyModel(BaseModel):
    chest_pain: bool = False
    breathing_difficulty: bool = False
    loss_of_consciousness: bool = False
    severe_allergic_reaction: bool = False

class ReportRequest(BaseModel):
    patient_id: str
    symptoms: str
    vitals: VitalsModel = VitalsModel()
    medical_history: MedHistoryModel = MedHistoryModel()
    emergency_flags: EmergencyModel = EmergencyModel()
    age: int = 30

# ── Specific routes FIRST ──────────────────────────────────────────────────────

@router.post("/upload-pdf")
async def upload_pdf_report(
    patient_id: str = Form(...),
    age: int = Form(30),
    # Vitals (optional, alongside PDF)
    bp_systolic: Optional[float] = Form(None),
    bp_diastolic: Optional[float] = Form(None),
    blood_sugar: Optional[float] = Form(None),
    temperature: Optional[float] = Form(None),
    pulse: Optional[float] = Form(None),
    oxygen: Optional[float] = Form(None),
    # Emergency flags
    chest_pain: bool = Form(False),
    breathing_difficulty: bool = Form(False),
    loss_of_consciousness: bool = Form(False),
    severe_allergic_reaction: bool = Form(False),
    # Medical history
    diabetes: bool = Form(False),
    hypertension: bool = Form(False),
    heart_disease: bool = Form(False),
    asthma: bool = Form(False),
    kidney_disease: bool = Form(False),
    thyroid: bool = Form(False),
    cancer: bool = Form(False),
    stroke_history: bool = Form(False),
    file: UploadFile = File(...),
):
    """Accept a medical PDF + vitals form, extract text, run AI triage."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    content = await file.read()
    extracted_text = ""
    page_count = 0
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(doc)
        pages_text = [page.get_text() for page in doc]
        doc.close()
        extracted_text = "\n".join(pages_text).strip()
    except ImportError:
        logger.warning("PyMuPDF not installed, using raw decode fallback")
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
        except Exception:
            extracted_text = ""
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    if not extracted_text or len(extracted_text.strip()) < 10:
        raise HTTPException(status_code=422, detail="PDF appears to contain no readable text")

    # ── Structured PDF analysis ─────────────────────────────────────────
    from app.ai.pdf_analyzer import _extract_sections_rule_based, analyze_pdf_with_llm
    rule_sections = _extract_sections_rule_based(extracted_text)
    llm_analysis = await analyze_pdf_with_llm(extracted_text)

    chief = llm_analysis.get("chief_complaint") or rule_sections.get("chief_complaints", "")
    symptoms_from_llm = llm_analysis.get("symptoms_summary") or ""
    raw_symptoms = chief or symptoms_from_llm or extracted_text[:500]

    pdf_analysis = {
        "filename": file.filename,
        "page_count": page_count or rule_sections.get("page_count_estimate", 1),
        "word_count": rule_sections.get("word_count", 0),
        "raw_text": extracted_text[:5000],
        "rule_sections": {
            "vitals_raw": rule_sections.get("vitals", ""),
            "medications_raw": rule_sections.get("medications", ""),
            "diagnoses_raw": rule_sections.get("diagnoses", ""),
            "history_raw": rule_sections.get("history", ""),
            "lab_results_raw": rule_sections.get("lab_results", ""),
            "doctor_notes_raw": rule_sections.get("doctor_notes", ""),
        },
        "extracted_vitals": rule_sections.get("extracted_vitals", {}),
        "extracted_medications": rule_sections.get("extracted_medications", []),
        "llm_analysis": llm_analysis,
    }

    # Merge form vitals (patient-entered values take priority over PDF-extracted)
    form_vitals = {
        "bp_systolic": bp_systolic, "bp_diastolic": bp_diastolic,
        "blood_sugar": blood_sugar, "temperature": temperature,
        "pulse": pulse, "oxygen": oxygen,
    }
    form_history = {
        "diabetes": diabetes, "hypertension": hypertension,
        "heart_disease": heart_disease, "asthma": asthma,
        "kidney_disease": kidney_disease, "thyroid": thyroid,
        "cancer": cancer, "stroke_history": stroke_history,
    }
    form_emergency = {
        "chest_pain": chest_pain, "breathing_difficulty": breathing_difficulty,
        "loss_of_consciousness": loss_of_consciousness,
        "severe_allergic_reaction": severe_allergic_reaction,
    }

    result = await process_patient_report(
        patient_id=patient_id,
        report_data={
            "symptoms": f"[PDF: {file.filename}] {raw_symptoms[:800]}",
            "vitals": {k: v for k, v in form_vitals.items() if v is not None},
            "medical_history": form_history,
            "emergency_flags": form_emergency,
            "pdf_analysis": pdf_analysis,
        },
        patient_age=age,
    )
    return success_response(result, "PDF report analyzed and processed successfully")


@router.post("/report")
async def submit_report(body: ReportRequest):
    result = await process_patient_report(
        patient_id=body.patient_id,
        report_data={
            "symptoms": body.symptoms,
            "vitals": body.vitals.model_dump(),
            "medical_history": body.medical_history.model_dump(),
            "emergency_flags": body.emergency_flags.model_dump(),
        },
        patient_age=body.age,
    )
    return success_response(result, "Report submitted successfully")


@router.get("/queue-status/{patient_id}")
async def queue_status(patient_id: str):
    status = await get_queue_status(patient_id)
    return success_response(status)


@router.get("/report/{report_id}")
async def get_report_detail(report_id: str):
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return success_response(report)


@router.get("/{patient_id}/reports")
async def get_all_patient_reports(patient_id: str):
    """All reports for a patient (for My Reports page)."""
    reports = await get_patient_reports(patient_id)
    return success_response({"reports": reports, "total": len(reports)})


@router.get("/{patient_id}/notes")
async def patient_notes(patient_id: str):
    notes = await get_patient_notes(patient_id)
    return success_response({"notes": notes})


# ── Wildcard route LAST ────────────────────────────────────────────────────────

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    profile = await get_patient_profile(patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient not found")
    return success_response(profile)
