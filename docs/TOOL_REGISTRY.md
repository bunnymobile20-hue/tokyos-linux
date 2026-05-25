# Tool Registry

## O que é

O Tool Registry é o catálogo central de todas as ferramentas que a Tokyo IA pode usar. Cada ferramenta tem capacidades, nível de risco e schema de entrada/saída.

## Arquivo de Configuração

```yaml
tools:
  - id: browser_agent
    name: Navegador IA
    status: active
    risk_level: low
    requires_approval: false
    capabilities:
      - open_url
      - dry_run_browser
```

Localização: `/opt/tokyos/tokyo-ia/config/tools.yaml`

## Ferramentas Atuais

| ID | Nome | Status | Risco | Requer Aprovação |
|----|------|--------|-------|-----------------|
| browser_agent | Navegador IA | active | low | não |
| playwright | Playwright | inactive | high | sim |
| firecrawl | Firecrawl | inactive | low | não |
| mem0 | Memória (Mem0) | active | low | não |
| obsidian | Obsidian Vault | planned | low | não |
| openclaw | OpenClaw Gateway | legacy | high | sim |
| hermes | Hermes Agent | active | medium | não |
| paperclip | Paperclip | active | medium | não |
| tokyo_planner | Planejador Tokyo | active | low | não |
| tokyos_portal | Portal TokyOS | active | low | não |
| system_monitor | Monitor do Sistema | active | low | não |
| action_log | Registro de Ações | active | low | não |

## Como Adicionar uma Ferramenta

1. Adicionar entrada em `config/tools.yaml`
2. Criar adapter em `adapters/`.py
3. Registrar no `tool_registry.py` → `find_by_intent()`
4. Registrar no `action_executor.py` → `adapter_map`
5. Testar com `scripts/fase5/70_test_tokyo_command.sh`
