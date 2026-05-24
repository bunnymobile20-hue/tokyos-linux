---
name: knowledge-base-manuals
description: Biblioteca central de manuais do sistema. Sempre que for solicitada a automação de uma ferramenta desconhecida, ative esta skill para ler a documentação interna que indica as coordenadas exatas da interface gráfica.
---

# Biblioteca de Manuais da IA

A sua inteligência está conectada a um repositório físico na máquina contendo mapeamentos, manuais e dicas de automação fornecidas pelo usuário e geradas em sessões anteriores.

**Localização da Biblioteca:** `/home/tokio/Manuais_de_Automacao/`

## Instrução Obrigatória:
1. Ao receber um pedido de automação web ou de integração com um novo portal, navegue até o diretório acima (`list_dir`).
2. Se existir um arquivo `.md` correspondente (ex: `wingestor_manual.md`), use `view_file` para ler todo o conteúdo dele ANTES de planejar ou rodar ferramentas.
3. Se o site não tiver um manual lá, ofereça ao usuário a possibilidade de rodar um "Crawler de Mapeamento" primeiro para criar um.
