"""
Tokyo IA — Mem0 Adapter
Adiciona e busca memórias.
Nesta fase: usa memory_loop SQLite local.
"""

import sys
sys.path.insert(0, "/opt/tokyos/tokyo-ia")

from orchestrator.memory_loop import save_memory, get_recent_memories


def add_memory(content: str, user: str = "tokyos", context: str = "geral") -> dict:
    mem_id = save_memory(user=user, context=context, content=content)
    return {
        "status": "ok",
        "memory_id": mem_id,
        "message": "Memória salva.",
    }


def search_memory(query: str) -> dict:
    mems = get_recent_memories(10)
    results = [m for m in mems if query.lower() in m.get("content", "").lower()]
    return {"status": "ok", "results": results[:5]}


def get_status() -> dict:
    return {"tool": "mem0", "status": "active", "mode": "sqlite_local"}
