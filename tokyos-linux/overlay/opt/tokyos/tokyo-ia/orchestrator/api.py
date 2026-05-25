"""
Tokyo IA — Orchestrator API
Endpoints FastAPI para o cérebro Tokyo IA.
"""

import json
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.insert(0, "/opt/tokyos/tokyo-ia")

from orchestrator.command_bus import get_bus, Command
from orchestrator.intent_router import classify
from orchestrator.tool_registry import get_registry
from orchestrator.action_executor import execute
from orchestrator.memory_loop import (
    save_command,
    save_memory,
    get_recent_commands,
    get_recent_memories,
)

app = FastAPI(title="Tokyo IA Orchestrator", version="0.1.0")

ACTION_LOG = "/opt/tokyos/tokyo-ia/logs/tokyo_actions.jsonl"


class CommandRequest(BaseModel):
    raw_text: str
    source: str = "portal"
    user: str = "tokyos"


class MemoryRequest(BaseModel):
    content: str
    user: str = "tokyos"
    context: str = "geral"


class WorkflowRunRequest(BaseModel):
    workflow_id: str
    params: dict = {}


def _log_action(cmd: Command, intent: str, tool_id: Optional[str], risk: str, status: str, result: str, error: Optional[str] = None):
    os.makedirs(os.path.dirname(ACTION_LOG), exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "command_id": cmd.id,
        "source": cmd.source,
        "user": cmd.user,
        "intent": intent,
        "tool": tool_id,
        "risk_level": risk,
        "status": status,
        "result": result[:200] if result else "",
        "error": error,
    }
    with open(ACTION_LOG, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


@app.post("/tokyo/command")
def handle_command(req: CommandRequest):
    bus = get_bus()
    registry = get_registry()

    cmd = bus.receive(raw_text=req.raw_text, source=req.source, user=req.user)
    intent = classify(cmd.raw_text)
    tool = registry.find_by_intent(intent)

    tool_id = tool.id if tool else None
    risk = tool.risk_level if tool else "low"
    cmd.intent = intent
    cmd.selected_tool = tool_id

    if not tool:
        cmd.status = "unknown_intent"
        bus.update(cmd, status="unknown_intent")
        _log_action(cmd, intent, None, "low", "unknown", "Intenção não reconhecida")
        save_command(cmd.to_dict())
        return {
            "command_id": cmd.id,
            "intent": intent,
            "selected_tool": None,
            "status": "unknown",
            "message": "Intenção não reconhecida. Tente reformular.",
            "requires_approval": False,
        }

    params = {"action": "default", "url": cmd.raw_text, "prompt": cmd.raw_text}
    action_result = execute(tool, params)

    cmd.status = action_result.get("status", "error")
    cmd.result = action_result
    bus.update(cmd, status=cmd.status, result=action_result)

    _log_action(
        cmd, intent, tool_id, risk,
        action_result.get("status", "error"),
        str(action_result.get("result", action_result.get("message", ""))),
        action_result.get("error"),
    )

    save_command(cmd.to_dict())

    return {
        "command_id": cmd.id,
        "intent": intent,
        "selected_tool": tool_id,
        "status": action_result.get("status", "error"),
        "result_summary": action_result.get("result", action_result.get("message", "")),
        "requires_approval": action_result.get("requires_approval", False),
        "raw_result": action_result,
    }


@app.get("/tokyo/commands/recent")
def list_commands(limit: int = 10):
    return {"commands": get_recent_commands(limit)}


@app.get("/tokyo/tools")
def list_tools():
    registry = get_registry()
    return {"tools": registry.list_status()}


@app.get("/tokyo/tools/status")
def tool_status():
    registry = get_registry()
    return {"tools": [{"id": t.id, "name": t.name, "status": t.status} for t in registry.all()]}


@app.get("/tokyo/memory/recent")
def recent_memory(limit: int = 5):
    return {"memories": get_recent_memories(limit)}


@app.post("/tokyo/memory/add")
def add_memory(req: MemoryRequest):
    mem_id = save_memory(user=req.user, context=req.context, content=req.content)
    return {"status": "ok", "memory_id": mem_id}


@app.post("/tokyo/workflows/run")
def run_workflow(req: WorkflowRunRequest):
    return {
        "status": "dry_run",
        "workflow_id": req.workflow_id,
        "message": f"[DRY-RUN] Workflow {req.workflow_id} seria executado com params: {req.params}",
        "note": "Workflow engine em construção.",
    }


@app.get("/tokyo/orchestrator/health")
def health():
    return {"status": "online", "service": "Tokyo IA Orchestrator", "version": "0.1.0"}
