# Workflow Engine

## O que é

O Workflow Engine permite criar sequências de ações automatizadas que a Tokyo IA pode executar sob demanda ou em horários agendados.

## Workflows Atuais

### bunny_daily_sales.yaml
- **Nome**: Relatório diário de vendas
- **Intenção**: extract_report
- **Ferramentas**: browser_agent, mem0
- **Status**: planned

### bunny_accounts_today.yaml
- **Nome**: Contas a pagar do dia
- **Intenção**: create_task
- **Ferramentas**: tokyo_planner, mem0
- **Status**: planned

### tokyo_system_check.yaml
- **Nome**: Checagem do sistema TokyOS
- **Intenção**: check_system
- **Ferramentas**: system_monitor, action_log
- **Status**: active

## Formato YAML

```yaml
name: "Nome do Workflow"
intent: extract_report
status: planned|active|deprecated
description: "Descrição"
tools:
  - browser_agent
  - mem0
steps:
  - tool: browser_agent
    action: open_url
    params:
      url: "http://..."
  - tool: mem0
    action: add_memory
    params:
      content: "processado"
      context: "vendas"
```

## Como Adicionar

1. Criar `workflows/meu_workflow.yaml`
2. Testar com `POST /tokyo/workflows/run`
3. Aguardar engine completa para execução real
