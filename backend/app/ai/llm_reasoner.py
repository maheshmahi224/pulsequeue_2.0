import asyncio
import logging
from typing import List
from openai import OpenAI
from app.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

logger = logging.getLogger("pulsequeue")

_client = None

def get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=LLM_BASE_URL,
            api_key=LLM_API_KEY,
            timeout=12,          # hard HTTP-level timeout
            max_retries=0,       # fail fast, no retries
        )
    return _client

SYSTEM_PROMPT = (
    "You are a clinical AI triage assistant. "
    "Respond ONLY with valid JSON. Be concise."
)

def build_prompt(symptoms: str, vitals: dict, prediction: list, risk_score: float) -> str:
    # Compact vitals — skip None values
    vitals_str = ", ".join(
        f"{k}:{v}" for k, v in vitals.items() if v is not None
    )[:200]
    pred_str = ", ".join(
        f"{d['name']}({int(d['confidence']*100)}%)" for d in prediction[:2]
    )
    # Keep prompt SHORT — fewer tokens = faster response
    return (
        f"Symptoms: {symptoms[:300]}\n"
        f"Vitals: {vitals_str or 'none'}\n"
        f"ML: {pred_str or 'none'} | Risk: {risk_score}/100\n\n"
        "Return JSON: {\"risk_reason\":\"2 sentences\","
        "\"supporting_factors\":[\"factor1\",\"factor2\",\"factor3\"],"
        "\"sources\":[]}"
    )

async def generate_reasoning(
    symptoms: str, vitals: dict, prediction: list,
    risk_score: float, context: str = ""
) -> dict:
    try:
        prompt = build_prompt(symptoms, vitals, prediction, risk_score)
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _call_llm, prompt),
            timeout=10          # reduced from previous value
        )
        return result
    except asyncio.TimeoutError:
        logger.warning("LLM reasoning timed out — using fast fallback")
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
                {"role": "user",   "content": prompt}
            ],
            max_tokens=200,      # was 400 — halved for speed
            temperature=0.1,     # lower = faster + more deterministic
            stream=False,
        )
        raw = response.choices[0].message.content.strip()
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
        factors.append(f"High BP: {vitals['bp_systolic']} mmHg")
    if (vitals.get("oxygen") or 100) < 92:
        factors.append(f"Low SpO2: {vitals['oxygen']}%")
    if (vitals.get("blood_sugar") or 0) > 300:
        factors.append(f"High glucose: {vitals['blood_sugar']} mg/dL")
    if prediction:
        factors.append(f"Likely: {prediction[0]['name']}")
    if not factors:
        factors = [f"Risk score: {risk_score}/100 based on clinical parameters"]
    return {
        "risk_reason": f"Risk score {risk_score}/100. AI reasoning unavailable; rule-based assessment applied.",
        "supporting_factors": factors,
        "sources": [],
    }
