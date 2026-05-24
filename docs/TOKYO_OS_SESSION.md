# Fase Futura: Tokyo OS Kiosk Session

Para transformar o Tokyo OS em um substituto total da interface gráfica (dispensando o Cinnamon/Mint Desktop na inicialização), é necessário criar uma Sessão X11 ou Wayland dedicada.

Esta abordagem é ideal para **modo Kiosk**, onde o usuário não terá barra de tarefas do SO base, apenas a interface web interativa do Tokyo OS em tela cheia usando o Google Chrome.

## Passos para Implementação Futura

1. Crie o arquivo de sessão Desktop em `/usr/share/xsessions/tokyo-os.desktop`:
```ini
[Desktop Entry]
Name=Tokyo OS Session
Comment=Sessão dedicada para o Tokyo OS Kiosk
Exec=/home/tokio/TokiOS/scripts/start_tokyo_session.sh
Type=Application
```

2. Crie o script `/home/tokio/TokiOS/scripts/start_tokyo_session.sh` com permissão de execução (`chmod +x`):
```bash
#!/bin/bash
# Desativa protetor de tela
xset s off
xset -dpms
xset s noblank

# Inicia gerenciador de janelas mínimo (ex: openbox)
openbox-session &

# Inicia o servidor Tokyo OS em background
bash /home/tokio/TokiOS/scripts/start_tokyo.sh

# Mantém a sessão viva esperando o Chrome
wait $!
```

3. Na tela de login do Linux Mint (LightDM / GDM), o usuário clica no ícone de engrenagem e seleciona **"Tokyo OS Session"** em vez de "Cinnamon".

## Alertas de Segurança
- Certifique-se de que o script `start_tokyo.sh` inicia o navegador em modo `--kiosk` e trata falhas corretamente.
- Se o backend falhar ao subir, a tela ficará preta. Mantenha um atalho de teclado global (via openbox `rc.xml`) para abrir um terminal de emergência.
