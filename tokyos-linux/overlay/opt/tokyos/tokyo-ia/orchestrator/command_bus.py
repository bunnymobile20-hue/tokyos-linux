"""
Tokyo IA — Command Bus
Recebe comandos de qualquer fonte (voz, portal, chat, workflow, API)
e os transforma em objetos padronizados.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

COMMAND_LOG = "/opt/tokyos/tokyo-ia/logs/commands.jsonl"

class Command:
    def __init__(
        self,
        raw_text: str,
        source: str = "portal",
        user: str = "tokyos",
        command_id: Optional[str] = None,
    ):
        self.id = command_id or str(uuid.uuid4())[:8]
        self.source = source
        self.user = user
        self.raw_text = raw_text.strip()
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.status = "received"
        self.intent = None
        self.selected_tool = None
        self.result = None
        self.error = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source": self.source,
            "user": self.user,
            "raw_text": self.raw_text,
            "timestamp": self.timestamp,
            "status": self.status,
            "intent": self.intent,
            "selected_tool": self.selected_tool,
            "result": self.result,
            "error": self.error,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class CommandBus:
    def __init__(self):
        self.history: list[Command] = []

    def receive(self, raw_text: str, source: str = "portal", user: str = "tokyos") -> Command:
        cmd = Command(raw_text=raw_text, source=source, user=user)
        self.history.append(cmd)
        self._log(cmd)
        return cmd

    def update(self, cmd: Command, **kwargs) -> Command:
        for k, v in kwargs.items():
            setattr(cmd, k, v)
        self._log(cmd)
        return cmd

    def recent(self, limit: int = 10) -> list[dict]:
        return [c.to_dict() for c in self.history[-limit:]]

    def _log(self, cmd: Command):
        import os
        os.makedirs(os.path.dirname(COMMAND_LOG), exist_ok=True)
        with open(COMMAND_LOG, "a") as f:
            f.write(cmd.to_json() + "\n")


_bus: Optional[CommandBus] = None

def get_bus() -> CommandBus:
    global _bus
    if _bus is None:
        _bus = CommandBus()
    return _bus
