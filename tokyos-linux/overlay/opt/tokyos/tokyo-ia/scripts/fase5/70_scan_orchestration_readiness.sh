#!/bin/bash
# Tokyo IA — Scan de readiness para orquestração
# Verifica se o ambiente está pronto para receber a Tokyo IA Orchestration Layer

echo "=== Tokyo IA — Orchestration Readiness Scan ==="
echo ""

PASS=0
FAIL=0

check() {
    local desc="$1"
    local cond="$2"
    if eval "$cond" 2>/dev/null; then
        echo "  [OK] $desc"
        PASS=$((PASS + 1))
    else
        echo "  [FAIL] $desc"
        FAIL=$((FAIL + 1))
    fi
}

echo "--- Python ---"
check "Python3 disponível" "command -v python3"
check "yaml library" "python3 -c 'import yaml' 2>/dev/null"

echo "--- FastAPI ---"
check "FastAPI disponível" "python3 -c 'import fastapi' 2>/dev/null || pip3 install fastapi uvicorn 2>/dev/null; python3 -c 'import fastapi' 2>/dev/null"

echo "--- Diretórios ---"
check "/opt/tokyos existe" "test -d /opt/tokyos"
check "/opt/tokyos/tokyo-ia existe" "test -d /opt/tokyos/tokyo-ia"

echo "--- Backend ---"
check "Backend TokyOS na 3001" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ 2>/dev/null | grep -q 200"

echo "--- Dependências futuras ---"
check "Chromium" "command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || command -v google-chrome 2>/dev/null || echo 'not found'"
check "systemctl" "command -v systemctl 2>/dev/null || echo 'not found'"

echo ""
echo "=== Scan concluído: $PASS ok, $FAIL falhas ==="
exit $FAIL
