import logging
from typing import List
from app.ai.ml_engine import predict_diseases
from app.ai.risk_calculator import calculate_risk_score
from app.ai.decision_engine import decide_priority, get_rule_reasoning
from app.ai.llm_reasoner import generate_reasoning
from app.ai import rag_engine

logger = logging.getLogger("pulsequeue")

async def process_patient(report: dict) -> dict:
    symptoms = report.get("symptoms", "")
    vitals = {}
    v = report.get("vitals", {})
    if hasattr(v, "model_dump"):
        vitals = v.model_dump()
    elif isinstance(v, dict):
        vitals = v
    medical_history = {}
    m = report.get("medical_history", {})
    if hasattr(m, "model_dump"):
        medical_history = m.model_dump()
    elif isinstance(m, dict):
        medical_history = m
    emergency_flags = {}
    e = report.get("emergency_flags", {})
    if hasattr(e, "model_dump"):
        emergency_flags = e.model_dump()
    elif isinstance(e, dict):
        emergency_flags = e
    age = report.get("age", 30)

    try:
        prediction = predict_diseases(symptoms, vitals, medical_history)
    except Exception as ex:
        logger.error(f"ML prediction error: {ex}")
        prediction = [{"name": "General Assessment", "confidence": 0.40}]

    try:
        risk_score = calculate_risk_score(age, vitals, symptoms, emergency_flags, medical_history)
    except Exception as ex:
        logger.error(f"Risk calc error: {ex}")
        risk_score = 40.0

    priority = decide_priority(risk_score, emergency_flags)
    rule_factors = get_rule_reasoning(risk_score, priority, vitals, emergency_flags, medical_history)

    rag_context = ""
    sources = []
    try:
        rag_context, sources = rag_engine.retrieve_context(symptoms)
    except Exception as ex:
        logger.warning(f"RAG retrieval failed: {ex}")

    reasoning = {
        "risk_reason": f"Risk score {risk_score}. Priority: {priority}.",
        "supporting_factors": rule_factors,
        "sources": sources
    }
    try:
        llm_result = await generate_reasoning(symptoms, vitals, prediction, risk_score, rag_context)
        if llm_result and llm_result.get("risk_reason"):
            reasoning = {
                "risk_reason": llm_result.get("risk_reason", reasoning["risk_reason"]),
                "supporting_factors": llm_result.get("supporting_factors", rule_factors),
                "sources": llm_result.get("sources", sources)
            }
    except Exception as ex:
        logger.warning(f"LLM reasoning failed, using rules: {ex}")

    return {
        "prediction": prediction,
        "risk_score": risk_score,
        "priority": priority,
        "reasoning": reasoning
    }
