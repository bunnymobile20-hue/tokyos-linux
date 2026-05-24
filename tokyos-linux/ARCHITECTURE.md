# TokyOS Linux — Arquitetura

## Filosofia
TokyOS Linux é um sistema operacional minimalista, imutável e kiosk-first.
Não há desktop environment, gerenciador de janelas ou login manager.
O boot termina no dashboard TokyOS em tela cheia.

## Stack de Base
- **Kernel**: Linux LTS (configurado mínimo — só drivers necessários)
- **Init**: Script shell PID 1 customizado (tokyos-init)
- **RootFS**: SquashFS (read-only) montado da partição ISO ou disco
- **Overlay**: tmpfs + partição de dados persistente (/var, /etc, /opt/tokyos/data)
- **Display**: Wayland + um Chromium em modo --kiosk (ou webview nativo futuro)
- **Serviços**: Node.js v20 (Hermes API + backend), Python (browser-use), WebSocket

## Estrutura de Partições (instalado em disco)
```
+-------------------+-------------------+-------------------+
| EFI (vfat, 512MB) | ROOT (squashfs)   | DATA (ext4)       |
| /boot/efi         | /run/rootfs       | /mnt/data         |
+-------------------+-------------------+-------------------+
```
- ROOT é read-only, montada via loopback do squashfs
- DATA monta em /mnt/data com symlinks para /var, /etc, /opt/tokyos/data

## Boot Flow
1. UEFI → systemd-boot → kernel + initramfs
2. Initramfs: descobre root (ISO ou partição), monta squashfs
3. tokyos-init (PID 1):
   a. Monta tmpfs em /run
   b. Monta DATA (se existir) ou cria tmpfs fallback
   c. Seta symlinks: /var → /mnt/data/var, /etc → /mnt/data/etc
   d. Sobe networking (dhcpcd)
   e. Gera/gira AUTHTOKEN
   f. Sobe backend Node.js
   g. Sobe kiosk (Chromium --kiosk)
   h. Entra em loop monitorando backend + kiosk

## Atualizações (swupdate-style)
Duas partições swap:
- Partição A (ativa) + Partição B (standby)
- download de novo squashfs → escreve em B → seta boot para B → reboot
- Se B falha boot, fallback automático para A

## ISO (Live USB)
Gerada com archiso (ou similar):
- Kernel + initramfs
- Squashfs com overlay TokyOS + rootfs base
- systemd-boot como bootloader UEFI
- BIOS legacy support via ISOLINUX (opcional)

## Dependências do Rootfs
### Core
- linux-lts, linux-firmware
- systemd-boot (ou apenas systemd-boot como bootloader)
- squashfs-tools (para montar root)
- dhcpcd (rede)
- wayland, weston (ou sway) — compositor Wayland
- mesa (drivers GPU)

### TokyOS
- nodejs v20
- npm
- python3, python3-pip
- git
- unzip, wget, curl
- xdg-utils (para chromium abrir URLs)

### Kiosk
- chromium (--kiosk --no-sandbox --disable-gpu --enable-features=UseOzonePlatform --ozone-platform=wayland)
- fontes: noto-fonts, noto-fonts-cjk, noto-fonts-emoji

## Estrutura de Pastas (dentro da ISO)
```
/ (squashfs)
├── bin/ -> usr/bin
├── sbin/ -> usr/bin
├── usr/
│   └── local/
│       └── bin/
│           ├── tokyos-init         # PID 1
│           ├── tokyos-backend      # starts backend
│           ├── tokyos-kiosk        # starts chromium
│           ├── tokyos-update       # update mechanism
│           └── tokyos-config       # first-boot config
├── opt/
│   └── tokyos/
│       ├── backend/                # Node.js backend (código)
│       ├── AUTHTOKEN               # auth token
│       └── data/ -> link simbólico
├── etc/
│   └── tokyos/
│       ├── tokyos.conf             # config principal
│       └── network.conf            # config de rede
├── var/ -> link simbólico
└── root/
    └── .local/share/applications/  # para mime types se necessário
```
