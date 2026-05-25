"""
Tokyo IA — Voice Adapter
Recebe texto transcrito por voz e envia para o Command Bus.
Nesta fase não precisa STT real.
"""

import sys
sys.path.insert(0, "/opt/tokyos/tokyo-ia")

from orchestrator.command_bus import get_bus


def handle_transcribed_text(text: str, user: str = "tokyos") -> dict:
    bus = get_bus()
    cmd = bus.receive(raw_text=text, source="voice", user=user)
    return {
        "status": "received",
        "command_id": cmd.id,
        "message": f"Comando de voz recebido: {text[:50]}...",
    }


def get_status() -> dict:
    return {"tool": "voice_adapter", "status": "active", "mode": "text_input"}
