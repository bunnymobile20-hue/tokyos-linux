/**
 * sistema de memória especialista — Três camadas de memória para especialistas em gerenciamento、FactPool resumo、Retrato de especialista
 *
 * Responsabilidades：
 * 1. buildFactPoolSummary: de FactPool Extraia resumos de texto compactos（injeção user message）
 * 2. buildExpertProfile: Crie retratos de especialistas a partir de dados de desempenho（injeção system message）
 * 3. buildMemoryContext: Resumo do especialista em montagem/meio/texto de memória de longo prazo（injeção user message）
 * 4. runDailyMemoryUpdate: Atualizar memória após o expediente（Escreva a entrada de hoje、Resultados do dia de liquidação、LLM compressão média）
 */

import { logger } from '../../utils/logger'
import { saLog } from './sa-logger'
import { callProviderText } from './llm-provider-adapter'
import {
  readExpertDailyMemories,
  readExpertMemoryStore,
  getAvailableSignalDates,
  readStockAnalysisQuoteCache,
  readStockAnalysisSignals,
  readStockAnalysisExpertPerformance,
  saveExpertDailyMemories,
  saveStockAnalysisExpertPerformance,
  saveExpertMemoryStore,
  withFileLock,
  MAX_SHORT_TERM_DAYS,
} from './store'
import type {
  ExpertDailyMemoryEntry,
  ExpertLongTermMemory,
  ExpertMemory,
  ExpertMemoryStore,
  ExpertMidTermMemory,
  ExpertProfile,
  FactPool,
  FactPoolSummary,
  StockAnalysisAIConfig,
  StockAnalysisAIProvider,
  StockAnalysisExpertPerformanceData,
  StockAnalysisExpertPerformanceEntry,
  StockAnalysisSignal,
} from './types'

function calculateEntryCorrectness(entry: ExpertDailyMemoryEntry, actualReturn: number): boolean {
  return (entry.verdict === 'bullish' && actualReturn > 0)
    || (entry.verdict === 'bearish' && actualReturn < 0)
    || (entry.verdict === 'neutral' && Math.abs(actualReturn) < 0.5)
}

// ==================== FactPool resumo ====================

/** de FactPool Extraia resumos de texto compactos，para especialistas em injeção prompt（processamento de texto simples，zero LLM custo） */
export function buildFactPoolSummary(factPool: FactPool): FactPoolSummary {
  const macroSummary = buildMacroSummary(factPool)
  const policySummary = buildPolicySummary(factPool)
  const announcementHighlights = buildAnnouncementHighlights(factPool)
  const industryHighlights = buildIndustryHighlights(factPool)
  const sentimentSummary = buildSentimentSummary(factPool)
  const globalMarketSummary = buildGlobalMarketSummary(factPool)
  const moneyFlowSummary = buildMoneyFlowSummary(factPool)

  return { macroSummary, policySummary, announcementHighlights, industryHighlights, sentimentSummary, globalMarketSummary, moneyFlowSummary }
}

/**
 * estágio C：Construindo uma perspectiva de ações individual FactPool resumo。
 * - A seção de anúncios destaca apenas o anúncio da própria ação.，e complementar o importante anúncio geral como context
 * - A seção de notícias do setor destaca apenas notícias relacionadas ao setor ao qual a ação pertence.
 * - Outros campos（macro/política/opinião pública/mundialmente/fundos）Ainda compartilhado globalmente
 */
export function buildFactPoolSummaryForStock(
  factPool: FactPool,
  stockCode: string,
  sector: string | null | undefined,
): FactPoolSummary {
  const macroSummary = buildMacroSummary(factPool)
  const policySummary = buildPolicySummary(factPool)
  const announcementHighlights = buildAnnouncementHighlightsForStock(factPool, stockCode)
  const industryHighlights = buildIndustryHighlightsForStock(factPool, sector)
  const sentimentSummary = buildSentimentSummary(factPool)
  const globalMarketSummary = buildGlobalMarketSummary(factPool)
  const moneyFlowSummary = buildMoneyFlowSummary(factPool)

  return { macroSummary, policySummary, announcementHighlights, industryHighlights, sentimentSummary, globalMarketSummary, moneyFlowSummary }
}

function buildMacroSummary(factPool: FactPool): string | null {
  const m = factPool.macroData
  if (!m) return null

  const parts: string[] = []
  if (m.gdpGrowth !== null) parts.push(`GDPTaxa de crescimento${m.gdpGrowth}%`)
  if (m.cpi !== null) parts.push(`CPIAno após ano${m.cpi}%`)
  if (m.pmi !== null) parts.push(`PMI ${m.pmi}`)
  if (m.interestRate !== null) parts.push(`LPR ${m.interestRate}%`)
  if (m.exchangeRateUsdCny !== null) parts.push(`Dólar/RMB ${m.exchangeRateUsdCny.toFixed(2)}`)
  if (m.treasuryYield10y !== null) parts.push(`10Ydívida nacional ${m.treasuryYield10y.toFixed(2)}%`)

  return parts.length > 0 ? parts.join('，') : null
}

function buildPolicySummary(factPool: FactPool): string | null {
  const events = factPool.policyEvents
  if (events.length === 0) return null

  return events.slice(0, 3).map((e) => e.title).join('；')
}

function buildAnnouncementHighlights(factPool: FactPool): string[] {
  const items = factPool.companyAnnouncements
  if (items.length === 0) return []

  // Tenha prioridade major Anúncio importante
  const major = items.filter((a) => a.importance === 'major')
  const selected = major.length > 0 ? major : items
  return selected.slice(0, 5).map((a) => `${a.name}: ${a.title}`)
}

/**
 * estágio C：Anúncio exclusivo para ações individuais——Devolva primeiro os anúncios das próprias ações（marca「Estoque de capital」），
 * Se não for suficiente 5 tira，Adicionar outro major anúncio de nível（marca「situação geral」）。
 */
function buildAnnouncementHighlightsForStock(factPool: FactPool, stockCode: string): string[] {
  const items = factPool.companyAnnouncements
  if (items.length === 0) return []

  const normalize = (code: string) => code.replace(/^(sh|sz|bj)/i, '').trim()
  const targetCode = normalize(stockCode)

  const own: string[] = []
  const othersMajor: string[] = []

  for (const a of items) {
    const line = `${a.name}: ${a.title}`
    if (normalize(a.code) === targetCode) {
      own.push(`【Estoque de capital】${line}`)
    } else if (a.importance === 'major') {
      othersMajor.push(`【outro】${line}`)
    }
  }

  const combined = [...own]
  for (const entry of othersMajor) {
    if (combined.length >= 5) break
    combined.push(entry)
  }
  return combined
}

function buildIndustryHighlights(factPool: FactPool): string[] {
  const items = factPool.industryNews
  if (items.length === 0) return []

  return items.slice(0, 5).map((n) => n.title)
}

/**
 * estágio C：Notícias do setor exclusivas para ações individuais——Retorne primeiro sectors O campo contém novidades para este setor de ações（marca「indústria」），
 * Se não for suficiente 5 tira，Mais notícias（marca「Outras indústrias」）。
 */
function buildIndustryHighlightsForStock(factPool: FactPool, sector: string | null | undefined): string[] {
  const items = factPool.industryNews
  if (items.length === 0) return []

  const sectorKey = (sector ?? '').trim()
  if (!sectorKey) {
    return items.slice(0, 5).map((n) => n.title)
  }

  const own: string[] = []
  const others: string[] = []
  for (const n of items) {
    const match = (n.sectors ?? []).some((s) => s.includes(sectorKey) || sectorKey.includes(s))
    if (match) own.push(`【indústria】${n.title}`)
    else others.push(`【Outras indústrias】${n.title}`)
  }

  const combined = [...own]
  for (const entry of others) {
    if (combined.length >= 5) break
    combined.push(entry)
  }
  return combined
}

function buildSentimentSummary(factPool: FactPool): string | null {
  const primarySnapshots = factPool.socialSentiment.filter((snapshot) => snapshot.sourceKind === 'primary_sentiment')
  const snapshots = primarySnapshots.length > 0 ? primarySnapshots : factPool.socialSentiment
  if (snapshots.length === 0) return null

  // Pegue a proporção média de touros e ursos
  let totalBull = 0
  let totalBear = 0
  for (const s of snapshots) {
    totalBull += s.overallBullBearRatio.bull
    totalBear += s.overallBullBearRatio.bear
  }
  const avgBull = totalBull / snapshots.length
  const avgBear = totalBear / snapshots.length
  const ratio = avgBear > 0 ? (avgBull / avgBear).toFixed(1) : '∞'

  // Colete tópicos importantes（Remover duplicatas，maioria5individual）
  const topicsSet = new Set<string>()
  for (const s of snapshots) {
    for (const topic of s.hotTopics.slice(0, 3)) {
      topicsSet.add(topic)
      if (topicsSet.size >= 5) break
    }
    if (topicsSet.size >= 5) break
  }

  const sentiment = avgBull > avgBear ? 'Otimista' : avgBull < avgBear ? 'Mais pessimista' : 'neutro'
  const topicStr = topicsSet.size > 0 ? `，tópicos quentes: ${[...topicsSet].join('、')}` : ''
  return `sentimento do mercado${sentiment}，proporção touro-urso ${ratio}:1${topicStr}`
}

function buildGlobalMarketSummary(factPool: FactPool): string | null {
  const g = factPool.globalMarkets
  if (!g) return null

  const parts: string[] = []
  if (g.sp500Change !== null) parts.push(`S&P500 ${formatChange(g.sp500Change)}`)
  if (g.nasdaqChange !== null) parts.push(`Nasdaq ${formatChange(g.nasdaqChange)}`)
  if (g.hsiChange !== null) parts.push(`Índice Hang Seng ${formatChange(g.hsiChange)}`)
  if (g.a50FuturesChange !== null) parts.push(`A50futuros ${formatChange(g.a50FuturesChange)}`)
  if (g.crudeOilChange !== null) parts.push(`bruto ${formatChange(g.crudeOilChange)}`)
  if (g.goldChange !== null) parts.push(`ouro ${formatChange(g.goldChange)}`)

  return parts.length > 0 ? parts.join('，') : null
}

/** [H5] de FactPool Fluxo de retirada de fundos/Resumo do fluxo do setor */
function buildMoneyFlowSummary(factPool: FactPool): string | null {
  const extras = factPool.priceVolumeExtras
  if (!extras) return null

  const parts: string[] = []

  // entrada líquida de ações individuais TOP 3
  if (extras.moneyFlow.length > 0) {
    const top3 = extras.moneyFlow.slice(0, 3)
      .map((m) => `${m.name}(${m.mainNetInflow > 0 ? '+' : ''}${m.mainNetInflow.toFixed(0)}Dez mil)`)
      .join('、')
    parts.push(`Entrada líquida principal: ${top3}`)
  }

  // Fluxo de capital do setor TOP 3
  if (extras.sectorFlow.length > 0) {
    const top3 = extras.sectorFlow.slice(0, 3)
      .map((s) => `${s.sectorName}(${s.netInflow > 0 ? '+' : ''}${s.netInflow.toFixed(0)}Dez mil)`)
      .join('、')
    parts.push(`Fundos setoriais: ${top3}`)
  }

  // Lista de Dragão e Tigre
  if (extras.dragonTiger) {
    parts.push(`Lista de Dragão e Tigre ${extras.dragonTiger.stockCount} Somente na lista`)
  }

  // bloquear comércio
  if (extras.blockTrade) {
    parts.push(`bloquear comércio ${extras.blockTrade.tradeCount} Caneta`)
  }

  return parts.length > 0 ? parts.join('；') : null
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/** Vai FactPoolSummary Formatado para ser injetável prompt de Markdown texto */
export function formatFactPoolSummaryForPrompt(summary: FactPoolSummary): string {
  const lines: string[] = []

  if (summary.macroSummary) lines.push(`- macro: ${summary.macroSummary}`)
  if (summary.policySummary) lines.push(`- política: ${summary.policySummary}`)
  if (summary.announcementHighlights.length > 0) {
    lines.push(`- anúncio: ${summary.announcementHighlights.join('；')}`)
  }
  if (summary.industryHighlights.length > 0) {
    lines.push(`- indústria: ${summary.industryHighlights.join('；')}`)
  }
  if (summary.sentimentSummary) lines.push(`- opinião pública: ${summary.sentimentSummary}`)
  if (summary.globalMarketSummary) lines.push(`- mundialmente: ${summary.globalMarketSummary}`)
  if (summary.moneyFlowSummary) lines.push(`- fundos: ${summary.moneyFlowSummary}`)

  return lines.length > 0 ? lines.join('\n') : ''
}

// ==================== Retrato de especialista ====================

/** Crie retratos a partir de dados de desempenho de especialistas，para injeção system prompt */
export function buildExpertProfile(
  entry: StockAnalysisExpertPerformanceEntry,
): ExpertProfile {
  const recentStreak = computeRecentStreak(entry.recentOutcomes.map((o) => o.correct))

  return {
    expertId: entry.expertId,
    expertName: entry.expertName,
    predictionCount: entry.predictionCount,
    winRate: entry.winRate,
    avgConfidence: entry.averageConfidence,
    calibration: entry.calibration,
    bestMarketRegime: null,  // TODO: As estatísticas podem ser agrupadas com base no ambiente de mercado em versões subsequentes.
    worstMarketRegime: null,
    recentStreak,
  }
}

function computeRecentStreak(outcomes: boolean[]): string {
  if (outcomes.length === 0) return 'Ainda não há registro de previsão'

  const recent = outcomes.slice(0, 10)
  let streak = 0
  const firstResult = recent[0]

  for (const result of recent) {
    if (result === firstResult) {
      streak++
    } else {
      break
    }
  }

  const total = recent.length
  const correct = recent.filter(Boolean).length

  if (streak >= 3) {
    return firstResult
      ? `recente${streak}consecutivo correto（fechar${total}secundário${correct}vezes correto）`
      : `recente${streak}erros consecutivos（fechar${total}secundário${correct}vezes correto）`
  }

  return `fechar${total}na previsão${correct}vezes correto`
}

/** Formate retratos de especialistas para serem injetáveis prompt de Markdown texto */
export function formatExpertProfileForPrompt(profile: ExpertProfile): string {
  const lines: string[] = [
    `## seu desempenho histórico`,
    `- Número de previsões: ${profile.predictionCount}，taxa de vitórias: ${(profile.winRate * 100).toFixed(1)}%，Calibração: ${profile.calibration.toFixed(2)}`,
  ]

  if (profile.bestMarketRegime) lines.push(`- bom em: ${profile.bestMarketRegime}`)
  if (profile.worstMarketRegime) lines.push(`- insuficiente: ${profile.worstMarketRegime}`)
  lines.push(`- Recentemente: ${profile.recentStreak}`)

  return lines.join('\n')
}

// ==================== construção de contexto de memória ====================

/** Montando memória especializada para texto contextual（injeção user message） */
export function buildMemoryContext(memory: ExpertMemory | undefined): string {
  if (!memory) return ''

  const sections: string[] = []

  // memória de curto prazo
  if (memory.shortTerm.entries.length > 0) {
    sections.push(formatShortTermMemory(memory.shortTerm.entries))
  }

  // memória de médio prazo
  if (memory.midTerm) {
    sections.push(formatMidTermMemory(memory.midTerm))
  }

  // memória de longo prazo
  if (memory.longTerm) {
    const ltLines: string[] = []
    if (memory.longTerm.lessons.length > 0) {
      ltLines.push(`## lições de longo prazo`)
      for (const lesson of memory.longTerm.lessons.slice(0, 10)) {
        ltLines.push(`- ${lesson}`)
      }
    }
    if (memory.longTerm.strengths.length > 0) {
      ltLines.push(`## Bom ambiente de mercado`)
      for (const s of memory.longTerm.strengths.slice(0, 5)) {
        ltLines.push(`- ${s}`)
      }
    }
    if (memory.longTerm.weaknesses.length > 0) {
      ltLines.push(`## Não é bom no ambiente de mercado`)
      for (const w of memory.longTerm.weaknesses.slice(0, 5)) {
        ltLines.push(`- ${w}`)
      }
    }
    if (ltLines.length > 0) sections.push(ltLines.join('\n'))
  }

  return sections.join('\n\n')
}

function formatShortTermMemory(entries: ExpertDailyMemoryEntry[]): string {
  const lines: string[] = [`## Revisão de suas previsões de curto prazo（recente${entries.length}dia）`]

  for (const e of entries) {
    const verdictText = e.verdict === 'bullish' ? 'longo' : e.verdict === 'bearish' ? 'grosseiro' : 'neutro'
    let resultText = 'Para ser verificado'
    if (e.actualReturnNextDay !== null && e.wasCorrect !== null) {
      const sign = e.actualReturnNextDay >= 0 ? '+' : ''
      resultText = `real${sign}${e.actualReturnNextDay.toFixed(2)}% ${e.wasCorrect ? '✓' : '✗'}`
    }
    lines.push(`- ${e.tradeDate} [${e.code}]: ${verdictText}(confiança${e.confidence}) → ${resultText}`)
  }

  return lines.join('\n')
}

function formatMidTermMemory(midTerm: ExpertMidTermMemory): string {
  const lines: string[] = [
    `## Resumo intercalar（${midTerm.period.from} ~ ${midTerm.period.to}）`,
    `taxa de vitórias ${(midTerm.winRate * 100).toFixed(1)}%，confiança média ${midTerm.avgConfidence.toFixed(0)}，tendência${midTerm.dominantVerdict === 'bullish' ? 'longo' : midTerm.dominantVerdict === 'bearish' ? 'grosseiro' : 'neutro'}。`,
  ]

  if (midTerm.keyPatterns.length > 0) {
    lines.push(`regras principais: ${midTerm.keyPatterns.join('；')}`)
  }

  if (midTerm.summary) {
    lines.push(midTerm.summary)
  }

  return lines.join('\n')
}

// ==================== Atualização de memória após o expediente ====================

/**
 * Processo de atualização de memória após o expediente：
 * 1. Extraia votos de especialistas dos sinais do dia，escrever daily-memories
 * 2. Preencher o do dia anterior daily-memories（Calcule o lucro real usando o preço de fechamento do dia）
 * 3. renovar memory-store memória de curto prazo
 * 4. Se estouro de curto prazo → usar LLM Memória compactada para médio prazo
 */
export async function runDailyMemoryUpdate(
  stockAnalysisDir: string,
  tradeDate: string,
  aiConfig: StockAnalysisAIConfig,
): Promise<void> {
  const logTag = '[memory]'
  const startMs = Date.now()
  saLog.info('memory', `Iniciar atualização de memória após o expediente tradeDate=${tradeDate}`)

  try {
    // Step 1: Extraia votos de especialistas dos sinais do dia，escrever daily-memories
    const signals = await readStockAnalysisSignals(stockAnalysisDir, tradeDate)
    const todayEntries = extractMemoryEntriesFromSignals(signals, tradeDate)

    if (todayEntries.length > 0) {
      const settledEntries = await settleTradeDateResults(stockAnalysisDir, todayEntries, signals)
      await saveExpertDailyMemories(stockAnalysisDir, tradeDate, settledEntries)
      await syncExpertPerformanceFromDailyMemory(stockAnalysisDir, tradeDate, settledEntries)
      logger.info(`${logTag} Escreva e resolva ${settledEntries.length} Itens de memória do dia (${tradeDate})`, { module: 'StockAnalysis' })
    }

    // Step 3 & 4: renovar memory-store（curto prazo + compressão a médio prazo）
    await updateMemoryStore(stockAnalysisDir, tradeDate, aiConfig)

    const elapsedMs = Date.now() - startMs
    saLog.info('memory', `Atualização de memória após o expediente concluída tradeDate=${tradeDate} Entrada de hoje=${todayEntries.length} demorado=${elapsedMs}ms`)
    logger.info(`${logTag} Atualização de memória concluída (${tradeDate})`, { module: 'StockAnalysis' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'erro desconhecido'
    const elapsedMs = Date.now() - startMs
    saLog.error('memory', `Falha na atualização da memória após o expediente tradeDate=${tradeDate} demorado=${elapsedMs}ms erro=${msg}`)
    logger.error(`${logTag} Falha na atualização da memória: ${msg}`, { module: 'StockAnalysis' })
    // A falha na atualização da memória não deve bloquear o processo fora do expediente，Downgrade silencioso
  }
}

/** Extraia registros de previsão de todos os especialistas da lista de sinais */
function extractMemoryEntriesFromSignals(
  signals: StockAnalysisSignal[],
  tradeDate: string,
): ExpertDailyMemoryEntry[] {
  const entries: ExpertDailyMemoryEntry[] = []

  for (const signal of signals) {
    if (!signal.expert?.votes) continue

    for (const vote of signal.expert.votes) {
      entries.push({
        tradeDate,
        expertId: vote.expertId,
        expertName: vote.expertName,
        layer: vote.layer,
        code: signal.code,
        name: signal.name,
        verdict: vote.verdict,
        confidence: vote.confidence,
        reason: vote.reason,
        modelId: vote.modelId,
        providerId: vote.providerId,
        providerName: vote.providerName,
        assignedModelId: vote.assignedModelId,
        usedFallback: vote.usedFallback,
        actualReturnNextDay: null,
        wasCorrect: null,
      })
    }
  }

  return entries
}

/** Use o resultado de fechamento no dia da previsão para liquidar o dia daily-memories。 */
async function settleTradeDateResults(
  stockAnalysisDir: string,
  entries: ExpertDailyMemoryEntry[],
  signals: StockAnalysisSignal[],
): Promise<ExpertDailyMemoryEntry[]> {
  const changeMap = new Map<string, number>()
  for (const signal of signals) {
    const settledChange = signal.realtime?.changePercent ?? signal.snapshot.changePercent
    changeMap.set(signal.code, Number.isFinite(settledChange) ? settledChange : 0)
  }

  // usar quote cache Não concluído signals preço de fechamento das ações
  const missingCodes = new Set<string>()
  for (const entry of entries) {
    if (entry.actualReturnNextDay !== null) continue
    if (!changeMap.has(entry.code)) missingCodes.add(entry.code)
  }
  if (missingCodes.size > 0) {
    try {
      const quoteCache = await readStockAnalysisQuoteCache(stockAnalysisDir)
      if (quoteCache?.quotes) {
        for (const q of quoteCache.quotes) {
          if (missingCodes.has(q.code)) {
            changeMap.set(q.code, q.changePercent)
          }
        }
      }
        logger.info(`[memory] de quote cache Reabastecer ${missingCodes.size - [...missingCodes].filter((code) => !changeMap.has(code)).length} Dados de liquidação no mesmo dia`, { module: 'StockAnalysis' })
      } catch {
      // quote cache Faça downgrade silenciosamente quando não estiver disponível，Use apenas dados do sinal
    }
  }

  const nextEntries = entries.map((entry) => ({ ...entry }))
  let settled = 0
  for (const entry of nextEntries) {
    if (entry.actualReturnNextDay !== null) continue // Preenchido

    const actualReturn = changeMap.get(entry.code)
    if (actualReturn === undefined) continue

    entry.actualReturnNextDay = actualReturn
    // P2-C4: neutral Limite de correção reduzido — de 1% Mudar para 0.5%（A Flutuações médias diárias de estoque 1.5-2%，1% Causado por estar muito solto neutral A taxa de vitórias é artificialmente alta）
    entry.wasCorrect = calculateEntryCorrectness(entry, actualReturn)
    settled++
  }

  logger.info(`[memory] Povoado ${settled} Resultados de memória para o dia`, { module: 'StockAnalysis' })
  return nextEntries
}

async function syncExpertPerformanceFromDailyMemory(
  stockAnalysisDir: string,
  tradeDate: string,
  entries: ExpertDailyMemoryEntry[],
): Promise<void> {
  const settledEntries = entries.filter((entry) => entry.actualReturnNextDay !== null && entry.wasCorrect !== null)
  if (settledEntries.length === 0) return

  const existing = await readStockAnalysisExpertPerformance(stockAnalysisDir)
  const entryMap = new Map(existing.entries.map((entry) => [entry.expertId, { ...entry, recentOutcomes: [...entry.recentOutcomes] }]))

  for (const memoryEntry of settledEntries) {
    const predictionReturn = memoryEntry.actualReturnNextDay ?? 0
    const correct = Boolean(memoryEntry.wasCorrect)
    const performanceEntry = entryMap.get(memoryEntry.expertId)
    const outcomeKey = `${tradeDate}:${memoryEntry.code}:${memoryEntry.verdict}`

    const outcome = {
      tradeDate,
      code: memoryEntry.code,
      modelId: memoryEntry.modelId,
      providerId: memoryEntry.providerId,
      providerName: memoryEntry.providerName,
      assignedModelId: memoryEntry.assignedModelId,
      usedFallback: memoryEntry.usedFallback,
      verdict: memoryEntry.verdict,
      confidence: memoryEntry.confidence,
      actualReturnPercent: Number(predictionReturn.toFixed(4)),
      correct,
      source: 'daily_close' as const,
    }

    if (performanceEntry) {
      const alreadySynced = performanceEntry.recentOutcomes.some((item) => `${item.tradeDate}:${item.code}:${item.verdict}` === outcomeKey && item.source === 'daily_close')
      if (alreadySynced) continue

      performanceEntry.predictionCount += 1
      if (correct) performanceEntry.correctCount += 1
      performanceEntry.winRate = Number((performanceEntry.correctCount / performanceEntry.predictionCount).toFixed(4))
      performanceEntry.averageConfidence = Number((((performanceEntry.averageConfidence * (performanceEntry.predictionCount - 1)) + memoryEntry.confidence) / performanceEntry.predictionCount).toFixed(4))
      performanceEntry.calibration = Number(Math.abs(performanceEntry.averageConfidence / 100 - performanceEntry.winRate).toFixed(4))
      performanceEntry.lastPredictionDate = tradeDate
      performanceEntry.recentOutcomes = [outcome, ...performanceEntry.recentOutcomes].slice(0, 50)
    } else {
      entryMap.set(memoryEntry.expertId, {
        expertId: memoryEntry.expertId,
        expertName: memoryEntry.expertName ?? memoryEntry.expertId,
        layer: memoryEntry.layer ?? 'rule_functions',
        predictionCount: 1,
        correctCount: correct ? 1 : 0,
        winRate: correct ? 1 : 0,
        averageConfidence: memoryEntry.confidence,
        calibration: Number(Math.abs(memoryEntry.confidence / 100 - (correct ? 1 : 0)).toFixed(4)),
        weight: 1,
        lastPredictionDate: tradeDate,
        recentOutcomes: [outcome],
      })
    }
  }

  const updatedEntries = Array.from(entryMap.values()).map((entry) => {
    const baseWeight = entry.predictionCount < 5 ? 1 : 1.0 + (entry.winRate - 0.5) * 2.0
    const latestDate = entry.recentOutcomes[0]?.tradeDate
    const ageDays = latestDate ? Math.max(0, (Date.now() - new Date(latestDate).getTime()) / 86400000) : 0
    const decayFactor = Math.pow(2, -ageDays / 60)
    const weight = baseWeight * (0.5 + 0.5 * decayFactor)
    return {
      ...entry,
      weight: Number(Math.max(0.1, Math.min(2.0, weight)).toFixed(4)),
    }
  })

  await saveStockAnalysisExpertPerformance(stockAnalysisDir, {
    updatedAt: new Date().toISOString(),
    entries: updatedEntries,
  })
  logger.info(`[memory] Já ${settledEntries.length} Os resultados da liquidação do dia são sincronizados com expert-performance (${tradeDate})`, { module: 'StockAnalysis' })
}

function buildExpertPerformanceFromSettledEntries(entries: ExpertDailyMemoryEntry[]): StockAnalysisExpertPerformanceData {
  const entryMap = new Map<string, StockAnalysisExpertPerformanceEntry>()
  const dedupeKeys = new Set<string>()
  const sortedEntries = [...entries]
    .filter((entry) => entry.actualReturnNextDay !== null && entry.wasCorrect !== null)
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate))

  for (const memoryEntry of sortedEntries) {
    const dedupeKey = [
      memoryEntry.tradeDate,
      memoryEntry.code,
      memoryEntry.expertId,
      memoryEntry.verdict,
      memoryEntry.modelId ?? '',
      memoryEntry.providerId ?? '',
    ].join(':')
    if (dedupeKeys.has(dedupeKey)) continue
    dedupeKeys.add(dedupeKey)

    const predictionReturn = memoryEntry.actualReturnNextDay ?? 0
    const correct = Boolean(memoryEntry.wasCorrect)
    const performanceEntry = entryMap.get(memoryEntry.expertId)
    const outcome = {
      tradeDate: memoryEntry.tradeDate,
      code: memoryEntry.code,
      modelId: memoryEntry.modelId,
      providerId: memoryEntry.providerId,
      providerName: memoryEntry.providerName,
      assignedModelId: memoryEntry.assignedModelId,
      usedFallback: memoryEntry.usedFallback,
      verdict: memoryEntry.verdict,
      confidence: memoryEntry.confidence,
      actualReturnPercent: Number(predictionReturn.toFixed(4)),
      correct,
      source: 'daily_close' as const,
    }

    if (performanceEntry) {
      performanceEntry.predictionCount += 1
      if (correct) performanceEntry.correctCount += 1
      performanceEntry.averageConfidence = Number((((performanceEntry.averageConfidence * (performanceEntry.predictionCount - 1)) + memoryEntry.confidence) / performanceEntry.predictionCount).toFixed(4))
      performanceEntry.recentOutcomes = [outcome, ...performanceEntry.recentOutcomes].slice(0, 50)
      performanceEntry.lastPredictionDate = performanceEntry.lastPredictionDate.localeCompare(memoryEntry.tradeDate) >= 0
        ? performanceEntry.lastPredictionDate
        : memoryEntry.tradeDate
    } else {
      entryMap.set(memoryEntry.expertId, {
        expertId: memoryEntry.expertId,
        expertName: memoryEntry.expertName ?? memoryEntry.expertId,
        layer: memoryEntry.layer ?? 'rule_functions',
        predictionCount: 1,
        correctCount: correct ? 1 : 0,
        winRate: correct ? 1 : 0,
        averageConfidence: memoryEntry.confidence,
        calibration: Number(Math.abs(memoryEntry.confidence / 100 - (correct ? 1 : 0)).toFixed(4)),
        weight: 1,
        lastPredictionDate: memoryEntry.tradeDate,
        recentOutcomes: [outcome],
      })
    }
  }

  const updatedEntries = Array.from(entryMap.values()).map((entry) => {
    entry.winRate = Number((entry.correctCount / entry.predictionCount).toFixed(4))
    entry.calibration = Number(Math.abs(entry.averageConfidence / 100 - entry.winRate).toFixed(4))
    const latestDate = entry.recentOutcomes[0]?.tradeDate
    const ageDays = latestDate ? Math.max(0, (Date.now() - new Date(latestDate).getTime()) / 86400000) : 0
    const decayFactor = Math.pow(2, -ageDays / 60)
    const baseWeight = entry.predictionCount < 5 ? 1 : 1.0 + (entry.winRate - 0.5) * 2.0
    return {
      ...entry,
      weight: Number(Math.max(0.1, Math.min(2.0, baseWeight * (0.5 + 0.5 * decayFactor))).toFixed(4)),
    }
  })

  return {
    updatedAt: new Date().toISOString(),
    entries: updatedEntries,
  }
}

export async function rebuildExpertPerformanceFromSignals(stockAnalysisDir: string): Promise<StockAnalysisExpertPerformanceData> {
  const dates = await getAvailableSignalDates(stockAnalysisDir)
  const allSettledEntries: ExpertDailyMemoryEntry[] = []

  for (const tradeDate of dates) {
    const signals = await readStockAnalysisSignals(stockAnalysisDir, tradeDate)
    if (signals.length === 0) continue

    const entries = extractMemoryEntriesFromSignals(signals, tradeDate)
    if (entries.length === 0) continue

    const settledEntries = await settleTradeDateResults(stockAnalysisDir, entries, signals)
    const completeEntries = settledEntries.filter((entry) => entry.actualReturnNextDay !== null && entry.wasCorrect !== null)
    if (completeEntries.length === 0) continue

    await saveExpertDailyMemories(stockAnalysisDir, tradeDate, settledEntries)
    allSettledEntries.push(...completeEntries)
  }

  const rebuilt = buildExpertPerformanceFromSettledEntries(allSettledEntries)
  await saveStockAnalysisExpertPerformance(stockAnalysisDir, rebuilt)
  logger.info(`[memory] Já de signals reconstrução expert-performance：especialista=${rebuilt.entries.length} amostra=${allSettledEntries.length}`, { module: 'StockAnalysis' })
  return rebuilt
}

/** renovar memory-store：Integre a memória de curto prazo，quando necessário LLM compressão média */
/** [P2-24] Caminho do arquivo de armazenamento de memória，usado para withFileLock Impedir gravações simultâneas */
function memoryStoreLockKey(stockAnalysisDir: string): string {
  return `${stockAnalysisDir}/experts/memory-store.json`
}

async function updateMemoryStore(
  stockAnalysisDir: string,
  tradeDate: string,
  aiConfig: StockAnalysisAIConfig,
): Promise<void> {
  // [P2-24] usar withFileLock Proteger read-modify-write，Evite a substituição de dados durante chamadas simultâneas
  await withFileLock(memoryStoreLockKey(stockAnalysisDir), async () => {
  const store = await readExpertMemoryStore(stockAnalysisDir)

  // Carregado recentemente MAX_SHORT_TERM_DAYS+5 de Deus daily memories（Adicione alguns dias extras）
  const recentDates = getRecentTradeDates(tradeDate, MAX_SHORT_TERM_DAYS + 10)
  const allRecentEntries: ExpertDailyMemoryEntry[] = []

  for (const date of recentDates) {
    const entries = await readExpertDailyMemories(stockAnalysisDir, date)
    allRecentEntries.push(...entries)
  }

  // Grupo por especialistas
  const entriesByExpert = new Map<string, ExpertDailyMemoryEntry[]>()
  for (const entry of allRecentEntries) {
    const existing = entriesByExpert.get(entry.expertId) ?? []
    existing.push(entry)
    entriesByExpert.set(entry.expertId, existing)
  }

  // precisar LLM Especialista em compressão（estouro de memória de curto prazo）
  const needsCompression: Array<{ expertId: string; overflowEntries: ExpertDailyMemoryEntry[] }> = []

  // Atualize a memória de curto prazo de cada especialista
  for (const [expertId, entries] of entriesByExpert) {
    // Classificar por data decrescente（mais recente primeiro）
    entries.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))

    // Truncado por dia de negociação em vez de número fixo de barras（Corrigir análise diária >10 Erro de truncamento quando apenas ações）
    const uniqueDates = [...new Set(entries.map((e) => e.tradeDate))].sort((a, b) => b.localeCompare(a))
    const keepDates = new Set(uniqueDates.slice(0, MAX_SHORT_TERM_DAYS))
    const shortTermEntries = entries.filter((e) => keepDates.has(e.tradeDate))
    const overflowEntries = entries.filter((e) => !keepDates.has(e.tradeDate))

    if (!store.memories[expertId]) {
      store.memories[expertId] = {
        expertId,
        shortTerm: { entries: [] },
        midTerm: null,
        longTerm: null,
        updatedAt: new Date().toISOString(),
      }
    }

    store.memories[expertId].shortTerm.entries = shortTermEntries
    store.memories[expertId].updatedAt = new Date().toISOString()

    if (overflowEntries.length > 0) {
      needsCompression.push({ expertId, overflowEntries })
    }
  }

  // LLM Memória compactada de médio prazo（Se houver entradas excedentes）
  if (needsCompression.length > 0) {
    await compressMidTermMemories(store, needsCompression, aiConfig)
  }

  await saveExpertMemoryStore(stockAnalysisDir, store)
  }) // withFileLock end
}

/** usar LLM Comprimindo a memória de curto prazo transbordada em resumos de médio prazo */
async function compressMidTermMemories(
  store: ExpertMemoryStore,
  items: Array<{ expertId: string; overflowEntries: ExpertDailyMemoryEntry[] }>,
  aiConfig: StockAnalysisAIConfig,
): Promise<void> {
  // Encontre todos disponíveis LLM provider（usado para fallback corrente）
  const providers = findAllAvailableProviders(aiConfig)
  if (providers.length === 0) {
    logger.warn('[memory] Nenhum disponível LLM provider，Ignorar a compactação de memória de médio prazo', { module: 'StockAnalysis' })
    // Fallback para compressão estatística pura
    for (const { expertId, overflowEntries } of items) {
      store.memories[expertId].midTerm = buildStatisticalMidTermMemory(
        overflowEntries,
        store.memories[expertId].midTerm,
      )
    }
    return
  }

  for (const { expertId, overflowEntries } of items) {
    try {
      const compressed = await compressSingleExpertMidTerm(
        expertId,
        overflowEntries,
        store.memories[expertId].midTerm,
        providers,
      )
      store.memories[expertId].midTerm = compressed
      logger.info(`[memory] especialista ${expertId} memória de médio prazo LLM compressão（${overflowEntries.length} tira → resumo）`, { module: 'StockAnalysis' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'erro desconhecido'
      logger.warn(`[memory] especialista ${expertId} LLM Falha na compactação，Downgrade para compactação estatística: ${msg}`, { module: 'StockAnalysis' })
      store.memories[expertId].midTerm = buildStatisticalMidTermMemory(
        overflowEntries,
        store.memories[expertId].midTerm,
      )
    }
  }
}

/** Abordagem puramente estatística para construir memória de médio prazo（LLM Opções de downgrade em caso de indisponibilidade） */
function buildStatisticalMidTermMemory(
  entries: ExpertDailyMemoryEntry[],
  existing: ExpertMidTermMemory | null,
): ExpertMidTermMemory {
  const filledEntries = entries.filter((e) => e.wasCorrect !== null)
  const winCount = filledEntries.filter((e) => e.wasCorrect).length
  const winRate = filledEntries.length > 0 ? winCount / filledEntries.length : 0
  const avgConfidence = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
    : 50

  const verdictCounts = { bullish: 0, bearish: 0, neutral: 0 }
  for (const e of entries) verdictCounts[e.verdict]++
  const dominantVerdict = verdictCounts.bullish >= verdictCounts.bearish && verdictCounts.bullish >= verdictCounts.neutral
    ? 'bullish' as const
    : verdictCounts.bearish >= verdictCounts.neutral
      ? 'bearish' as const
      : 'neutral' as const

  const dates = entries.map((e) => e.tradeDate).sort()
  const period = {
    from: existing?.period.from ?? dates[0] ?? '',
    to: dates[dates.length - 1] ?? '',
  }

  // mesclar existente keyPatterns
  const keyPatterns = existing?.keyPatterns?.slice(0, 5) ?? []

  // [M12] média ponderada：Com base no tamanho da amostra，Evite regressão após múltiplas compressões 50%
  // P2-C3: deterioração da memória de médio prazo — Tamanho da amostra de dados antigos por 0.8 redução do fator de atenuação，Certifique-se de que os dados recentes recebam mais peso
  const DECAY_FACTOR = 0.8
  const newSampleCount = filledEntries.length || entries.length
  const rawExistingCount = existing ? (existing.sampleCount ?? 1) : 0
  const existingSampleCount = Math.round(rawExistingCount * DECAY_FACTOR) // Decompor pesos amostrais antigos
  const totalSampleCount = existingSampleCount + newSampleCount

  const mergedWinRate = existing && existingSampleCount > 0
    ? (existing.winRate * existingSampleCount + winRate * newSampleCount) / totalSampleCount
    : winRate
  const mergedAvgConfidence = existing && existingSampleCount > 0
    ? (existing.avgConfidence * existingSampleCount + avgConfidence * newSampleCount) / totalSampleCount
    : avgConfidence

  return {
    summary: existing?.summary ?? '',
    period,
    winRate: mergedWinRate,
    avgConfidence: mergedAvgConfidence,
    dominantVerdict,
    keyPatterns,
    compressedAt: new Date().toISOString(),
    sampleCount: totalSampleCount,
  }
}

/** usar LLM Comprimindo a memória excedente de um único especialista em um resumo intermediário */
async function compressSingleExpertMidTerm(
  expertId: string,
  overflowEntries: ExpertDailyMemoryEntry[],
  existingMidTerm: ExpertMidTermMemory | null,
  providers: Array<{ provider: StockAnalysisAIProvider; modelId: string }>,
): Promise<ExpertMidTermMemory> {
  const stats = buildStatisticalMidTermMemory(overflowEntries, existingMidTerm)

  // construir LLM compressão prompt
  const entrySummaries = overflowEntries.slice(0, 30).map((e) => {
    const verdictText = e.verdict === 'bullish' ? 'longo' : e.verdict === 'bearish' ? 'grosseiro' : 'neutro'
    const resultText = e.wasCorrect !== null
      ? (e.wasCorrect ? '✓correto' : '✗erro')
      : 'Para ser verificado'
    return `${e.tradeDate} [${e.code}] ${verdictText}(confiança${e.confidence}): ${e.reason} → ${resultText}`
  }).join('\n')

  const existingContext = existingMidTerm?.summary
    ? `\n\nResumo de memória de médio prazo existente（Precisa integrar atualizações）：\n${existingMidTerm.summary}`
    : ''

  const systemMsg = 'Você é um assistente de compactação de memória de análise de investimentos。Por favor, condense o seguinte registro de previsão em um resumo conciso da memória de médio prazo。'

  const userMsg = [
    `especialista ID: ${expertId}`,
    `estatísticas: taxa de vitórias ${(stats.winRate * 100).toFixed(1)}%, confiança média ${stats.avgConfidence.toFixed(0)}, tendência principal: ${stats.dominantVerdict}`,
    ``,
    `Registros de previsão que precisam ser compactados:`,
    entrySummaries,
    existingContext,
    ``,
    `Por favor, produza um parágrafo que não exceda 300 Resumo chinês da palavra，generalizar:`,
    `1. As principais tendências e resultados de previsão durante este período`,
    `2. Descubra padrões e padrões（como：Em que circunstâncias o julgamento é preciso?/Erro）`,
    `3. Principais lições que vale a pena lembrar`,
    ``,
    `Por favor, retorne enquanto isso 2-5 regras principais（keyPatterns），Cada item não excede 20 Personagem。`,
    ``,
    `Por favor, siga rigorosamente o seguinte JSON Retorno de formato:`,
    '```json',
    `{`,
    `  "summary": "texto de resumo",`,
    `  "keyPatterns": ["lei1", "lei2"]`,
    `}`,
    '```',
  ].join('\n')

  const content = await callMemoryLLM(
    providers,
    [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
    `especialista ${expertId} compressão a médio prazo`,
  )

  const parsed = parseCompressionResponse(content)

  return {
    summary: parsed.summary || stats.summary,
    period: stats.period,
    winRate: stats.winRate,
    avgConfidence: stats.avgConfidence,
    dominantVerdict: stats.dominantVerdict,
    keyPatterns: parsed.keyPatterns.length > 0 ? parsed.keyPatterns : stats.keyPatterns,
    compressedAt: new Date().toISOString(),
    sampleCount: stats.sampleCount,
  }
}

function parseCompressionResponse(content: string): { summary: string; keyPatterns: string[] } {
  // Tente analisar diretamente
  try {
    const raw = JSON.parse(content)
    return {
      summary: String(raw.summary ?? '').slice(0, 500),
      keyPatterns: Array.isArray(raw.keyPatterns) ? raw.keyPatterns.map(String).slice(0, 5) : [],
    }
  } catch {
    // tente começar de code block extrair
  }

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const raw = JSON.parse(jsonMatch[1].trim())
      return {
        summary: String(raw.summary ?? '').slice(0, 500),
        keyPatterns: Array.isArray(raw.keyPatterns) ? raw.keyPatterns.map(String).slice(0, 5) : [],
      }
    } catch {
      // continuar
    }
  }

  // revelar todos os detalhes：todo o parágrafo como summary
  return { summary: content.slice(0, 500), keyPatterns: [] }
}

/** de aiConfig Encontre o primeiro disponível provider + model */
function findAvailableProvider(
  aiConfig: StockAnalysisAIConfig,
): { provider: StockAnalysisAIProvider; modelId: string } | null {
  const all = findAllAvailableProviders(aiConfig)
  return all.length > 0 ? all[0] : null
}

/** de aiConfig Encontre todos disponíveis provider + model（usado para fallback corrente） */
function findAllAvailableProviders(
  aiConfig: StockAnalysisAIConfig,
): Array<{ provider: StockAnalysisAIProvider; modelId: string }> {
  const result: Array<{ provider: StockAnalysisAIProvider; modelId: string }> = []
  for (const provider of aiConfig.providers) {
    if (!provider.enabled || !provider.apiKey) continue
    if (provider.models.length > 0) {
      result.push({ provider, modelId: provider.models[0] })
    }
  }
  return result
}

/** memória geral LLM chamar，Apoie muitos provider fallback */
async function callMemoryLLM(
  providers: Array<{ provider: StockAnalysisAIProvider; modelId: string }>,
  messages: Array<{ role: string; content: string }>,
  label: string,
): Promise<string> {
  const systemMsg = messages.find((message) => message.role === 'system')?.content ?? ''
  const userMsg = messages.find((message) => message.role === 'user')?.content ?? ''

  for (let i = 0; i < providers.length; i++) {
    const { provider, modelId } = providers[i]
    try {
      const data = await callProviderText({
        provider,
        modelId,
        messages,
        // [P2-23] certificar-se max_tokens Valor mínimo garantido（Pelo menos 512），Evite ser muito pequeno e fazer com que a saída fique truncada
        maxTokens: Math.max(512, Math.min(provider.maxTokens ?? 2000, 4096)),
        temperature: 0.3,
        userAgent: 'ClawOS/StockAnalysis Memory',
        timeoutMs: 60_000,
      })
      const content = data.content.trim()
      if (!content) throw new Error('LLM Retornar conteúdo vazio')

      // Registro LLM Registro completo de chamadas
      saLog.llmCall({
        timestamp: new Date().toISOString(),
        module: 'memory',
        model: modelId,
        providerId: provider.id,
        agentName: label,
        prompt: { system: systemMsg, user: userMsg },
        response: content,
        latencyMs: data.latencyMs,
        tokens: data.usage ? {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens,
        } : undefined,
        success: true,
      })

      return content
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'erro desconhecido'

      // não consegui gravar LLM registro de chamadas
      saLog.llmCall({
        timestamp: new Date().toISOString(),
        module: 'memory',
        model: modelId,
        providerId: provider.id,
        agentName: label,
        prompt: { system: systemMsg, user: userMsg },
        response: null,
        latencyMs: 0,
        success: false,
        error: msg,
      })

      if (i < providers.length - 1) {
        logger.warn(`[memory] ${label} provider ${provider.name || modelId} falhar (${msg})，tente a seguir`, { module: 'StockAnalysis' })
      } else {
        throw new Error(`todos ${providers.length} individual provider Tudo falhou，最后erro: ${msg}`)
      }
    }
  }
  throw new Error('Nenhum disponível provider')
}

// Ferramenta de calendário de negociação de trading-calendar.ts importar
import { getRecentTradeDates } from './trading-calendar'

// ==================== construção de memória de longo prazo ====================

/** São necessárias pelo menos várias compressões intermediárias para construir memória de longo prazo */
const MIN_MID_TERM_COMPRESSIONS_FOR_LONG_TERM = 1

/**
 * [H4] Atualização mensal da memória de longo prazo：Percorra todos os especialistas com memória de médio prazo，
 * usar LLM Agregando lições de longo prazo da memória de médio prazo/Vantagens/Desvantagens；LLM Downgrade para extração pura de estatísticas quando indisponível。
 *
 * Hora de ligar：Depois que o relatório mensal for gerado（generateMonthlyReport）
 */
export async function runLongTermMemoryUpdate(
  stockAnalysisDir: string,
  aiConfig: StockAnalysisAIConfig,
): Promise<void> {
  const logTag = '[memory:long-term]'
  const startMs = Date.now()
  saLog.info('memory', 'Inicie a atualização da memória de longo prazo')

  try {
    // [P2-24] usar withFileLock Proteger read-modify-write
    await withFileLock(memoryStoreLockKey(stockAnalysisDir), async () => {
      const store = await readExpertMemoryStore(stockAnalysisDir)
      let updated = 0

      for (const [expertId, memory] of Object.entries(store.memories)) {
        if (!memory.midTerm) continue
        // A memória de médio prazo precisa ser pelo menos comprimida 1 Segunda categoria（ter compressedAt）Vale a pena construir um longo prazo
        if (!memory.midTerm.compressedAt) continue

        try {
          const longTerm = await buildLongTermForExpert(
            expertId,
            memory,
            aiConfig,
          )
          if (longTerm) {
            store.memories[expertId].longTerm = longTerm
            store.memories[expertId].updatedAt = new Date().toISOString()
            updated++
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'erro desconhecido'
          logger.warn(`${logTag} especialista ${expertId} A construção da memória de longo prazo falhou: ${msg}`, { module: 'StockAnalysis' })
        }
      }

      if (updated > 0) {
        store.updatedAt = new Date().toISOString()
        await saveExpertMemoryStore(stockAnalysisDir, store)
        const elapsedMs = Date.now() - startMs
        saLog.info('memory', `Atualização de memória de longo prazo concluída Atualizar número de especialistas=${updated} demorado=${elapsedMs}ms`)
        logger.info(`${logTag} Memória de longo prazo atualizada，${updated} especialistas`, { module: 'StockAnalysis' })
      } else {
        const elapsedMs = Date.now() - startMs
        saLog.info('memory', `A memória de longo prazo não precisa ser atualizada（Não há especialistas qualificados） demorado=${elapsedMs}ms`)
        logger.info(`${logTag} Não há necessidade de atualizar a memória de longo prazo（Não há especialistas qualificados）`, { module: 'StockAnalysis' })
      }
    }) // withFileLock end
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'erro desconhecido'
    const elapsedMs = Date.now() - startMs
    saLog.error('memory', `Falha na atualização da memória de longo prazo demorado=${elapsedMs}ms erro=${msg}`)
    logger.error(`${logTag} Falha no processo de atualização da memória de longo prazo: ${msg}`, { module: 'StockAnalysis' })
    // A falha na atualização da memória de longo prazo não bloqueia o processo de relatório mensal
  }
}

/** Construído para um único especialista/Atualizar a memória de longo prazo */
async function buildLongTermForExpert(
  expertId: string,
  memory: ExpertMemory,
  aiConfig: StockAnalysisAIConfig,
): Promise<ExpertLongTermMemory | null> {
  const midTerm = memory.midTerm
  if (!midTerm) return null

  const providers = findAllAvailableProviders(aiConfig)
  if (providers.length > 0) {
    return buildLongTermWithLLM(expertId, memory, providers)
  }

  // LLM Não disponível → Downgrade para extração estatística pura
  return buildLongTermStatistical(expertId, memory)
}

/** LLM maneira de construir memória de longo prazo */
async function buildLongTermWithLLM(
  expertId: string,
  memory: ExpertMemory,
  providers: Array<{ provider: StockAnalysisAIProvider; modelId: string }>,
): Promise<ExpertLongTermMemory> {
  const existing = memory.longTerm
  const midTerm = memory.midTerm!

  // Construir contexto
  const contextParts: string[] = [
    `especialista ID: ${expertId}`,
    `estatísticas provisórias: taxa de vitórias ${(midTerm.winRate * 100).toFixed(1)}%, confiança média ${midTerm.avgConfidence.toFixed(0)}, tendência principal ${midTerm.dominantVerdict}`,
    `período de tempo: ${midTerm.period.from} ~ ${midTerm.period.to}`,
  ]

  if (midTerm.summary) {
    contextParts.push(`\nresumo provisório:\n${midTerm.summary}`)
  }
  if (midTerm.keyPatterns.length > 0) {
    contextParts.push(`\nregras principais:\n${midTerm.keyPatterns.map((p) => `- ${p}`).join('\n')}`)
  }

  // Representações recentes na memória de curto prazo
  const recentEntries = memory.shortTerm.entries.filter((e) => e.wasCorrect !== null)
  if (recentEntries.length > 0) {
    const recentWins = recentEntries.filter((e) => e.wasCorrect).length
    contextParts.push(`\ndesempenho recente: ${recentEntries.length} na previsão ${recentWins} vezes correto (${(recentWins / recentEntries.length * 100).toFixed(1)}%)`)
  }

  if (existing) {
    contextParts.push(`\nTenha memória de longo prazo（Precisa integrar atualizações）:`)
    if (existing.lessons.length > 0) contextParts.push(`lição: ${existing.lessons.join('；')}`)
    if (existing.strengths.length > 0) contextParts.push(`bom em: ${existing.strengths.join('；')}`)
    if (existing.weaknesses.length > 0) contextParts.push(`insuficiente: ${existing.weaknesses.join('；')}`)
  }

  const systemMsg = 'Você é um sistema de memória de análise de investimentos。Extraia lições de longo prazo e preferências do ambiente de mercado das memórias de médio prazo dos especialistas。'

  const userMsg = [
    ...contextParts,
    ``,
    `Extraia o seguinte conteúdo:`,
    `1. lessons: 5-10lições básicas（Cada item não excede30Personagem，como"A taxa de vitórias de perseguir o avanço após um grande volume é alta."）`,
    `2. strengths: 2-5Bom ambiente de mercado（como"Estratégia de compra baixa em um mercado volátil"）`,
    `3. weaknesses: 2-5Ambiente de mercado em que o artigo não é bom（como"É fácil comprar o fundo do poço muito cedo em uma queda acentuada"）`,
    ``,
    `Por favor, siga rigorosamente o seguinte JSON Retorno de formato:`,
    '```json',
    `{`,
    `  "lessons": ["lição1", "lição2"],`,
    `  "strengths": ["bom em1", "bom em2"],`,
    `  "weaknesses": ["insuficiente1", "insuficiente2"]`,
    `}`,
    '```',
  ].join('\n')

  try {
    const content = await callMemoryLLM(
      providers,
      [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg },
      ],
      `especialista ${expertId} memória de longo prazo`,
    )

    const parsed = parseLongTermResponse(content)

    // Mesclar com a memória de longo prazo existente para remover duplicatas
    return mergeLongTermMemory(existing, parsed)
  } catch (error) {
    logger.warn(`[memory:long-term] LLM Falha na compilação，Downgrade para extração de estatísticas: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
    return buildLongTermStatistical(expertId, memory)
  }
}

/** analisar LLM memória de longo prazo JSON */
function parseLongTermResponse(content: string): ExpertLongTermMemory {
  const empty: ExpertLongTermMemory = { lessons: [], strengths: [], weaknesses: [], updatedAt: new Date().toISOString() }

  const tryParse = (text: string): ExpertLongTermMemory | null => {
    try {
      const raw = JSON.parse(text)
      return {
        lessons: Array.isArray(raw.lessons) ? raw.lessons.map(String).slice(0, 20) : [],
        strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).slice(0, 10) : [],
        weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses.map(String).slice(0, 10) : [],
        updatedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  // Tente analisar diretamente
  const direct = tryParse(content)
  if (direct) return direct

  // tente começar de code block extrair
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    const extracted = tryParse(jsonMatch[1].trim())
    if (extracted) return extracted
  }

  return empty
}

/** Mesclar memória antiga e nova de longo prazo，Remover duplicatas，Truncar para o limite superior */
function mergeLongTermMemory(
  existing: ExpertLongTermMemory | null,
  incoming: ExpertLongTermMemory,
): ExpertLongTermMemory {
  if (!existing) return incoming

  const dedup = (arr: string[], max: number): string[] => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const item of arr) {
      const normalized = item.trim()
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized)
        result.push(normalized)
      }
      if (result.length >= max) break
    }
    return result
  }

  return {
    // novo primeiro，O velho vem por último（LLM O conteúdo antigo foi integrado，Mas as entradas antigas são garantidamente mantidas）
    lessons: dedup([...incoming.lessons, ...existing.lessons], 20),
    strengths: dedup([...incoming.strengths, ...existing.strengths], 10),
    weaknesses: dedup([...incoming.weaknesses, ...existing.weaknesses], 10),
    updatedAt: new Date().toISOString(),
  }
}

/** Construindo memória de longo prazo usando métodos puramente estatísticos（LLM Opções de downgrade em caso de indisponibilidade） */
function buildLongTermStatistical(
  expertId: string,
  memory: ExpertMemory,
): ExpertLongTermMemory {
  const existing = memory.longTerm
  const midTerm = memory.midTerm

  const lessons: string[] = existing?.lessons.slice(0, 15) ?? []
  const strengths: string[] = existing?.strengths.slice(0, 8) ?? []
  const weaknesses: string[] = existing?.weaknesses.slice(0, 8) ?? []

  // da memória de médio prazo keyPatterns extrair lições
  if (midTerm?.keyPatterns) {
    for (const pattern of midTerm.keyPatterns) {
      if (!lessons.includes(pattern)) {
        lessons.push(pattern)
      }
    }
  }

  // Extrapolando vantagens de estatísticas provisórias/Desvantagens
  if (midTerm) {
    if (midTerm.winRate >= 0.6) {
      const note = `${midTerm.period.from}~${midTerm.period.to}Taxa de ganhos durante o período${(midTerm.winRate * 100).toFixed(0)}%`
      if (!strengths.some((s) => s.includes(midTerm.period.from))) {
        strengths.push(note)
      }
    } else if (midTerm.winRate < 0.4) {
      const note = `${midTerm.period.from}~${midTerm.period.to}Durante o período, a taxa de vitórias foi de apenas${(midTerm.winRate * 100).toFixed(0)}%`
      if (!weaknesses.some((w) => w.includes(midTerm.period.from))) {
        weaknesses.push(note)
      }
    }
  }

  return {
    lessons: lessons.slice(0, 20),
    strengths: strengths.slice(0, 10),
    weaknesses: weaknesses.slice(0, 10),
    updatedAt: new Date().toISOString(),
  }
}

// ==================== Exportar funções internas para teste ====================

export const _testing = {
  buildMacroSummary,
  buildPolicySummary,
  buildAnnouncementHighlights,
  buildAnnouncementHighlightsForStock,
  buildIndustryHighlights,
  buildIndustryHighlightsForStock,
  buildSentimentSummary,
  buildGlobalMarketSummary,
  buildMoneyFlowSummary,
  formatChange,
  computeRecentStreak,
  formatShortTermMemory,
  formatMidTermMemory,
  extractMemoryEntriesFromSignals,
  buildStatisticalMidTermMemory,
  getRecentTradeDates,
  parseCompressionResponse,
  parseLongTermResponse,
  mergeLongTermMemory,
  buildLongTermStatistical,
  settleTradeDateResults,
  buildExpertPerformanceFromSettledEntries,
}
