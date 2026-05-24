/**
 * LLM mecanismo de inferência — Encapsulamento OpenAI compatível API chamar、prompt estrutura、Análise de resposta
 *
 * Responsabilidades：
 * 1. para cada LLM Exclusivo para a camada especializada de análise de construção prompt
 * 2. Chamadas simultâneas em lote LLM API，Colete os resultados da votação
 * 3. analisar LLM voltou JSON resposta estruturada
 * 4. Retorna a classificação agregada do especialista
 */

import { logger } from '../../utils/logger'
import { saLog } from './sa-logger'
import type { LLMCallLogEntry } from './sa-logger'
import {
  buildMemoryContext,
  formatExpertProfileForPrompt,
  formatFactPoolSummaryForPrompt,
  buildFactPoolSummaryForStock,
} from './memory'
import { callProviderText } from './llm-provider-adapter'
import type {
  ExpertMemoryStore,
  ExpertProfile,
  FactPool,
  FactPoolSummary,
  StockAnalysisAIConfig,
  StockAnalysisAIProvider,
  StockAnalysisExpertDefinition,
  StockAnalysisExpertLayer,
  StockAnalysisExpertStance,
  StockAnalysisKlinePoint,
  StockAnalysisMarketState,
  StockAnalysisStockSnapshot,
  StockFundamentals,
} from './types'

const UNSUPPORTED_CANDIDATES = new Set([
  'OpenCodeGo/MiMo-V2-Pro',
  'OpenCodeGo/GLM-5',
])

function isUnsupportedCandidate(provider: StockAnalysisAIProvider, modelId: string): boolean {
  return UNSUPPORTED_CANDIDATES.has(`${provider.name}/${modelId}`)
}

// ==================== definição de tipo ====================

/** único especialista LLM Resultados da votação */
export interface ExpertVote {
  expertId: string
  expertName: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  /** LLM Julgamento devolvido：longo/grosseiro/neutro */
  verdict: 'bullish' | 'bearish' | 'neutral'
  /** LLM Confiança devolvida 0-100 */
  confidence: number
  /** LLM uma frase razão dada */
  reason: string
  /** O modelo que foi realmente chamado com sucesso ID（fallback pode estar relacionado a assignedModelId diferente） */
  modelId: string
  /** O fornecedor real ligou ID */
  providerId?: string
  /** O nome real do fornecedor chamado */
  providerName?: string
  /** Modelo atribuído original na configuração especializada ID（Não sujeito a fallback Influência） */
  assignedModelId?: string
  /** Se deve usar substituto（LLM Downgrade para inferência de regras quando a chamada falha） */
  usedFallback: boolean
  /** atraso de resposta (ms) */
  latencyMs: number
}

/** Avaliações agregadas de especialistas（substituir original buildExpertScore A saída de） */
export interface LLMExpertScore {
  bullishCount: number
  bearishCount: number
  neutralCount: number
  consensus: number
  score: number
  highlights: string[]
  risks: string[]
  /** Votos detalhados de cada especialista（Para depuração e exibição front-end） */
  votes: ExpertVote[]
  /** chamada bem sucedida LLM número de especialistas（modelo mestre + fallback LLM Todos considerados bem sucedidos） */
  llmSuccessCount: number
  /** usar fallback LLM Número de especialistas com modelos de sucesso（O modelo principal falha, mas outros LLM assumir） */
  llmFallbackCount: number
  /** Número de especialistas completamente rebaixados para inferência do mecanismo de regras（todos LLM Candidatos falharam） */
  ruleFallbackCount: number
  /** @deprecated compatível com versões anteriores：igual llmFallbackCount + ruleFallbackCount */
  fallbackCount: number
  /** Se tudo são dados simulados（zero LLM Chamada bem-sucedida，Todos os mecanismos de regras） */
  isSimulated: boolean
  /** [L4] Proporção de rebaixamento 0-1：Cálculo baseado apenas na degradação do mecanismo de regras。0 = Downgrade sem regras，1 = Fazer downgrade de todas as regras */
  degradeRatio: number
}

// ==================== Prompt estrutura ====================

/** nível analítico prompt modelo */
const LAYER_PROMPTS: Record<Exclude<StockAnalysisExpertLayer, 'rule_functions'>, string> = {
  industry_chain: 'Você é um especialista em análise da cadeia industrial。Por favor, observe as relações de oferta e demanda upstream e downstream、Prosperidade da indústria、Analise este estoque a partir da política industrial e outras perspectivas。',
  company_fundamentals: 'Você é um especialista em análise fundamental de empresas。Por favor, comece com lucratividade、saúde financeira、vantagem competitiva、Analise esse estoque sob a perspectiva da qualidade da gestão e outros aspectos。',
  sell_side_research: 'Você é um pesquisador do sell-side。Comece com o nível de avaliação、previsão de lucro、preço alvo、Analise o estoque a partir de comparação do setor e outras perspectivas。',
  world_power: 'Você é um especialista em geopolítica e análise da estrutura mundial。por favor comece pelas relações internacionais、política comercial、conflito geopolítico A Análise do impacto no mercado de ações e na indústria。',
  global_macro: 'Você é um especialista em análise macroeconômica global。por favor comece com a política monetária、expectativas de inflação、crescimento económico、Analise o impacto das tendências das taxas de juros nas ações de outros ângulos。',
  risk_governance: 'Você é um especialista em controle de risco e análise de governança。Comece com Risco de Governança Corporativa、Risco de conformidade、Qualidade de divulgação de informações、Analisar os riscos desta ação sob a ótica do penhor de capital e outros aspectos。',
  sentiment: 'Você é um especialista em análise de sentimento de mercado。Por favor, leia o sentimento do mercado、Fluxo de fundos、comportamento do investidor、pânico/Analise a tendência de curto prazo das ações a partir de perspectivas como o Índice de Ganância。',
  market_trading: 'Você é um especialista em análise de transações de mercado。Comece com o formulário técnico、Relação de preço por volume、Distribuição de chips、Analise esse estoque sob a perspectiva das principais tendências de capital e outros aspectos。',
  buy_side: 'Você é um gestor de investimentos institucionais do lado da compra。Configure a partir da combinação、Relação risco-benefício、Período de posição、Avalie se vale a pena comprar ações do ponto de vista da gestão de capital e outros aspectos。',
}

/**
 * v1.33.0 P1-3：Reescrita do guia de posição
 * versão antiga"tendem a ser otimistas/Cauteloso"vai deixar LLM Análise com conclusões predefinidas，Votar é altamente relevante。
 * Novas versões especificam apenas"perspectiva"——Foco diferente，Mas as conclusões devem ser baseadas em dados。
 * mesmos dados，Os observadores de oportunidades podem ver vantagens，Observadores de risco podem ver riscos negativos，Ambos podem estar corretos。
 */
const STANCE_GUIDE: Record<StockAnalysisExpertStance, string> = {
  bullish: 'Sua tendência de ângulo de visão"descoberta de oportunidade"：Priorize a identificação de catalisadores positivos、Benefícios potenciais、Avaliação do espaço de reparo。Mas a análise deve basear-se inteiramente em factos，Os dados devem ser fornecidos honestamente quando apontam claramente para um risco bearish/neutral，Não é permitido fazer"Demais"E forçado a olhar por muito tempo。',
  bearish: 'Sua tendência de ângulo de visão"Identificação de risco"：Priorize os riscos negativos、As avaliações estão superaquecidas、Catalisador Negativo。Mas a análise deve basear-se inteiramente em factos，Os dados devem ser fornecidos honestamente quando apontam claramente para uma oportunidade bullish/neutral，Não é permitido fazer"Grosseiro"E forçado a pessimista。',
  neutral: 'Você vê oportunidades e riscos com uma perspectiva equilibrada，Não tendencioso para qualquer conclusão predefinida，Faça julgamentos baseados inteiramente em dados。',
}

/**
 * Definição de partição de dimensão de dados，Usado para pressionar infoSubset Filtro passado para LLM informação contextual。
 * Cada dimensão retorna a partição markdown matriz de linhas de texto。
 */
function getDataSections(
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
): Record<string, string[]> {
  return {
    basic: [
      `- código：${snapshot.code}，nome：${snapshot.name}，placa：${snapshot.sector}`,
      `- preço mais recente：${snapshot.latestPrice}，Aumentar ou diminuir：${snapshot.changePercent}%`,
      `- taxa de rotatividade：${snapshot.turnoverRate}%，Capitalização total de mercado：${(snapshot.totalMarketCap / 1e8).toFixed(1)}100 milhões`,
    ],
    price: [
      `- preço mais recente：${snapshot.latestPrice}，Aumentar ou diminuir：${snapshot.changePercent}%`,
    ],
    momentum: [
      `- 5Renda diária：${snapshot.return5d}%，20Renda diária：${snapshot.return20d}%，60Renda diária：${snapshot.return60d}%`,
    ],
    ma: [
      `- MA5：${snapshot.movingAverage5}，MA20：${snapshot.movingAverage20}，MA60：${snapshot.movingAverage60}`,
      `- 20posição de preço diária：${(snapshot.pricePosition20d * 100).toFixed(1)}%（0=mais baixo,100=Mais alto）`,
    ],
    volume: [
      `- Razão de quantidade：${snapshot.volumeBreakout}（>1 Aumentar o volume）`,
      `- taxa de rotatividade：${snapshot.turnoverRate}%`,
      `- 20faturamento médio diário：${(snapshot.averageTurnoverAmount20d / 1e8).toFixed(1)}100 milhões`,
    ],
    volatility: [
      `- 20volatilidade diária：${snapshot.volatility20d}，quantil de volatilidade：${(snapshot.volatilityRank * 100).toFixed(1)}%`,
      `- 20amplitude diária：${snapshot.amplitude20d}%，Número de dias consecutivos de queda：${snapshot.declineDays20d}céu`,
    ],
    market: [
      `- tendência：${marketState.trend}，Volatilidade：${marketState.volatility}`,
      `- Liquidez：${marketState.liquidity}，humor：${marketState.sentiment}，estilo：${marketState.style}`,
      `- CSI500 20aumento diário：${marketState.csi500Return20d}%`,
      `- volatilidade anualizada：${marketState.annualizedVolatility20d}%`,
      `- Proporção de ações em alta：${(marketState.risingRatio * 100).toFixed(1)}%`,
    ],
  }
}

/** technical sim price + ma + volume apelido composto */
const TECHNICAL_ALIAS = ['price', 'ma', 'volume']

/**
 * v1.33.0 P0-1：construir「Indicadores técnicos de leitura obrigatória」pedaço（RSI/MACD/ATR/Intensidade industrial, etc.）。
 * Esses indicadores são snapshot Já foi calculado, mas não foi inserido antes. prompt。Visibilidade forçada para todos os especialistas，
 * Não saindo infoSubset filtro——Porque são julgamentos de longo e curto/Sinais básicos de volatilidade，Qualquer especialista deveria ver。
 */
function buildIndicatorBlock(snapshot: StockAnalysisStockSnapshot): string[] {
  const lines: string[] = []
  const fmt = (v: number | null | undefined, digits = 2): string => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'N/A'
    return v.toFixed(digits)
  }

  // RSI：0-100，>70 sobrecomprado / <30 sobrevendido
  lines.push(`- RSI14：${fmt(snapshot.rsi14, 1)}（>70 sobrecomprado、<30 sobrevendido）`)
  // MACD：line / signal / histogram
  lines.push(`- MACD：DIF=${fmt(snapshot.macdLine, 3)}，DEA=${fmt(snapshot.macdSignal, 3)}，coluna=${fmt(snapshot.macdHistogram, 3)}（coluna>0 Distrito de Jincha、coluna<0 área de garfo morto）`)
  // ATR：Faixa de flutuação（valor absoluto + Porcentagem de preço relativo）
  lines.push(`- ATR14：${fmt(snapshot.atr14, 2)}，Relação de preço：${fmt(snapshot.atrPercent, 2)}%（faixa de flutuação intradiária）`)
  // apoiar/Posição relativa de pressão
  if (snapshot.distanceToResistance1 !== null && snapshot.distanceToResistance1 !== undefined) {
    lines.push(`- pressão de cima：${fmt(snapshot.distanceToResistance1, 2)}%，Suporte de baixo：${fmt(snapshot.distanceToSupport1, 2)}%`)
  }
  // inclinação média（força da tendência）
  lines.push(`- MA20 declive：${fmt(snapshot.movingAverage20Slope, 3)}，MA60 declive：${fmt(snapshot.movingAverage60Slope, 3)}（apenas=Tendência de alta）`)
  // Força relativa da cadeia industrial
  if (snapshot.industryStrength !== null && snapshot.industryStrength !== undefined) {
    lines.push(`- Intensidade industrial：${fmt(snapshot.industryStrength, 2)}，Largura：${fmt(snapshot.industryBreadth, 2)}，20Crescimento diário da indústria：${fmt(snapshot.industryReturn20d, 2)}%，Força das tendências da indústria：${fmt(snapshot.industryTrendStrength, 2)}`)
  }
  return lines
}

/**
 * v1.33.0 estágio E：fundamentos da empresa（PE/PB/Capitalização total de mercado/ROE）。
 * Os campos podem ser null（Fonte de dados não retornada），null Esta linha não é exibida quando，evite enganar LLM。
 * Visibilidade forçada para todos os especialistas——Avaliação e lucratividade são informações essenciais de especialistas fundamentais，Os especialistas técnicos também devem compreender o nível de avaliação。
 */
function buildFundamentalsBlock(fundamentals: StockFundamentals | null | undefined): string[] {
  if (!fundamentals) return []
  const lines: string[] = []
  const fmt = (v: number | null, digits = 2): string => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'N/A'
    return v.toFixed(digits)
  }
  if (fundamentals.peRatio !== null) {
    lines.push(`- Relação preço/lucro TTM：${fmt(fundamentals.peRatio, 2)}（<0 Perda、15-25 normal、>40 superestimar、<10 Pode ser subestimado）`)
  }
  if (fundamentals.pbRatio !== null) {
    lines.push(`- relação preço/livro：${fmt(fundamentals.pbRatio, 2)}（<1 Quebre a rede，>3 No lado alto）`)
  }
  if (fundamentals.totalMarketCapYi !== null) {
    lines.push(`- Capitalização total de mercado：${fmt(fundamentals.totalMarketCapYi, 2)} bilhão`)
  }
  if (fundamentals.roePercent !== null) {
    lines.push(`- ROE：${fmt(fundamentals.roePercent, 2)}%（>15 excelente、5-15 geralmente、<5 Fraco、<0 Perda）`)
  }
  if (lines.length === 0) return []
  lines.push(`- fonte de dados：${fundamentals.source}，Dia de rastreamento：${fundamentals.fetchedDate}`)
  return lines
}

/**
 * v1.33.0 P0-2：aproximadamente 30 dia K linha comprimida em prompt resumo digerível。
 * Estratégia：Pegue o mais próximo 30 raiz，saída 4 papel：
 *   1) Visão geral estatística（preço médio、mais alto mais baixo、Aumento ou diminuição total、Rotatividade média）
 *   2) fechar 10 Informativo dia a dia（OHLC + quantidade）
 *   3) Primeiros dias 20 O dia é dobrado em 5 resumo do parágrafo（Todo 4 Seção raiz）
 *   4) Reconhecimento de formato de chave（Aumento contínuo/Número de dias consecutivos de queda、Amplitude máxima de um dia）
 * Alvo token ≈ 800-1200（sobre 1500-2000 Caracteres chineses）。
 * Visibilidade forçada para todos os especialistas，porque K A linha é a base comum para todos os julgamentos técnicos。
 */
function buildKlineSummary(history: StockAnalysisKlinePoint[] | undefined): string[] {  if (!history || history.length === 0) return []
  const lines: string[] = []
  // Pegue o mais próximo 30 raiz，ordem crescente de tempo
  const recent = history.slice(-30)
  if (recent.length < 5) {
    // Poucos dados não valem a pena resumir
    return []
  }

  // ---- 1. Visão geral estatística ----
  const closes = recent.map((p) => p.close)
  const highs = recent.map((p) => p.high)
  const lows = recent.map((p) => p.low)
  const volumes = recent.map((p) => p.volume)
  const turnoverRates = recent.map((p) => p.turnoverRate)
  const avgClose = closes.reduce((s, v) => s + v, 0) / closes.length
  const maxHigh = Math.max(...highs)
  const minLow = Math.min(...lows)
  const firstClose = recent[0].close
  const lastClose = recent[recent.length - 1].close
  const totalReturn = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0
  const avgTurnover = turnoverRates.reduce((s, v) => s + v, 0) / turnoverRates.length
  const avgVolume = volumes.reduce((s, v) => s + v, 0) / volumes.length

  lines.push(`- intervalo：${recent[0].date} para ${recent[recent.length - 1].date}（comum ${recent.length} raiz）`)
  lines.push(`- preço médio：${avgClose.toFixed(2)}，Mais alto：${maxHigh.toFixed(2)}，mais baixo：${minLow.toFixed(2)}`)
  lines.push(`- A ascensão e queda total do intervalo：${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%，Rotatividade média：${avgTurnover.toFixed(2)}%`)

  // ---- 2. Primeiros dias 20 dobra do dia（Todo 4 As raízes são mescladas em um resumo）----
  const earlyCount = Math.max(0, recent.length - 10)
  if (earlyCount >= 4) {
    const early = recent.slice(0, earlyCount)
    const chunkSize = 4
    const chunkLines: string[] = []
    for (let i = 0; i < early.length; i += chunkSize) {
      const chunk = early.slice(i, i + chunkSize)
      if (chunk.length === 0) continue
      const chunkOpen = chunk[0].open
      const chunkClose = chunk[chunk.length - 1].close
      const chunkHigh = Math.max(...chunk.map((p) => p.high))
      const chunkLow = Math.min(...chunk.map((p) => p.low))
      const chunkChg = chunkOpen > 0 ? ((chunkClose - chunkOpen) / chunkOpen) * 100 : 0
      const chunkAvgVol = chunk.reduce((s, p) => s + p.volume, 0) / chunk.length
      const volRatio = avgVolume > 0 ? chunkAvgVol / avgVolume : 1
      chunkLines.push(
        `  · ${chunk[0].date}~${chunk[chunk.length - 1].date}：abrir${chunkOpen.toFixed(2)} receber${chunkClose.toFixed(2)} alto${chunkHigh.toFixed(2)} Baixo${chunkLow.toFixed(2)} Aumentar${chunkChg >= 0 ? '+' : ''}${chunkChg.toFixed(2)}% Razão de quantidade${volRatio.toFixed(2)}`,
      )
    }
    if (chunkLines.length > 0) {
      lines.push(`- tendência inicial（Todo 4 fusão do dia）：`)
      lines.push(...chunkLines)
    }
  }

  // ---- 3. fechar 10 Informativo dia a dia ----
  const latest = recent.slice(-10)
  lines.push(`- fechar ${latest.length} dia a dia（data/abrir/receber/alto/Baixo/altos e baixos%/Mudar de mãos%）：`)
  for (const p of latest) {
    lines.push(
      `  · ${p.date} ${p.open.toFixed(2)}/${p.close.toFixed(2)}/${p.high.toFixed(2)}/${p.low.toFixed(2)} ${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}% Mudar de mãos${p.turnoverRate.toFixed(2)}%`,
    )
  }

  // ---- 4. padrão chave ----
  // Aumento contínuo/Número de dias consecutivos de queda（Contando a partir do último）
  let consecUp = 0
  let consecDown = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].changePercent > 0) {
      if (consecDown > 0) break
      consecUp++
    } else if (recent[i].changePercent < 0) {
      if (consecUp > 0) break
      consecDown++
    } else {
      break
    }
  }
  const maxAmp = Math.max(...recent.map((p) => p.amplitude))
  const maxAmpDate = recent.find((p) => p.amplitude === maxAmp)?.date ?? ''
  const formBits: string[] = []
  if (consecUp >= 2) formBits.push(`Aumento contínuo recentemente ${consecUp} dia`)
  if (consecDown >= 2) formBits.push(`Quedas recentes ${consecDown} dia`)
  formBits.push(`Amplitude máxima do intervalo ${maxAmp.toFixed(2)}%（${maxAmpDate}）`)
  lines.push(`- Características morfológicas：${formBits.join('，')}`)

  return lines
}

function buildStockContext(
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  infoSubset?: string[],
  history?: StockAnalysisKlinePoint[],
  fundamentals?: StockFundamentals | null,
): string {
  const sections = getDataSections(snapshot, marketState)
  // v1.33.0：Deve ler o bloco（Não sujeito a infoSubset filtro，Visível para todos os especialistas）
  const indicatorLines = buildIndicatorBlock(snapshot)
  const klineLines = buildKlineSummary(history)
  const fundamentalsLines = buildFundamentalsBlock(fundamentals)

  // Não especificado infoSubset Ou quando é um array vazio，Retornar todos os dados（compatível com versões anteriores）
  if (!infoSubset || infoSubset.length === 0) {
    const parts: string[] = [
      `## informações de estoque`,
      ...sections.basic,
      ``,
      `## Indicadores técnicos`,
      ...sections.momentum,
      ...sections.ma,
      ...sections.volume,
      ...sections.volatility,
      ``,
      `## Indicadores principais de leitura obrigatória`,
      ...indicatorLines,
      ``,
      `## ambiente de mercado`,
      ...sections.market,
    ]
    if (klineLines.length > 0) {
      parts.push(``, `## fechar 30 dia K resumo da linha`, ...klineLines)
    }
    if (fundamentalsLines.length > 0) {
      parts.push(``, `## fundamentos da empresa`, ...fundamentalsLines)
    }
    return parts.join('\n')
  }

  // Expandir technical Alias
  const resolvedKeys = new Set<string>()
  for (const key of infoSubset) {
    if (key === 'technical') {
      for (const alias of TECHNICAL_ALIAS) resolvedKeys.add(alias)
    } else {
      resolvedKeys.add(key)
    }
  }

  const lines: string[] = []

  // Informações básicas sobre estoque（basic ou price acionar）
  if (resolvedKeys.has('basic') || resolvedKeys.has('price')) {
    lines.push(`## informações de estoque`)
    if (resolvedKeys.has('basic')) lines.push(...sections.basic)
    else if (resolvedKeys.has('price')) lines.push(...sections.price)
    lines.push(``)
  }

  // tecnologia/Indicadores quantitativos
  const techLines: string[] = []
  if (resolvedKeys.has('momentum')) techLines.push(...sections.momentum)
  if (resolvedKeys.has('ma')) techLines.push(...sections.ma)
  if (resolvedKeys.has('volume')) techLines.push(...sections.volume)
  if (resolvedKeys.has('volatility')) techLines.push(...sections.volatility)
  if (techLines.length > 0) {
    lines.push(`## Indicadores técnicos`)
    lines.push(...techLines)
    lines.push(``)
  }

  // ambiente de mercado
  if (resolvedKeys.has('market')) {
    lines.push(`## ambiente de mercado`)
    lines.push(...sections.market)
    lines.push(``)
  }

  // v1.33.0：Indicadores principais de leitura obrigatória + K resumo da linha + Fundamentos（força visível，Não sujeito a infoSubset controlar）
  lines.push(`## Indicadores principais de leitura obrigatória`)
  lines.push(...indicatorLines)
  if (klineLines.length > 0) {
    lines.push(``, `## fechar 30 dia K resumo da linha`, ...klineLines)
  }
  if (fundamentalsLines.length > 0) {
    lines.push(``, `## fundamentos da empresa`, ...fundamentalsLines)
  }

  return lines.join('\n')
}

/** Construa para especialistas system message（definição de função + retrato） */
function buildExpertSystemMessage(
  expert: StockAnalysisExpertDefinition,
  profile?: ExpertProfile,
): string {
  const profileSection = profile && profile.predictionCount > 0
    ? `\n\n${formatExpertProfileForPrompt(profile)}`
    : ''

  if (expert.systemPrompt) {
    return [
      `Quem é você"${expert.name}"。`,
      ``,
      expert.systemPrompt,
      profileSection,
      ``,
      `Por favor pressione estritamente JSON formato retorna resultados de análise，Não adicione nenhum texto extra。`,
    ].filter(Boolean).join('\n')
  }
  // Reverter para a versão antiga layer + stance Emenda
  const layerPrompt = LAYER_PROMPTS[expert.layer as Exclude<StockAnalysisExpertLayer, 'rule_functions'>]
  const stanceGuide = STANCE_GUIDE[expert.stance]
  return [
    `Quem é você"${expert.name}"，um profissional A analista de ações。`,
    ``,
    layerPrompt,
    stanceGuide,
    expert.frameworkPrompt ? `Requisitos suplementares：${expert.frameworkPrompt}` : '',
    profileSection,
    ``,
    `Por favor pressione estritamente JSON formato retorna resultados de análise，Não adicione nenhum texto extra。`,
  ].filter(Boolean).join('\n')
}

/**
 * digitar prompt Limite total de caracteres。
 * Chinês sobre 1.5-2 token/personagem，50000 Personagens aprox. 75000-100000 token。
 * Janelas de contexto para a maioria dos modelos >= 128K token，50000 caracteres é o limite superior seguro。
 * Se ultrapassar o limite，Priorize o truncamento da parte da memória（A memória é o conteúdo de comprimento variável mais longo）。
 */
const MAX_PROMPT_CHARS = 50_000

/** Construa para especialistas user message（dados + FactPool resumo + memória + Tarefa） */
function buildExpertUserMessage(
  expert: StockAnalysisExpertDefinition,
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  factPoolSummary?: FactPoolSummary,
  memoryStore?: ExpertMemoryStore,
  history?: StockAnalysisKlinePoint[],
  factPool?: FactPool,
  fundamentals?: StockFundamentals | null,
): string {
  const stockContext = buildStockContext(snapshot, marketState, expert.infoSubset, history, fundamentals)

  const sections: string[] = [stockContext]

  // injeção FactPool resumo——estágio C：Se fornecido factPool objeto original，Em seguida, reconstrua-o da perspectiva de ações individuais summary
  let factPoolText = ''
  const effectiveSummary = factPool
    ? buildFactPoolSummaryForStock(factPool, snapshot.code, snapshot.sector)
    : factPoolSummary
  if (effectiveSummary) {
    factPoolText = formatFactPoolSummaryForPrompt(effectiveSummary) ?? ''
    if (factPoolText) {
      sections.push(`\n## Macro e Inteligência de Mercado\n${factPoolText}`)
    }
  }

  // Injetar memória especializada（Com proteção de comprimento）
  if (memoryStore) {
    const memory = memoryStore.memories[expert.id]
    let memoryText = buildMemoryContext(memory)
    if (memoryText) {
      // Conte o número de caracteres usados（dados de estoque + FactPool + Modelo de tarefa aprox. 300 personagem），Deixe espaço para a memória
      const usedChars = stockContext.length + factPoolText.length + 400
      const memoryBudget = MAX_PROMPT_CHARS - usedChars
      if (memoryText.length > memoryBudget && memoryBudget > 500) {
        const originalLen = memoryText.length
        memoryText = memoryText.slice(0, memoryBudget) + '\n...(O conteúdo da memória foi truncado)'
        logger.warn(`[llm-inference] especialista ${expert.name} O contexto da memória é muito longo (${originalLen} personagem)，Truncado para ${memoryBudget} personagem`, { module: 'StockAnalysis' })
      }
      if (memoryBudget > 500) {
        sections.push(`\n${memoryText}`)
      }
    }
  }

  sections.push(
    ``,
    `## Tarefa`,
    `Com base nos dados acima，Dê sua análise e julgamento。Por favor, siga rigorosamente o seguinte JSON Retorno de formato（Não anexe mais nada）：`,
    ``,
    '```json',
    `{`,
    `  "verdict": "bullish ou bearish ou neutral",`,
    `  "confidence": 0chegar100inteiro,`,
    `  "reason": "Um breve motivo（não mais do que50Personagem）"`,
    `}`,
    '```',
  )

  return sections.join('\n')
}

// ==================== LLM API chamar ====================

interface LLMResponse {
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reason: string
}

/** Solteiro LLM tempo limite da chamada（milissegundo）— Mantenha o modo de pensamento profundo，Requer um tempo limite longo o suficiente */
const LLM_CALL_TIMEOUT_MS = 360_000
const EXPERT_VOTING_TIMEOUT_MS = 30 * 60 * 1000
const MIN_EFFECTIVE_LLM_VOTES = 8

/**
 * [P2-7] max_tokens valor padrão，Grande diferença/modelo pequeno。
 * modelo grande (ter provider.maxTokens configurado): Usar valores de configuração
 * Quando não configurado: Use padrões conservadores 8192，Evite exceder o limite do modelo pequeno
 * Se o modelo de um fornecedor suportar valores maiores，deveria estar em ai-config.json Configurações explícitas em maxTokens。
 */
const DEFAULT_MAX_TOKENS = 8_192

/** um para tentar provider + model combinação */
interface LLMCandidate {
  provider: StockAnalysisAIProvider
  modelId: string
}

/**
 * Térreo：Para especificar provider + model Iniciar uma vez LLM chamar。
 * Retorna com sucesso o resultado analisado，falhar diretamente throw。
 */
async function callLLMOnce(
  provider: StockAnalysisAIProvider,
  modelId: string,
  systemMessage: string,
  userMessage: string,
): Promise<{ verdict: 'bullish' | 'bearish' | 'neutral'; confidence: number; reason: string; latencyMs: number }> {
  const start = Date.now()

  try {
    const data = await callProviderText({
      provider,
      modelId,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      maxTokens: provider.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 0.3,
      userAgent: 'ClawOS/StockAnalysis LLM-Inference',
      timeoutMs: LLM_CALL_TIMEOUT_MS,
    })
    const latencyMs = data.latencyMs
    // P1-9: Priorizar de content pegar，descascar <think> Rótulo；fallback chegar reasoning_content O que se segue
    let content = data.content ?? ''
    const reasoningContent = data.reasoningContent
    content = stripThinkingTags(content)
    // alguns modelos（como DeepSeek R1）Vai thinking colocar reasoning_content，A resposta formal está em content
    if (!content.trim() && reasoningContent) {
      // content Vazio, mas presente reasoning_content，Indica que o modelo pode colocar a resposta em reasoning_content fim
      // Nesse caso content deve conter a resposta，Não pode ser restaurado se estiver vazio
      logger.warn('[llm-inference] content Vazio, mas existe reasoning_content，O modelo pode não estar emitindo a resposta corretamente')
    }
    const parsed = parseLLMResponse(content)

    // Registro LLM Registro completo de chamadas（JSONL）
    saLog.llmCall({
      timestamp: new Date().toISOString(),
      module: 'inference',
      model: modelId,
      providerId: provider.id,
      agentName: modelId,
      prompt: { system: systemMessage, user: userMessage },
      response: content,
      reasoningContent,
      latencyMs,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      } : undefined,
      success: true,
    })

    return { ...parsed, latencyMs }
  } catch (error) {
    const latencyMs = Date.now() - start
    const errMsg = error instanceof Error ? error.message : 'erro desconhecido'

    // não consegui gravar LLM registro de chamadas
    saLog.llmCall({
      timestamp: new Date().toISOString(),
      module: 'inference',
      model: modelId,
      providerId: provider.id,
      agentName: modelId,
      prompt: { system: systemMessage, user: userMessage },
      response: null,
      latencyMs,
      success: false,
      error: errMsg,
    })

    throw error
  }
}

/**
 * chame um único especialista LLM API，Com automático fallback：
 * 1. Experimente primeiro a distribuição principal provider + model
 * 2. Tente novamente após falhar fallbackCandidates Outros em provider + model
 * 3. Degradar para inferência de regras somente se todas falharem
 */
async function callExpertLLMWithFallback(
  expert: StockAnalysisExpertDefinition,
  primaryCandidate: LLMCandidate,
  fallbackCandidates: LLMCandidate[],
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  profile?: ExpertProfile,
  factPoolSummary?: FactPoolSummary,
  memoryStore?: ExpertMemoryStore,
  history?: StockAnalysisKlinePoint[],
  factPool?: FactPool,
  fundamentals?: StockFundamentals | null,
): Promise<ExpertVote> {
  const systemMessage = buildExpertSystemMessage(expert, profile)
  const userMessage = buildExpertUserMessage(expert, snapshot, marketState, factPoolSummary, memoryStore, history, factPool, fundamentals)

  // Construir ordem de teste：candidato principal → fallback candidato（ir掉ecandidato principalrepitade）
  const allCandidates: LLMCandidate[] = [primaryCandidate]
  for (const fb of fallbackCandidates) {
    const isDup = fb.provider.id === primaryCandidate.provider.id
      && fb.modelId === primaryCandidate.modelId
    if (!isDup) allCandidates.push(fb)
  }

  const errors: string[] = []

  for (let i = 0; i < allCandidates.length; i++) {
    const candidate = allCandidates[i]
    const isFallback = i > 0
    const tag = isFallback
      ? `[fallback ${i}/${allCandidates.length - 1}: ${candidate.provider.name}/${candidate.modelId}]`
      : `[primary: ${candidate.provider.name}/${candidate.modelId}]`

    // P2-C5: Ignore o disjuntor provider
    if (isProviderCircuitOpen(candidate.provider.id)) {
      errors.push(`${tag} provider Explodiu，pular sobre`)
      continue
    }

    try {
      const result = await callLLMOnce(
        candidate.provider,
        candidate.modelId,
        systemMessage,
        userMessage,
      )

      recordProviderSuccess(candidate.provider.id)

      if (isFallback) {
        logger.info(`[llm-inference] especialista ${expert.name} ${tag} fallback sucesso (${result.latencyMs}ms)`, { module: 'StockAnalysis' })
      }

      // Registre detalhes de sucesso da chamada de especialista
      saLog.info('LLM-Inference', `especialista ${expert.name} ${tag} Terminar: verdict=${result.verdict} confidence=${result.confidence} latency=${result.latencyMs}ms fallback=${isFallback}`)

      return {
        expertId: expert.id,
        expertName: expert.name,
        layer: expert.layer,
        stance: expert.stance,
        verdict: result.verdict,
        confidence: result.confidence,
        reason: result.reason,
        modelId: candidate.modelId,
        providerId: candidate.provider.id,
        providerName: candidate.provider.name,
        assignedModelId: primaryCandidate.modelId,
        usedFallback: isFallback,
        latencyMs: result.latencyMs,
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'erro desconhecido'
      errors.push(`${tag} ${errMsg}`)
      recordProviderFailure(candidate.provider.id)
      logger.warn(`[llm-inference] especialista ${expert.name} ${tag} chamada falhou: ${errMsg}`, { module: 'StockAnalysis' })
      saLog.warn('LLM-Inference', `especialista ${expert.name} ${tag} chamada falhou: ${errMsg}`)
    }
  }

  // Todos os candidatos falharam，downgrade para inferência de regras
  logger.warn(`[llm-inference] especialista ${expert.name} todos ${allCandidates.length} Todos os modelos candidatos falharam，downgrade para inferência de regras`, { module: 'StockAnalysis' })
  saLog.warn('LLM-Inference', `especialista ${expert.name} todos ${allCandidates.length} Todos os modelos candidatos falharam，downgrade para inferência de regras。erro: ${errors.join('; ')}`)
  return buildFallbackVote(expert, snapshot, 0)
}

/** P1-9: descascar LLM thinking gerado por padrão <think>...</think> Rótulo */
function stripThinkingTags(text: string): string {
  // Remover <think>...</think> pedaço（correspondência gananciosa，Suporta múltiplas linhas）
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/** [L3] Extraia a camada mais externa do texto JSON objeto，Suporta chaves aninhadas */
function extractOutermostJson(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}

/** analisar LLM voltou JSON contente */
function parseLLMResponse(content: string): LLMResponse {
  // Tente analisar diretamente
  try {
    const raw = JSON.parse(content)
    return validateLLMResponse(raw)
  } catch {
    // tente começar de markdown code block extraído de JSON
  }

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1].trim())
      return validateLLMResponse(raw)
    } catch {
      // continue tentando
    }
  }

  // [L3] Extraia o nível mais externo usando correspondência de colchetes JSON objeto（Aninhamento de suporte）
  const extracted = extractOutermostJson(content)
  if (extracted) {
    try {
      const raw = JSON.parse(extracted)
      return validateLLMResponse(raw)
    } catch {
      // Falha na análise
    }
  }

  throw new Error(`Não foi possível analisar LLM Devolver conteúdo: ${content.slice(0, 100)}`)
}

function validateLLMResponse(raw: Record<string, unknown>): LLMResponse {
  const verdict = String(raw.verdict ?? '').toLowerCase()
  if (verdict !== 'bullish' && verdict !== 'bearish' && verdict !== 'neutral') {
    throw new Error(`Inválido verdict: ${verdict}`)
  }
  const confidence = Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 50)))
  const reason = String(raw.reason ?? 'sem razão').slice(0, 100)

  return { verdict, confidence, reason }
}

/**
 * v1.33.0 P1-3：LLM Inferência de downgrade de regra quando a chamada falha。
 * Forte dependência de versões antigas stance（bullish Especialistas têm prioridade bullish、bearish Especialistas têm prioridade bearish），
 * Faz com que as amostras de degradação de regras sejam altamente correlacionadas entre si、Votar perde diversidade。
 *
 * nova versão：Acumulando pontuações usando apenas sinais técnicos（ignorar stance），dado verdict。
 * Para preservar as diferenças de retrato，stance Afeta apenas confidence pequeno deslocamento（±5），não afeta verdict direção。
 */
function buildFallbackVote(
  expert: StockAnalysisExpertDefinition,
  snapshot: StockAnalysisStockSnapshot,
  latencyMs: number,
): ExpertVote {
  // ==== Pontuação cumulativa de sinais longos e curtos ====
  let score = 0
  const reasons: string[] = []

  // 1) 20 Renda diária：Principais tendências
  if (snapshot.return20d > 5) { score += 2; reasons.push('20Subindo diariamente') }
  else if (snapshot.return20d > 0) { score += 1 }
  else if (snapshot.return20d < -5) { score -= 2; reasons.push('20Queda diária') }
  else if (snapshot.return20d < 0) { score -= 1 }

  // 2) preço relativo MA20
  if (snapshot.latestPrice > snapshot.movingAverage20) score += 1
  else if (snapshot.latestPrice < snapshot.movingAverage20) score -= 1

  // 3) MA20 declive：força da tendência
  if (snapshot.movingAverage20Slope > 0.05) { score += 1; reasons.push('MA20Para cima') }
  else if (snapshot.movingAverage20Slope < -0.05) { score -= 1; reasons.push('MA20Para baixo') }

  // 4) Número de dias consecutivos de queda
  if (snapshot.declineDays20d > 5) { score -= 2; reasons.push(`Sequência de queda${snapshot.declineDays20d}dia`) }
  else if (snapshot.declineDays20d > 3) score -= 1

  // 5) RSI Sobrecomprado e sobrevendido（Quando há dados）
  if (snapshot.rsi14 !== null && snapshot.rsi14 !== undefined) {
    if (snapshot.rsi14 > 75) { score -= 1; reasons.push('RSIsobrecomprado') }
    else if (snapshot.rsi14 < 25) { score += 1; reasons.push('RSIsobrevendido') }
  }

  // 6) MACD direção da coluna
  if (snapshot.macdHistogram !== null && snapshot.macdHistogram !== undefined) {
    if (snapshot.macdHistogram > 0) score += 0.5
    else if (snapshot.macdHistogram < 0) score -= 0.5
  }

  // 7) Força relativa da cadeia industrial（Quando há dados）
  if (snapshot.industryStrength !== null && snapshot.industryStrength !== undefined) {
    if (snapshot.industryStrength > 0.7) { score += 0.5; reasons.push('Indústria forte') }
    else if (snapshot.industryStrength < 0.3) { score -= 0.5; reasons.push('A indústria está fraca') }
  }

  // ==== verdict tomando uma decisão（Puramente baseado em dados，não depende de stance） ====
  let verdict: ExpertVote['verdict']
  if (score >= 2) verdict = 'bullish'
  else if (score <= -2) verdict = 'bearish'
  else verdict = 'neutral'

  // ==== confidence：|score| mapeado para 35-70，stance Apenas pequenos deslocamentos são feitos para preservar as diferenças de imagem ====
  const baseConf = Math.min(70, 35 + Math.abs(score) * 6)
  let stanceBias = 0
  if (expert.stance === 'bullish' && verdict === 'bullish') stanceBias = 5
  else if (expert.stance === 'bearish' && verdict === 'bearish') stanceBias = 5
  else if (expert.stance === 'bullish' && verdict === 'bearish') stanceBias = -3
  else if (expert.stance === 'bearish' && verdict === 'bullish') stanceBias = -3
  const confidence = Math.max(20, Math.min(80, Math.round(baseConf + stanceBias)))

  const reason = reasons.length > 0
    ? `Julgamento de rebaixamento de regra：${reasons.slice(0, 3).join('、')}`
    : `Julgamento de rebaixamento de regra：sinal neutro（score=${score.toFixed(1)}）`

  return {
    expertId: expert.id,
    expertName: expert.name,
    layer: expert.layer,
    stance: expert.stance,
    verdict,
    confidence,
    reason,
    modelId: expert.assignedModel?.modelId ?? 'rule-fallback',
    providerId: expert.assignedModel?.providerId,
    providerName: expert.assignedModel?.providerName,
    assignedModelId: expert.assignedModel?.modelId,
    usedFallback: true,
    latencyMs,
  }
}

// ==================== 15 especialista em função de regra ====================

/** O especialista em função de regra não chama LLM，Calculado diretamente com base em indicadores técnicos */
function buildRuleExpertVote(
  expert: StockAnalysisExpertDefinition,
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
): ExpertVote {
  const { verdict, confidence, reason } = evaluateRuleFunction(expert.name, snapshot, marketState)
  return {
    expertId: expert.id,
    expertName: expert.name,
    layer: expert.layer,
    stance: expert.stance,
    verdict,
    confidence,
    reason,
    modelId: 'rule-engine',
    usedFallback: false,
    latencyMs: 0,
  }
}

function evaluateRuleFunction(
  ruleName: string,
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
): { verdict: ExpertVote['verdict']; confidence: number; reason: string } {
  switch (ruleName) {
    case '5impulso diário':
      return snapshot.return5d > 2 ? { verdict: 'bullish', confidence: 65, reason: `5Subindo diariamente${snapshot.return5d}%` }
        : snapshot.return5d < -2 ? { verdict: 'bearish', confidence: 65, reason: `5Queda diária${snapshot.return5d}%` }
        : { verdict: 'neutral', confidence: 50, reason: '5Momentum diário estável' }
    case '20impulso diário':
      return snapshot.return20d > 5 ? { verdict: 'bullish', confidence: 70, reason: `20Subindo diariamente${snapshot.return20d}%` }
        : snapshot.return20d < -5 ? { verdict: 'bearish', confidence: 70, reason: `20Queda diária${snapshot.return20d}%` }
        : { verdict: 'neutral', confidence: 50, reason: '20Momentum diário médio' }
    case '60impulso diário':
      return snapshot.return60d > 10 ? { verdict: 'bullish', confidence: 60, reason: `60Subindo diariamente${snapshot.return60d}%` }
        : snapshot.return60d < -10 ? { verdict: 'bearish', confidence: 60, reason: `60Queda diária${snapshot.return60d}%` }
        : { verdict: 'neutral', confidence: 50, reason: '60Momentum diário estável' }
    case 'RSIreversão média':
      return snapshot.pricePosition20d > 0.85 ? { verdict: 'bearish', confidence: 60, reason: 'A posição do preço está no lado alto，Risco de sobrecompra' }
        : snapshot.pricePosition20d < 0.15 ? { verdict: 'bullish', confidence: 60, reason: 'A posição do preço é baixa，Recuperação de sobrevenda' }
        : { verdict: 'neutral', confidence: 50, reason: 'RSI faixa normal' }
    case 'Regressão Média das Bandas de Bollinger':
      return snapshot.pricePosition20d > 0.9 ? { verdict: 'bearish', confidence: 55, reason: 'Toque na faixa Bollinger' }
        : snapshot.pricePosition20d < 0.1 ? { verdict: 'bullish', confidence: 55, reason: 'Tocou na Bollinger Band' }
        : { verdict: 'neutral', confidence: 50, reason: 'Correndo dentro das Bandas de Bollinger' }
    case 'MA60desvio da reversão média': {
      if (!snapshot.movingAverage60) return { verdict: 'neutral', confidence: 50, reason: 'MA60 Dados insuficientes' }
      const deviation = (snapshot.latestPrice - snapshot.movingAverage60) / snapshot.movingAverage60 * 100
      return deviation > 15 ? { verdict: 'bearish', confidence: 60, reason: `desviarMA60+${deviation.toFixed(1)}%` }
        : deviation < -15 ? { verdict: 'bullish', confidence: 60, reason: `desviarMA60${deviation.toFixed(1)}%` }
        : { verdict: 'neutral', confidence: 50, reason: 'MA60desvio do normal' }
    }
    case 'Classificação da proporção de quantidade':
      return snapshot.volumeBreakout > 1.5 ? { verdict: 'bullish', confidence: 65, reason: `Razão de quantidade${snapshot.volumeBreakout}Aumentar o volume` }
        : snapshot.volumeBreakout < 0.6 ? { verdict: 'bearish', confidence: 55, reason: 'O encolhimento é óbvio' }
        : { verdict: 'neutral', confidence: 50, reason: 'A energia é normal' }
    case 'Pontuação de rotatividade':
      return snapshot.turnoverRate > 5 ? { verdict: 'bullish', confidence: 60, reason: `taxa de rotatividade${snapshot.turnoverRate}%ativo` }
        : snapshot.turnoverRate < 1 ? { verdict: 'bearish', confidence: 55, reason: 'A rotatividade é lenta' }
        : { verdict: 'neutral', confidence: 50, reason: 'Taxa de rotatividade moderada' }
    case 'Pontuação do Fluxo de Fundos':
      return snapshot.volumeBreakout > 1.2 && snapshot.changePercent > 0
        ? { verdict: 'bullish', confidence: 65, reason: 'Aumentando em volume pesado，entrada de capital' }
        : snapshot.volumeBreakout > 1.2 && snapshot.changePercent < 0
        ? { verdict: 'bearish', confidence: 65, reason: 'Caindo em volume pesado，saída de capital' }
        : { verdict: 'neutral', confidence: 50, reason: 'O fluxo de fundos não é claro' }
    case 'ATRVolatilidade':
      return snapshot.volatility20d > 40 ? { verdict: 'bearish', confidence: 60, reason: `Volatilidade${snapshot.volatility20d}No lado alto` }
        : snapshot.volatility20d < 15 ? { verdict: 'bullish', confidence: 55, reason: 'Acumulação de baixa volatilidade' }
        : { verdict: 'neutral', confidence: 50, reason: 'A volatilidade é normal' }
    case 'quantis de volatilidade histórica':
      return snapshot.volatilityRank > 0.8 ? { verdict: 'bearish', confidence: 60, reason: 'A volatilidade está em máximos históricos' }
        : snapshot.volatilityRank < 0.2 ? { verdict: 'bullish', confidence: 55, reason: 'A volatilidade está em níveis historicamente baixos' }
        : { verdict: 'neutral', confidence: 50, reason: 'Os quantis de volatilidade são normais' }
    case 'impulso relativo do setor':
      return snapshot.return20d > marketState.csi500Return20d + 5
        ? { verdict: 'bullish', confidence: 65, reason: 'Superou significativamente o mercado' }
        : snapshot.return20d < marketState.csi500Return20d - 5
        ? { verdict: 'bearish', confidence: 65, reason: 'Desempenho inferior ao do mercado significativamente' }
        : { verdict: 'neutral', confidence: 50, reason: 'Perto da tendência do mercado' }
    case 'Mudanças na classificação da seção':
      return snapshot.return5d > snapshot.return20d / 4 + 1
        ? { verdict: 'bullish', confidence: 55, reason: 'Aumento acelerado recentemente' }
        : snapshot.return5d < snapshot.return20d / 4 - 1
        ? { verdict: 'bearish', confidence: 55, reason: 'Enfraquecido recentemente' }
        : { verdict: 'neutral', confidence: 50, reason: 'ritmo constante' }
    case 'risco de carteira':
      return marketState.volatility === 'high_volatility'
        ? { verdict: 'bearish', confidence: 60, reason: 'Alta volatilidade do mercado，O risco do portfólio é alto' }
        : marketState.sentiment === 'pessimistic'
        ? { verdict: 'bearish', confidence: 55, reason: 'O sentimento do mercado é pessimista' }
        : { verdict: 'neutral', confidence: 50, reason: 'Risco do portfólio controlável' }
    case 'risco de ações individuais':
      return snapshot.declineDays20d >= 10
        ? { verdict: 'bearish', confidence: 70, reason: `Sequência de queda${snapshot.declineDays20d}dia` }
        : snapshot.volatility20d > 50
        ? { verdict: 'bearish', confidence: 60, reason: 'A volatilidade das ações individuais é muito alta' }
        : { verdict: 'neutral', confidence: 50, reason: 'Os riscos de ações individuais são controláveis' }
    default:
      return { verdict: 'neutral', confidence: 50, reason: 'Função de regra não reconhecida' }
  }
}

// ==================== Entrada de raciocínio em lote ====================

/** provider.concurrency O número padrão de simultaneidades quando não definido */
const DEFAULT_PROVIDER_CONCURRENCY = 3

/** Limite superior total simultâneo global，Evite que muitas solicitações sejam feitas ao mesmo tempo */
const MAX_GLOBAL_CONCURRENCY = 8

/** P2-C5: Provider fusível de nível — Depois que falhas consecutivas atingirem o limite, pule o provider */
const PROVIDER_CIRCUIT_BREAKER_THRESHOLD = 3 // Número de falhas consecutivas
const PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS = 60_000 // tempo de resfriamento do fusível 60 Segundo
const providerFailureCount = new Map<string, number>()
const providerCircuitOpenAt = new Map<string, number>()

function isProviderCircuitOpen(providerId: string): boolean {
  const openAt = providerCircuitOpenAt.get(providerId)
  if (!openAt) return false
  if (Date.now() - openAt > PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS) {
    // O período de resfriamento termina，redefinir fusível
    providerCircuitOpenAt.delete(providerId)
    providerFailureCount.delete(providerId)
    return false
  }
  return true
}

function recordProviderFailure(providerId: string) {
  const count = (providerFailureCount.get(providerId) ?? 0) + 1
  providerFailureCount.set(providerId, count)
  if (count >= PROVIDER_CIRCUIT_BREAKER_THRESHOLD) {
    providerCircuitOpenAt.set(providerId, Date.now())
    logger.warn(`[llm-inference] Provider ${providerId} fusível：contínuo ${count} fracassado，pausa ${PROVIDER_CIRCUIT_BREAKER_COOLDOWN_MS / 1000}s`)
  }
}

function recordProviderSuccess(providerId: string) {
  providerFailureCount.delete(providerId)
  providerCircuitOpenAt.delete(providerId)
}

/**
 * construir fallback Lista de candidatos：coletar tudo enabled provider de tudo model，
 * Excluir a tarefa principal do especialista atual，Como um pool de novas tentativas。
 * [P2-11] Prioridades diferentes provider Candidatos ficaram em primeiro lugar，mesmo provider diferente model na parte de trás。
 */
function buildFallbackCandidates(
  providerMap: Map<string, StockAnalysisAIProvider>,
  excludeProviderId: string,
  excludeModelId: string,
): LLMCandidate[] {
  const differentProvider: LLMCandidate[] = []
  const sameProvider: LLMCandidate[] = []
  for (const provider of providerMap.values()) {
    for (const modelId of provider.models) {
      if (provider.id === excludeProviderId && modelId === excludeModelId) continue
      if (isUnsupportedCandidate(provider, modelId)) {
        saLog.warn('LLM-Inference', `Ignorar candidatos conhecidos sem suporte: ${provider.name}/${modelId}`)
        continue
      }
      if (provider.id === excludeProviderId) {
        sameProvider.push({ provider, modelId })
      } else {
        differentProvider.push({ provider, modelId })
      }
    }
  }
  return [...differentProvider, ...sameProvider]
}

/**
 * execute tudo em um estoque 45 votos de especialistas
 * - 30 individual LLM especialista：trazer fallback de chamadas simultâneas，Mude automaticamente para outros modelos se um modelo falhar/fornecedor
 * - 15 especialista em função de regra：computação local
 * Retorno agregado LLMExpertScore
 */
export async function runExpertVoting(
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  aiConfig: StockAnalysisAIConfig,
  expertWeights?: Map<string, number>,
  profileMap?: Map<string, ExpertProfile>,
  factPoolSummary?: FactPoolSummary,
  memoryStore?: ExpertMemoryStore,
  history?: StockAnalysisKlinePoint[],
  factPool?: FactPool,
  fundamentals?: StockFundamentals | null,
): Promise<LLMExpertScore> {
  const votingStart = Date.now()
  const enabledExperts = aiConfig.experts.filter((e) => e.enabled)
  const providerMap = new Map(aiConfig.providers.filter((p) => p.enabled).map((p) => [p.id, p]))

  const ruleExperts = enabledExperts.filter((e) => e.layer === 'rule_functions')
  const llmExperts = enabledExperts.filter((e) => e.layer !== 'rule_functions' && e.assignedModel)
  const unassignedExperts = enabledExperts.filter((e) => e.layer !== 'rule_functions' && !e.assignedModel)

  saLog.info('LLM-Inference', `A votação começa: estoque=${snapshot.code} Especialista Chefe=${enabledExperts.length} LLM=${llmExperts.length} regra=${ruleExperts.length} Não atribuído=${unassignedExperts.length} fornecedor=${providerMap.size}`)

  // especialista em regras：Cálculo síncrono
  const ruleVotes = ruleExperts.map((expert) => buildRuleExpertVote(expert, snapshot, marketState))

  // Modelo não atribuído LLM especialista：Downgrade para governar
  const unassignedVotes = unassignedExperts.map((expert) => buildFallbackVote(expert, snapshot, 0))

  // LLM especialista：trazer fallback de chamadas simultâneas（injetar memória + FactPool + perfil de desempenho）
  // Proteção geral de tempo limite: 30 minuto。Manter tickets bem-sucedidos quando ocorrer o tempo limite，Os demais especialistas serão complementados com o rebaixamento das regras.。
  let llmVotes: ExpertVote[]
  try {
    llmVotes = await runLLMWithFallback(
      llmExperts, providerMap, snapshot, marketState,
      profileMap, factPoolSummary, memoryStore,
      EXPERT_VOTING_TIMEOUT_MS,
      history,
      factPool,
      fundamentals,
    )
  } catch (error) {
    logger.warn(`[llm-inference] ${(error as Error).message}，Preencher tudo com downgrade de regra LLM especialista`)
    saLog.error('LLM-Inference', `LLM Exceção de chamada simultânea: ${(error as Error).message}，${llmExperts.length} individual LLM Todos os especialistas são relegados à inferência de regras`)
    llmVotes = llmExperts.map((expert) => buildFallbackVote(expert, snapshot, 0))
  }

  const allVotes = [...ruleVotes, ...llmVotes, ...unassignedVotes]
  const result = aggregateVotes(allVotes, expertWeights)
  const votingElapsed = Date.now() - votingStart

  saLog.info('LLM-Inference', `Votação concluída: estoque=${snapshot.code} Tempo total gasto=${votingElapsed}ms score=${result.score} consensus=${result.consensus} bullish=${result.bullishCount} bearish=${result.bearishCount} neutral=${result.neutralCount} llmSuccess=${result.llmSuccessCount} ruleFallback=${result.ruleFallbackCount} degradeRatio=${result.degradeRatio} isSimulated=${result.isSimulated}`)

  return result
}

/**
 * trazer fallback de LLM Chamadas simultâneas：
 * - Agrupar por fornecedor，Use limites de simultaneidade independentes por provedor
 * - Teste automaticamente modelos de outros fornecedores após falha em uma única chamada（Mecanismo de mergulho）
 * - A quantidade total de simultaneidade global não excede MAX_GLOBAL_CONCURRENCY
 */
async function runLLMWithFallback(
  experts: StockAnalysisExpertDefinition[],
  providerMap: Map<string, StockAnalysisAIProvider>,
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  profileMap?: Map<string, ExpertProfile>,
  factPoolSummary?: FactPoolSummary,
  memoryStore?: ExpertMemoryStore,
  overallTimeoutMs = EXPERT_VOTING_TIMEOUT_MS,
  history?: StockAnalysisKlinePoint[],
  factPool?: FactPool,
  fundamentals?: StockFundamentals | null,
): Promise<ExpertVote[]> {
  // de acordo com providerId Grupo
  const groups = new Map<string, { expert: StockAnalysisExpertDefinition; originalIndex: number }[]>()
  const noProviderVotes: { vote: ExpertVote; originalIndex: number }[] = []

  for (let i = 0; i < experts.length; i++) {
    const expert = experts[i]
    const providerId = expert.assignedModel!.providerId
    const provider = providerMap.get(providerId)

    if (!provider) {
      noProviderVotes.push({ vote: buildFallbackVote(expert, snapshot, 0), originalIndex: i })
      continue
    }

    if (!groups.has(providerId)) groups.set(providerId, [])
    groups.get(providerId)!.push({ expert, originalIndex: i })
  }

  const results: Array<ExpertVote | undefined> = new Array(experts.length)
  const startedAt = Date.now()

  function hasTimedOut() {
    return Date.now() - startedAt >= overallTimeoutMs
  }

  // Preencha nenhum primeiro provider de fallback
  for (const { vote, originalIndex } of noProviderVotes) {
    results[originalIndex] = vote
  }

  // Semáforo simultâneo global（Promise Implementação de fila，evite pesquisas）
  let globalActive = 0
  const waitQueue: Array<() => void> = []
  function waitForGlobalSlot(): Promise<void> {
    if (globalActive < MAX_GLOBAL_CONCURRENCY) {
      globalActive++
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      waitQueue.push(() => { globalActive++; resolve() })
    })
  }
  function releaseGlobalSlot() {
    globalActive--
    if (waitQueue.length > 0) {
      const next = waitQueue.shift()!
      next()
    }
  }

  // Paralelo a cada fornecedor，Pressione dentro de cada grupo concurrency Limitação atual
  await Promise.all(
    Array.from(groups.entries()).map(async ([providerId, items]) => {
      const provider = providerMap.get(providerId)!
      const concurrency = Math.max(1, provider.concurrency || DEFAULT_PROVIDER_CONCURRENCY)
      let cursor = 0

      async function runner() {
        while (cursor < items.length) {
          if (hasTimedOut()) return

          const current = cursor
          cursor += 1
          const { expert, originalIndex } = items[current]

          await waitForGlobalSlot()
          try {
            const primaryModelId = expert.assignedModel!.modelId
            const primaryCandidate: LLMCandidate = { provider, modelId: primaryModelId }
            const fallbacks = buildFallbackCandidates(providerMap, providerId, primaryModelId)

            results[originalIndex] = await callExpertLLMWithFallback(
              expert,
              primaryCandidate,
              fallbacks,
              snapshot,
              marketState,
              profileMap?.get(expert.id),
              factPoolSummary,
              memoryStore,
              history,
              factPool,
              fundamentals,
            )
          } finally {
            releaseGlobalSlot()
          }
        }
      }

  await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => runner()),
      )
    }),
  )

  const completedVotes = results.filter((vote): vote is ExpertVote => Boolean(vote))
  const completedExpertIds = new Set(completedVotes.map((vote) => vote.expertId))
  const timedOutExperts = experts.filter((expert) => !completedExpertIds.has(expert.id))

  if (timedOutExperts.length > 0) {
    const llmSuccessCount = completedVotes.filter((vote) => vote.modelId !== 'rule-fallback' && vote.modelId !== 'rule-engine').length
    saLog.warn(
      'LLM-Inference',
      `Especialistas votam ${overallTimeoutMs}ms Nem tudo concluído dentro do orçamento total：Concluído=${completedVotes.length}/${experts.length}，LLMsucesso=${llmSuccessCount}，Downgrade de tempo limite=${timedOutExperts.length}`,
    )

    if (llmSuccessCount < MIN_EFFECTIVE_LLM_VOTES) {
      saLog.error(
        'LLM-Inference',
        `LLM Votos de especialistas válidos insuficientes（sucesso=${llmSuccessCount}，Requisitos mínimos=${MIN_EFFECTIVE_LLM_VOTES}），Alterar tudo para fazer downgrade de regras`,
      )
      return experts.map((expert) => buildFallbackVote(expert, snapshot, 0))
    }
  }

  return experts.map((expert, index) => results[index] ?? buildFallbackVote(expert, snapshot, 0))
}

/** Agregue todos os votos em classificações de especialistas（Suporta ponderação por peso dinâmico individual especializado） */
function aggregateVotes(votes: ExpertVote[], expertWeights?: Map<string, number>): LLMExpertScore {
  const bullishVotes = votes.filter((v) => v.verdict === 'bullish')
  const bearishVotes = votes.filter((v) => v.verdict === 'bearish')
  const neutralVotes = votes.filter((v) => v.verdict === 'neutral')

  const bullishCount = bullishVotes.length
  const bearishCount = bearishVotes.length
  const neutralCount = neutralVotes.length
  const totalVoters = bullishCount + bearishCount + neutralCount

  // P2-A4: neutral vote para incluir consensus calcular — neutral considerado como 0.5 contribuição direcional
  // alto neutral A proporção será consensus puxe em direção 0.5，Reduzir a confiança comercial
  const adjustedBullish = bullishCount + neutralCount * 0.5
  const adjustedTotal = bullishCount + bearishCount + neutralCount
  const consensus = adjustedTotal > 0 ? adjustedBullish / adjustedTotal : 0.5

  // P2-A5: confidence normalização — Votações para o mesmo modelo são realizadas z-score padronização，faça modelos diferentes confidence comparável
  // de acordo com modelId Calcular média e desvio padrão por grupo，e então remapear para 0-100 escopo
  const modelConfidences = new Map<string, number[]>()
  for (const v of votes) {
    const key = v.modelId
    if (!modelConfidences.has(key)) modelConfidences.set(key, [])
    modelConfidences.get(key)!.push(v.confidence)
  }
  const normalizedConfidence = new Map<string, number>()
  for (const v of votes) {
    const group = modelConfidences.get(v.modelId)!
    if (group.length < 3) {
      // Amostra insuficiente，mantenha-o original confidence
      normalizedConfidence.set(v.expertId, v.confidence)
    } else {
      const mean = group.reduce((s, c) => s + c, 0) / group.length
      const std = Math.sqrt(group.reduce((s, c) => s + (c - mean) ** 2, 0) / group.length) || 1
      // z-score mapeado para 50 ± 25 escopo（significar=50，1 desvio padrão=25）
      const z = (v.confidence - mean) / std
      normalizedConfidence.set(v.expertId, Math.max(5, Math.min(95, 50 + z * 25)))
    }
  }

  // classificação ponderada：Use o normalizado confidence e pesos de desempenho históricos
  const getWeight = (v: ExpertVote) => (expertWeights?.get(v.expertId) ?? 1.0) * (normalizedConfidence.get(v.expertId) ?? v.confidence)
  const weightedBullish = bullishVotes.reduce((sum, v) => sum + getWeight(v), 0)
  const weightedBearish = bearishVotes.reduce((sum, v) => sum + getWeight(v), 0)
  const weightedNeutral = neutralVotes.reduce((sum, v) => sum + getWeight(v), 0)
  const totalWeight = weightedBullish + weightedBearish + weightedNeutral
  const score = totalWeight > 0
    ? ((weightedBullish * 100 + weightedNeutral * 50) / totalWeight)
    : 50

  // Distinguir entre três tipos de fontes de votação：
  // 1. LLM Modelo principal bem sucedido（!usedFallback && modelId != rule-engine/rule-fallback）
  // 2. LLM fallback sucesso（usedFallback && modelId != rule-fallback）— sério LLM analisar，Acabei de mudar o modelo
  // 3. Downgrade do mecanismo de regras（modelId == rule-fallback ou rule-engine）— nenhum LLM participar
  const llmPrimaryCount = votes.filter((v) => !v.usedFallback && v.modelId !== 'rule-engine' && v.modelId !== 'rule-fallback').length
  const llmFallbackCount = votes.filter((v) => v.usedFallback && v.modelId !== 'rule-fallback').length
  const ruleFallbackCount = votes.filter((v) => v.modelId === 'rule-fallback').length
  const ruleEngineCount = votes.filter((v) => v.modelId === 'rule-engine').length

  // LLM número total de sucessos = Modelo principal bem sucedido + fallback LLM sucesso（Ambos são reais LLM analisar）
  const llmSuccessCount = llmPrimaryCount + llmFallbackCount

  // compatível com versões anteriores fallbackCount = LLM fallback + Downgrade de regra
  const fallbackCount = llmFallbackCount + ruleFallbackCount

  // extrair top highlights e risks
  const highlights = bullishVotes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((v) => `${v.expertName}: ${v.reason}`)

  const risks = bearishVotes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((v) => `${v.expertName}: ${v.reason}`)

  if (highlights.length === 0) highlights.push('Nenhum sinal claro de alta ainda')
  if (risks.length === 0) risks.push('Ainda não há riscos estruturais significativos')

  // Número total de votos de mecanismos não-regra（LLM Número total de especialistas，Não contém 15 especialista em regras integradas）
  const llmVoterCount = llmPrimaryCount + llmFallbackCount + ruleFallbackCount

  const aggregatedResult: LLMExpertScore = {
    bullishCount,
    bearishCount,
    neutralCount,
    consensus: Math.round(consensus * 10000) / 10000,
    score: Math.round(Math.max(0, Math.min(100, score)) * 100) / 100,
    highlights,
    risks,
    votes,
    llmSuccessCount,
    llmFallbackCount,
    ruleFallbackCount,
    fallbackCount,
    isSimulated: llmSuccessCount === 0 && ruleFallbackCount > 0,
    degradeRatio: llmVoterCount > 0
      ? Math.round((ruleFallbackCount / llmVoterCount) * 10000) / 10000
      : (totalVoters > 0 ? 0 : 1),
  }

  saLog.debug('LLM-Inference', `Detalhes da agregação: totalVoters=${totalVoters} bullish=${bullishCount} bearish=${bearishCount} neutral=${neutralCount} weightedBullish=${weightedBullish.toFixed(2)} weightedBearish=${weightedBearish.toFixed(2)} weightedNeutral=${weightedNeutral.toFixed(2)} llmPrimary=${llmPrimaryCount} llmFallback=${llmFallbackCount} ruleFallback=${ruleFallbackCount} ruleEngine=${ruleEngineCount}`)

  return aggregatedResult
}

// ==================== Exportação assistida por teste ====================

export const _testing = {
  aggregateVotes,
  buildFallbackVote,
  buildFallbackCandidates,
  parseLLMResponse,
  buildStockContext,
  buildIndicatorBlock,
  buildKlineSummary,
  buildFundamentalsBlock,
  buildExpertSystemMessage,
  buildExpertUserMessage,
  isUnsupportedCandidate,
  LLM_CALL_TIMEOUT_MS,
  EXPERT_VOTING_TIMEOUT_MS,
  MIN_EFFECTIVE_LLM_VOTES,
}
