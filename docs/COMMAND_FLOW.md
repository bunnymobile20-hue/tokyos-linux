# Command Flow

## Como um Comando Entra

```
Fonte: Voz → Voice Adapter → POST /tokyo/command
Fonte: Portal → Formulário → POST /tokyo/command
Fonte: Chat → Input → POST /tokyo/command
Fonte: Workflow → Gatilho → POST /tokyo/command
Fonte: Atalho → Tecla → POST /tokyo/command
Fonte: API → curl → POST /tokyo/command
```

## Como a Intenção é Detectada

O Intent Router usa regras simples baseadas em palavras-chave:

| Padrão | Intenção |
|--------|----------|
| "abre", "abrir", "navegar" | open_page |
| "pesquisar", "busca" | search_web |
| "relatório", "extrair" | extract_report |
| "lembra", "salva na memória" | save_memory |
| "cria tarefa", "crie" | create_task |
| "roda workflow", "executa" | run_workflow |
| "verifica", "status" | check_system |
| "pergunta", "consulta" | ask_agent |

Se nenhuma regra encaixar → `unknown`.

## Como a Ferramenta é Escolhida

O Tool Registry mapeia intenção → ferramenta:

```
open_page       → browser_agent
search_web      → firecrawl
extract_report  → browser_agent
save_memory     → mem0
create_task     → tokyo_planner
run_workflow    → tokyo_planner
check_system    → system_monitor
ask_agent       → hermes
```

## Como a Ação é Executada

1. Action Executor recebe tool + params
2. Verifica risk_level
3. Se high-risk → bloqueia, retorna dry_run
4. Se seguro → chama adapter correspondente
5. Adapter executa ação real ou mock
6. Resultado volta para o Command Bus

## Como a Memória é Salva

Toda ação passa pelo Memory Loop:
1. `save_command()` — salva comando e resultado em SQLite
2. Se ação for `save_memory` → `save_memory()` na tabela memories
3. `save_tool_result()` — salva resultado da ferramenta
4. Log em `logs/tokyo_actions.jsonl`
