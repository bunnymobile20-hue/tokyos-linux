# TokyOS + Tokyo IA Architecture

## Visão Geral da Arquitetura

```
┌──────────────────────────────────────────────────────┐
│                    TOKYOS                             │
│                 (Corpo Operacional)                    │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │              Interface (React SPA)              │  │
│  │  ┌──────────┐ ┌─────────┐ ┌────────────────┐  │  │
│  │  │ Desktop  │ │ Portal  │ │ TokyOS Store   │  │  │
│  │  │ Launcher │ │Dashboard│ │ Apps & Plugins │  │  │
│  │  └──────────┘ └─────────┘ └────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │            Backend (Node.js)                    │  │
│  │  ┌──────────┐ ┌─────────┐ ┌────────────────┐  │  │
│  │  │ API REST │ │ Auth    │ │ Services       │  │  │
│  │  │ :3001    │ │ Basic   │ │ (DB, Cache)    │  │  │
│  │  └──────────┘ └─────────┘ └────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │         Tokyo IA (Cérebro)                     │  │
│  │  ┌────────┐ ┌──────┐ ┌───────┐ ┌──────────┐  │  │
│  │  │ Agents │ │Brain │ │Voice  │ │ Vision   │  │  │
│  │  │ (RPA)  │ │(Memo)│ │(STT)  │ │(CV)      │  │  │
│  │  └────────┘ └──────┘ └───────┘ └──────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐   │  │
│  │  │Workflows │ │Approval  │ │ Policy     │   │  │
│  │  │Engine    │ │Guard     │ │ Engine     │   │  │
│  │  └──────────┘ └──────────┘ └────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │            Sistema Base (Linux)                │  │
│  │  ┌────────┐ ┌──────┐ ┌───────┐ ┌──────────┐  │  │
│  │  │ Logs   │ │Backup│ │Services│ │ Updates  │  │  │
│  │  │ System │ │Snap  │ │systemd │ │ A/B OTA  │  │  │
│  │  └────────┘ └──────┘ └───────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Fluxo de Dados

```
Usuário → TokyOS Desktop → App → Backend API (:3001)
                                    ├── TokyOS Services (logs, backup, updates)
                                    └── Tokyo IA (agentes, memória, decisões)
```

## Componentes

### TokyOS
- **TokyOS Portal**: Dashboard principal com KPIs, status do sistema
- **TokyOS Desktop**: Ambiente de trabalho com launcher de apps, dock, widgets
- **TokyOS Store**: Catálogo de aplicativos e integrações
- **TokyOS Settings**: Configurações do sistema, personalização, contas
- **TokyOS Logs**: Visualização de logs do sistema e serviços
- **TokyOS Backup**: Gerenciamento de snapshots e restic backups
- **TokyOS Services**: Gerenciamento de serviços systemd

### Tokyo IA
- **Tokyo IA Agent**: Agentes RPA (Hermes, Paperclip)
- **Tokyo IA Brain**: Memória neural e raciocínio
- **Tokyo Voice**: Assistente de voz (Jarvis)
- **Tokyo Vision**: Visão computacional
- **Tokyo Workflows**: Motor de workflows automatizados
- **Tokyo Approval Guard**: Sistema de aprovação e auditoria
- **Tokyo Policy Engine**: Motor de políticas e regras de negócio

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| Backend | Node.js 20, Express |
| Banco | SQLite (via better-sqlite3) |
| SO Base | Debian Bookworm |
| Desktop | GNOME 43 (ou kiosk lightweight) |
| Display | Wayland (weston) ou X11 (Xorg) |
