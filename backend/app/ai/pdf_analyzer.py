"""
PDF Medical Report Analyzer
Extracts structured sections from raw PDF text using simple NLP rules + LLM
"""
import re
import asyncio
import logging
from app.ai.llm_reasoner import _call_llm

logger = logging.getLogger("pulsequeue")

SECTION_KEYWORDS = {
    "chief_complaints": ["chief complaint", "presenting complaint", "reason for visit", "patient complaints", "complaints"],
    "symptoms": ["symptoms", "symptom", "signs and symptoms", "clinical features"],
    "diagnoses": ["diagnosis", "diagnoses", "impression", "assessment", "clinical diagnosis", "differential"],
    "medications": ["medication", "medicines", "drugs", "prescription", "treatment", "therapy", "dose"],
    "vitals": ["vital", "blood pressure", "pulse", "temperature", "oxygen", "bmi", "weight", "height", "spo2"],
    "lab_results": ["laboratory", "lab result", "report", "cbc", "blood test", "urine", "culture", "biopsy", "hemoglobin", "hba1c", "creatinine"],
    "history": ["history", "past medical", "family history", "surgical history", "allergy", "allergies"],
    "doctor_notes": ["note", "impression", "plan", "recommendation", "advice", "follow up", "refer"],
}

def _extract_sections_rule_based(text: str) -> dict:
    """Simple rule-based section extraction from PDF text."""
    lines = text.split("\n")
    sections: dict = {k: [] for k in SECTION_KEYWORDS}
    sections["raw_text"] = text[:3000]
    
    current_section = None
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        lower = line_clean.lower()
        
        # Check if this line is a section header
        matched = False
        for section, keywords in SECTION_KEYWORDS.items():
            if any(kw in lower for kw in keywords) and len(line_clean) < 80:
                current_section = section
                matched = True
                break
        
        if not matched and current_section and len(line_clean) > 5:
            sections[current_section].append(line_clean)
    
    # Convert lists to strings
    result = {}
    for k, v in sections.items():
        if k == "raw_text":
            result[k] = v
        elif isinstance(v, list):
            result[k] = "\n".join(v[:10]) if v else ""
        else:
            result[k] = v
    
    # Extract key values using regex
    result["extracted_vitals"] = _extract_vitals(text)
    result["extracted_medications"] = _extract_medications(text)
    result["word_count"] = len(text.split())
    result["page_count_estimate"] = max(1, len(text) // 2000)
    
    return result


def _extract_vitals(text: str) -> dict:
    """Extract vital signs from text using regex."""
    vitals = {}
    patterns = {
        "bp": r"(?:BP|Blood Pressure)[:\s]+(\d{2,3})[/\\](\d{2,3})",
        "pulse": r"(?:Pulse|HR|Heart Rate)[:\s]+(\d{2,3})",
        "temperature": r"(?:Temp|Temperature)[:\s]+(\d{2,3}(?:\.\d)?)",
        "oxygen": r"(?:SpO2|Oxygen Saturation|O2 Sat)[:\s]+(\d{2,3})",
        "blood_sugar": r"(?:Blood Sugar|Glucose|BSL|FBS|RBS)[:\s]+(\d{2,4})",
        "hemoglobin": r"(?:Hb|Hemoglobin)[:\s]+(\d{1,2}(?:\.\d)?)",
        "bmi": r"BMI[:\s]+(\d{1,2}(?:\.\d)?)",
    }
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if key == "bp":
                vitals["bp"] = f"{match.group(1)}/{match.group(2)} mmHg"
            else:
                vitals[key] = match.group(1)
    return vitals


def _extract_medications(text: str) -> list:
    """Extract medication names from text."""
    common_drugs = [
        "metformin", "amlodipine", "lisinopril", "atorvastatin", "aspirin",
        "omeprazole", "paracetamol", "amoxicillin", "azithromycin", "ciprofloxacin",
        "losartan", "atenolol", "insulin", "glibenclamide", "ramipril",
        "pantoprazole", "clopidogrel", "warfarin", "furosemide", "spironolactone",
        "metoprolol", "salbutamol", "budesonide", "prednisolone", "dexamethasone",
        "vitamin d", "calcium", "iron", "folic acid", "b12", "multivitamin"
    ]
    found = []
    lower = text.lower()
    for drug in common_drugs:
        if drug in lower:
            found.append(drug.title())
    return list(set(found))[:10]


async def analyze_pdf_with_llm(text: str) -> dict:
    """Use LLM to extract structured medical data from PDF text."""
    prompt = f"""You are a medical AI. Extract structured information from this medical report text.

REPORT TEXT:
{text[:2500]}

Return ONLY valid JSON with these exact fields:
{{
  "chief_complaint": "main reason for visit in 1-2 sentences",
  "symptoms_summary": "list of symptoms as comma-separated string",
  "diagnoses": ["diagnosis1", "diagnosis2"],
  "key_medications": ["drug1", "drug2"],
  "critical_findings": "any urgent/alarming findings in 1 sentence or empty string",
  "doctor_instructions": "key recommendations in 1-2 sentences or empty string",
  "risk_factors": ["factor1", "factor2"],
  "follow_up": "follow-up instructions or empty string"
}}

If information is not found in the text, use empty string or empty array.
Respond ONLY with valid JSON."""

    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _call_llm, prompt),
            timeout=25
        )
        return result
    except Exception as e:
        logger.warning(f"LLM PDF analysis failed: {e}, using rule-based fallback")
        return {}
