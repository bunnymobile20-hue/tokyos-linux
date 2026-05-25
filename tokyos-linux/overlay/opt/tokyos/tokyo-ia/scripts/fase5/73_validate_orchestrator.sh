#!/bin/bash
# Tokyo IA — Validate Orchestrator
# Verifica se o orchestrator está rodando e respondendo

BASE_URL="${TOKYO_IA_URL:-http://127.0.0.1:8080}"
PASS=0
FAIL=0

echo "=== Tokyo IA Orchestrator Validation ==="
echo ""

check() {
    local desc="$1"
    local url="$2"
    local expect="$3"

    echo -n "[CHECK] $desc ... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$response" = "$expect" ]; then
        echo "OK (HTTP $response)"
        PASS=$((PASS + 1))
    else
        echo "FAIL (HTTP $response, esperado $expect)"
        FAIL=$((FAIL + 1))
    fi
}

echo "--- Endpoints ---"
check "Health" "$BASE_URL/tokyo/orchestrator/health" "200"
check "Tools" "$BASE_URL/tokyo/tools" "200"
check "Command POST" "$BASE_URL/tokyo/command" "200"
check "Commands recent" "$BASE_URL/tokyo/commands/recent" "200"
check "Memory recent" "$BASE_URL/tokyo/memory/recent" "200"
check "Tools status" "$BASE_URL/tokyo/tools/status" "200"

echo ""
echo "--- Teste de comando real ---"
echo -n "[TEST] POST /tokyo/command (abre WinGestor) ... "
RESP=$(curl -s -X POST "$BASE_URL/tokyo/command" \
    -H "Content-Type: application/json" \
    -d '{"raw_text":"abre o WinGestor","source":"portal","user":"tokyos"}' 2>/dev/null)
INTENT=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('intent',''))" 2>/dev/null)
STATUS=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)

if [ "$INTENT" = "open_page" ] && [ -n "$STATUS" ]; then
    echo "OK (intent=$INTENT, status=$STATUS)"
    PASS=$((PASS + 1))
else
    echo "FAIL"
    echo "  response: $RESP"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Resultado: $PASS passaram, $FAIL falharam ==="
exit $FAIL
