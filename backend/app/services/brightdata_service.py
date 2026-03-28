"""
brightdata_service.py
─────────────────────
Uses Bright Data's Web Unlocker API to fetch live medical reference data from
public health sites (MedlinePlus, WHO, PubMed search) and injects it into the
RAG knowledge base so the AI triage engine uses up-to-date clinical evidence.

Strategy
────────
• At app startup  → fetch medical pages for key emergency conditions
• Cache results   → 24-hour TTL on disk (rag-knowledge/brightdata_cache/)
• Fallback        → if Bright Data is unreachable, RAG uses existing .txt files
• Zero impact     → completely isolated; existing code paths untouched if disabled
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import httpx

from app.config import (
    BRIGHTDATA_API_KEY,
    BRIGHTDATA_CACHE_TTL_HOURS,
    BRIGHTDATA_ENABLED,
    RAG_DOCS_PATH,
)

logger = logging.getLogger("pulsequeue")

# ── Constants ────────────────────────────────────────────────────────────────

BRIGHTDATA_UNLOCKER_URL = "https://api.brightdata.com/request"
CACHE_DIR = Path("rag-knowledge/brightdata_cache")
ENRICHED_DIR = Path(RAG_DOCS_PATH)

# Public medical reference pages to scrape — only static, public, non-PII pages
MEDICAL_REFERENCE_URLS = [
    # MedlinePlus emergency conditions (public US National Library of Medicine)
    "https://medlineplus.gov/heartattack.html",
    "https://medlineplus.gov/stroke.html",
    "https://medlineplus.gov/sepsis.html",
    "https://medlineplus.gov/chestpain.html",
    "https://medlineplus.gov/breathingproblems.html",
    "https://medlineplus.gov/diabeticcoma.html",
    "https://medlineplus.gov/lowbloodpressure.html",
    "https://medlineplus.gov/hypertension.html",
    "https://medlineplus.gov/pulmonaryembolism.html",
    "https://medlineplus.gov/kidneyfailure.html",
]

# Labels for each URL — used as filenames for enriched RAG docs
URL_LABELS = {
    "heartattack": "Heart Attack (Myocardial Infarction)",
    "stroke": "Acute Stroke",
    "sepsis": "Sepsis & Septic Shock",
    "chestpain": "Chest Pain — Differential Diagnosis",
    "breathingproblems": "Respiratory Distress & Breathing Problems",
    "diabeticcoma": "Diabetic Coma & Hyperglycaemic Emergencies",
    "lowbloodpressure": "Hypotension & Shock States",
    "hypertension": "Hypertensive Crisis",
    "pulmonaryembolism": "Pulmonary Embolism",
    "kidneyfailure": "Acute Kidney Injury & Renal Failure",
}


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_key(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()

def _cache_path(url: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{_cache_key(url)}.json"

def _is_cache_valid(url: str) -> bool:
    path = _cache_path(url)
    if not path.exists():
        return False
    meta = json.loads(path.read_text())
    age_hours = (time.time() - meta.get("fetched_at", 0)) / 3600
    return age_hours < BRIGHTDATA_CACHE_TTL_HOURS

def _read_cache(url: str) -> Optional[str]:
    path = _cache_path(url)
    if path.exists():
        meta = json.loads(path.read_text())
        return meta.get("text", "")
    return None

def _write_cache(url: str, text: str):
    path = _cache_path(url)
    path.write_text(json.dumps({"url": url, "fetched_at": time.time(), "text": text}))


# ── Bright Data fetch ─────────────────────────────────────────────────────────

async def _fetch_via_brightdata(url: str, timeout: int = 20) -> Optional[str]:
    """
    Fetch a URL through Bright Data Web Unlocker, returns plain text.
    Falls back to direct httpx fetch if Bright Data returns an error.
    MedlinePlus is a US government site — public and no IP blocking.
    """
    import re

    def _strip_html(raw: str) -> str:
        raw = re.sub(r"<script[^>]*>.*?</script>", " ", raw, flags=re.DOTALL)
        raw = re.sub(r"<style[^>]*>.*?</style>", " ", raw, flags=re.DOTALL)
        raw = re.sub(r"<[^>]+>", " ", raw)
        raw = re.sub(r"\s+", " ", raw).strip()
        lines = [l.strip() for l in raw.split(".") if len(l.strip()) > 40]
        return ". ".join(lines[:200])

    # ── Try Bright Data Web Unlocker (multiple zone name variants) ────────────
    zone_candidates = ["web_unlocker1", "web_unlocker", "unlocker", "residential"]
    headers = {
        "Authorization": f"Bearer {BRIGHTDATA_API_KEY}",
        "Content-Type": "application/json",
    }
    for zone in zone_candidates:
        payload = {"zone": zone, "url": url, "format": "raw", "method": "GET"}
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(BRIGHTDATA_UNLOCKER_URL, headers=headers, json=payload)
                if resp.status_code == 200 and len(resp.text) > 200:
                    logger.info(f"[BrightData] ✓ zone='{zone}' succeeded for {url}")
                    return _strip_html(resp.text)
                else:
                    logger.debug(
                        f"[BrightData] zone='{zone}' → {resp.status_code}: {resp.text[:120]}"
                    )
        except Exception as e:
            logger.debug(f"[BrightData] zone='{zone}' exception: {e}")

    # ── Fallback: direct httpx request (MedlinePlus is public) ───────────────
    logger.info(f"[BrightData] All zones failed → falling back to direct fetch: {url}")
    try:
        async with httpx.AsyncClient(
            timeout=15,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; PulseQueue-MedRef/1.0; "
                    "+https://github.com/maheshmahi224/pulsequeue_2.0)"
                )
            },
            follow_redirects=True,
        ) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and len(resp.text) > 200:
                logger.info(f"[BrightData] Direct fetch OK: {url}")
                return _strip_html(resp.text)
            else:
                logger.warning(f"[BrightData] Direct fetch failed ({resp.status_code}): {url}")
                return None
    except Exception as e:
        logger.warning(f"[BrightData] Direct fetch exception for {url}: {e}")
        return None


# ── Enrichment writer ─────────────────────────────────────────────────────────

def _label_for_url(url: str) -> str:
    for key, label in URL_LABELS.items():
        if key in url:
            return label
    return url.split("/")[-1].replace(".html", "").replace("-", " ").title()

def _write_enriched_doc(url: str, text: str):
    """Write scraped content as a .txt file into the RAG docs directory."""
    ENRICHED_DIR.mkdir(parents=True, exist_ok=True)
    label = _label_for_url(url)
    safe_name = label.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("&", "and")
    out_path = ENRICHED_DIR / f"bd_{safe_name}.txt"
    header = f"=== BRIGHT DATA — LIVE MEDICAL REFERENCE ===\nCondition: {label}\nSource: {url}\n\n"
    out_path.write_text(header + text, encoding="utf-8")
    logger.info(f"[BrightData] Enriched RAG doc written: {out_path.name} ({len(text)} chars)")


# ── Main entry point ──────────────────────────────────────────────────────────

async def enrich_rag_knowledge_base() -> int:
    """
    Fetch live medical reference pages via Bright Data and inject them
    into the RAG knowledge base.  Returns number of docs successfully written.

    Must be called BEFORE rag_engine.init_rag() so the new docs are indexed.
    """
    if not BRIGHTDATA_ENABLED:
        logger.info("[BrightData] Disabled by config — skipping enrichment")
        return 0

    logger.info(f"[BrightData] Starting RAG knowledge base enrichment ({len(MEDICAL_REFERENCE_URLS)} URLs)")

    tasks = [_enrich_one(url) for url in MEDICAL_REFERENCE_URLS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    written = sum(1 for r in results if r is True)
    logger.info(f"[BrightData] Enrichment complete — {written}/{len(MEDICAL_REFERENCE_URLS)} docs written")
    return written


async def _enrich_one(url: str) -> bool:
    """Fetch one URL (with caching) and write to RAG docs. Returns True on success."""
    try:
        # Try cache first
        if _is_cache_valid(url):
            text = _read_cache(url)
            if text:
                _write_enriched_doc(url, text)
                logger.debug(f"[BrightData] Cache hit: {url}")
                return True

        # Fetch via Bright Data
        text = await _fetch_via_brightdata(url)
        if text and len(text) > 200:
            _write_cache(url, text)
            _write_enriched_doc(url, text)
            return True
        else:
            logger.warning(f"[BrightData] Empty/short response for {url}")
            return False
    except Exception as e:
        logger.error(f"[BrightData] Error processing {url}: {e}")
        return False


async def refresh_cache_background():
    """
    Background task to refresh expired cache entries.
    Call periodically (e.g., every 12 hours) to keep RAG data fresh.
    """
    expired = [url for url in MEDICAL_REFERENCE_URLS if not _is_cache_valid(url)]
    if expired:
        logger.info(f"[BrightData] Background refresh: {len(expired)} expired entries")
        for url in expired:
            await _enrich_one(url)
            await asyncio.sleep(1)  # gentle pacing
