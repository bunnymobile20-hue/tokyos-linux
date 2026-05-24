# Legacy Names Map

## ClawOS → TokyOS

| Legado (ClawOS) | Novo (TokyOS) | Tipo |
|-----------------|---------------|------|
| ClawOS Dashboard | TokyOS Portal | Interface |
| ClawOS Web Desktop | TokyOS Desktop | Interface |
| ClawOS Store | TokyOS Store | Interface |
| ClawOS Settings | TokyOS Settings | Interface |
| ClawOS Logs | TokyOS Logs | Sistema |
| ClawOS Backup | TokyOS Backup | Sistema |
| ClawOS Services | TokyOS Services | Sistema |
| `clawos.service` | `tokyos.service` | Systemd (Fase 4) |
| `/opt/clawos/` | `/opt/tokyos/` | Path (Fase 4) |
| `CLAWOS_*` env vars | `TOKYOS_*` env vars | Ambiente (Fase 4) |
| `clawos.*` localStorage | `tokyos.*` localStorage | Browser (Fase 4) |
| `clawos:*` Basic Auth | `tokyos:*` Basic Auth | API (Fase 4) |

## KiraCore → Tokyo IA

| Legado (KiraCore) | Novo (Tokyo IA) | Tipo |
|-------------------|-----------------|------|
| KiraCore Agent | Tokyo IA Agent | Agente |
| KiraCore Brain | Tokyo IA Brain | Inteligência |
| Kira Memory | Tokyo Memory | Memória |
| Kira Voice | Tokyo Voice | Voz |
| Kira Vision | Tokyo Vision | Visão |
| Kira Workflows | Tokyo Workflows | Workflows |
| Approval Guard | Tokyo Approval Guard | Aprovação |
| Policy Engine | Tokyo Policy Engine | Políticas |
| Kira Analytics | Tokyo Analytics | Análise |
| Kira Automation | Tokyo Automation | Automação |

## Referências preservadas (não alterar agora)

- `clawos` como usuário/senha Basic Auth (compatibilidade API)
- `kira_` em nomes de variáveis internas (código)
- `application/x-clawos-*` em data transfer (drag & drop interno)
- `clawos` em URLs de proxy reverso
