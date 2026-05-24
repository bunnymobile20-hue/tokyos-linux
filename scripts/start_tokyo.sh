#!/bin/bash
# start_tokyo.sh - Inicialização central do Tokyo OS
# Uso: bash start_tokyo.sh [--restore-icons]

PROJECT_DIR="/home/tokio/TokiOS"
LOG_DIR="${PROJECT_DIR}/logs"
CONFIG_FILE="${PROJECT_DIR}/config/startup.yaml"

mkdir -p "$LOG_DIR"

echo "=================================================" >> "$LOG_DIR/startup.log"
echo "[$(date)] Iniciando Tokyo OS Boot Sequence" >> "$LOG_DIR/startup.log"

# Verifica SO
if ! grep -q "Linux Mint" /etc/os-release 2>/dev/null; then
    echo "[WARN] Não está rodando nativamente no Linux Mint, mas prosseguindo..." >> "$LOG_DIR/startup.log"
fi

# Parsing básico de YAML no bash (leitura das variáveis)
SAFE_MODE=$(grep "safe_mode:" "$CONFIG_FILE" | awk '{print $2}')
KIOSK_MODE=$(grep "kiosk_mode:" "$CONFIG_FILE" | awk '{print $2}')
OPEN_BROWSER=$(grep "open_browser:" "$CONFIG_FILE" | awk '{print $2}')
DASHBOARD_URL=$(grep "dashboard_url:" "$CONFIG_FILE" | awk '{print $2}' | tr -d '"')

# Modo restauração de ícones
if [ "$1" = "--restore-icons" ]; then
    bash "${PROJECT_DIR}/scripts/restore-desktop-icons.sh"
    exit $?
fi

if [ "$SAFE_MODE" = "true" ]; then
    echo "[INFO] Iniciando em SAFE MODE. Ignorando automações perigosas." >> "$LOG_DIR/startup.log"
fi

# Verificar banco de dados
DB_FILE="${PROJECT_DIR}/data/database/bunnydreams.db"
if [ ! -f "$DB_FILE" ]; then
    echo "[ERRO] Banco SQLite ausente. O sistema pode apresentar falhas." >> "$LOG_DIR/startup_errors.log"
else
    echo "[OK] Banco de dados verificado." >> "$LOG_DIR/startup.log"
fi

# Iniciar o sistema base em background usando o orquestrador de produção existente
# Ele levanta o Node(Vite), Backend, Streamlit e RPA.
bash "${PROJECT_DIR}/Servidor_Tokio_Producao.sh" >> "$LOG_DIR/startup.log" 2>&1

# Checagem Healthcheck opcional
RUN_HEALTH=$(grep "run_healthcheck_on_start:" "$CONFIG_FILE" | awk '{print $2}')
if [ "$RUN_HEALTH" = "true" ]; then
    echo "[INFO] Rodando AutoTeste Rápido..." >> "$LOG_DIR/startup.log"
    # Rodar o script python (usando o venv do dashboard)
    if [ -f "${PROJECT_DIR}/dashboard/venv/bin/python" ]; then
        ${PROJECT_DIR}/dashboard/venv/bin/python ${PROJECT_DIR}/tools/health_check/runner.py >> "$LOG_DIR/startup.log" 2>&1
    fi
fi

# Ocultar ícones da área de trabalho (Cinnamon/Nemo)
if [ "$SAFE_MODE" != "true" ] && [ -n "$DBUS_SESSION_BUS_ADDRESS" ]; then
    if gsettings list-schemas 2>/dev/null | grep -q "org.nemo.desktop"; then
        gsettings set org.nemo.desktop show-desktop-icons false
        echo "[INFO] Ícones da área de trabalho ocultados." >> "$LOG_DIR/startup.log"
    fi
fi

# Abrir Interface Visual sobre o Mint
if [ "$OPEN_BROWSER" = "true" ]; then
    echo "[INFO] Aguardando o Frontend ficar online em $DASHBOARD_URL..." >> "$LOG_DIR/startup.log"
    # Aguarda até o frontend responder (max 30 segundos)
    for i in {1..30}; do
        if curl -s -I "$DASHBOARD_URL" | grep -qi "HTTP/.* 200"; then
            echo "[INFO] Frontend online! Iniciando UI..." >> "$LOG_DIR/startup.log"
            break
        fi
        sleep 1
    done
    
    if [ "$KIOSK_MODE" = "true" ]; then
        google-chrome --kiosk --user-data-dir=/tmp/tokyos_chrome_profile $DASHBOARD_URL &
    else
        google-chrome --app=$DASHBOARD_URL --user-data-dir=/tmp/tokyos_chrome_profile --start-maximized &
    fi
fi

echo "[$(date)] Tokyo OS Iniciado com Sucesso" >> "$LOG_DIR/startup.log"
