# Memory Loop

## O que é

O Memory Loop é o sistema de persistência da Tokyo IA. Ele salva:
- Histórico de comandos
- Memórias do usuário
- Resultados de ferramentas
- Logs de ações

## Banco de Dados

SQLite local em:
```
/opt/tokyos/tokyo-ia/data/tokyo_memory.db
```

## Tabelas

### commands

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT | UUID do comando |
| source | TEXT | Voz, portal, workflow, api |
| user | TEXT | Quem enviou |
| raw_text | TEXT | Texto original |
| intent | TEXT | Intenção classificada |
| selected_tool | TEXT | Ferramenta escolhida |
| status | TEXT | received/ok/error/blocked |
| created_at | TEXT | Timestamp ISO |
| result_summary | TEXT | Resumo do resultado |

### memories

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | PK autoincrement |
| user | TEXT | Dono da memória |
| context | TEXT | Contexto (vendas, sistema, etc) |
| content | TEXT | Conteúdo da memória |
| tags | TEXT | JSON array de tags |
| created_at | TEXT | Timestamp ISO |

### tool_results

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | PK autoincrement |
| command_id | TEXT | Comando relacionado |
| tool_id | TEXT | Ferramenta usada |
| action | TEXT | Ação executada |
| status | TEXT | ok/error/dry_run |
| result | TEXT | JSON do resultado |
| created_at | TEXT | Timestamp ISO |

## Logs

Toda ação também gera uma linha em:
```
/opt/tokyos/tokyo-ia/logs/tokyo_actions.jsonl
```

Formato JSONL com timestamp, command_id, source, user, intent, tool, risk_level, status, result, error.
