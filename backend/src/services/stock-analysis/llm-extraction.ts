/**
 * G3+M3 LLM camada de extração de informações — Chamada em lote fora do horário comercial
 *
 * em princípio：LLM Não faça previsões，Somente extração de informações。
 *
 * 3 extração Agent：
 * 1. analisador de anúncios — Extraia eventos estruturados de anúncios da empresa
 * 2. Analisador de impacto de notícias — Avalie o impacto das notícias do setor/grau
 * 3. Analisador de sentimento de opinião pública — Quantificando métricas de sentimento nas mídias sociais
 *
 * cada Agent Suporta configuração de modelo independente + automático fallback：
 * - uso prioritário per-agent modelo atribuído
 * - Se não for atribuído, use o primeiro disponível provider O primeiro modelo de
 * - Quando a chamada do modelo principal falha，Percorrer automaticamente outros provider + model Tente novamente
 */

import { logger } from '../../utils/logger'
import { saLog } from './sa-logger'
import { callProviderText } from './llm-provider-adapter'
import type {
  AnnouncementEvent,
  FactPool,
  LLMExtractionAgentId,
  LLMExtractionResult,
  NewsImpactEvent,
  SentimentIndex,
  StockAnalysisAIConfig,
  StockAnalysisAIProvider,
} from './types'

const LLM_CALL_TIMEOUT_MS = 360_000
const AGENT_FALLBACK_BUDGET_MS = 15 * 60 * 1000
const UNSUPPORTED_CANDIDATES = new Set([
  'OpenCodeGo/MiMo-V2-Pro',
  'OpenCodeGo/GLM-5',
])

// ==================== Função utilitária ====================

function nowIso(): string {
  return new Date().toISOString()
}

/** um para tentar provider + model combinação */
interface LLMCandidate {
  provider: StockAnalysisAIProvider
  modelId: string
}

function isUnsupportedCandidate(provider: StockAnalysisAIProvider, modelId: string): boolean {
  return UNSUPPORTED_CANDIDATES.has(`${provider.name}/${modelId}`)
}

/** chamar OpenAI compatível API */
async function callLLMChat(
  provider: StockAnalysisAIProvider,
  modelId: string,
  systemMessage: string,
  userMessage: string,
): Promise<{ content: string; latencyMs: number }> {
  const data = await callProviderText({
    provider,
    modelId,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    maxTokens: provider.maxTokens ?? 50_000,
    temperature: 0.2,
    userAgent: 'ClawOS/StockAnalysis LLM-Extraction',
    timeoutMs: LLM_CALL_TIMEOUT_MS,
  })
  let content = data.content ?? ''
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  return { content, latencyMs: data.latencyMs }
}

/** A correspondência balanceada de colchetes extrai o primeiro completo JSON estrutura */
function extractBalancedJson(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open)
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
    if (ch === open) depth++
    else if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return null
}

/**
 * [P2-12] truncado de JSON Tente restaurar elementos completos no texto do array。
 * Extraia os balanceados um por um {...} Análise de substring，Ignorar elementos incompletos truncados。
 */
function recoverArrayItems<T>(text: string): T[] {
  const items: T[] = []
  let pos = 0
  while (pos < text.length) {
    const start = text.indexOf('{', pos)
    if (start === -1) break
    const fragment = extractBalancedJson(text.slice(start), '{', '}')
    if (!fragment) break
    try {
      items.push(JSON.parse(fragment) as T)
    } catch {
      // O elemento não pode ser analisado，pular sobre
    }
    pos = start + fragment.length
  }
  return items
}

type JsonExtractionMode = 'object-first' | 'array-first'

/** de LLM Extrair do texto retornado JSON variedade/objeto */
function extractJsonFromText<T>(text: string, mode: JsonExtractionMode = 'array-first'): T | null {
  // Tente extrair ```json ... ``` bloco de código
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1] : text

  // Use correspondência balanceada de colchetes para extrair o primeiro completo JSON estrutura
  const candidate = mode === 'object-first'
    ? extractBalancedJson(jsonStr, '{', '}') ?? extractBalancedJson(jsonStr, '[', ']')
    : extractBalancedJson(jsonStr, '[', ']') ?? extractBalancedJson(jsonStr, '{', '}')

  if (!candidate) {
    // [P2-12] matriz completa/Falha na extração do objeto（pode ser truncado），Experimente a recuperação elemento por elemento
    const recovered = recoverArrayItems<unknown>(jsonStr)
    if (recovered.length > 0) {
      logger.warn(`[llm-extraction] JSON Falha na análise geral，Elemento restaurado por elemento ${recovered.length} tira`)
      return recovered as T
    }
    return null
  }

  try {
    return JSON.parse(candidate) as T
  } catch {
    // [P2-12] Partida equilibrada bem-sucedida, mas JSON.parse falhar（possível truncamento interno），Experimente a recuperação elemento por elemento
    const recovered = recoverArrayItems<unknown>(candidate)
    if (recovered.length > 0) {
      logger.warn(`[llm-extraction] JSON Falha na análise，Elemento restaurado por elemento ${recovered.length} tira`, { text: candidate.slice(0, 200) })
      return recovered as T
    }
    logger.warn('[llm-extraction] JSON Falha na análise，Não é possível recuperar', { text: candidate.slice(0, 200) })
    return null
  }
}

// ==================== Seleção de modelo + Fallback ====================

/**
 * Extrair para especificado Agent Selecione o modelo candidato principal：
 * 1. uso prioritário per-agent modelo atribuído（Se correspondente provider Ainda ativado）
 * 2. Caso contrário, use o primeiro disponível provider O primeiro modelo de
 */
function pickPrimaryCandidate(
  agentId: LLMExtractionAgentId,
  aiConfig: StockAnalysisAIConfig,
): LLMCandidate | null {
  const agentConfig = aiConfig.extractionAgents?.find((a) => a.agentId === agentId)

  // uso prioritário per-agent modelo atribuído
  if (agentConfig?.assignedModel) {
    const ref = agentConfig.assignedModel
    const provider = aiConfig.providers.find(
      (p) => p.id === ref.providerId && p.enabled && p.baseUrl && p.apiKey,
    )
    if (provider && provider.models.includes(ref.modelId) && !isUnsupportedCandidate(provider, ref.modelId)) {
      return { provider, modelId: ref.modelId }
    }
    logger.warn(`[llm-extraction] Agent ${agentId} modelo atribuído ${ref.modelId} Não disponível，usará fallback`)
  }

  // reversão：Pegue o primeiro disponível provider O primeiro modelo de
  for (const provider of aiConfig.providers) {
    if (!provider.enabled || !provider.baseUrl || !provider.apiKey) continue
    if (provider.models.length > 0) {
      const firstSupportedModel = provider.models.find((modelId) => !isUnsupportedCandidate(provider, modelId))
      if (firstSupportedModel) {
        return { provider, modelId: firstSupportedModel }
      }
    }
  }
  return null
}

/**
 * construir fallback Lista de candidatos：coletar tudo enabled provider de tudo model，
 * Excluir candidato primário atual，Como um pool de novas tentativas。
 */
function buildFallbackCandidates(
  aiConfig: StockAnalysisAIConfig,
  excludeProviderId: string,
  excludeModelId: string,
): LLMCandidate[] {
  const candidates: LLMCandidate[] = []
  for (const provider of aiConfig.providers) {
    if (!provider.enabled || !provider.baseUrl || !provider.apiKey) continue
    for (const modelId of provider.models) {
      if (provider.id === excludeProviderId && modelId === excludeModelId) continue
      if (isUnsupportedCandidate(provider, modelId)) {
        saLog.warn('LLM-Extraction', `Ignorar candidatos conhecidos sem suporte: ${provider.name}/${modelId}`)
        continue
      }
      candidates.push({ provider, modelId })
    }
  }
  return candidates
}

type CallLog = LLMExtractionResult['llmCalls'][number]

/**
 * trazer fallback de LLM Encapsulamento de chamadas：
 * Experimente primeiro o candidato principal，Tente novamente após falhar fallback Outros na lista de candidatos provider + model。
 * O log de erros final será retornado somente após todas as falhas.。
 */
async function callWithFallback<T>(
  agentId: string,
  primary: LLMCandidate,
  fallbacks: LLMCandidate[],
  callFn: (provider: StockAnalysisAIProvider, modelId: string) => Promise<{ result: T; callLog: CallLog }>,
  emptyResult: T,
): Promise<{ result: T; callLog: CallLog }> {
  const allCandidates = [primary, ...fallbacks]
  const startedAt = Date.now()

  for (let i = 0; i < allCandidates.length; i++) {
    if (Date.now() - startedAt >= AGENT_FALLBACK_BUDGET_MS) {
      logger.error(`[llm-extraction] Agent ${agentId} fallback Tempo limite total do orçamento（${AGENT_FALLBACK_BUDGET_MS}ms）`)
      saLog.error('LLM-Extraction', `Agent ${agentId} fallback Tempo limite total do orçamento（${AGENT_FALLBACK_BUDGET_MS}ms），Interromper tentativas subsequentes de candidatos`)
      break
    }

    const candidate = allCandidates[i]
    const label = i === 0
      ? `[primary: ${candidate.provider.name}/${candidate.modelId}]`
      : `[fallback ${i}/${allCandidates.length - 1}: ${candidate.provider.name}/${candidate.modelId}]`

    try {
      const outcome = await callFn(candidate.provider, candidate.modelId)
      if (outcome.callLog.success) {
        if (i > 0) {
          logger.info(`[llm-extraction] Agent ${agentId} ${label} fallback sucesso`)
        }
        saLog.info('LLM-Extraction', `Agent ${agentId} ${label} sucesso: latency=${outcome.callLog.latencyMs}ms`)
        return outcome
      }
      // callLog.success === false Mas não throw（não deveria aparecer，mas faça defesa）
      logger.warn(`[llm-extraction] Agent ${agentId} ${label} Falha no retorno，tente o próximo candidato`)
      saLog.warn('LLM-Extraction', `Agent ${agentId} ${label} Falha no retorno（análise de exceção），tente o próximo candidato`)
    } catch (error) {
      const errMsg = (error as Error).message
      logger.warn(`[llm-extraction] Agent ${agentId} ${label} chamada falhou: ${errMsg}，tente o próximo candidato`)
      saLog.warn('LLM-Extraction', `Agent ${agentId} ${label} chamada falhou: ${errMsg}`)

      // não consegui gravar LLM registro de chamadas
      saLog.llmCall({
        timestamp: new Date().toISOString(),
        module: 'extraction',
        model: candidate.modelId,
        providerId: candidate.provider.id,
        agentName: agentId,
        prompt: { system: '', user: '' },
        response: null,
        latencyMs: 0,
        success: false,
        error: errMsg,
      })
    }
  }

  // Tudo falhou
  const lastCandidate = allCandidates[allCandidates.length - 1]
  logger.error(`[llm-extraction] Agent ${agentId} Todos os modelos candidatos falharam（comum ${allCandidates.length} individual）`)
  saLog.error('LLM-Extraction', `Agent ${agentId} todos ${allCandidates.length} Todos os modelos candidatos falharam`)
  return {
    result: emptyResult,
    callLog: {
      agent: agentId,
      model: lastCandidate.modelId,
      latencyMs: 0,
      success: false,
      error: `todos ${allCandidates.length} Todos os modelos candidatos falharam`,
    },
  }
}

// ==================== Agent 1: analisador de anúncios ====================

const ANNOUNCEMENT_SYSTEM_PROMPT = `Você é um especialista profissional na análise de anúncios de empresas listadas。Sua tarefa é extrair informações estruturadas sobre eventos a partir de títulos e resumos de anúncios。

Você deve gerar um JSON variedade，Cada elemento contém：
- company: Código de estoque（como "600519"）ou nome da empresa
- eventType: tipo de evento（como "Previsão de desempenho"、"Acionistas reduzem participações"、"grandes contratos"、"Dividendos e dividendos"、"Questão de direitos adicionais"、"Contencioso e Arbitragem"、"Mudanças executivas" espere）
- magnitude: Descrição do impacto（"Superou significativamente as expectativas"、"Como esperado"、"abaixo do esperado"、"Principais mudanças" espere）
- sentiment: pontuação de sentimento -1.0 chegar 1.0（frente=Valor positivo，Negativo=valor negativo）
- keyMetrics: Dicionário de indicadores-chave（como {"revenue_growth": 0.35}），Caso contrário, é um objeto vazio {}
- riskFlags: matriz de sinalizadores de risco（como ["As contas a receber cresceram rapidamente"]），Caso contrário, é um array vazio []
- confidence: Confiança 0-1

Somente saída JSON，Não adicione texto adicional。Se não houver nenhum anúncio significativo，Matriz vazia de saída []。`

async function doExtractAnnouncements(
  factPool: FactPool,
  provider: StockAnalysisAIProvider,
  modelId: string,
): Promise<{ result: AnnouncementEvent[]; callLog: CallLog }> {
  const agentName = 'announcement_parser'

  if (factPool.companyAnnouncements.length === 0) {
    return {
      result: [],
      callLog: { agent: agentName, model: modelId, latencyMs: 0, success: true, error: null },
    }
  }

  // [P2-13] Use a quantidade real após o truncamento，evitar prompt explicar"100tira"Mas na verdade ele só transmite 30 tira
  const slicedAnnouncements = factPool.companyAnnouncements.slice(0, 30)
  const announcementText = slicedAnnouncements
    .map((a, i) => `${i + 1}. [${a.code || 'desconhecido'}] ${a.name}: ${a.title} (${a.publishedAt})`)
    .join('\n')

  const userMsg = `Por favor, analise o seguinte ${slicedAnnouncements.length} Anúncios de empresas listadas，Extraia eventos estruturados：\n\n${announcementText}`
  const { content, latencyMs } = await callLLMChat(
    provider, modelId,
    ANNOUNCEMENT_SYSTEM_PROMPT,
    userMsg,
  )

  // Registro LLM Registro completo de chamadas
  saLog.llmCall({
    timestamp: new Date().toISOString(),
    module: 'extraction',
    model: modelId,
    providerId: provider.id,
    agentName,
    prompt: { system: ANNOUNCEMENT_SYSTEM_PROMPT, user: userMsg },
    response: content,
    latencyMs,
    success: true,
  })

  const parsed = extractJsonFromText<AnnouncementEvent[]>(content, 'array-first')
  // [P2-15] Verifique tudo 7 campos，Descarte registros incompletos em vez de mantê-los silenciosamente
  const announcements = (parsed ?? []).filter((item): item is AnnouncementEvent =>
    typeof item.company === 'string' && item.company.length > 0
    && typeof item.eventType === 'string' && item.eventType.length > 0
    && typeof item.magnitude === 'string'
    && typeof item.sentiment === 'number' && item.sentiment >= -1 && item.sentiment <= 1
    && typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1
    && (item.keyMetrics == null || typeof item.keyMetrics === 'object')
    && (item.riskFlags == null || Array.isArray(item.riskFlags)),
  ).map((item) => ({
    ...item,
    // Certifique-se de que os campos opcionais tenham valores padrão razoáveis
    keyMetrics: item.keyMetrics ?? {},
    riskFlags: Array.isArray(item.riskFlags) ? item.riskFlags : [],
  }))

  // P2-B2: distinguir"A chamada foi bem-sucedida e há dados"e"A chamada foi bem-sucedida, mas resolve como nula"
  const parseSuccess = announcements.length > 0 || (parsed !== null && parsed.length === 0)
  return {
    result: announcements,
    callLog: {
      agent: agentName, model: modelId, latencyMs,
      success: parseSuccess,
      error: !parseSuccess ? `LLM O conteúdo retornado não pode ser analisado em um anúncio válido（comprimento original=${content.length}）` : null,
    },
  }
}

// ==================== Agent 2: Analisador de impacto de notícias ====================

const NEWS_IMPACT_SYSTEM_PROMPT = `Você é um analista profissional de impacto de notícias do setor。Sua tarefa é avaliar o impacto das notícias no mercado。

Você deve gerar um JSON variedade，Cada elemento contém：
- topic: Tópicos de notícias
- impactDirection: "bom" | "Ruim" | "neutro"
- impactLevel: "principal" | "médio" | "pouco"
- affectedSectors: Matriz de indústrias afetadas（como ["Novos veículos energéticos", "Bateria de lítio"]）
- affectedStocks: Conjunto de símbolos de ação que podem ser afetados（como ["300750"]），Se não tiver certeza, é um array vazio.
- timeHorizon: "curto prazo" | "médio prazo" | "longo"
- confidence: Confiança 0-1

Somente saída JSON，Não adicione texto adicional。Se não houver notícias significativas，Matriz vazia de saída []。`

async function doExtractNewsImpact(
  factPool: FactPool,
  provider: StockAnalysisAIProvider,
  modelId: string,
): Promise<{ result: NewsImpactEvent[]; callLog: CallLog }> {
  const agentName = 'news_impact_analyzer'

  const allNews = [
    ...factPool.policyEvents.map((e) => `[política] ${e.title}: ${e.rawText.slice(0, 200)}`),
    ...factPool.industryNews.map((n) => `[indústria] ${n.title}: ${n.rawSummary.slice(0, 200)}`),
  ]

  if (allNews.length === 0) {
    return {
      result: [],
      callLog: { agent: agentName, model: modelId, latencyMs: 0, success: true, error: null },
    }
  }

  // [P2-13] Use a quantidade real após o truncamento
  const slicedNews = allNews.slice(0, 30)
  const newsText = slicedNews.map((n, i) => `${i + 1}. ${n}`).join('\n')

  const userMsg = `Por favor, analise o seguinte ${slicedNews.length} impacto das notícias no mercado：\n\n${newsText}`
  const { content, latencyMs } = await callLLMChat(
    provider, modelId,
    NEWS_IMPACT_SYSTEM_PROMPT,
    userMsg,
  )

  // Registro LLM Registro completo de chamadas
  saLog.llmCall({
    timestamp: new Date().toISOString(),
    module: 'extraction',
    model: modelId,
    providerId: provider.id,
    agentName,
    prompt: { system: NEWS_IMPACT_SYSTEM_PROMPT, user: userMsg },
    response: content,
    latencyMs,
    success: true,
  })

  const parsed = extractJsonFromText<NewsImpactEvent[]>(content, 'array-first')
  const newsImpacts = (parsed ?? []).filter((item) =>
    typeof item.topic === 'string'
    && ['bom', 'Ruim', 'neutro'].includes(item.impactDirection)
    && typeof item.confidence === 'number',
  )

  // P2-B2: Distinguir entre sucesso de chamada e falha de análise
  const newsParseSuccess = newsImpacts.length > 0 || (parsed !== null && parsed.length === 0)
  return {
    result: newsImpacts,
    callLog: {
      agent: agentName, model: modelId, latencyMs,
      success: newsParseSuccess,
      error: !newsParseSuccess ? `LLM O conteúdo retornado não pode ser analisado como um impacto válido nas notícias（comprimento original=${content.length}）` : null,
    },
  }
}

// ==================== Agent 3: Analisador de sentimento de opinião pública ====================

const SENTIMENT_SYSTEM_PROMPT = `Você é um especialista em análise de opinião em mídias sociais。Seu trabalho é quantificar o sentimento do mercado a partir de tópicos e discussões em alta。

Você deve gerar um JSON objeto，Incluir：
- overallSentiment: Pontuação geral de sentimento -1.0 chegar 1.0
- bullRatio: proporção longa 0-1
- bearRatio: proporção curta 0-1
- neutralRatio: proporção neutra 0-1（A soma dos três deve ser 1.0）
- hotTopics: Conjunto de tópicos importantes（maioria 10 individual）
- sentimentChange24h: 24Mudanças de humor de hora em hora -1.0 chegar 1.0
- herdingSignal: "none" | "moderate" | "extreme"（sinal de pastoreio）

Somente saída JSON objeto，Não adicione texto adicional。`

async function doExtractSentiment(
  factPool: FactPool,
  provider: StockAnalysisAIProvider,
  modelId: string,
): Promise<{ result: SentimentIndex | null; callLog: CallLog }> {
  const agentName = 'sentiment_analyzer'

  if (factPool.socialSentiment.length === 0) {
    return {
      result: null,
      callLog: { agent: agentName, model: modelId, latencyMs: 0, success: true, error: null },
    }
  }

  const sentimentText = factPool.socialSentiment
    .map((s) => `[${s.platform}/${s.sourceKind}] ${s.summary}; tópicos quentes: ${s.hotTopics.join(', ')}; relação longa/curta: muitos${s.overallBullBearRatio.bull}/nulo${s.overallBullBearRatio.bear}/meio${s.overallBullBearRatio.neutral}`)
    .join('\n')

  const userMsg = `Por favor, analise o sentimento do mercado dos seguintes dados de mídia social：\n\n${sentimentText}`
  const { content, latencyMs } = await callLLMChat(
    provider, modelId,
    SENTIMENT_SYSTEM_PROMPT,
    userMsg,
  )

  // Registro LLM Registro completo de chamadas
  saLog.llmCall({
    timestamp: new Date().toISOString(),
    module: 'extraction',
    model: modelId,
    providerId: provider.id,
    agentName,
    prompt: { system: SENTIMENT_SYSTEM_PROMPT, user: userMsg },
    response: content,
    latencyMs,
    success: true,
  })

  const parsed = extractJsonFromText<SentimentIndex>(content, 'object-first')
  let sentimentIndex: SentimentIndex | null = null
  if (parsed && typeof parsed.overallSentiment === 'number') {
    let bull = typeof parsed.bullRatio === 'number' ? parsed.bullRatio : 0.5
    let bear = typeof parsed.bearRatio === 'number' ? parsed.bearRatio : 0.3
    let neutral = typeof parsed.neutralRatio === 'number' ? parsed.neutralRatio : 0.2
    // [P2-14] Normalizar três ratio fazer e para 1.0
    const total = bull + bear + neutral
    if (total > 0 && Math.abs(total - 1.0) > 0.001) {
      bull /= total
      bear /= total
      neutral /= total
    }
    sentimentIndex = {
      overallSentiment: Math.max(-1, Math.min(1, parsed.overallSentiment)),
      bullRatio: bull,
      bearRatio: bear,
      neutralRatio: neutral,
      hotTopics: Array.isArray(parsed.hotTopics) ? parsed.hotTopics : [],
      sentimentChange24h: typeof parsed.sentimentChange24h === 'number' ? Math.max(-1, Math.min(1, parsed.sentimentChange24h)) : 0,
      herdingSignal: ['none', 'moderate', 'extreme'].includes(parsed.herdingSignal as string) ? parsed.herdingSignal as SentimentIndex['herdingSignal'] : 'none',
    }
  }

  // P2-B2: Distinguir entre sucesso de chamada e falha de análise
  const sentimentParseSuccess = sentimentIndex !== null
  return {
    result: sentimentIndex,
    callLog: {
      agent: agentName, model: modelId, latencyMs,
      success: sentimentParseSuccess,
      error: !sentimentParseSuccess ? `LLM O conteúdo retornado não pode ser analisado em um índice de sentimento válido（comprimento original=${content.length}）` : null,
    },
  }
}

// ==================== Função de entrada ====================

/**
 * correr LLM extração de informações（3 individual Agent Chamadas paralelas，modelos independentes + fallback）。
 *
 * cada Agent A lógica de seleção do modelo de：
 * 1. uso prioritário per-agent modelo configurado（extractionAgents em assignedModel）
 * 2. Se não estiver configurado, use o primeiro disponível provider O primeiro modelo de
 * 3. Quando a chamada do modelo principal falha，automático fallback para outro provider + model
 *
 * se AI Configuração não disponível（nenhum provider），então retorna silenciosamente um resultado vazio。
 */
export async function runLLMExtraction(
  _stockAnalysisDir: string,
  factPool: FactPool,
  aiConfig: StockAnalysisAIConfig,
): Promise<LLMExtractionResult> {
  // Verifique se algum está disponível provider
  const hasAnyProvider = aiConfig.providers.some(
    (p) => p.enabled && p.baseUrl && p.apiKey && p.models.length > 0,
  )
  if (!hasAnyProvider) {
    logger.warn('[llm-extraction] Nenhum disponível AI provider，pular sobre LLM extração de informações')
    saLog.warn('LLM-Extraction', 'Nenhum disponível AI provider，pular sobre LLM extração de informações')
    return {
      extractedAt: nowIso(),
      tradeDate: factPool.tradeDate,
      announcements: [],
      newsImpacts: [],
      sentimentIndex: null,
      llmCalls: [],
    }
  }

  /** por um único Agent cinto de corrida fallback extração */
  async function runAgentWithFallback<T>(
    agentId: LLMExtractionAgentId,
    callFn: (provider: StockAnalysisAIProvider, modelId: string) => Promise<{ result: T; callLog: CallLog }>,
    emptyResult: T,
  ): Promise<{ result: T; callLog: CallLog }> {
    const agentConfig = aiConfig.extractionAgents?.find((a) => a.agentId === agentId)
    if (agentConfig && !agentConfig.enabled) {
      logger.info(`[llm-extraction] Agent ${agentId} Desabilitado，pular sobre`)
      return {
        result: emptyResult,
        callLog: { agent: agentId, model: 'disabled', latencyMs: 0, success: true, error: null },
      }
    }

    const primary = pickPrimaryCandidate(agentId, aiConfig)
    if (!primary) {
      logger.warn(`[llm-extraction] Agent ${agentId} Nenhum modelo disponível`)
      return {
        result: emptyResult,
        callLog: { agent: agentId, model: 'none', latencyMs: 0, success: false, error: 'Nenhum modelo disponível' },
      }
    }

    const fallbacks = buildFallbackCandidates(aiConfig, primary.provider.id, primary.modelId)
    logger.info(
      `[llm-extraction] Agent ${agentId}: modelo mestre ${primary.provider.name}/${primary.modelId}`
      + (fallbacks.length > 0 ? `，alternativa ${fallbacks.length} individual` : ''),
      { module: 'StockAnalysis' },
    )

    return callWithFallback(agentId, primary, fallbacks, callFn, emptyResult)
  }

  const extractionStart = Date.now()
  saLog.info('LLM-Extraction', `A extração começa: tradeDate=${factPool.tradeDate} anúncio=${factPool.companyAnnouncements.length} política=${factPool.policyEvents.length} Notícias da indústria=${factPool.industryNews.length} opinião pública=${factPool.socialSentiment.length}`)

  // 3 extração Agent Correr em paralelo，independente fallback
  const [annResult, newsResult, sentResult] = await Promise.all([
    runAgentWithFallback(
      'announcement_parser',
      (provider, modelId) => doExtractAnnouncements(factPool, provider, modelId),
      [] as AnnouncementEvent[],
    ),
    runAgentWithFallback(
      'news_impact_analyzer',
      (provider, modelId) => doExtractNewsImpact(factPool, provider, modelId),
      [] as NewsImpactEvent[],
    ),
    runAgentWithFallback(
      'sentiment_analyzer',
      (provider, modelId) => doExtractSentiment(factPool, provider, modelId),
      null as SentimentIndex | null,
    ),
  ])

  const result: LLMExtractionResult = {
    extractedAt: nowIso(),
    tradeDate: factPool.tradeDate,
    announcements: annResult.result,
    newsImpacts: newsResult.result,
    sentimentIndex: sentResult.result,
    llmCalls: [annResult.callLog, newsResult.callLog, sentResult.callLog],
  }

  const successCount = result.llmCalls.filter((c) => c.success).length
  const extractionElapsed = Date.now() - extractionStart
  logger.info(`[llm-extraction] LLM Extração concluída: ${successCount}/3 sucesso, Evento de anúncio ${result.announcements.length}, impacto das notícias ${result.newsImpacts.length}`)
  saLog.info('LLM-Extraction', `Extração concluída: demorado=${extractionElapsed}ms sucesso=${successCount}/3 Evento de anúncio=${result.announcements.length} impacto das notícias=${result.newsImpacts.length} opinião pública=${result.sentimentIndex ? 'ter' : 'nenhum'}`)

  return result
}

export const _testing = {
  extractJsonFromText,
  pickPrimaryCandidate,
  buildFallbackCandidates,
  isUnsupportedCandidate,
  AGENT_FALLBACK_BUDGET_MS,
  LLM_CALL_TIMEOUT_MS,
}
