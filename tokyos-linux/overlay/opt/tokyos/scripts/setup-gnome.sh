#!/bin/bash
# Aplica configurações iniciais do GNOME para o usuário tokyos
exec /usr/bin/env \
    XDG_CONFIG_HOME=/home/tokyos/.config \
    /usr/bin/dconf update 2>/dev/null || true

mkdir -p /home/tokyos/.config/dconf
cat > /home/tokyos/.config/dconf/user.txt << 'DCONF'
[org/gnome/shell]
favorite-apps=['tokyos.desktop', 'chromium.desktop', 'org.gnome.Nautilus.desktop', 'org.gnome.Terminal.desktop']

[org/gnome/desktop/background]
picture-uri=''
picture-options='none'
primary-color='#0f172a'

[org/gnome/desktop/screensaver]
picture-uri=''
primary-color='#0f172a'

[org/gnome/settings-daemon/plugins/media-keys]
custom-keybindings=['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/']

[org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0]
name='TokyOS Dashboard'
binding='<Super>t'
command='/opt/tokyos/scripts/open-dashboard.sh'

[org/gnome/desktop/interface]
font-name='Noto Sans 10'
document-font-name='Noto Sans 10'
monospace-font-name='Noto Sans Mono 10'
DCONF
chown -R 1000:1000 /home/tokyos/.config 2>/dev/null || true
