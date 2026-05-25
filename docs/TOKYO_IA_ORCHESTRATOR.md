# Tokyo IA Orchestrator

## Visão Geral

O Tokyo IA Orchestrator é o cérebro central que conecta voz, portal, ferramentas, memória, navegador, workflows e automações.

## Fluxo do Comando

```
Usuário → [Voz | Portal | Chat | Workflow | Atalho | API]
                    ↓
            Command Bus
            (comando padronizado)
                    ↓
            Intent Router
            (classifica intenção)
                    ↓
            Tool Registry
            (escolhe ferramenta)
                    ↓
            Action Executor
            (executa via adapter)
                    ↓
            Memory Loop
            (salva histórico + resultado)
                    ↓
            Resposta para o usuário
```

## Arquitetura

```
/opt/tokyos/tokyo-ia/
├── orchestrator/
│   ├── command_bus.py      # Recebe e padroniza comandos
│   ├── intent_router.py    # Classifica intenção
│   ├── tool_registry.py    # Catálogo de ferramentas
│   ├── action_executor.py  # Executa ações com segurança
│   ├── memory_loop.py      # Persistência SQLite
│   └── api.py              # FastAPI endpoints
├── adapters/               # Conexão com ferramentas
├── config/tools.yaml       # Cadastro de ferramentas
├── workflows/              # Workflows YAML
├── data/                   # SQLite DB
├── logs/                   # tokyo_actions.jsonl
├── reports/
├── tests/
└── scripts/fase5/
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/tokyo/orchestrator/health` | Health check |
| POST | `/tokyo/command` | Executa comando |
| GET | `/tokyo/commands/recent` | Histórico de comandos |
| GET | `/tokyo/tools` | Lista ferramentas |
| GET | `/tokyo/tools/status` | Status das ferramentas |
| GET | `/tokyo/memory/recent` | Memórias recentes |
| POST | `/tokyo/memory/add` | Adiciona memória |
| POST | `/tokyo/workflows/run` | Executa workflow |

## Segurança

- Ações high-risk são bloqueadas pelo Approval Guard
- Toda ação é logada em `logs/tokyo_actions.jsonl`
- Tudo é salvo no Memory Loop (SQLite)
- Navegador só abre URLs locais ou permitidas
- Playwright/automação real requer aprovação
