"""
Tokyo IA — Tool Registry
Gerencia o cadastro de ferramentas disponíveis e suas capacidades.
Carrega config de tools.yaml.
"""

import os
import yaml
from typing import Optional

TOOLS_CONFIG = "/opt/tokyos/tokyo-ia/config/tools.yaml"


class Tool:
    def __init__(self, data: dict):
        self.id: str = data.get("id", "unknown")
        self.name: str = data.get("name", self.id)
        self.role: str = data.get("role", "")
        self.status: str = data.get("status", "unknown")
        self.endpoint: Optional[str] = data.get("endpoint")
        self.command: Optional[str] = data.get("command")
        self.risk_level: str = data.get("risk_level", "low")
        self.requires_approval: bool = data.get("requires_approval", False)
        self.capabilities: list[str] = data.get("capabilities", [])
        self.input_schema: dict = data.get("input_schema", {})
        self.output_schema: dict = data.get("output_schema", {})

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "endpoint": self.endpoint,
            "command": self.command,
            "risk_level": self.risk_level,
            "requires_approval": self.requires_approval,
            "capabilities": self.capabilities,
        }


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}
        self._load()

    def _load(self):
        if not os.path.exists(TOOLS_CONFIG):
            self._tools = {}
            return
        with open(TOOLS_CONFIG) as f:
            data = yaml.safe_load(f) or {}
        for item in data.get("tools", []):
            tool = Tool(item)
            self._tools[tool.id] = tool

    def get(self, tool_id: str) -> Optional[Tool]:
        return self._tools.get(tool_id)

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def list_status(self) -> list[dict]:
        return [t.to_dict() for t in self._tools.values()]

    def find_by_intent(self, intent: str) -> Optional[Tool]:
        mapping = {
            "open_page": "browser_agent",
            "search_web": "firecrawl",
            "extract_report": "browser_agent",
            "save_memory": "mem0",
            "create_task": "tokyo_planner",
            "run_workflow": "tokyo_planner",
            "check_system": "system_monitor",
            "ask_agent": "hermes",
            "automate_browser": "browser_agent",
        }
        tool_id = mapping.get(intent)
        return self._tools.get(tool_id) if tool_id else None


_registry: Optional[ToolRegistry] = None

def get_registry() -> ToolRegistry:
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry
