"""
Tokyo IA — Testes do Orchestrator
"""

import sys
import os
import json

sys.path.insert(0, "/opt/tokyos/tokyo-ia")

from orchestrator.command_bus import CommandBus, Command
from orchestrator.intent_router import classify
from orchestrator.tool_registry import ToolRegistry
from orchestrator.memory_loop import init_db, save_command, get_recent_commands


def test_command_bus():
    bus = CommandBus()
    cmd = bus.receive("abre o WinGestor", source="portal", user="tokyos")
    assert cmd.id
    assert cmd.raw_text == "abre o WinGestor"
    assert cmd.source == "portal"
    assert cmd.status == "received"
    assert len(bus.history) == 1
    print("[PASS] test_command_bus")


def test_intent_router():
    tests = [
        ("abre o WinGestor", "open_page"),
        ("abre o site da loja", "open_page"),
        ("pesquisa sobre vitrine de loja", "search_web"),
        ("pesquise sobre presentes", "search_web"),
        ("puxa relatório de vendas", "extract_report"),
        ("relatório de vendas", "extract_report"),
        ("salva na memória que amanhã temos que conferir estoque", "save_memory"),
        ("lembra de comprar papel", "save_memory"),
        ("cria uma tarefa para amanhã", "create_task"),
        ("crie uma tarefa", "create_task"),
        ("verifique o sistema", "check_system"),
        ("status do sistema", "check_system"),
        ("roda relatório diário de vendas", "run_workflow"),
        ("comando aleatório qualquer", "unknown"),
    ]
    for text, expected in tests:
        result = classify(text)
        assert result == expected, f"Falhou: '{text}' → {result} (esperado {expected})"
        print(f"  [OK] '{text[:40]}...' → {result}")
    print("[PASS] test_intent_router")


def test_tool_registry():
    registry = ToolRegistry()
    tools = registry.all()
    assert len(tools) > 0
    browser = registry.get("browser_agent")
    assert browser is not None
    assert browser.id == "browser_agent"
    assert browser.status == "active"
    tool = registry.find_by_intent("check_system")
    assert tool is not None
    assert tool.id == "system_monitor"
    print("[PASS] test_tool_registry")


def test_memory_loop():
    init_db()
    cmd_id = save_command({
        "id": "test-001",
        "source": "test",
        "user": "tokyos",
        "raw_text": "teste",
        "intent": "check_system",
        "selected_tool": "system_monitor",
        "status": "ok",
        "timestamp": "2025-01-01T00:00:00",
        "result_summary": "teste ok",
    })
    assert cmd_id == "test-001"
    recent = get_recent_commands(5)
    assert len(recent) > 0
    print("[PASS] test_memory_loop")


if __name__ == "__main__":
    test_command_bus()
    test_intent_router()
    test_tool_registry()
    test_memory_loop()
    print("\nTodos os testes passaram.")
