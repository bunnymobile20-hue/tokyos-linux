#!/bin/bash
# status_tokyo.sh - Relatório rápido de status do sistema Tokyo OS

PROJECT_DIR="/home/tokio/TokiOS"

echo "======================================"
echo "    TOKYO OS - SYSTEM STATUS"
echo "======================================"

# Verificar processos
check_process() {
    if pgrep -f "$1" > /dev/null; then
        echo -e "[$2] \e[32mAtivo\e[0m"
    else
        echo -e "[$2] \e[31mInativo\e[0m"
    fi
}

check_process "vite" "Dashboard UI (Vite)"
check_process "node.*dist/server.js" "Tokyo IA Backend (Node)"
check_process "streamlit run" "Dashboard ERP (Streamlit)"
check_process "ws_server.py" "Motor RPA WinGestor"
check_process "ollama serve" "Serviço Ollama"

echo "--------------------------------------"
# Verificar banco
DB_FILE="${PROJECT_DIR}/data/database/bunnydreams.db"
if [ -f "$DB_FILE" ]; then
    echo -e "[Banco SQLite] \e[32mAcessível\e[0m ($(du -h "$DB_FILE" | cut -f1))"
else
    echo -e "[Banco SQLite] \e[31mAusente\e[0m"
fi

echo "--------------------------------------"
# Memoria e Disco
echo "Uso de RAM:"
free -m | awk 'NR==2{printf "Total: %sMB, Usado: %sMB (%.2f%%)\n", $2, $3, $3*100/$2 }'
echo "Espaço em Disco (/):"
df -h / | awk 'NR==2{printf "Total: %s, Usado: %s (%s)\n", $2, $3, $5}'

echo "--------------------------------------"
echo "Últimos Erros:"
tail -n 5 "${PROJECT_DIR}/logs/startup_errors.log" 2>/dev/null || echo "Nenhum erro registrado."
echo "======================================"
