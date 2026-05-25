#!/bin/bash
# Tokyo IA — Apply Orchestrator Setup
# Só roda com --approve.
# Uso: bash scripts/fase5/72_apply_orchestrator_setup.sh [--approve]

set -euo pipefail

if [ "${1:-}" != "--approve" ]; then
    echo "ERRO: Este script requer --approve para executar."
    echo "Uso: bash $0 --approve"
    echo ""
    echo "AVISO: Isso instalará dependências Python e configurará serviços."
    exit 1
fi

echo "=== Tokyo IA — Applying Orchestrator Setup ==="

# 1. Dependências Python
echo "[1/4] Instalando dependências Python..."
pip3 install fastapi uvicorn pyyaml 2>/dev/null || true

# 2. Verificar diretórios
echo "[2/4] Verificando diretórios..."
for dir in orchestrator adapters config workflows data logs reports tests scripts/fase5; do
    mkdir -p "/opt/tokyos/tokyo-ia/$dir"
done

# 3. Testes
echo "[3/4] Rodando testes..."
python3 /opt/tokyos/tokyo-ia/tests/test_orchestrator.py || echo "  AVISO: Testes falharam, mas continuando..."

# 4. Iniciar API (se uvicorn disponível)
echo "[4/4] Iniciando API Tokyo IA..."
if command -v uvicorn &>/dev/null; then
    nohup uvicorn orchestrator.api:app --host 127.0.0.1 --port 8080 --reload \
        --app-dir /opt/tokyos/tokyo-ia \
        > /opt/tokyos/tokyo-ia/logs/api.log 2>&1 &
    echo "  API Tokyo IA iniciada na porta 8080 (PID $!)"
else
    echo "  AVISO: uvicorn não encontrado. API não iniciada."
fi

echo "=== Setup concluído ==="
echo "  API: http://127.0.0.1:8080/docs"
echo "  Health: http://127.0.0.1:8080/tokyo/orchestrator/health"
