---
name: wingestor-navigation-manual
description: Manual oficial de navegação do ERP WinGestor. LEIA este manual ANTES de tentar criar scripts de automação, usar playwright ou manipular telas do WinGestor. Ele contém todas as URLs corretas, nomes de formulários, IDs de inputs e botões de ação para os módulos Financeiro, Vendas e Produtos.
---
# Manual de Navegação e Interação - WinGestor
Este manual contém o mapeamento dos formulários, botões e campos de entrada das principais telas do WinGestor, desenhado para orientar robôs de automação.

## Caixa (`https://app.wingestor.com.br/caixa`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/caixa/fechar`
  - **Campos de Entrada:**
    - `name="valor_dinheiro"` (Tipo: `tel`)
    - `name="valor_cheque"` (Tipo: `tel`)
    - `name="valor_outros"` (Tipo: `tel`)
    - `name="observacao"` (Tipo: `text`)
  - **Botões do Formulário:**
    - `Salvar Fechamento` (Tipo: `submit`)

### Links e Botões de Ação
- `Fechar Caixa` -> Navega para `https://app.wingestor.com.br/caixa/fechar-conta/140`
---

## Abertura de caixa (`https://app.wingestor.com.br/caixa/create`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/caixa`

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/caixa`
---

## Lista de Caixa (`https://app.wingestor.com.br/caixa/list`)

### Links e Botões de Ação
- `Listar todos os caixas abertos` -> Navega para `https://app.wingestor.com.br/caixa/abertos-empresa`
---

## Categorias de Produto (`https://app.wingestor.com.br/categoria-produtos`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/15`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/14`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/11`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/13`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/16`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/12`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/18`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos/17`
- **Ação do Formulário:** `https://app.wingestor.com.br/categoria-produtos-destroy-select`
  - **Botões do Formulário:**
    - `Remover selecionados` (Tipo: `button`)

### Links e Botões de Ação
- `Nova Categoria` -> Navega para `https://app.wingestor.com.br/categoria-produtos/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/categoria-produtos`
---

## Compras (`https://app.wingestor.com.br/compras`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3369`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3368`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3367`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3366`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3365`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3171`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3170`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3097`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3095`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3080`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/3079`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2996`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2995`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2812`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2811`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2702`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2701`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2700`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2699`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2698`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2697`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2422`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2421`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2420`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2419`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2417`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2416`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2415`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2414`
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe/2413`

### Links e Botões de Ação
- `Nova Compra` -> Navega para `https://app.wingestor.com.br/compras/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/compras`
---

## Importar Xml (`https://app.wingestor.com.br/compras-xml`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/store-xml`
  - **Campos de Entrada:**
    - `name="file"` (Tipo: `file`)

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/compras`
---

## Nova Compra (`https://app.wingestor.com.br/compras/create`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/nfe`
  - **Campos de Entrada:**
    - `name="local_id"` (Tipo: `select`)
    - `name="fornecedor_id"` (Tipo: `select`)
    - `name="fornecedor_nome"` (Tipo: `text`)
    - `name="nome_fantasia"` (Tipo: `text`)
    - `name="fornecedor_cpf_cnpj"` (Tipo: `tel`)
    - `name="ie"` (Tipo: `text`)
    - `name="telefone"` (Tipo: `tel`)
    - `name="contribuinte"` (Tipo: `select`)
    - `name="consumidor_final"` (Tipo: `select`)
    - `name="email"` (Tipo: `text`)
    - `name="fornecedor_cidade"` (Tipo: `select`)
    - `name="fornecedor_rua"` (Tipo: `text`)
    - `name="fornecedor_numero"` (Tipo: `text`)
    - `name="cep"` (Tipo: `text`)
    - `name="fornecedor_bairro"` (Tipo: `text`)
    - `name="complemento"` (Tipo: `text`)
    - `name="produto_id[]"` (Tipo: `select`)
    - `name="quantidade[]"` (Tipo: `tel`)
    - `name="valor_unitario[]"` (Tipo: `tel`)
    - `name="sub_total[]"` (Tipo: `tel`)
    - `name="perc_icms[]"` (Tipo: `tel`)
    - `name="perc_pis[]"` (Tipo: `tel`)
    - `name="perc_cofins[]"` (Tipo: `tel`)
    - `name="perc_ipi[]"` (Tipo: `tel`)
    - `name="perc_red_bc[]"` (Tipo: `tel`)
    - `name="cfop[]"` (Tipo: `tel`)
    - `name="ncm[]"` (Tipo: `tel`)
    - `name="codigo_beneficio_fiscal[]"` (Tipo: `text`)
    - `name="cst_csosn[]"` (Tipo: `select`)
    - `name="cst_pis[]"` (Tipo: `select`)
    - `name="cst_cofins[]"` (Tipo: `select`)
    - `name="cst_ipi[]"` (Tipo: `select`)
    - `name="xPed[]"` (Tipo: `text`)
    - `name="nItemPed[]"` (Tipo: `text`)
    - `name="infAdProd[]"` (Tipo: `text`)
    - `name="transportadora_id"` (Tipo: `select`)
    - `name="razao_social_transp"` (Tipo: `text`)
    - `name="nome_fantasia_transp"` (Tipo: `text`)
    - `name="cpf_cnpj_transp"` (Tipo: `tel`)
    - `name="ie_transp"` (Tipo: `tel`)
    - `name="antt"` (Tipo: `tel`)
    - `name="rua_transp"` (Tipo: `tel`)
    - `name="numero_transp"` (Tipo: `tel`)
    - `name="cidade_transp"` (Tipo: `select`)
    - `name="cep_transp"` (Tipo: `tel`)
    - `name="email_transp"` (Tipo: `text`)
    - `name="telefone_transp"` (Tipo: `tel`)
    - `name="bairro_transp"` (Tipo: `text`)
    - `name="complemento_transp"` (Tipo: `text`)
    - `name="valor_frete"` (Tipo: `tel`)
    - `name="qtd_volumes"` (Tipo: `tel`)
    - `name="numeracao_volumes"` (Tipo: `tel`)
    - `name="peso_bruto"` (Tipo: `tel`)
    - `name="peso_liquido"` (Tipo: `tel`)
    - `name="especie"` (Tipo: `text`)
    - `name="marca"` (Tipo: `text`)
    - `name="tipo"` (Tipo: `select`)
    - `name="placa"` (Tipo: `text`)
    - `name="uf"` (Tipo: `select`)
    - `name="natureza_id"` (Tipo: `select`)
    - `name="acrescimo"` (Tipo: `tel`)
    - `name="desconto"` (Tipo: `tel`)
    - `name="observacao"` (Tipo: `text`)
    - `name="numero_nfe"` (Tipo: `tel`)
    - `name="referencia"` (Tipo: `tel`)
    - `name="data_emissao_saida"` (Tipo: `date`)
    - `name="data_emissao_retroativa"` (Tipo: `date`)
    - `name="data_entrega"` (Tipo: `date`)
    - `name="tpNF"` (Tipo: `select`)
    - `name="finNFe"` (Tipo: `select`)
    - `name="gerar_conta_pagar"` (Tipo: `select`)
    - `name="tipo_pagamento[]"` (Tipo: `select`)
    - `name="data_vencimento[]"` (Tipo: `date`)
    - `name="valor_fatura[]"` (Tipo: `tel`)
    - `name="bandeira_cartao"` (Tipo: `select`)
    - `name="cAut_cartao"` (Tipo: `tel`)
    - `name="cnpj_cartao"` (Tipo: `tel`)
    - `name="tipo_pagamento_lista"` (Tipo: `select`)
    - `name="funcionario_lista_id"` (Tipo: `select`)
    - `name="lista_preco_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Lista de preços` (Tipo: `button`)
    - `Adicionar Produto` (Tipo: `button`)
    - `Fatura Padrão do Cliente` (Tipo: `button`)
    - `Gerar Fatura` (Tipo: `button`)
    - `Adicionar Pagamento` (Tipo: `button`)
    - `Salvar` (Tipo: `submit`)
    - `Salvar` (Tipo: `button`)
    - `Gerar` (Tipo: `button`)
    - `Escolher lista` (Tipo: `button`)

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/compras`
---

## Contas a Pagar (`https://app.wingestor.com.br/conta-pagar`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/18`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/19`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/20`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/21`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/22`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/23`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/24`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/25`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/26`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/27`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/28`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/29`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/31`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/32`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/33`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/34`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/35`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/36`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/49`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/50`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/51`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/52`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/53`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/54`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/55`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/56`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/57`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/58`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/59`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar/60`
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar-destroy-select`
  - **Botões do Formulário:**
    - `Remover selecionados` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar-pagar-select`
  - **Botões do Formulário:**
    - `Pagar selecionados` (Tipo: `button`)

### Links e Botões de Ação
- `Nova Conta Pagar` -> Navega para `https://app.wingestor.com.br/conta-pagar/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/conta-pagar`
---

## Nova Conta Pagar (`https://app.wingestor.com.br/conta-pagar/create`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-pagar`
  - **Campos de Entrada:**
    - `name="local_id"` (Tipo: `select`)
    - `name="descricao"` (Tipo: `text`)
    - `name="fornecedor_id"` (Tipo: `select`)
    - `name="valor_integral"` (Tipo: `text`)
    - `name="data_vencimento"` (Tipo: `date`)
    - `name="status"` (Tipo: `select`)
    - `name="tipo_pagamento"` (Tipo: `select`)
    - `name="categoria_conta_id"` (Tipo: `select`)
    - `name="file"` (Tipo: `file`)
    - `name="observacao"` (Tipo: `text`)
    - `name="observacao2"` (Tipo: `text`)
    - `name="observacao3"` (Tipo: `text`)
    - `name="recorrencia"` (Tipo: `tel`) - Placeholder: "mm/aa"
  - **Botões do Formulário:**
    - `Salvar` (Tipo: `submit`)

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/conta-pagar`
---

## Contas a Receber (`https://app.wingestor.com.br/conta-receber`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-receber-destroy-select`
  - **Botões do Formulário:**
    - `Remover selecionados` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-receber-recebe-select`
  - **Botões do Formulário:**
    - `Receber selecionados` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/boleto-create-several`
  - **Botões do Formulário:**
    - `Gerar boletos` (Tipo: `submit`)

### Links e Botões de Ação
- `Nova Conta Receber` -> Navega para `https://app.wingestor.com.br/conta-receber/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/conta-receber`
---

## Nova Conta Receber (`https://app.wingestor.com.br/conta-receber/create`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/conta-receber`
  - **Campos de Entrada:**
    - `name="local_id"` (Tipo: `select`)
    - `name="descricao"` (Tipo: `text`)
    - `name="cliente_id"` (Tipo: `select`)
    - `name="valor_integral"` (Tipo: `text`)
    - `name="data_vencimento"` (Tipo: `date`)
    - `name="status"` (Tipo: `select`)
    - `name="tipo_pagamento"` (Tipo: `select`)
    - `name="categoria_conta_id"` (Tipo: `select`)
    - `name="file"` (Tipo: `file`)
    - `name="observacao"` (Tipo: `text`)
    - `name="observacao2"` (Tipo: `text`)
    - `name="observacao3"` (Tipo: `text`)
    - `name="recorrencia"` (Tipo: `tel`) - Placeholder: "mm/aa"
  - **Botões do Formulário:**
    - `Salvar` (Tipo: `submit`)

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/conta-receber`
---

## Estoque (`https://app.wingestor.com.br/estoque`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/31`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/32`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/33`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/34`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/35`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/36`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/37`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/38`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/39`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/40`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/41`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/42`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/43`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/44`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/45`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/46`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/47`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/48`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/49`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/50`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/51`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/52`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/53`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/54`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/55`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/56`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/57`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/58`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/59`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/estoque/60`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)

### Links e Botões de Ação
- `Adicionar estoque` -> Navega para `https://app.wingestor.com.br/estoque/create`
- `Retirada de Estoque` -> Navega para `https://app.wingestor.com.br/estoque-retirada`
- `Apontamento de Produção` -> Navega para `https://app.wingestor.com.br/apontamento/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/estoque`
---

## Inventários (`https://app.wingestor.com.br/inventarios`)

### Links e Botões de Ação
- `Novo Inventário` -> Navega para `https://app.wingestor.com.br/inventarios/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/inventarios`
---

## Configuração Mercado Livre (`https://app.wingestor.com.br/mercado-livre-produtos-news`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/mercado-livre-config`
  - **Campos de Entrada:**
    - `name="client_id"` (Tipo: `text`)
    - `name="client_secret"` (Tipo: `text`)
    - `name="url"` (Tipo: `text`)
  - **Botões do Formulário:**
    - `Salvar` (Tipo: `submit`)

---

## Produtos (`https://app.wingestor.com.br/produtos`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1237`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1253`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1254`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5869`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5424`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5425`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5426`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5411`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1255`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1256`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1257`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1258`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1259`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1260`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1261`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1262`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1263`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1264`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1201`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1265`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1266`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1267`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1268`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1269`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1270`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1271`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1272`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1273`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1274`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/5555`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos-destroy-select`
  - **Botões do Formulário:**
    - `Remover selecionados` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos-desactive-select`
  - **Botões do Formulário:**
    - `Desativar selecionados` (Tipo: `button`)

### Links e Botões de Ação
- `Novo Produto` -> Navega para `https://app.wingestor.com.br/produtos/create`
- `Upload` -> Navega para `https://app.wingestor.com.br/produtos-import`
- `Exportar` -> Navega para `https://app.wingestor.com.br/produtos-export`
- `Reajuste em Grupo` -> Navega para `https://app.wingestor.com.br/produtos-reajuste`
- `Upload de Imagens` -> Navega para `https://app.wingestor.com.br/produtos-upload-imagens`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos`
---

## Produtos de Cardápio (`https://app.wingestor.com.br/produtos-cardapio`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1200`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1201`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1202`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1203`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1204`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1205`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1206`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1207`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1208`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1209`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1210`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1211`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1212`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1213`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1214`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1215`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1216`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1217`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1218`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1219`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1220`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1221`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1222`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1223`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1224`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1225`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1226`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1227`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1228`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1229`

### Links e Botões de Ação
- `Novo Produto Cardápio` -> Navega para `https://app.wingestor.com.br/produtos/create?cardapio=1`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-cardapio`
---

## Categorias de Cardápio (`https://app.wingestor.com.br/produtos-cardapio-categorias`)

### Links e Botões de Ação
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-cardapio-categorias`
---

## Produtos de Delivery (`https://app.wingestor.com.br/produtos-delivery`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1200`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1201`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1202`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1203`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1204`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1205`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1206`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1207`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1208`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1209`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1210`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1211`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1212`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1213`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1214`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1215`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1216`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1217`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1218`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1219`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1220`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1221`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1222`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1223`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1224`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1225`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1226`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1227`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1228`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1229`

### Links e Botões de Ação
- `Novo Produto Delivery` -> Navega para `https://app.wingestor.com.br/produtos/create?delivery=1`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-delivery`
---

## Categorias de Delivery (`https://app.wingestor.com.br/produtos-delivery-categorias`)

### Links e Botões de Ação
- `Nova Categoria` -> Navega para `https://app.wingestor.com.br/categoria-produtos/create?delivery=1`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-delivery-categorias`
---

## Produtos de Ecommerce (`https://app.wingestor.com.br/produtos-ecommerce`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1200`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1201`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1202`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1203`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1204`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1205`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1206`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1207`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1208`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1209`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1210`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1211`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1212`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1213`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1214`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1215`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1216`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1217`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1218`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1219`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1220`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1221`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1222`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1223`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1224`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1225`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1226`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1227`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1228`
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos/1229`

### Links e Botões de Ação
- `Novo Produto Ecommerce` -> Navega para `https://app.wingestor.com.br/produtos/create?ecommerce=1`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-ecommerce`
---

## Categorias de Ecommerce (`https://app.wingestor.com.br/produtos-ecommerce-categorias`)

### Links e Botões de Ação
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-ecommerce-categorias`
---

## Produtos para Reserva (`https://app.wingestor.com.br/produtos-reserva`)

### Links e Botões de Ação
- `Novo Produto` -> Navega para `https://app.wingestor.com.br/produtos/create?reserva=1`
- `Limpar` -> Navega para `https://app.wingestor.com.br/produtos-reserva`
---

## Novo Produto (`https://app.wingestor.com.br/produtos/create`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/produtos`
  - **Campos de Entrada:**
    - `name="nome"` (Tipo: `text`)
    - `name="valor_compra"` (Tipo: `tel`)
    - `name="percentual_lucro"` (Tipo: `tel`)
    - `name="valor_unitario"` (Tipo: `tel`)
    - `name="valor_minimo_venda"` (Tipo: `tel`)
    - `name="codigo_barras"` (Tipo: `text`)
    - `name="codigo_barras2"` (Tipo: `text`)
    - `name="codigo_barras3"` (Tipo: `text`)
    - `name="referencia"` (Tipo: `tel`)
    - `name="gerenciar_estoque"` (Tipo: `select`)
    - `name="estoque_inicial"` (Tipo: `tel`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="sub_categoria_id"` (Tipo: `select`)
    - `name="marca_id"` (Tipo: `select`)
    - `name="estoque_minimo"` (Tipo: `text`)
    - `name="alerta_validade"` (Tipo: `text`)
    - `name="referencia_balanca"` (Tipo: `tel`)
    - `name="unidade"` (Tipo: `select`)
    - `name="status"` (Tipo: `select`)
    - `name="composto"` (Tipo: `select`)
    - `name="variavel"` (Tipo: `select`)
    - `name="combo"` (Tipo: `select`)
    - `name="tipo_unico"` (Tipo: `select`)
    - `name="balanca_pdv"` (Tipo: `select`)
    - `name="exportar_balanca"` (Tipo: `select`)
    - `name="locais[]"` (Tipo: `select`)
    - `name="valor_atacado"` (Tipo: `tel`)
    - `name="quantidade_atacado"` (Tipo: `tel`)
    - `name="observacao"` (Tipo: `tel`)
    - `name="observacao2"` (Tipo: `tel`)
    - `name="observacao3"` (Tipo: `tel`)
    - `name="observacao4"` (Tipo: `tel`)
    - `name="tipo_dimensao"` (Tipo: `select`)
    - `name="espessura"` (Tipo: `tel`)
    - `name="largura"` (Tipo: `tel`)
    - `name="altura"` (Tipo: `tel`)
    - `name="comprimento"` (Tipo: `tel`)
    - `name="peso"` (Tipo: `tel`)
    - `name="peso_bruto"` (Tipo: `tel`)
    - `name="tipo_producao"` (Tipo: `select`)
    - `name="local_armazenamento"` (Tipo: `text`)
    - `name="variacao_modelo_id"` (Tipo: `select`)
    - `name="sub_variacao_modelo_id"` (Tipo: `select`)
    - `name="margem_combo"` (Tipo: `tel`)
    - `name="valor_combo"` (Tipo: `tel`)
    - `name="image"` (Tipo: `file`)
    - `name="padrao_id"` (Tipo: `select`)
    - `name="ncm"` (Tipo: `select`)
    - `name="cest"` (Tipo: `tel`)
    - `name="perc_icms"` (Tipo: `tel`)
    - `name="perc_pis"` (Tipo: `tel`)
    - `name="perc_cofins"` (Tipo: `tel`)
    - `name="perc_ipi"` (Tipo: `tel`)
    - `name="perc_red_bc"` (Tipo: `tel`)
    - `name="origem"` (Tipo: `select`)
    - `name="cst_csosn"` (Tipo: `select`)
    - `name="cst_pis"` (Tipo: `select`)
    - `name="cst_cofins"` (Tipo: `select`)
    - `name="cst_ipi"` (Tipo: `select`)
    - `name="cEnq"` (Tipo: `select`)
    - `name="cfop_estadual"` (Tipo: `tel`)
    - `name="cfop_outro_estado"` (Tipo: `tel`)
    - `name="cfop_entrada_estadual"` (Tipo: `tel`)
    - `name="cfop_entrada_outro_estado"` (Tipo: `tel`)
    - `name="codigo_beneficio_fiscal"` (Tipo: `text`)
    - `name="modBCST"` (Tipo: `select`)
    - `name="pICMSST"` (Tipo: `tel`)
    - `name="pMVAST"` (Tipo: `tel`)
    - `name="redBCST"` (Tipo: `tel`)
    - `name="motivo_desoneracao_icms"` (Tipo: `select`)
    - `name="codigo_anp"` (Tipo: `select`)
    - `name="perc_glp"` (Tipo: `tel`)
    - `name="perc_gnn"` (Tipo: `tel`)
    - `name="perc_gni"` (Tipo: `tel`)
    - `name="valor_partida"` (Tipo: `tel`)
    - `name="unidade_tributavel"` (Tipo: `text`)
    - `name="quantidade_tributavel"` (Tipo: `tel`)
    - `name="adRemICMSRet"` (Tipo: `tel`)
    - `name="pBio"` (Tipo: `tel`)
    - `name="pOrig"` (Tipo: `tel`)
    - `name="indImport"` (Tipo: `select`)
    - `name="cUFOrig"` (Tipo: `select`)
    - `name="cardapio"` (Tipo: `checkbox`)
    - `name="valor_cardapio"` (Tipo: `tel`)
    - `name="tempo_preparo"` (Tipo: `tel`)
    - `name="tipo_carne"` (Tipo: `select`)
    - `name="destaque_cardapio"` (Tipo: `select`)
    - `name="oferta_cardapio"` (Tipo: `select`)
    - `name="descricao"` (Tipo: `tel`)
    - `name="delivery"` (Tipo: `checkbox`)
    - `name="valor_delivery"` (Tipo: `tel`)
    - `name="destaque_delivery"` (Tipo: `select`)
    - `name="oferta_delivery"` (Tipo: `select`)
    - `name="valor_atacado_delivery"` (Tipo: `tel`)
    - `name="quantidade_atacado_delivery"` (Tipo: `tel`)
    - `name="texto_delivery"` (Tipo: `textarea`)
    - `name="nuvemshop"` (Tipo: `checkbox`)
    - `name="nuvem_shop_valor"` (Tipo: `tel`)
    - `name="nuvem_shop_valor_promocional"` (Tipo: `tel`)
    - `name="categoria_nuvem_shop"` (Tipo: `select`)
    - `name="altura_nuvem_shop"` (Tipo: `tel`)
    - `name="largura_nuvem_shop"` (Tipo: `tel`)
    - `name="comprimento_nuvem_shop"` (Tipo: `tel`)
    - `name="peso_nuvem_shop"` (Tipo: `tel`)
    - `name="texto_nuvem_shop"` (Tipo: `textarea`)
    - `name="ecommerce"` (Tipo: `checkbox`)
    - `name="valor_ecommerce"` (Tipo: `tel`)
    - `name="percentual_desconto"` (Tipo: `tel`)
    - `name="descricao_ecommerce"` (Tipo: `text`)
    - `name="destaque_ecommerce"` (Tipo: `select`)
    - `name="texto_ecommerce"` (Tipo: `textarea`)
    - `name="reserva"` (Tipo: `checkbox`)
  - **Botões do Formulário:**
    - `Adicionar linha` (Tipo: `button`)
    - `x` (Tipo: `button`)
    - `Arquivo` (Tipo: `button`)
    - `Editar` (Tipo: `button`)
    - `Visualizar` (Tipo: `button`)
    - `Inserir` (Tipo: `button`)
    - `Formatar` (Tipo: `button`)
    - `Parágrafo` (Tipo: `button`)
    - `Salvar` (Tipo: `submit`)

### Links e Botões de Ação
- `Voltar` -> Navega para `https://app.wingestor.com.br/produtos`
---

## Relatórios (`https://app.wingestor.com.br/relatorios`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-produtos`
  - **Campos de Entrada:**
    - `name="estoque"` (Tipo: `select`)
    - `name="tipo"` (Tipo: `select`)
    - `name="marca_id"` (Tipo: `select`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-nfe`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="tipo"` (Tipo: `select`)
    - `name="cliente"` (Tipo: `select`)
    - `name="finNFe"` (Tipo: `select`)
    - `name="estado"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-clientes`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="tipo"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-fornecedores`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="tipo"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-cte`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="estado"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-nfce`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="cliente"` (Tipo: `select`)
    - `name="estado"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-conta_pagar`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="status"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
    - `name="fornecedor_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-conta_receber`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="status"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
    - `name="cliente"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-comissao`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="funcionario_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-compras`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-vendas`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="estado"` (Tipo: `select`)
    - `name="cliente"` (Tipo: `select`)
    - `name="categoria_origem_id"` (Tipo: `select`)
    - `name="start_time"` (Tipo: `time`)
    - `name="end_time"` (Tipo: `time`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-mdfe`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="estado"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-taxas`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-lucro`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-despesa-frete`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="tipo_despesa_frete_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/totaliza-produtos`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-estoque`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="estoque_minimo"` (Tipo: `select`)
    - `name="esportar_excel"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/custo-medio`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="ordem"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/curva-abc-clientes`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/entrega-produtos`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="vendas[]"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/venda-por-vendedor`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="funcionario_id"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/inventario`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="ordem"` (Tipo: `select`)
    - `name="livro"` (Tipo: `text`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/relatorio-venda-produtos`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="marca_id"` (Tipo: `select`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="produto_id"` (Tipo: `select`)
    - `name="ordem"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/movimentacao`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="marca_id"` (Tipo: `select`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="produto_id"` (Tipo: `select`)
    - `name="ordem"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
    - `name="fiscal"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/ordem-servico`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="cliente"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/tipos-pagamento`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="tipo_pagamento"` (Tipo: `select`)
    - `name="local_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/reservas`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="estado"` (Tipo: `select`)
    - `name="vagos"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/lucro-produto`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="marca_id"` (Tipo: `select`)
    - `name="categoria_id"` (Tipo: `select`)
    - `name="produto_id"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)
- **Ação do Formulário:** `https://app.wingestor.com.br/relatorios/pedidos-delivery`
  - **Campos de Entrada:**
    - `name="start_date"` (Tipo: `date`)
    - `name="end_date"` (Tipo: `date`)
    - `name="estado"` (Tipo: `select`)
  - **Botões do Formulário:**
    - `Gerar relatório` (Tipo: `submit`)

---

## Transferências de estoque (`https://app.wingestor.com.br/transferencia-estoque`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/14`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/13`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/12`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/11`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/10`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/9`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/8`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/7`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/6`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/5`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/4`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/3`
- **Ação do Formulário:** `https://app.wingestor.com.br/transferencia-estoque/2`

### Links e Botões de Ação
- `Nova Transferência` -> Navega para `https://app.wingestor.com.br/transferencia-estoque/create`
- `Limpar` -> Navega para `https://app.wingestor.com.br/transferencia-estoque`
---

## Vendas (`https://app.wingestor.com.br/vendas`)

### Formulários
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12181`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12180`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12179`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12178`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12177`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12176`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12175`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12174`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12173`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12172`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12171`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12170`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12169`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12168`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12166`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12165`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12164`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12163`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12162`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12161`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12159`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12156`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12155`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12154`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12151`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12150`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12148`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12143`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12141`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12140`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12181`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12180`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12179`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12178`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12177`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12176`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12175`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12174`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12173`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12172`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12171`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12170`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12169`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12168`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12166`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12165`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12164`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12163`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12162`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12161`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12159`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12156`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12155`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12154`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12151`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12150`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12148`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12143`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12141`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)
- **Ação do Formulário:** `https://app.wingestor.com.br/frontbox/12140`
  - **Botões do Formulário:**
    - `Excluir` (Tipo: `button`)

### Links e Botões de Ação
- `Limpar` -> Navega para `https://app.wingestor.com.br/vendas`
---

