#!/bin/bash
# setup_fresh.sh — Instalação completa do TokiOS no Deepin 25.1
# Uso: sudo bash setup_fresh.sh <usuário>
# Exemplo: sudo bash setup_fresh.sh tokio

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Uso: sudo bash $0 <usuário>"
    echo "Exemplo: sudo bash $0 tokio"
    exit 1
fi

USER="$1"
HOME_DIR="/home/$USER"
TOKIOS_DIR="$HOME_DIR/TokiOS"
OPT_DIR="$HOME_DIR/opt-tokyos"
BACKUP_DIR="$TOKIOS_DIR/backups"

echo "============================================"
echo "  TokiOS — Setup Fresh para Deepin 25.1"
echo "  Usuário: $USER"
echo "============================================"
echo ""

# ── Verificar se é root ──
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute com sudo"
    exit 1
fi

# ── 1. Sistema base ──
echo "[1/8] Instalando dependências do sistema..."
apt update -qq
apt install -y -qq git curl wget build-essential python3 python3-pip python3-venv \
    tmux nginx ca-certificates nvidia-driver google-chrome-stable 2>/dev/null || true

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y -qq nodejs

# Docker
apt install -y -qq docker.io docker-compose 2>/dev/null || true
usermod -aG docker "$USER" 2>/dev/null || true
echo "  ✅ Sistema base pronto"

# ── 2. Clonar repositório ──
echo "[2/8] Clonando repositório..."
sudo -u "$USER" git clone https://github.com/bunnymobile20-hue/tokyos-linux.git "$TOKIOS_DIR" 2>/dev/null || {
    echo "  ⚠️  Repositório já existe, pulando"
}
echo "  ✅ Repositório clonado"

# ── 3. Restaurar backup ──
echo "[3/8] Restaurando backups..."
if ls "$BACKUP_DIR"/tokyos_reinstall_*.tar.gz 1>/dev/null 2>&1; then
    cd /
    for b in "$BACKUP_DIR"/tokyos_*.tar.gz; do
        tar -xzf "$b" 2>/dev/null
        echo "  Restaurado: $(basename $b)"
    done
fi
echo "  ✅ Backup restaurado"

# ── 4. Ollama ──
echo "[4/8] Instalando Ollama..."
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/install.sh | bash
fi
echo "  ✅ Ollama instalado"

# ── 5. Backend ──
echo "[5/8] Instalando backend..."
cd "$TOKIOS_DIR/backend"
sudo -u "$USER" npm install 2>/dev/null
sudo -u "$USER" npm run build 2>/dev/null
echo "  ✅ Backend pronto"

# ── 6. Frontend ──
echo "[6/8] Instalando frontend..."
cd "$TOKIOS_DIR/frontend"
sudo -u "$USER" npm install 2>/dev/null
sudo -u "$USER" npm run build 2>/dev/null
echo "  ✅ Frontend pronto"

# ── 7. Serviços opt-tokyos ──
echo "[7/8] Instalando serviços..."
for service in dashboard jarvis-agent; do
    if [ -f "$OPT_DIR/$service/requirements.txt" ]; then
        cd "$OPT_DIR/$service"
        sudo -u "$USER" python3 -m venv venv 2>/dev/null
        sudo -u "$USER" "$OPT_DIR/$service/venv/bin/pip" install -r requirements.txt -qq 2>/dev/null
        echo "  ✅ $service"
    fi
done
if [ -f "$OPT_DIR/token-server/package.json" ]; then
    cd "$OPT_DIR/token-server"
    sudo -u "$USER" npm install 2>/dev/null
    echo "  ✅ token-server"
fi
echo "  ✅ Serviços prontos"

# ── 8. Browser agent ──
echo "[8/8] Instalando Browser Agent..."
BA_DIR="$TOKIOS_DIR/backend/services/browser_agent"
if [ -d "$BA_DIR" ]; then
    cd "$BA_DIR"
    sudo -u "$USER" python3 -m venv venv 2>/dev/null
    sudo -u "$USER" "$BA_DIR/venv/bin/pip" install browser-use websockets -qq 2>/dev/null
    echo "  ✅ Browser Agent pronto"
fi

echo ""
echo "============================================"
echo "  ✅ Setup concluído!"
echo "============================================"
echo ""
echo "Próximos passos:"
echo "  1. Baixar modelos: ollama pull qwen3:14b && ollama pull qwen2.5:7b"
echo "  2. Iniciar serviços: tmux scripts ou ./Servidor_Tokio_Producao.sh"
echo "  3. Verificar .env's em cada serviço"
echo ""
echo "Documentação completa: $TOKIOS_DIR/docs/REINSTALL.md"
