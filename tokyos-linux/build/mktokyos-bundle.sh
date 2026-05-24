#!/bin/bash
# mkbundle.sh — Build portátil do TokyOS (SEM root)
# Gera tokyos-runtime.squashfs + run.sh
# Pode ser extraído em qualquer Linux e executado
#
# Uso: ./mkbundle.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TOKYOS_DIR="$(dirname "$PROJECT_DIR")"
OVERLAY_DIR="$PROJECT_DIR/overlay"
BUILD_DIR="$SCRIPT_DIR/work-bundle"
STAGING_DIR="$BUILD_DIR/staging"
SQUASHFS_OUT="$PROJECT_DIR/tokyos-runtime.squashfs"
RUNNER_OUT="$PROJECT_DIR/run-tokyos.sh"

log()  { echo -e "\033[0;32m[BUNDLE]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
die()  { echo -e "\033[0;31m[FATAL]\033[0m $*" >&2; exit 1; }

# ============================================================
# Passo 1: Build do frontend
# ============================================================
build_frontend() {
    local FRONTEND_DIR="$TOKYOS_DIR/frontend"
    if [ ! -d "$FRONTEND_DIR" ]; then
        die "Frontend não encontrado em $FRONTEND_DIR"
    fi

    log "Buildando frontend..."
    (cd "$FRONTEND_DIR" && npm run build 2>&1) || die "Frontend build falhou"
    log "Frontend buildado com sucesso"
}

# ============================================================
# Passo 2: Cria staging com todos os arquivos
# ============================================================
create_staging() {
    log "Criando staging..."

    rm -rf "$STAGING_DIR"
    mkdir -p "$STAGING_DIR"

    # Overlay
    cp -a "$OVERLAY_DIR/." "$STAGING_DIR/"
    chmod +x "$STAGING_DIR/usr/local/bin/tokyos-"*

    # Backend
    local BACKEND_SRC="$TOKYOS_DIR/backend"
    local BACKEND_DST="$STAGING_DIR/opt/tokyos/backend"
    if [ -d "$BACKEND_SRC/dist" ]; then
        mkdir -p "$BACKEND_DST"
        cp -a "$BACKEND_SRC/package.json" "$BACKEND_DST/" 2>/dev/null || true
        cp -a "$BACKEND_SRC/dist" "$BACKEND_DST/" 2>/dev/null || true
        cp -a "$BACKEND_SRC/node_modules" "$BACKEND_DST/" 2>/dev/null || true
        log "  Backend: OK ($(du -sh "$BACKEND_DST" | cut -f1))"
    else
        warn "  Backend dist/ não encontrado (compile com tsc)"
    fi

    # Frontend (buildado)
    local FRONTEND_SRC="$TOKYOS_DIR/frontend"
    local FRONTEND_DST="$STAGING_DIR/opt/tokyos/frontend"
    if [ -d "$FRONTEND_SRC/dist" ]; then
        mkdir -p "$FRONTEND_DST"
        cp -a "$FRONTEND_SRC/dist/." "$FRONTEND_DST/"
        log "  Frontend: OK ($(du -sh "$FRONTEND_DST" | cut -f1))"

        # Symlink no caminho que o backend espera (../../frontend/dist)
        mkdir -p "$BACKEND_DST/../../frontend"
        ln -sfn "$FRONTEND_DST" "$BACKEND_DST/../../frontend/dist"
    fi

    # TokyOS config
    mkdir -p "$STAGING_DIR/etc/tokyos"
    cp "$OVERLAY_DIR/etc/tokyos/tokyos.conf" "$STAGING_DIR/etc/tokyos/" 2>/dev/null || true
    echo "1.0.0-dev" > "$STAGING_DIR/etc/tokyos/version"

    # Cria diretórios de dados
    mkdir -p "$STAGING_DIR/opt/tokyos/data"
    mkdir -p "$STAGING_DIR/mnt/data"

    log "Staging pronto em $STAGING_DIR"
}

# ============================================================
# Passo 3: Cria squashfs com fakeroot
# ============================================================
create_squashfs() {
    log "Criando squashfs portátil..."

    rm -f "$SQUASHFS_OUT"
    fakeroot mksquashfs "$STAGING_DIR" "$SQUASHFS_OUT" \
        -comp gzip -b 128K -no-xattrs \
        -e "var/cache" "var/tmp"

    log "Squashfs criado: $SQUASHFS_OUT ($(du -sh "$SQUASHFS_OUT" | cut -f1))"
}

# ============================================================
# Passo 4: Gera script run-tokyos.sh
# ============================================================
generate_runner() {
    log "Gerando run-tokyos.sh..."

    cat > "$RUNNER_OUT" << 'RUNEOF'
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
RUNEOF

    chmod +x "$RUNNER_OUT"
    log "Runner criado: $RUNNER_OUT"
}

# ============================================================
# MAIN
# ============================================================
main() {
    echo ""
    echo "=============================================="
    echo "  TokyOS Bundle Builder"
    echo "=============================================="
    echo ""

    build_frontend
    create_staging
    create_squashfs
    generate_runner

    echo ""
    echo -e "\033[0;32m=============================================="
    echo "  BUNDLE CONCLUÍDO!"
    echo "=============================================="
    echo -e "\033[0m"
    echo "  Runtime:  $SQUASHFS_OUT ($(du -sh "$SQUASHFS_OUT" | cut -f1))"
    echo "  Runner:   $RUNNER_OUT"
    echo ""
    echo "  Para executar:"
    echo "    ./run-tokyos.sh"
    echo ""
    echo "  Distribua os dois arquivos juntos:"
    echo "    tokyos-runtime.squashfs"
    echo "    run-tokyos.sh"
    echo ""
}

main
