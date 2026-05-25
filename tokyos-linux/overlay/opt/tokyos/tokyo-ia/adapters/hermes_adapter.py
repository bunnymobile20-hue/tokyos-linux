"""
Tokyo IA — Hermes Adapter
Agente de raciocínio e RPA.
Chama API do Hermes Agent.
"""

import urllib.request
import json

HERMES_URL = "http://127.0.0.1:3001/api"


def reason(prompt: str) -> dict:
    try:
        req = urllib.request.Request(
            f"{HERMES_URL}/hermes/reason",
            data=json.dumps({"prompt": prompt}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return {"status": "ok", "result": data}
    except Exception as e:
        return {"status": "dry_run", "message": f"Hermes não disponível: {e}", "prompt": prompt}


def get_status() -> dict:
    try:
        req = urllib.request.Request(f"{HERMES_URL}/system/hermes/status")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return {"tool": "hermes", "status": "online" if resp.status == 200 else "error"}
    except Exception:
        return {"tool": "hermes", "status": "offline"}
