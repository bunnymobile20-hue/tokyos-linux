import type {
  MarketRegime,
  StockAnalysisMarketState,
  StockAnalysisOverview,
  StockAnalysisSignal,
  StockAnalysisStrategyConfig,
  StockAnalysisTradeRecord,
} from './types'

function deriveMarketRegime(marketState: StockAnalysisMarketState): MarketRegime {
  if (marketState.trend === 'bull_trend') return 'bull_trend'
  if (marketState.trend === 'bear_trend') return 'bear_trend'
  if (marketState.volatility === 'high_volatility') return 'high_volatility'
  if (marketState.volatility === 'low_volatility') return 'low_volatility_range'
  return 'normal_range'
}

export interface DailyAdviceItem {
  type: 'buy' | 'sell' | 'watch' | 'swap'
  title: string
  code: string | null
  score?: number
  summary: string
  bullets: string[]
}

export interface DailyAdviceSummary {
  positionUsageLabel: string
  sells: DailyAdviceItem[]
  buys: DailyAdviceItem[]
  watches: DailyAdviceItem[]
  swaps: DailyAdviceItem[]
  stats: {
    analyzed: number
    passed: number
    watched: number
    summaryText: string
  }
}

export interface WeeklyDashboardSummary {
  winRate: number
  profitLossRatio: number
  weeklyReturn: number
  cumulativeReturn: number
  maxDrawdown: number
  sharpeLike: number
  watchAccuracy: number
  tradeCount: number
  watchDays: number
  bestGroup: string | null
  worstGroup: string | null
  overrideWinRate: number | null
  overrideAvgReturn: number | null
  overrideCount: number
  alerts: string[]
  tuningSuggestions: string[]
}

export interface BehaviorProfileSummary {
  executionRate: number
  ignoreRate: number
  rejectRate: number
  overrideRate: number
  watchRate: number
  disciplineScore: number
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator
}

export function formatModelGroupLabel(group: string, displayName?: string) {
  if (displayName) return displayName
  switch (group) {
    case 'rules': return 'Grupo de funções de regras'
    case 'rule-engine': return 'Grupo de funções de regras'
    case 'rule-fallback': return 'inferência rebaixada'
    default: return group
  }
}

export function buildDailyAdviceSummary(overview: StockAnalysisOverview): DailyAdviceSummary {
  const passingSignals = overview.topSignals.filter((signal) => signal.action === 'strong_buy' || signal.action === 'buy')
  const watchSignals = overview.topSignals.filter((signal) => signal.action === 'watch')

  // Sinal de venda reativo（parar a perda/Obtenha lucro/Reduzir posições/maturidade）
  const reactiveSells = overview.positions
    .filter((position) => position.action === 'stop_loss' || position.action === 'take_profit' || position.action === 'reduce' || position.action === 'review')
    .map<DailyAdviceItem>((position) => ({
      type: 'sell',
      title: position.name,
      code: position.code,
      summary: position.actionReason,
      bullets: [
        `Lucro atual ${position.returnPercent.toFixed(2)}%`,
        `Nível de stop loss ${position.stopLossPrice.toFixed(2)}`,
        `Nível de lucro ${position.takeProfitPrice1.toFixed(2)} / ${position.takeProfitPrice2.toFixed(2)}`,
      ],
    }))

  // Sinal de venda ativo（A avaliação da posição descobriu que a pontuação caiu ou ficou curta）
  const proactiveSells = (overview.positionEvaluations ?? [])
    .filter((evaluation) => evaluation.sellRecommended)
    .filter((evaluation) => !reactiveSells.some((item) => item.code === evaluation.code))
    .map<DailyAdviceItem>((evaluation) => ({
      type: 'sell',
      title: `${evaluation.name}（Tome a iniciativa de vender）`,
      code: evaluation.code,
      summary: evaluation.sellReasonText,
      bullets: [
        `Compre pontos básicos ${evaluation.buyCompositeScore}，Pontuação base atual ${evaluation.currentCompositeScore}（${evaluation.scoreDelta > 0 ? '+' : ''}${evaluation.scoreDelta}）`,
        `Consenso de especialistas ${evaluation.expertConsensus.toFixed(2)}${evaluation.technicalBreakdown ? '，Tecnicamente quebrado' : ''}`,
        ...evaluation.reasoning.slice(0, 1),
      ],
    }))

  const sellSignals = [...reactiveSells, ...proactiveSells]

  // Sugestões para mudança de posição
  const swapItems = (overview.swapSuggestions ?? []).map<DailyAdviceItem>((swap) => ({
    type: 'swap',
    title: `${swap.sellName} → ${swap.buyName}`,
    code: swap.buyCode,
    score: swap.buyFinalScore,
    summary: `Vantagens de trocar de posição +${swap.scoreDifference} apontar`,
    bullets: [
      `vender ${swap.sellName}（atual ${swap.sellCurrentScore} apontar）`,
      `comprar ${swap.buyName}（${swap.buyFinalScore} apontar）`,
      swap.reasoning,
    ],
  }))

  const buyItems = passingSignals.slice(0, 3).map<DailyAdviceItem>((signal) => ({
    type: 'buy',
    title: signal.name,
    code: signal.code,
    score: signal.finalScore,
    summary: `Posições recomendadas ${Math.round(signal.suggestedPosition * 100)}%，Preço sugerido ${signal.suggestedPriceRange.min.toFixed(2)}-${signal.suggestedPriceRange.max.toFixed(2)}`,
    bullets: [
      `Consenso de especialistas ${signal.expert.consensus.toFixed(2)}（longo ${signal.expert.bullishCount} / grosseiro ${signal.expert.bearishCount}）`,
      `Pontos técnicos ${signal.technical.total}，Pontuação quantitativa ${signal.quant.total}`,
      ...signal.passingChecks.slice(0, 2),
    ],
  }))

  const watchItems = watchSignals.slice(0, 3).map<DailyAdviceItem>((signal) => ({
    type: 'watch',
    title: signal.name,
    code: signal.code,
    score: signal.finalScore,
    summary: signal.watchReasons[0] ?? 'Não alcançado Conviction Filter Limite de compra',
    bullets: signal.watchReasons.length > 0 ? signal.watchReasons.slice(0, 3) : ['Evidência insuficiente，Recomenda-se continuar esperando e ver'],
  }))

  const summaryParts = [
    sellSignals.length > 0 ? `vender ${sellSignals.length} Caneta` : null,
    swapItems.length > 0 ? `Posições de câmbio ${swapItems.length} Caneta` : null,
    buyItems.length > 0 ? `comprar ${buyItems.length} Caneta` : null,
    `espere e veja ${Math.max(watchSignals.length, overview.stats.candidatePoolSize - passingSignals.length)} Apenas`,
  ].filter(Boolean)

  return {
    positionUsageLabel: `${overview.positions.length}/${overview.stats.maxPositions ?? 3} Apenas`,
    sells: sellSignals,
    buys: buyItems,
    watches: watchItems,
    swaps: swapItems,
    stats: {
      analyzed: overview.stats.candidatePoolSize,
      passed: passingSignals.length,
      watched: Math.max(watchSignals.length, overview.stats.candidatePoolSize - passingSignals.length),
      summaryText: summaryParts.join(' + '),
    },
  }
}

function calculateProfitLossRatio(trades: StockAnalysisTradeRecord[]) {
  const sellTrades = trades.filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
  const profitValues = sellTrades.map((trade) => trade.pnlPercent ?? 0).filter((value) => value > 0)
  const lossValues = sellTrades.map((trade) => trade.pnlPercent ?? 0).filter((value) => value < 0).map(Math.abs)
  return safeDivide(average(profitValues), average(lossValues))
}

function calculateSharpeLike(trades: StockAnalysisTradeRecord[]) {
  const returns = trades
    .filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
    .map((trade) => trade.pnlPercent ?? 0)
  const avg = average(returns)
  const variance = average(returns.map((value) => (value - avg) ** 2))
  return variance === 0 ? 0 : avg / Math.sqrt(variance)
}

function calculateWatchAccuracy(overview: StockAnalysisOverview) {
  const watchLogs = overview.watchLogs
  if (watchLogs.length === 0) {
    return 0
  }
  const correctCount = watchLogs.filter((item) => item.highestSignalScore < 75).length
  return safeDivide(correctCount, watchLogs.length)
}

export function buildWeeklyDashboardSummary(overview: StockAnalysisOverview, config: StockAnalysisStrategyConfig | null): WeeklyDashboardSummary {
  if (overview.performanceDashboard) {
    const bestGroup = overview.performanceDashboard.bestModelGroup
    const worstGroup = overview.performanceDashboard.worstModelGroup
    const latestWeek = overview.weeklySummary[0]
    return {
      winRate: latestWeek?.winRate ?? overview.stats.winRate,
      profitLossRatio: latestWeek?.averageProfitLossRatio ?? calculateProfitLossRatio(overview.recentTrades),
      weeklyReturn: latestWeek?.weeklyReturn ?? overview.stats.weeklyReturn,
      cumulativeReturn: overview.stats.cumulativeReturn,
      maxDrawdown: overview.stats.maxDrawdown,
      sharpeLike: overview.performanceDashboard.sharpeLike,
      watchAccuracy: overview.performanceDashboard.watchAccuracy,
      tradeCount: latestWeek?.tradeCount ?? overview.recentTrades.length,
      watchDays: latestWeek?.watchDays ?? overview.watchLogs.length,
      bestGroup: bestGroup ? formatModelGroupLabel(bestGroup) : null,
      worstGroup: worstGroup ? formatModelGroupLabel(worstGroup) : null,
      overrideWinRate: overview.performanceDashboard.overrideStats?.totalCount
        ? overview.performanceDashboard.overrideStats.winRate : null,
      overrideAvgReturn: overview.performanceDashboard.overrideStats?.totalCount
        ? overview.performanceDashboard.overrideStats.averageReturn : null,
      overrideCount: overview.performanceDashboard.overrideStats?.totalCount ?? 0,
      alerts: overview.performanceDashboard.alerts,
      tuningSuggestions: overview.performanceDashboard.tuningSuggestions,
    }
  }

  const latestWeek = overview.weeklySummary[0]
  const bestGroup = [...overview.modelGroupPerformance].sort((left, right) => right.winRate - left.winRate)[0] ?? null
  const worstGroup = [...overview.modelGroupPerformance].sort((left, right) => left.winRate - right.winRate)[0] ?? null
  const winRate = latestWeek?.winRate ?? overview.stats.winRate
  const profitLossRatio = latestWeek?.averageProfitLossRatio && latestWeek.averageProfitLossRatio > 0
    ? latestWeek.averageProfitLossRatio
    : calculateProfitLossRatio(overview.recentTrades)
  const watchAccuracy = calculateWatchAccuracy(overview)
  const sharpeLike = calculateSharpeLike(overview.recentTrades)
  const alerts: string[] = []
  const tuningSuggestions: string[] = []

  if (winRate < 0.45) {
    alerts.push('Taxa de vitória inferior a 45%，A estratégia atual entrou na zona cautelosa')
  }
  if (overview.stats.maxDrawdown <= -10) {
    alerts.push('O rebaixamento máximo está próximo do limite mensal de controle de risco，Precisa ser menos agressivo')
  }
  if (worstGroup && worstGroup.winRate < 0.45) {
    alerts.push(`${formatModelGroupLabel(worstGroup.group, worstGroup.displayName)} Desempenho fraco consecutivo，Recomenda-se reduzir o peso`)
  }

  const regime = overview.marketRegime ?? deriveMarketRegime(overview.marketState)
  const threshold = config?.marketThresholds[regime]?.minCompositeScore ?? null
  if (winRate < 0.45 && threshold !== null) {
    tuningSuggestions.push(`min_composite_score: ${threshold} → ${threshold + 3}`)
  }
  if (worstGroup && worstGroup.winRate < 0.45) {
    tuningSuggestions.push(`${worstGroup.group}_expert_weight: ${worstGroup.weight.toFixed(2)} → ${Math.max(0.5, worstGroup.weight - 0.2).toFixed(2)}`)
  }
  if (watchAccuracy < 0.6) {
    tuningSuggestions.push('Espere e veja que a precisão é baixa，Precisa revisar Conviction Filter espere e veja o limite')
  }

  return {
    winRate,
    profitLossRatio,
    weeklyReturn: latestWeek?.weeklyReturn ?? overview.stats.weeklyReturn,
    cumulativeReturn: overview.stats.cumulativeReturn,
    maxDrawdown: overview.stats.maxDrawdown,
    sharpeLike,
    watchAccuracy,
    tradeCount: latestWeek?.tradeCount ?? overview.recentTrades.length,
    watchDays: latestWeek?.watchDays ?? overview.watchLogs.length,
    bestGroup: bestGroup ? formatModelGroupLabel(bestGroup.group, bestGroup.displayName) : null,
    worstGroup: worstGroup ? formatModelGroupLabel(worstGroup.group, worstGroup.displayName) : null,
    overrideWinRate: null,
    overrideAvgReturn: null,
    overrideCount: 0,
    alerts,
    tuningSuggestions,
  }
}

export function buildBehaviorProfileSummary(overview: StockAnalysisOverview): BehaviorProfileSummary {
  const totalSignals = overview.topSignals.length
  // v1.35.0 [A9-P0-1] executionCount Incluir user_confirmed + system_auto_buy（A essência da compra automática também é uma decisão de execução）
  const executionCount = overview.topSignals.filter((signal) =>
    signal.decisionSource === 'user_confirmed' || signal.decisionSource === 'system_auto_buy'
  ).length
  const rejectCount = overview.topSignals.filter((signal) => signal.decisionSource === 'user_rejected').length
  // ignoreCount Incluir user_ignored + system_auto_ignore（Ignorar automaticamente）
  const ignoreCount = overview.topSignals.filter((signal) =>
    signal.decisionSource === 'user_ignored' || signal.decisionSource === 'system_auto_ignore'
  ).length
  const overrideCount = overview.topSignals.filter((signal) => signal.decisionSource === 'user_override').length
  const watchRate = safeDivide(overview.stats.watchSignals, overview.stats.candidatePoolSize)
  const disciplineScore = Math.round(
    (safeDivide(executionCount, totalSignals || 1) * 40)
    + ((1 - safeDivide(ignoreCount, totalSignals || 1)) * 30)
    + ((1 - safeDivide(rejectCount, totalSignals || 1)) * 20)
    + ((watchRate > 0.3 ? 1 : 0.6) * 10),
  )

  return {
    executionRate: safeDivide(executionCount, totalSignals),
    ignoreRate: safeDivide(ignoreCount, totalSignals),
    rejectRate: safeDivide(rejectCount, totalSignals),
    overrideRate: safeDivide(overrideCount, totalSignals),
    watchRate,
    disciplineScore,
  }
}

export function watchOutcomeLabel(outcome: 'correct' | 'wrong' | 'pending') {
  switch (outcome) {
    case 'correct': return 'espere e veja correto'
    case 'wrong': return 'espere e veja o erro'
    case 'pending': return 'Para ser avaliado'
  }
}

export function buildConvictionStats(signals: StockAnalysisSignal[], marketState: StockAnalysisMarketState) {
  const strongBuyCount = signals.filter((signal) => signal.action === 'strong_buy').length
  const buyCount = signals.filter((signal) => signal.action === 'buy').length
  const watchCount = signals.filter((signal) => signal.action === 'watch').length
  const avgScore = average(signals.map((signal) => signal.finalScore))
  const threshold = signals[0]?.thresholds ?? null

  return {
    strongBuyCount,
    buyCount,
    watchCount,
    avgScore,
    thresholdSummary: threshold
      ? `atual ${marketState.trend} limite：abrangente ${threshold.minCompositeScore} / especialista ${threshold.minExpertConsensus} / tecnologia ${threshold.minTechnicalScore} / Quantificar ${threshold.minQuantScore}`
      : 'Atualmente não há cálculos Conviction Filter limite',
  }
}

// ---------- Preparação de dados do gráfico de desempenho ----------

export interface ChartDataPoint {
  label: string
  value: number
}

/** Construir dados de linha de renda cumulativa a partir da matriz de relatórios semanais（em ordem cronológica，Últimas à direita） */
export function buildCumulativeReturnChartData(overview: StockAnalysisOverview): ChartDataPoint[] {
  const weeks = [...overview.weeklySummary].reverse()
  return weeks.map((week) => ({
    label: week.weekLabel,
    value: week.cumulativeReturn,
  }))
}

/** Construir dados de linha de retração máxima a partir da matriz de relatório semanal（em ordem cronológica） */
export function buildDrawdownChartData(overview: StockAnalysisOverview): ChartDataPoint[] {
  const weeks = [...overview.weeklySummary].reverse()
  return weeks.map((week) => ({
    label: week.weekLabel,
    value: week.maxDrawdown,
  }))
}

/** Construa dados de linha de tendência de taxa vencedora a partir de uma matriz de relatórios semanais（em ordem cronológica） */
export function buildWinRateChartData(overview: StockAnalysisOverview): ChartDataPoint[] {
  const weeks = [...overview.weeklySummary].reverse()
  return weeks.map((week) => ({
    label: week.weekLabel,
    value: week.winRate * 100,
  }))
}

/** Construa dados do histograma de ganhos semanais a partir da matriz de relatórios semanais（em ordem cronológica） */
export function buildWeeklyReturnChartData(overview: StockAnalysisOverview): ChartDataPoint[] {
  const weeks = [...overview.weeklySummary].reverse()
  return weeks.map((week) => ({
    label: week.weekLabel,
    value: week.weeklyReturn,
  }))
}
