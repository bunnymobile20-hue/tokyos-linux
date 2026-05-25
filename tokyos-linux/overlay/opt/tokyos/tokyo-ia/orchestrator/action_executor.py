"""
Tokyo IA — Action Executor
Executa ações usando adapters.
Ações high-risk são bloqueadas e encaminhadas ao Approval Guard.
"""

import os
import sys
from typing import Optional

sys.path.insert(0, "/opt/tokyos/tokyo-ia")

from orchestrator.tool_registry import Tool, get_registry
from adapters import (
    browser_agent,
    firecrawl,
    mem0,
    system_adapter,
    hermes,
    paperclip,
)

HIGH_RISK_TOOLS = {"openclaw", "automate_browser"}


def execute(tool: Tool, params: dict) -> dict:
    risk = tool.risk_level if hasattr(tool, "risk_level") else "low"

    if risk == "high" or tool.id in HIGH_RISK_TOOLS:
        return {
            "status": "blocked",
            "action": "dry_run",
            "message": f"Ação '{tool.id}' requer aprovação. Dry-run apenas.",
            "requires_approval": True,
        }

    adapter_map = {
        "browser_agent": browser_agent,
        "firecrawl": firecrawl,
        "mem0": mem0,
        "system_monitor": system_adapter,
        "hermes": hermes,
        "paperclip": paperclip,
    }

    adapter = adapter_map.get(tool.id)
    if not adapter:
        return {"status": "error", "message": f"Adapter não encontrado: {tool.id}"}

    action = params.get("action", "default")
    handler = getattr(adapter, action, None) or getattr(adapter, f"{action}_mock", None)
    if not handler:
        handler = getattr(adapter, "get_status", lambda: {"status": "unknown"})

    try:
        result = handler(**{k: v for k, v in params.items() if k != "action"})
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
