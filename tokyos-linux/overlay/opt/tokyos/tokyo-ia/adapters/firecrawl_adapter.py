"""
Tokyo IA — Firecrawl Adapter
Extração de dados de URLs via Firecrawl.
Desativado se Firecrawl não estiver configurado.
"""

import os
import urllib.request
import json

FIRECRAWL_URL = os.environ.get("FIRECRAWL_URL", "http://127.0.0.1:3002")
FIRECRAWL_KEY = os.environ.get("FIRECRAWL_KEY", "")


def _is_configured() -> bool:
    return bool(FIRECRAWL_KEY)


def dry_run_extract(url: str) -> dict:
    return {
        "status": "dry_run",
        "message": f"[DRY-RUN] Firecrawl extrairia: {url}",
        "firecrawl_configured": _is_configured(),
        "note": "Configure FIRECRAWL_KEY para ativar extração real.",
    }


def extract_url(url: str) -> dict:
    if not _is_configured():
        return dry_run_extract(url)
    try:
        req = urllib.request.Request(
            f"{FIRECRAWL_URL}/v1/crawl",
            data=json.dumps({"url": url}).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {FIRECRAWL_KEY}"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        return {"status": "ok", "result": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_status() -> dict:
    return {
        "tool": "firecrawl",
        "status": "configured" if _is_configured() else "inactive",
        "endpoint": FIRECRAWL_URL,
    }
