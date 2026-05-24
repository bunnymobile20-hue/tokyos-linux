#!/bin/bash
# stop_tokyo.sh - Encerramento seguro do Tokyo OS

PROJECT_DIR="/home/tokio/TokiOS"
LOG_DIR="${PROJECT_DIR}/logs"

echo "=================================================" >> "$LOG_DIR/startup.log"
echo "[$(date)] Parando Tokyo OS..." >> "$LOG_DIR/startup.log"

# Chama o script oficial de parada de produção
bash "${PROJECT_DIR}/Parar_Tokio.sh" >> "$LOG_DIR/startup.log" 2>&1

# Fecha o navegador se estiver em modo App/Kiosk na porta do dashboard
# Busca por processos do chrome rodando a porta 5173
pkill -f "google-chrome.*localhost:5173"

echo "[$(date)] Tokyo OS Encerrado. O Ollama foi mantido ativo por precaução." >> "$LOG_DIR/startup.log"
