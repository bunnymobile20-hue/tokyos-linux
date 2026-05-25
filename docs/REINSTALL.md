# Reinstalação do TokiOS no Deepin 25.1

> Preparado em: 2026-05-25
> Destino: Deepin 25.1 (Linux)
> GPU: RTX 3060 12GB VRAM

---

## Pacotes de backup

| Arquivo | Conteúdo | Tamanho |
|---------|----------|---------|
| `tokyos_backup_sanitized_core.tar.gz` | memoriais, skills, scripts de startup | ~2.5KB |
| `tokyos_backup_sanitized_services.tar.gz` | dashboard, token-server, scripts | ~24KB |
| `tokyos_backup_sanitized_jarvis.tar.gz` | jarvis-agent (agent, prompts, tools) | ~21KB |
| `tokyos_*.full.tar.gz` | **NÃO subir pro git** — contém .env com secrets | |

> Sanitizados em `backups/`. `.full.tar.gz` contém secrets — mantenha local.

---

## Passo 0 — Sistema Base

```bash
# Atualizar Deepin
sudo apt update && sudo apt upgrade -y

# Dependências essenciais
sudo apt install -y git curl wget build-essential python3 python3-pip python3-venv \
  nodejs npm tmux nginx ca-certificates

# Node.js 22+ (Deepin pode vir desatualizado)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Docker (para FileBrowser e outros)
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

---

## Passo 1 — Clonar Repositório

```bash
git clone https://github.com/bunnymobile20-hue/tokyos-linux.git /home/tokio/TokiOS
cd /home/tokio/TokiOS
```

---

## Passo 2 — Restaurar Backup

```bash
cd /
tar -xzf /home/tokio/TokiOS/backups/tokyos_reinstall_*.tar.gz
tar -xzf /home/tokio/TokiOS/backups/tokyos_opt-services_*.tar.gz
tar -xzf /home/tokio/TokiOS/backups/tokyos_jarvis-agent_*.tar.gz
```

---

## Passo 3 — Ollama + Modelos

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Baixar modelos (26GB total)
ollama pull qwen3:14b
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```

> GPU RTX 3060 12GB: Qwen 3 14B cabe folgado (9.3GB).
> Verificar se CUDA está ativo: `ollama serve` → logs mostram "CUDA可用".

---

## Passo 4 — Backend

```bash
cd /home/tokio/TokiOS/backend
npm install
npm run build

# .env já restaurado do backup
# Verificar conexão com banco:
ls data/database/*.db
```

---

## Passo 5 — Frontend

```bash
cd /home/tokio/TokiOS/frontend
npm install
npm run build

# Servir via nginx ou preview
```

---

## Passo 6 — Serviços opt-tokyos

```bash
# Dashboard
cd /home/tokio/opt-tokyos/dashboard
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# .env já restaurado

# Jarvis Agent
cd /home/tokio/opt-tokyos/jarvis-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# .env já restaurado

# Token Server
cd /home/tokio/opt-tokyos/token-server
npm install
# .env já restaurado
```

---

## Passo 7 — Browser Agent

```bash
cd /home/tokio/opt-tokyos/TokiOS/backend/services/browser_agent
python3 -m venv venv
source venv/bin/activate
pip install browser-use websockets
# Ou reinstalar do requirements.txt se existir
```

---

## Passo 8 — Iniciar Tudo

```bash
# 1. Ollama (tmux)
tmux new-session -d -s ollama 'ollama serve'

# 2. Backend
PORT=7071 node /home/tokio/TokiOS/backend/dist/server.js

# 3. Frontend (dev)
cd /home/tokio/TokiOS/frontend && npx vite --host 0.0.0.0 --port 3000

# 4. Dashboard
cd /home/tokio/opt-tokyos/dashboard && python app.py

# 5. Jarvis Agent
cd /home/tokio/opt-tokyos/jarvis-agent && python agent-automation.py

# 6. Token Server
cd /home/tokio/opt-tokyos/token-server && npm start

# 7. Browser Agent
cd /home/tokio/TokiOS/backend/services/browser_agent && python agent_server.py
```

> Ou usar `./Servidor_Tokio_Producao.sh` que faz tudo automaticamente.

---

## Portas

| Serviço | Porta |
|---------|-------|
| Frontend (Vite) | 3000 |
| Backend | 7071 |
| ClawOS | 3001 |
| Dashboard | 8080 |
| Jarvis Agent | (LiveKit) |
| Token Server | 3002 |
| Browser Agent WS | 8765 |
| Ollama | 11434 |
| Chrome CDP | 9222 |

---

## Estrutura de Diretórios

```
/home/tokio/
├── TokiOS/                    # Repositório principal (git)
│   ├── backend/               # API + services
│   ├── frontend/              # Dashboard + apps
│   ├── data/database/         # SQLite DBs
│   ├── _memoria/              # Memoriais do agente
│   ├── _skills/               # Skills auto-geradas
│   ├── backups/               # Backups
│   └── docs/                  # Documentação
└── opt-tokyos/                # Serviços auxiliares (não git)
    ├── dashboard/             # Dashboard financeiro
    ├── jarvis-agent/          # Agente LiveKit + voz
    ├── token-server/          # Servidor de tokens
    └── scripts/               # Scripts utilitários
```

---

## Observações

1. **Deepin 25.1** usa base Debian testing — `apt` funciona normalmente
2. **RTX 3060 12GB** precisa dos drivers NVIDIA proprietários:
   ```bash
   sudo apt install nvidia-driver firmware-misc-nonfree
   ```
3. **Ollama** com CUDA: verificar com `ollama run qwen3:14b --verbose`
4. **LiveKit** precisa de credenciais no `.env` do jarvis-agent
5. **Chrome** para Browser Use: instalar com `sudo apt install google-chrome-stable`
