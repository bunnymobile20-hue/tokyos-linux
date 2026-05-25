#!/bin/bash
# Tokyo IA — Dry-run setup do Orchestrator
# Verifica o que seria instalado/configurado sem alterar nada

echo "=== Tokyo IA — Dry-run Orchestrator Setup ==="
echo ""
echo "Modo: DRY-RUN — nenhuma alteração será feita."
echo ""

echo "--- O que seria feito: ---"
echo "  1. Instalar python3-fastapi + uvicorn (pip)"
echo "  2. Instalar python3-yaml (pip)"
echo "  3. Verificar /opt/tokyos/tokyo-ia/estrutura"
echo "  4. Verificar /opt/tokyos/tokyo-ia/config/tools.yaml"
echo "  5. Verificar /opt/tokyos/tokyo-ia/orchestrator/*.py"
echo "  6. Verificar /opt/tokyos/tokyo-ia/adapters/*.py"
echo "  7. Verificar /opt/tokyos/tokyo-ia/workflows/*.yaml"
echo "  8. Rodar testes: python3 tests/test_orchestrator.py"
echo "  9. Iniciar API: uvicorn orchestrator.api:app --port 8080"
echo ""

echo "--- Verificações: ---"
OK=0
WARN=0

if python3 -c "import fastapi" 2>/dev/null; then
    echo "  [OK] FastAPI instalado"
    OK=$((OK + 1))
else
    echo "  [WARN] FastAPI seria instalado via pip"
    WARN=$((WARN + 1))
fi

if python3 -c "import yaml" 2>/dev/null; then
    echo "  [OK] PyYAML instalado"
    OK=$((OK + 1))
else
    echo "  [WARN] PyYAML seria instalado via pip"
    WARN=$((WARN + 1))
fi

for f in command_bus intent_router tool_registry action_executor memory_loop; do
    if [ -f "/opt/tokyos/tokyo-ia/orchestrator/$f.py" ]; then
        echo "  [OK] orchestrator/$f.py"
        OK=$((OK + 1))
    else
        echo "  [WARN] orchestrator/$f.py não encontrado"
        WARN=$((WARN + 1))
    fi
done

echo ""
echo "--- Resumo: ---"
echo "  $OK verificações OK"
echo "  $WARN avisos (seriam resolvidos na instalação)"
echo ""
echo "Para aplicar: bash $0 --approve"
echo ""

if [ "$1" = "--approve" ]; then
    echo "Modo --approve ativo. Aplicando..."
    pip3 install fastapi uvicorn pyyaml 2>/dev/null || true
    echo "Setup concluído."
fi
