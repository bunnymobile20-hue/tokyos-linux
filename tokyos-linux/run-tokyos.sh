#!/bin/bash
# run-tokyos.sh — Extrai e executa TokyOS Runtime no Linux atual
# Uso: ./run-tokyos.sh [--extract-only] [--port PORT]
#   --extract-only  só extrai, não executa
#   --port PORT     porta do backend (padrão 3001)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQUASHFS="$SCRIPT_DIR/tokyos-runtime.squashfs"
EXTRACT_DIR="$SCRIPT_DIR/tokyos-runtime"
BACKEND_PORT="${2:-3001}"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

log()  { echo -e "${GREEN}[TokyOS]${NC} $*"; }
die()  { echo -e "${RED}[ERRO]${NC} $*" >&2; exit 1; }

# Verifica squashfs
[ -f "$SQUASHFS" ] || die "Arquivo $SQUASHFS não encontrado"

# Extrai se necessário
if [ ! -d "$EXTRACT_DIR" ]; then
    log "Extraindo runtime..."
    mkdir -p "$EXTRACT_DIR"
    unsquashfs -f -d "$EXTRACT_DIR" "$SQUASHFS" >/dev/null 2>&1
    log "Extraído para $EXTRACT_DIR"
else
    log "Runtime já extraído em $EXTRACT_DIR"
fi

# Cria diretório de dados persistente
mkdir -p "$EXTRACT_DIR/mnt/data/"{var/{log,lib,tmp},etc/tokyos,opt/tokyos/data,root}
[ -f "$EXTRACT_DIR/etc/tokyos/tokyos.conf" ] || \
    cp "$EXTRACT_DIR/etc/tokyos/tokyos.conf" "$EXTRACT_DIR/mnt/data/etc/tokyos/" 2>/dev/null || true

# Gera AUTHTOKEN se não existir
AUTH_TOKEN_FILE="$EXTRACT_DIR/mnt/data/opt/tokyos/AUTHTOKEN"
if [ ! -f "$AUTH_TOKEN_FILE" ]; then
    echo -n "$(hostname)-$(date +%Y%m)" | sha256sum | cut -d' ' -f1 > "$AUTH_TOKEN_FILE"
    chmod 600 "$AUTH_TOKEN_FILE"
    log "AUTHTOKEN gerado"
fi
export AUTHTOKEN=$(cat "$AUTH_TOKEN_FILE")

# Para execução extrair-only
if [ "${1:-}" = "--extract-only" ]; then
    log "Extração concluída (modo extract-only)"
    echo "  Runtime em: $EXTRACT_DIR"
    echo "  Execute manualmente: cd $EXTRACT_DIR && ./usr/local/bin/tokyos-backend start"
    exit 0
fi

# Inicia backend
log "Iniciando backend na porta $BACKEND_PORT..."
cd "$EXTRACT_DIR"
export NODE_ENV=production
export PORT=$BACKEND_PORT

if [ -f "opt/tokyos/backend/dist/server.js" ]; then
    node opt/tokyos/backend/dist/server.js >> "$EXTRACT_DIR/mnt/data/var/log/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "$BACKEND_PID" > /tmp/tokyos-backend.pid 2>/dev/null || true
    log "Backend iniciado (PID $BACKEND_PID)"

    # Aguarda ficar pronto
    for i in $(seq 1 15); do
        if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${BACKEND_PORT}/api/system/hermes/status" 2>/dev/null | grep -q 200; then
            log "Backend pronto após ${i}s — http://127.0.0.1:${BACKEND_PORT}"
            break
        fi
        sleep 1
    done
else
    warn "Backend dist/server.js não encontrado. Só o frontend está disponível."
fi

# Abre navegador se possível
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:${BACKEND_PORT}" 2>/dev/null || true
elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "http://127.0.0.1:${BACKEND_PORT}" 2>/dev/null || true
fi

log "============================================"
log "  TokyOS rodando em http://127.0.0.1:${BACKEND_PORT}"
log "  Para parar: kill $BACKEND_PID"
log "============================================"

# Fica em foreground
wait $BACKEND_PID 2>/dev/null
