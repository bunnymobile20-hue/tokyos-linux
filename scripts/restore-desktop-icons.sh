#!/bin/bash
# restore-desktop-icons.sh - Restaura ícones da área de trabalho do Cinnamon
# Uso: bash restore-desktop-icons.sh

PROJECT_DIR="/home/tokio/TokiOS"
LOG_DIR="${PROJECT_DIR}/logs"
mkdir -p "$LOG_DIR"

echo "[$(date)] Restaurando ícones da área de trabalho..." >> "$LOG_DIR/startup.log"

if [ -n "$DBUS_SESSION_BUS_ADDRESS" ]; then
    if gsettings list-schemas 2>/dev/null | grep -q "org.nemo.desktop"; then
        gsettings set org.nemo.desktop show-desktop-icons true
        echo "[OK] Ícones da área de trabalho restaurados." >> "$LOG_DIR/startup.log"
        echo "Ícones restaurados com sucesso."
    else
        echo "[ERRO] Schema org.nemo.desktop não encontrado." >> "$LOG_DIR/startup.log"
        echo "Erro: schema org.nemo.desktop não disponível neste sistema."
        exit 1
    fi
else
    echo "[ERRO] Sessão D-Bus não detectada." >> "$LOG_DIR/startup.log"
    echo "Erro: execute este script dentro de uma sessão gráfica do Cinnamon."
    exit 1
fi
