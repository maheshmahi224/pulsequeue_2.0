import asyncio
import logging
from typing import List
from openai import OpenAI
from app.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, AI_TIMEOUT

logger = logging.getLogger("pulsequeue")

_client = None

def get_client():
    global _client
    if _client is None:
        _client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)
    return _client

SYSTEM_PROMPT = """You are a clinical AI assistant for PulseQueue, a hospital triage support system.
Your ONLY job is to explain medical risk factors based on the provided patient data.
You MUST NOT diagnose, prescribe, or assign priority.
You MUST reason only from the provided symptoms, vitals, and medical context.
If evidence is insufficient, say "Insufficient clinical data for detailed reasoning."
Always respond in the specified JSON format."""

def build_prompt(symptoms: str, vitals: dict, prediction: list, risk_score: float, context: str = "") -> str:
    vitals_str = ", ".join([f"{k}: {v}" for k, v in vitals.items() if v is not None])
    pred_str = ", ".join([f"{d['name']} ({int(d['confidence']*100)}%)" for d in prediction[:3]])
    ctx_section = f"\nMedical Context:\n{context}" if context else ""
    return f"""Patient Information:
Symptoms: {symptoms}
Vitals: {vitals_str or 'Not provided'}
ML Predictions: {pred_str or 'None'}
Risk Score: {risk_score}/100
{ctx_section}

Explain the key risk factors for this patient in structured JSON with fields:
- risk_reason: Brief explanation (2-3 sentences)
- supporting_factors: List of 3-5 specific risk factors
- sources: List of any referenced guidelines or knowledge

Respond ONLY with valid JSON, nothing else."""

async def generate_reasoning(symptoms: str, vitals: dict, prediction: list, risk_score: float, context: str = "") -> dict:
    try:
        prompt = build_prompt(symptoms, vitals, prediction, risk_score, context)
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _call_llm, prompt),
            timeout=AI_TIMEOUT
        )
        return result
    except asyncio.TimeoutError:
        logger.warning("LLM reasoning timed out, using fallback")
        return _fallback_reasoning(vitals, prediction, risk_score)
    except Exception as e:
        logger.error(f"LLM reasoning failed: {e}")
        return _fallback_reasoning(vitals, prediction, risk_score)

def _call_llm(prompt: str) -> dict:
    import json
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400,
            temperature=0.2
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        raise

def _fallback_reasoning(vitals: dict, prediction: list, risk_score: float) -> dict:
    factors = []
    if (vitals.get("bp_systolic") or 0) > 160:
        factors.append(f"Elevated blood pressure ({vitals['bp_systolic']} mmHg)")
    if (vitals.get("oxygen") or 100) < 92:
        factors.append(f"Low oxygen saturation ({vitals['oxygen']}%)")
    if (vitals.get("blood_sugar") or 0) > 300:
        factors.append(f"Elevated blood sugar ({vitals['blood_sugar']} mg/dL)")
    if prediction:
        factors.append(f"Likely condition: {prediction[0]['name']}")
    if not factors:
        factors = [f"Clinical risk score: {risk_score}/100"]
    return {
        "risk_reason": f"AI reasoning unavailable. Risk score {risk_score} determined by clinical parameters.",
        "supporting_factors": factors,
        "sources": ["Rule-based clinical protocol"]
    }
