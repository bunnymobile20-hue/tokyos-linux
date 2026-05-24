#!/bin/bash
# mkupdate.sh — Gera imagem de atualização (squashfs only)
# Menor que a ISO completa, para atualizações OTA via tokyos-update
#
# Uso: sudo ./mkupdate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OVERLAY_DIR="$PROJECT_DIR/overlay"
BUILD_DIR="$SCRIPT_DIR/work"
ROOTFS_DIR="$BUILD_DIR/rootfs"
OUTPUT_UPDATE="$PROJECT_DIR/tokyos-update.squashfs"

log()  { echo -e "\033[0;32m[UPDATE]${NC} $*"; }
die()  { echo -e "\033[0;31m[FATAL]${NC} $*" >&2; exit 1; }

if [ "$(id -u)" -ne 0 ]; then
    die "Este script precisa ser root"
fi

log "Criando imagem de atualização..."
rm -f "$OUTPUT_UPDATE"

mksquashfs "$ROOTFS_DIR" "$OUTPUT_UPDATE" \
    -comp xz -b 256K -no-xattrs \
    -e "var/cache/apt" "var/lib/apt" "usr/share/doc" \
    "usr/share/man" "var/log" "boot"

log "Atualização gerada: $OUTPUT_UPDATE ($(du -sh "$OUTPUT_UPDATE" | cut -f1))"
echo "  Hosteie em um servidor HTTP e configure UPDATE_URL no tokyos.conf"
