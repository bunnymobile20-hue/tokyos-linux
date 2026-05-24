#!/bin/bash
# start_tokyo_session.sh - Inicializador da Sessão X11 dedicada

# 1. Configurações de proteção de tela e energia (Desativa)
xset s off
xset -dpms
xset s noblank

# 2. Inicia o Openbox com o arquivo de configuração minimalista do Tokyo OS
openbox --config-file /home/tokio/TokiOS/scripts/tokyo-openbox-rc.xml &
OPENBOX_PID=$!

# 3. Inicia o servidor e frontend do Tokyo OS
# Ele abrirá o Google Chrome em kiosk mode (conforme startup.yaml)
bash /home/tokio/TokiOS/scripts/start_tokyo.sh &
TOKYO_PID=$!

# 4. Mantém a sessão ativa aguardando o Openbox
wait $OPENBOX_PID
