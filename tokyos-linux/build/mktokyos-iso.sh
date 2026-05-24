#!/bin/bash
# mktokyos-iso.sh — Build do TokyOS Linux ISO
# Debian + GNOME Desktop + TokyOS como aplicativo
#
# Uso: sudo ./mktokyos-iso.sh [--clean] [--dev]
#   --clean  limpa artefatos anteriores
#   --dev    modo desenvolvimento (pula compressão final, mais rápido)

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
        die "Dependências faltando: ${missing[*]}"
    fi
}

clean_all() {
    log "Limpando artefatos anteriores..."
    rm -rf "$BUILD_DIR"
    rm -f "$OUTPUT_ISO"
}

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

install_packages() {
    log "Instalando pacotes no chroot..."

    sed -i 's/main$/main contrib non-free non-free-firmware/' \
        "$ROOTFS_DIR/etc/apt/sources.list" 2>/dev/null || true

    cat > "$ROOTFS_DIR/etc/apt/apt.conf.d/99tokyos" << 'APTCONF'
APT::Install-Recommends "true";
APT::Get::Assume-Yes "true";
DPkg::Options {"--force-confold";"--force-confdef"};
DPkg::Lock::Timeout "120";
Quiet "2";
APTCONF

    chroot "$ROOTFS_DIR" apt-get update -qq

    # Kernel + firmware
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        linux-image-amd64 firmware-linux-free firmware-linux-nonfree \
        || true

    # Live boot
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        live-boot live-boot-initramfs-tools overlayroot

    # GNOME Desktop completo
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        task-gnome-desktop gdm3 gnome-shell gnome-terminal \
        nautilus gnome-control-center gnome-tweaks \
        adwaita-icon-theme fonts-noto fonts-noto-cjk \
        network-manager-gnome

    # PipeWire (substitui PulseAudio no GNOME)
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        pipewire pipewire-pulse pipewire-alsa wireplumber \
        alsa-utils pavucontrol

    # Chromium (navegador padrão)
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        chromium chromium-l10n

    # Ferramentas
    chroot "$ROOTFS_DIR" apt-get install -y -qq \
        curl wget git unzip xz-utils bzip2 \
        squashfs-tools e2fsprogs dosfstools \
        busybox python3 python3-pip python3-venv

    # Node.js v20
    chroot "$ROOTFS_DIR" bash -c \
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" \
        || log "AVISO: NodeSource falhou"
    chroot "$ROOTFS_DIR" apt-get install -y -qq nodejs || true

    # Rustdesk
    chroot "$ROOTFS_DIR" bash -c \
        "curl -sL https://github.com/rustdesk/rustdesk/releases/download/1.3.8/rustdesk-1.3.8-x86_64.deb -o /tmp/rustdesk.deb 2>/dev/null && \
         dpkg -i /tmp/rustdesk.deb 2>/dev/null || apt-get install -y -f -qq" \
        || log "AVISO: Rustdesk falhou"

    chroot "$ROOTFS_DIR" apt-get install -y -f -qq || true
    chroot "$ROOTFS_DIR" apt-get clean || true
    rm -rf "$ROOTFS_DIR/var/lib/apt/lists"/*
}

apply_overlay() {
    log "Aplicando overlay TokyOS..."

    cp -a "$OVERLAY_DIR/." "$ROOTFS_DIR/"
    chmod +x "$ROOTFS_DIR/usr/local/bin/tokyos-"* 2>/dev/null || true

    mkdir -p "$ROOTFS_DIR/opt/tokyos/backend"
    mkdir -p "$ROOTFS_DIR/opt/tokyos/data"
    mkdir -p "$ROOTFS_DIR/mnt/data"

    # Locale
    echo "pt_BR.UTF-8 UTF-8" > "$ROOTFS_DIR/etc/locale.gen"
    echo "en_US.UTF-8 UTF-8" >> "$ROOTFS_DIR/etc/locale.gen"
    chroot "$ROOTFS_DIR" locale-gen
    echo "LANG=pt_BR.UTF-8" > "$ROOTFS_DIR/etc/default/locale"

    # Hostname
    echo "tokyos" > "$ROOTFS_DIR/etc/hostname"
    echo "127.0.1.1 tokyos" >> "$ROOTFS_DIR/etc/hosts"

    # Usuário padrão
    chroot "$ROOTFS_DIR" useradd -m -s /bin/bash tokyos 2>/dev/null || true
    echo "tokyos:tokyos" | chroot "$ROOTFS_DIR" chpasswd 2>/dev/null || true
    chroot "$ROOTFS_DIR" usermod -aG sudo,adm,audio,video,input tokyos 2>/dev/null || true

    # Auto-login no GDM para o usuário tokyos
    mkdir -p "$ROOTFS_DIR/etc/gdm3"
    cat > "$ROOTFS_DIR/etc/gdm3/daemon.conf" << 'GDMEOF'
[daemon]
AutomaticLoginEnable = true
AutomaticLogin = tokyos
WaylandEnable = true
GDMEOF

    # Cria o arquivo de customização do GDM
    mkdir -p "$ROOTFS_DIR/etc/gdm3/greeter.dconf-defaults"
    cat > "$ROOTFS_DIR/etc/gdm3/greeter.dconf-defaults/00-tokyos" << 'DCONF'
[org/gnome/desktop/background]
picture-uri=''
picture-options='none'
primary-color='#0f172a'
secondary-color='#0f172a'

[org/gnome/desktop/screensaver]
picture-uri=''
primary-color='#0f172a'
DCONF

    # Habilita systemd services (symlinks diretos — systemctl em chroot falha sem dbus)
    mkdir -p "$ROOTFS_DIR/etc/systemd/system/multi-user.target.wants"
    mkdir -p "$ROOTFS_DIR/etc/systemd/system/sysinit.target.wants"
    ln -sf /etc/systemd/system/tokyos-backend.service \
        "$ROOTFS_DIR/etc/systemd/system/multi-user.target.wants/"
    ln -sf /etc/systemd/system/tokyos-firstboot.service \
        "$ROOTFS_DIR/etc/systemd/system/sysinit.target.wants/"
    ln -sf /lib/systemd/system/NetworkManager.service \
        "$ROOTFS_DIR/etc/systemd/system/multi-user.target.wants/" 2>/dev/null || true
}

bundle_apps() {
    BACKEND_SRC="$PROJECT_DIR/../backend"
    BACKEND_DST="$ROOTFS_DIR/opt/tokyos/backend"
    FRONTEND_SRC="$PROJECT_DIR/../frontend"
    FRONTEND_DST="$ROOTFS_DIR/opt/tokyos/frontend/dist"

    log "Copiando backend TokyOS..."

    if [ -d "$BACKEND_SRC" ]; then
        mkdir -p "$BACKEND_DST"
        cp -a "$BACKEND_SRC/package.json" "$BACKEND_DST/" 2>/dev/null || true
        cp -a "$BACKEND_SRC/dist" "$BACKEND_DST/" 2>/dev/null || true
        cp -aL "$BACKEND_SRC/node_modules" "$BACKEND_DST/" 2>/dev/null || true
        log "  Backend copiado ($(du -sh "$BACKEND_DST" | cut -f1))"
    else
        warn "  Backend nao encontrado em $BACKEND_SRC"
    fi

    log "Copiando frontend TokyOS..."

    if [ -d "$FRONTEND_SRC" ]; then
        log "  Buildando frontend (npm run build)..."
        (cd "$FRONTEND_SRC" && npm run build 2>&1) || warn "  Frontend build falhou"

        if [ -d "$FRONTEND_SRC/dist" ]; then
            mkdir -p "$FRONTEND_DST"
            cp -a "$FRONTEND_SRC/dist/." "$FRONTEND_DST/"
            log "  Frontend copiado ($(du -sh "$FRONTEND_DST" | cut -f1))"
        fi
    else
        warn "  Frontend nao encontrado em $FRONTEND_SRC"
    fi
}

setup_initramfs() {
    log "Configurando initramfs..."
    chroot "$ROOTFS_DIR" update-initramfs -u -k all 2>/dev/null || true
}

create_squashfs() {
    log "Criando squashfs do rootfs..."

    if [ "$DEV_MODE" = true ]; then
        mksquashfs "$ROOTFS_DIR" "$SQUASHFS_FILE" \
            -comp gzip -b 128K -no-xattrs \
            -e "var/cache/apt" "var/lib/apt/lists" \
            "usr/share/doc" "usr/share/man" "var/log"
    else
        mksquashfs "$ROOTFS_DIR" "$SQUASHFS_FILE" \
            -comp xz -b 256K -no-xattrs \
            -e "var/cache/apt" "var/lib/apt/lists" \
            "usr/share/doc" "usr/share/man" "var/log"
    fi

    log "Squashfs criado: $(du -sh "$SQUASHFS_FILE" | cut -f1)"
}

setup_iso() {
    log "Montando estrutura ISO..."

    mkdir -p "$ISO_DIR/boot/grub"
    mkdir -p "$ISO_DIR/live"

    cp "$ROOTFS_DIR/boot/vmlinuz-"* "$ISO_DIR/boot/vmlinuz"
    cp "$ROOTFS_DIR/boot/initrd.img-"* "$ISO_DIR/boot/initrd.img"
    cp "$SQUASHFS_FILE" "$ISO_DIR/live/tokyos-root.squashfs"

    cat > "$ISO_DIR/boot/grub/grub.cfg" << 'GRUBEOF'
set default="0"
set timeout=5

insmod efi_gop
insmod efi_uga
insmod video_bochs
insmod video_cirrus
insmod all_video

set gfxpayload=keep
set gfxmode=auto

menuentry "TokyOS Linux" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs
          toram=yes quiet splash consoleblank=0
    initrd /boot/initrd.img
}

menuentry "TokyOS Linux (modo seguro)" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs
          toram=yes nomodeset quiet
    initrd /boot/initrd.img
}
GRUBEOF

    cat > "$ISO_DIR/boot/grub/loopback.cfg" << 'LOOPEOF'
menuentry "TokyOS Linux" {
    linux /boot/vmlinuz boot=live findiso=/live/tokyos-root.squashfs toram=yes quiet splash
    initrd /boot/initrd.img
}
LOOPEOF
}

generate_iso() {
    log "Gerando ISO bootável..."

    mkdir -p "$ISO_DIR/EFI/BOOT"

    grub-mkrescue -o "$OUTPUT_ISO" "$ISO_DIR" \
        --locales="" \
        --fonts="" \
        --themes="" \
        2>&1

    log "ISO gerada: $OUTPUT_ISO ($(du -sh "$OUTPUT_ISO" | cut -f1))"
}

main() {
    echo ""
    echo "=============================================="
    echo "  TokyOS Linux Builder v$VERSION"
    echo "=============================================="
    echo ""

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
