#!/bin/bash
# Tokyo IA — Teste de comando via API
# Uso: bash scripts/fase5/70_test_tokyo_command.sh

BASE_URL="http://127.0.0.1:3001"
PASS=0
FAIL=0

test_cmd() {
    local desc="$1"
    local payload="$2"
    local expected_intent="$3"

    echo -n "[TEST] $desc ... "
    response=$(curl -s -X POST "$BASE_URL/tokyo/command" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null)

    intent=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('intent',''))" 2>/dev/null)

    if [ "$intent" = "$expected_intent" ]; then
        echo "OK (intent=$intent)"
        PASS=$((PASS + 1))
    else
        echo "FAIL: esperado=$expected_intent obtido=$intent"
        echo "  response: $response"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Tokyo IA Command Tests ==="
echo ""

test_cmd "Abrir WinGestor" \
    '{"raw_text":"abre o WinGestor","source":"portal","user":"tokyos"}' \
    "open_page"

test_cmd "Salvar memoria" \
    '{"raw_text":"salva na memória que amanhã temos que conferir estoque","source":"portal","user":"tokyos"}' \
    "save_memory"

test_cmd "Verificar sistema" \
    '{"raw_text":"verifique o sistema","source":"portal","user":"tokyos"}' \
    "check_system"

test_cmd "Pesquisar web" \
    '{"raw_text":"pesquise sobre vitrine de loja de presentes","source":"portal","user":"tokyos"}' \
    "search_web"

test_cmd "Rodar workflow" \
    '{"raw_text":"rode relatório diário de vendas","source":"portal","user":"tokyos"}' \
    "run_workflow"

test_cmd "Comando desconhecido" \
    '{"raw_text":"xablau aleatório","source":"portal","user":"tokyos"}' \
    "unknown"

echo ""
echo "=== Resultado: $PASS passaram, $FAIL falharam ==="
exit $FAIL
