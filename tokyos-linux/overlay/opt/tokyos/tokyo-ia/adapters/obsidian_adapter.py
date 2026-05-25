"""
Tokyo IA — Obsidian Adapter
Integração futura com Obsidian Vault.
Nesta fase: mock de salvamento de notas.
"""

def save_note(title: str, content: str) -> dict:
    return {
        "status": "dry_run",
        "message": f"[DRY-RUN] Nota salva no Obsidian: {title}",
        "note": "Obsidian vault não configurado. Integração futura.",
        "content_preview": content[:100] if content else "",
    }

def read_note(title: str) -> dict:
    return {"status": "dry_run", "message": f"Obsidian leitura: {title} (não implementado)"}

def get_status() -> dict:
    return {"tool": "obsidian", "status": "planned"}
