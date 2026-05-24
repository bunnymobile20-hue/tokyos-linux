---
name: wingestor-sales-analyzer
description: "Extrai e audita relatórios de vendas oficiais em PDF diretamente do ERP WinGestor."
---

# Wingestor Sales Analyzer (Hermes)

> Skill especializada de extração de relatórios auditados do ERP WinGestor. 

## Contexto
Diferente dos valores rápidos exibidos no Dashboard inicial, os valores reais e oficiais (já com devoluções e descontos aplicados) devem ser extraídos obrigatoriamente do módulo financeiro em PDF.

## Como usar
Acione quando o usuário solicitar "relatório oficial", "vendas auditadas", ou "números exatos do wingestor".

### Pré-requisitos
1. As credenciais (`WINGESTOR_EMAIL`, `WINGESTOR_PASSWORD`) devem estar no arquivo `~/.clawos/.env`.
2. Ambiente isolado do motor RPA deve estar em `browser_agent/venv/`.
3. O script oficial da corporação é `/home/tokio/TokiOS/tools/wingestor/scrape_wingestor_pdf.py`.

### Passo a passo para o Agente Hermes
Quando instado a buscar os relatórios de vendas:

1. Acesse o servidor ou motor RPA local.
2. Certifique-se de invocar o script em Python utilizando o `venv` apropriado. O comando de execução é:
   ```bash
   /home/tokio/TokiOS/browser_agent/venv/bin/python /home/tokio/TokiOS/tools/wingestor/scrape_wingestor_pdf.py
   ```
3. Aguarde o retorno JSON que o script fornece pela saída padrão.
4. O resultado terá o formato:
   ```json
   {
      "Total": "120.300,00",
      "Riverside": "45.000,00",
      "Teresina": "75.300,00"
   }
   ```
5. Comunique este valor ao usuário informando que estes são os valores extraídos, validados e lidos a partir do PDF oficial de vendas do WinGestor.

## Regras
- NUNCA reporte valores do endpoint Ajax `api/graficos/dados-cards`, pois ele é inconsistente para conciliação contábil.
- SEMPRE force o período exato (ex: 1º a 31 do mês) para ter dados precisos. O script suporta argumentos de data no código.
