#!/bin/bash
# Instala e ativa os serviços do Tokyo OS no Linux Mint

echo "Instalando serviços no systemd..."
sudo cp /home/tokio/TokiOS/services/*.service /etc/systemd/system/
sudo cp /home/tokio/TokiOS/services/*.timer /etc/systemd/system/

sudo systemctl daemon-reload

echo "Ativando timers e habilitando serviços de fundo..."
sudo systemctl enable tokyo-healthcheck.timer
sudo systemctl start tokyo-healthcheck.timer

sudo systemctl enable tokyo-agent-runner.service
sudo systemctl enable tokyo-model-center.service
sudo systemctl enable tokyo-execution-flow.service

echo "=========================================================="
echo "Serviços em background habilitados."
echo "Para ativar o dashboard no boot via systemd, rode:"
echo "sudo systemctl enable tokyo-dashboard.service"
echo "OBS: No modo atual, usaremos o autostart do Linux Mint para abrir o Chrome, então o tokyo-dashboard via systemd é opcional e recomendado apenas para uso headless."
echo "=========================================================="
