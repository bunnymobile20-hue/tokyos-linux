#!/bin/bash
# Tokyo IA — Validação do Orchestrator
# Verifica se todos os componentes estão no lugar

BASE="/opt/tokyos/tokyo-ia"
ERRORS=0

check() {
    if [ -f "$1" ] || [ -d "$1" ]; then
        echo "  [OK] $1"
    else
        echo "  [MISS] $1"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "=== Tokyo IA Orchestrator Validation ==="
echo ""

echo "--- Core ---"
check "$BASE/orchestrator/__init__.py"
check "$BASE/orchestrator/command_bus.py"
check "$BASE/orchestrator/intent_router.py"
check "$BASE/orchestrator/tool_registry.py"
check "$BASE/orchestrator/action_executor.py"
check "$BASE/orchestrator/memory_loop.py"
check "$BASE/orchestrator/api.py"

echo "--- Config ---"
check "$BASE/config/tools.yaml"

echo "--- Adapters ---"
check "$BASE/adapters/browser_agent_adapter.py"
check "$BASE/adapters/firecrawl_adapter.py"
check "$BASE/adapters/mem0_adapter.py"
check "$BASE/adapters/obsidian_adapter.py"
check "$BASE/adapters/openclaw_adapter.py"
check "$BASE/adapters/hermes_adapter.py"
check "$BASE/adapters/paperclip_adapter.py"
check "$BASE/adapters/system_adapter.py"
check "$BASE/adapters/voice_adapter.py"

echo "--- Workflows ---"
check "$BASE/workflows/bunny_daily_sales.yaml"
check "$BASE/workflows/bunny_accounts_today.yaml"
check "$BASE/workflows/tokyo_system_check.yaml"

echo "--- Tests ---"
check "$BASE/tests/test_orchestrator.py"
check "$BASE/scripts/fase5/70_test_tokyo_command.sh"

echo "--- Python Import Test ---"
if python3 -c "import sys; sys.path.insert(0,'$BASE'); from orchestrator.command_bus import CommandBus; print('  [OK] command_bus importado')" 2>/dev/null; then
    :
else
    echo "  [FAIL] Import de command_bus falhou"
    ERRORS=$((ERRORS + 1))
fi

if python3 -c "import sys; sys.path.insert(0,'$BASE'); from orchestrator.intent_router import classify; print('  [OK] intent_router importado')" 2>/dev/null; then
    :
else
    echo "  [FAIL] Import de intent_router falhou"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo "=== VALIDAÇÃO COMPLETA: Todos os componentes OK ==="
else
    echo "=== $ERRORS componente(s) faltando ==="
fi
exit $ERRORS
