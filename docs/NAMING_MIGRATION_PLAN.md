# Naming Migration Plan

## Fases

### Fase 1 — Documentação e Identidade (ATUAL)
- [x] Definir nomes oficiais: TokyOS e Tokyo IA
- [x] Criar mapa de nomenclatura legada
- [x] Documentar arquitetura e glossário
- [ ] Atualizar README.md com nova identidade

### Fase 2 — Interface Visível
- [ ] Substituir "ClawOS" por "TokyOS" em textos da UI (Dashboard, login, etc.)
- [ ] Substituir "KiraCore" / "Kira" por "Tokyo" em textos da UI
- [ ] Atualizar nomes de apps na App Store e launcher
- [ ] Atualizar mensagens de erro e notificações

### Fase 3 — Aliases de Comando
- [ ] Criar `tokyos-status`, `tokyos-start`, `tokyos-stop`, `tokyos-restart`, `tokyos-logs`
- [ ] Criar `tokyoia-status`
- [ ] Aliases apontam para scripts existentes (sem quebrar compatibilidade)

### Fase 4 — Refatoração Interna (SEGURA)
- [ ] Renomear variáveis de ambiente (`CLAWOS_` → `TOKYOS_`)
- [ ] Renomear chaves de localStorage (`clawos.*` → `tokyos.*`)
- [ ] Atualizar paths de configuração
- [ ] Renomear systemd services (após validação)

### Fase 5 — Legado
- [ ] Remover referências internas antigas (após migração completa)
- [ ] Arquivar scripts com nome antigo
- [ ] Documentar sunset do nome ClawOS

## Regras de Migração

- Nunca quebrar compatibilidade reversa
- Manter aliases/symlinks para nomes antigos por pelo menos 2 releases
- Toda mudança visível deve ser anunciada no release notes
- Testar cada fase antes de prosseguir
