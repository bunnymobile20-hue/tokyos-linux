"""
Tokyo IA — OpenClaw Adapter
Gateway de automação legado.
Alta risco — requer aprovação.
"""

def send_task(task: str) -> dict:
    return {
        "status": "blocked",
        "action": "dry_run",
        "message": f"[BLOQUEADO] OpenClaw task: {task}. Requer aprovação do Approval Guard.",
        "requires_approval": True,
    }

def get_status() -> dict:
    return {"tool": "openclaw", "status": "legacy", "note": "Requer aprovação para executar"}
