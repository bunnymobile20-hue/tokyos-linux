#!/bin/bash
# mkiso.sh — Build do TokyOS Linux ISO
# Cria um sistema Linux minimalista com boot kiosk direto no dashboard
#
# Uso: sudo ./mkiso.sh [--clean] [--dev]
#   --clean  limpa artefatos anteriores
#   --dev    modo desenvolvimento (pula compressão final, mais rápido)
#
# Dependências: debootstrap, squashfs-tools, xorriso, grub-pc-bin,
#               grub-efi-amd64-bin, grub-efi-amd64-signed, mtools

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OVERLAY_DIR="$PROJECT_DIR/overlay"
BUILD_DIR="$SCRIPT_DIR/work"
ROOTFS_DIR="$BUILD_DIR/rootfs"
ISO_DIR="$BUILD_DIR/iso"
SQUASHFS_FILE="$BUILD_DIR/tokyos-root.squashfs"
OUTPUT_ISO="$PROJECT_DIR/tokyos-linux.iso"
VERSION="1.0.0-dev"
ARCH="amd64"
DEBIAN_SUITE="bookworm"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[BUILD]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()  { echo -e "${RED}[FATAL]${NC} $*" >&2; exit 1; }

CLEAN=false
DEV_MODE=false

for arg in "$@"; do
    case "$arg" in
        --clean) CLEAN=true ;;
        --dev)   DEV_MODE=true ;;
        *)       die "Argumento desconhecido: $arg" ;;
    esac
done

# ============================================================
# Verificação de dependências
# ============================================================
check_deps() {
    local deps=(
        debootstrap chroot mksquashfs xorriso grub-mkrescue
        mmd mcopy unsquashfs
    )
    local missing=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing+=("$dep")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        die "Dependências faltando: ${missing[*]}. Instale com: sudo apt install debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin mtools"
    fi
}

# ============================================================
# Limpeza
# ============================================================
clean_all() {
    log "Limpando artefatos anteriores..."
    rm -rf "$BUILD_DIR"
    rm -f "$OUTPUT_ISO"
}

# ============================================================
# Cria rootfs base com debootstrap
# ============================================================
bootstrap_rootfs() {
    log "Criando rootfs base (Debian $DEBIAN_SUITE $ARCH)..."

    mkdir -p "$ROOTFS_DIR"

    if [ ! -f "$ROOTFS_DIR/debootstrap/debootstrap-success" ]; then
        debootstrap --arch="$ARCH" \
            --include="ca-certificates,locales,acl,udev,systemd-sysv,systemd,dbus" \
            "$DEBIAN_SUITE" "$ROOTFS_DIR" http://deb.debian.org/debian
    else
        log "Rootfs já bootstrapado, pulando"
    fi
}

# ============================================================
# Instala pacotes no chroot
# ============================================================
install_packages() {
    log "Instalando pacotes no chroot..."

    chroot "$ROOTFS_DIR" apt-get update -qq

    # Kernel e firmware
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        linux-image-amd64 firmware-linux-free firmware-linux-nonfree

    # Live boot (findiso, toram, etc.)
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        live-boot live-boot-initramfs-tools

    # Ferramentas de sistema
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        busybox squashfs-tools util-linux e2fsprogs dosfstools \
        curl wget git unzip xz-utils bzip2 \
        dhcpcd5 isc-dhcp-client

    # Wayland + display
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        weston libgl1-mesa-dri mesa-utils

    # X11 (fallback para GPUs/drivers sem Wayland)
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        xserver-xorg-core xserver-xorg xinit x11-xserver-utils \
        xfonts-base xfonts-utils

    # NVIDIA drivers (proprietarios)
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        nvidia-driver firmware-misc-nonfree nvidia-settings \
        || log "AVISO: NVIDIA driver pode falhar se kernel nao bater"

    # Som: PipeWire + ALSA
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        pipewire pipewire-pulse pipewire-alsa wireplumber \
        alsa-utils pavucontrol

    # Chromium para kiosk
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        chromium chromium-l10n

    # Rustdesk (remoto/assistencia)
    chroot "$ROOTFS_DIR" bash -c \
        "curl -sL https://github.com/rustdesk/rustdesk/releases/download/1.3.8/rustdesk-1.3.8-x86_64.deb -o /tmp/rustdesk.deb && \
         dpkg -i /tmp/rustdesk.deb 2>/dev/null || apt-get install -y -f -qq" \
        || log "AVISO: Rustdesk falhou ao instalar"

    # Node.js v20 (via NodeSource)
    chroot "$ROOTFS_DIR" bash -c \
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    chroot "$ROOTFS_DIR" apt-get install -y -qq nodejs

    # Google Antigravity — IDE (via APT repo)
    chroot "$ROOTFS_DIR" bash -c \
        "mkdir -p /etc/apt/keyrings && \
         curl -fsSL https://us-central1-apt.pkg.dev/doc/repo-signing-key.gpg | \
         gpg --dearmor -o /etc/apt/keyrings/antigravity-repo-key.gpg && \
         echo 'deb [signed-by=/etc/apt/keyrings/antigravity-repo-key.gpg] https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/ antigravity-debian main' > /etc/apt/sources.list.d/antigravity.list && \
         apt-get update -qq && \
         apt-get install -y -qq antigravity" \
        || log "AVISO: Google Antigravity IDE falhou ao instalar via APT"

    # Google Antigravity — CLI
    chroot "$ROOTFS_DIR" bash -c \
        "curl -fsSL https://antigravity.google/cli/install.sh | bash" \
        || log "AVISO: Antigravity CLI falhou ao instalar"

    # Google Antigravity — 2.0 Desktop App (tarball)
    chroot "$ROOTFS_DIR" bash -c \
        "mkdir -p /opt/antigravity-2.0 && \
         ANTIGRAVITY_URL=\$(curl -sL https://antigravity.google/download/linux | grep -oP 'https://[^\"]+\\.tar\\.gz' | head -1) && \
         if [ -n \"\$ANTIGRAVITY_URL\" ]; then \
           curl -sL \"\$ANTIGRAVITY_URL\" -o /tmp/antigravity-2.0.tar.gz && \
           tar xzf /tmp/antigravity-2.0.tar.gz -C /opt/antigravity-2.0 --strip-components=1 && \
           ln -sf /opt/antigravity-2.0/antigravity /usr/local/bin/antigravity-2.0 && \
           rm -f /tmp/antigravity-2.0.tar.gz; \
         else \
           echo 'AVISO: Antigravity 2.0 tarball URL nao encontrada'; \
         fi" \
        || log "AVISO: Antigravity 2.0 tarball falhou ao baixar/extrair"

    # Python
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        python3 python3-pip python3-venv

    # Limpeza
    chroot "$ROOTFS_DIR" apt-get clean
    rm -rf "$ROOTFS_DIR/var/lib/apt/lists"/*
}

# ============================================================
# Aplica overlay TokyOS
# ============================================================
apply_overlay() {
    log "Aplicando overlay TokyOS..."

    # Copia overlay para rootfs
    cp -a "$OVERLAY_DIR/." "$ROOTFS_DIR/"

    # Torna scripts executáveis
    chmod +x "$ROOTFS_DIR/usr/local/bin/tokyos-"*

    # Cria diretórios necessários
    mkdir -p "$ROOTFS_DIR/opt/tokyos/backend"
    mkdir -p "$ROOTFS_DIR/opt/tokyos/data"
    mkdir -p "$ROOTFS_DIR/mnt/data"

    # Gera locale
    echo "pt_BR.UTF-8 UTF-8" > "$ROOTFS_DIR/etc/locale.gen"
    echo "en_US.UTF-8 UTF-8" >> "$ROOTFS_DIR/etc/locale.gen"
    chroot "$ROOTFS_DIR" locale-gen

    echo "LANG=pt_BR.UTF-8" > "$ROOTFS_DIR/etc/default/locale"

    # Configura hostname
    echo "tokyos" > "$ROOTFS_DIR/etc/hostname"
    echo "127.0.1.1 tokyos" >> "$ROOTFS_DIR/etc/hosts"

    # Cria usuário tokyos (opcional, para serviços que precisam de user)
    chroot "$ROOTFS_DIR" useradd -m -s /bin/bash tokios 2>/dev/null || true
}

# ============================================================
# Configura initramfs personalizado
# ============================================================
setup_initramfs() {
    log "Configurando initramfs..."

    # Cria hook de initramfs para montar squashfs
    mkdir -p "$ROOTFS_DIR/etc/initramfs-tools/scripts/init-bottom"

    cat > "$ROOTFS_DIR/etc/initramfs-tools/scripts/init-bottom/tokyos-mount" << 'INITEOF'
#!/bin/sh
# Hook initramfs: monta squashfs e overlay persistente

PREREQ=""
prereqs() { echo "$PREREQ"; }
case "$1" in prereqs) prereqs; exit 0;; esac

. /scripts/functions

log_begin_msg "TokyOS: montando sistema..."

# Cria diretórios de montagem
mkdir -p /root /run/rootfs /mnt/data 2>/dev/null

# Procura squashfs na raiz do dispositivo de boot
ROOT_DEV=$(find /dev -name "sd*" -o -name "nvme*" -o -name "mmcblk*" 2>/dev/null | head -1)
SQUASHFS_PATH=""

# Tenta vários lugares para o squashfs
for candidate in "/run/squashfs/tokyos-root.squashfs" \
                  "/tokyos-root.squashfs" \
                  "/dev/disk/by-label/TOKYOS-SYS"; do
    if [ -f "$candidate" ]; then
        SQUASHFS_PATH="$candidate"
        break
    fi
done

# Se for partição raw com label, monta e acha squashfs
if [ -b "$ROOT_DEV" ]; then
    LABEL=$(blkid -s LABEL -o value "$ROOT_DEV" 2>/dev/null || echo "")
    if [ "$LABEL" = "TOKYOS-SYS-A" ] || [ "$LABEL" = "TOKYOS-SYS-B" ]; then
        mount -r "$ROOT_DEV" /run/rootfs
        if [ -f "/run/rootfs/tokyos-root.squashfs" ]; then
            SQUASHFS_PATH="/run/rootfs/tokyos-root.squashfs"
        fi
    fi
fi

if [ -n "$SQUASHFS_PATH" ]; then
    log_success_msg "TokyOS: squashfs encontrado em $SQUASHFS_PATH"
    mount -t squashfs -o loop,ro "$SQUASHFS_PATH" /root
else
    log_warning_msg "TokyOS: squashfs não encontrado, boot pode falhar"
fi

log_end_msg
INITEOF

    chmod +x "$ROOTFS_DIR/etc/initramfs-tools/scripts/init-bottom/tokyos-mount"

    # Configura init padrão para nosso tokyos-init
    mkdir -p "$ROOTFS_DIR/etc/default"
    echo "INIT=/usr/local/bin/tokyos-init" > "$ROOTFS_DIR/etc/default/tokyos"

    # Reconstrói initramfs
    chroot "$ROOTFS_DIR" update-initramfs -u -k all
}

# ============================================================
# Cria squashfs do rootfs
# ============================================================
create_squashfs() {
    log "Criando squashfs do rootfs..."

    if [ "$DEV_MODE" = true ]; then
        # Modo dev: sem compressão, mais rápido
        mksquashfs "$ROOTFS_DIR" "$SQUASHFS_FILE" \
            -comp gzip -b 128K -no-xattrs \
            -e "var/cache/apt" "var/lib/apt" "usr/share/doc" \
            "usr/share/man" "var/log"
    else
        # Modo produção: compressão máxima
        mksquashfs "$ROOTFS_DIR" "$SQUASHFS_FILE" \
            -comp xz -b 256K -no-xattrs \
            -e "var/cache/apt" "var/lib/apt" "usr/share/doc" \
            "usr/share/man" "var/log"
    fi

    log "Squashfs criado: $(du -sh "$SQUASHFS_FILE" | cut -f1)"
}

# ============================================================
# Monta estrutura da ISO
# ============================================================
setup_iso() {
    log "Montando estrutura ISO..."

    mkdir -p "$ISO_DIR/boot/grub"
    mkdir -p "$ISO_DIR/live"

    # Copia kernel e initramfs
    cp "$ROOTFS_DIR/boot/vmlinuz-"* "$ISO_DIR/boot/vmlinuz"
    cp "$ROOTFS_DIR/boot/initrd.img-"* "$ISO_DIR/boot/initrd.img"

    # Copia squashfs
    cp "$SQUASHFS_FILE" "$ISO_DIR/live/tokyos-root.squashfs"

    # GRUB config
    cat > "$ISO_DIR/boot/grub/grub.cfg" << 'GRUBEOF'
set default="0"
set timeout=5

loadfont=unicode
insmod efi_gop
insmod efi_uga
insmod video_bochs
insmod video_cirrus
insmod all_video

set gfxpayload=keep
set gfxmode=auto

menuentry "TokyOS Linux" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs
          toram=yes
          quiet
          consoleblank=0
    initrd /boot/initrd.img
}

menuentry "TokyOS Linux (modo seguro)" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs
          toram=yes
          nomodeset
          quiet
    initrd /boot/initrd.img
}

menuentry "TokyOS Linux (testar memória)" {
    linux16 /boot/memtest86+.bin
}
GRUBEOF

    # Loopback cfg pro GRUB encontrar squashfs
    cat > "$ISO_DIR/boot/grub/loopback.cfg" << 'LOOPEOF'
menuentry "TokyOS Linux" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs toram=yes quiet
    initrd /boot/initrd.img
}
LOOPEOF
}

# ============================================================
# Gera ISO bootável
# ============================================================
generate_iso() {
    log "Gerando ISO bootável..."

    # Cria diretório EFI para boot UEFI
    mkdir -p "$ISO_DIR/EFI/BOOT"

    grub-mkrescue -o "$OUTPUT_ISO" "$ISO_DIR" \
        --modules="part_gpt part_msdos fat ext2 squashfs iso9660 loopback linux search configfile normal" \
        --locales="" \
        --fonts="" \
        --install-modules="part_gpt part_msdos fat ext2 squashfs iso9660 loopback linux search configfile normal" \
        --themes="" \
        2>&1

    log "ISO gerada: $OUTPUT_ISO ($(du -sh "$OUTPUT_ISO" | cut -f1))"
}

# ============================================================
# Copia backend + frontend TokyOS para dentro da ISO
# ============================================================
bundle_apps() {
    BACKEND_SRC="$PROJECT_DIR/../backend"
    BACKEND_DST="$ROOTFS_DIR/opt/tokyos/backend"
    FRONTEND_SRC="$PROJECT_DIR/../frontend"
    FRONTEND_DST="$ROOTFS_DIR/opt/tokyos/frontend"

    # --- Backend ---
    log "Copiando backend TokyOS..."

    if [ -d "$BACKEND_SRC/dist" ]; then
        mkdir -p "$BACKEND_DST"
        cp -a "$BACKEND_SRC/package.json" "$BACKEND_DST/" 2>/dev/null || true
        cp -a "$BACKEND_SRC/dist" "$BACKEND_DST/" 2>/dev/null || true
        cp -a "$BACKEND_SRC/node_modules" "$BACKEND_DST/" 2>/dev/null || true
        log "  Backend copiado ($(du -sh "$BACKEND_DST" | cut -f1))"
    else
        warn "  Backend não encontrado em $BACKEND_SRC (compile com tsc primeiro)"
    fi

    # --- Frontend ---
    log "Copiando frontend TokyOS..."

    if [ -d "$FRONTEND_SRC" ]; then
        # Builda o frontend (produção)
        log "  Buildando frontend (npm run build)..."
        (cd "$FRONTEND_SRC" && npm run build 2>&1) || warn "  Frontend build falhou, tentando copiar dist/ existente..."

        if [ -d "$FRONTEND_SRC/dist" ]; then
            mkdir -p "$FRONTEND_DST"
            cp -a "$FRONTEND_SRC/dist/." "$FRONTEND_DST/"
            log "  Frontend copiado ($(du -sh "$FRONTEND_DST" | cut -f1))"

            # Backend espera frontend em ../../frontend/dist (relativo a dist/server.js)
            # Cria symlink no local esperado
            mkdir -p "$(dirname "$BACKEND_DST/../../frontend")"
            ln -sfn "$FRONTEND_DST" "$BACKEND_DST/../../frontend/dist"
        else
            warn "  Frontend dist/ não encontrado. Kiosk vai precisar de servidor externo."
        fi
    else
        warn "  Frontend não encontrado em $FRONTEND_SRC"
    fi
}

# ============================================================
# MAIN
# ============================================================
main() {
    echo ""
    echo "=============================================="
    echo "  TokyOS Linux Builder v$VERSION"
    echo "=============================================="
    echo ""

    # Verifica se é root
    if [ "$(id -u)" -ne 0 ]; then
        die "Este script precisa ser executado como root (sudo)"
    fi

    check_deps

    if [ "$CLEAN" = true ]; then
        clean_all
    fi

    mkdir -p "$BUILD_DIR"

    bootstrap_rootfs
    install_packages
    apply_overlay
    bundle_apps
    setup_initramfs
    create_squashfs
    setup_iso
    generate_iso

    echo ""
    echo -e "${GREEN}=============================================="
    echo "  BUILD CONCLUÍDO!"
    echo "=============================================="
    echo -e "${NC}"
    echo "  ISO: $OUTPUT_ISO"
    echo "  Tamanho: $(du -sh "$OUTPUT_ISO" | cut -f1)"
    echo ""
    echo "  Para gravar num USB:"
    echo "    sudo dd if=$OUTPUT_ISO of=/dev/sdX bs=4M status=progress"
    echo ""
}

main
