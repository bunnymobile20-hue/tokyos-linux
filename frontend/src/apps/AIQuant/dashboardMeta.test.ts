import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBehaviorProfileSummary,
  buildConvictionStats,
  buildCumulativeReturnChartData,
  buildDailyAdviceSummary,
  buildDrawdownChartData,
  buildWeeklyDashboardSummary,
  buildWeeklyReturnChartData,
  buildWinRateChartData,
  formatModelGroupLabel,
} from './dashboardMeta'
import type { StockAnalysisOverview, StockAnalysisStrategyConfig } from './types'

const baseOverview: StockAnalysisOverview = {
  generatedAt: '2026-04-02T08:00:00.000Z',
  tradeDate: '2026-04-02',
  stockAnalysisDir: '/tmp/ai-stock',
  marketState: {
    asOfDate: '2026-04-02',
    trend: 'range_bound',
    volatility: 'normal_volatility',
    liquidity: 'normal_liquidity',
    sentiment: 'neutral',
    style: 'balanced',
    csi500Return20d: 1.2,
    annualizedVolatility20d: 18,
    averageTurnover20d: 120000000000,
    risingRatio: 0.52,
  },
  marketRegime: 'normal_range',
  fusionWeights: { expert: 0.35, technical: 0.35, quant: 0.3 },
  stats: {
    stockPoolSize: 500,
    candidatePoolSize: 3,
    passingSignals: 1,
    watchSignals: 1,
    openPositions: 1,
    tradeRecords: 2,
    cumulativeReturn: 8.5,
    weeklyReturn: 1.2,
    winRate: 0.45,
    maxDrawdown: -3.2,
    maxPositions: 3,
  },
  topSignals: [
    {
      id: 'signal-1',
      tradeDate: '2026-04-02',
      code: '000456',
      name: 'compra de teste',
      latestPrice: 18.66,
      sector: 'CSI500',
      snapshot: {
        code: '000456',
        name: 'compra de teste',
        market: 'sz',
        exchange: 'Bolsa de Valores de Shenzhen',
        sector: 'CSI500',
        latestPrice: 18.66,
        changePercent: 2.3,
        turnoverRate: 3.2,
        totalMarketCap: 1000000000,
        circulatingMarketCap: 800000000,
        averageTurnoverAmount20d: 150000000,
        amplitude20d: 6,
        declineDays20d: 2,
        return5d: 3,
        return20d: 8,
        return60d: 10,
        return120d: 12,
        momentumRank20d: 0.82,
        momentumRank60d: 0.77,
        volumeBreakout: 1.4,
        volatility20d: 22,
        volatilityRank: 0.3,
        pricePosition20d: 0.8,
        movingAverage5: 18,
        movingAverage20: 17,
        movingAverage60: 16,
        movingAverage120: 15,
        movingAverage20Slope: 0.8,
        movingAverage60Slope: 0.6,
        rsi14: 61,
        macdLine: 0.52,
        macdSignal: 0.41,
        macdHistogram: 0.11,
        atr14: 0.68,
        atrPercent: 3.64,
        distanceToResistance1: 4.2,
        distanceToSupport1: 3.1,
        industryStrength: 0.72,
        industryBreadth: 0.66,
        industryReturn20d: 7.2,
        industryReturn60d: 12.5,
        industryTrendStrength: 0.74,
        scoreReason: ['Faturamento atinge meta'],
      },
      expert: { bullishCount: 32, bearishCount: 12, neutralCount: 6, consensus: 0.72, score: 80, highlights: ['Os especialistas estão menos divididos'], risks: ['Nenhum risco óbvio ainda'] },
      marketState: {
        asOfDate: '2026-04-02', trend: 'range_bound', volatility: 'normal_volatility', liquidity: 'normal_liquidity', sentiment: 'neutral', style: 'balanced', csi500Return20d: 1.2, annualizedVolatility20d: 18, averageTurnover20d: 120000000000, risingRatio: 0.52,
      },
      thresholds: { minCompositeScore: 76, minExpertConsensus: 0.63, minTechnicalScore: 70, minQuantScore: 65 },
      technical: { total: 78, trend: 79, momentumConfirmation: 80, structure: 76, participation: 77, risk: 78, absolute: 75, relative: 77, sector: 81, notes: ['avanço 20 alta diária'] },
      quant: { total: 71, mediumTermMomentum: 73, crossSectionalStrength: 72, liquidityQuality: 69, stability: 70, meanReversion: 68, momentum: 74, volumeBreakout: 72, volatility: 68, liquidity: 70, value: 65, notes: ['Fator de impulso forte'] },
      compositeScore: 79,
      scoreBonus: 3,
      finalScore: 82,
      action: 'buy',
      suggestedPosition: 0.25,
      suggestedPriceRange: { min: 18.5, max: 18.8 },
      stopLossPrice: 18.1,
      takeProfitPrice1: 19.2,
      takeProfitPrice2: 19.8,
      passingChecks: ['O consenso de especialistas atende aos padrões', 'Avanço de quantidade'],
      vetoReasons: [],
      watchReasons: [],
      reasoning: ['Bom para a indústria', 'avanço tecnológico'],
      confidence: 0.82,
      createdAt: '2026-04-02T08:00:00.000Z',
      decisionSource: 'user_confirmed',
      userDecisionNote: 'Confirmar execução',
    },
    {
      id: 'signal-2',
      tradeDate: '2026-04-02',
      code: '300789',
      name: 'Teste espere e veja',
      latestPrice: 24.2,
      sector: 'Tecnologia de crescimento',
      snapshot: {
        code: '300789', name: 'Teste espere e veja', market: 'sz', exchange: 'Bolsa de Valores de Shenzhen', sector: 'Tecnologia de crescimento', latestPrice: 24.2, changePercent: 1.2, turnoverRate: 2.1, totalMarketCap: 2000000000, circulatingMarketCap: 1500000000, averageTurnoverAmount20d: 180000000, amplitude20d: 5.5, declineDays20d: 3, return5d: 2, return20d: 4, return60d: 6, return120d: 8, momentumRank20d: 0.61, momentumRank60d: 0.57, volumeBreakout: 1.1, volatility20d: 25, volatilityRank: 0.5, pricePosition20d: 0.62, movingAverage5: 23.8, movingAverage20: 23.5, movingAverage60: 22.5, movingAverage120: 21.7, movingAverage20Slope: 0.3, movingAverage60Slope: 0.2, rsi14: 54, macdLine: 0.22, macdSignal: 0.25, macdHistogram: -0.03, atr14: 0.75, atrPercent: 3.1, distanceToResistance1: 2.8, distanceToSupport1: 4.4, industryStrength: 0.52, industryBreadth: 0.5, industryReturn20d: 3.4, industryReturn60d: 6.8, industryTrendStrength: 0.55, scoreReason: ['Capacidade média'] },
      expert: { bullishCount: 20, bearishCount: 18, neutralCount: 12, consensus: 0.53, score: 60, highlights: ['Especialistas estão divididos'], risks: ['Tecnologia média'] },
      marketState: {
        asOfDate: '2026-04-02', trend: 'range_bound', volatility: 'normal_volatility', liquidity: 'normal_liquidity', sentiment: 'neutral', style: 'balanced', csi500Return20d: 1.2, annualizedVolatility20d: 18, averageTurnover20d: 120000000000, risingRatio: 0.52,
      },
      thresholds: { minCompositeScore: 76, minExpertConsensus: 0.63, minTechnicalScore: 70, minQuantScore: 65 },
      technical: { total: 67, trend: 66, momentumConfirmation: 68, structure: 65, participation: 67, risk: 69, absolute: 66, relative: 68, sector: 65, notes: ['A pontuação técnica acabou de ser aprovada'] },
      quant: { total: 63, mediumTermMomentum: 62, crossSectionalStrength: 61, liquidityQuality: 66, stability: 64, meanReversion: 63, momentum: 62, volumeBreakout: 61, volatility: 64, liquidity: 66, value: 60, notes: ['A pontuação quantitativa é ligeiramente inferior'] },
      compositeScore: 68,
      scoreBonus: 0,
      finalScore: 68,
      action: 'watch',
      suggestedPosition: 0,
      suggestedPriceRange: { min: 23.9, max: 24.4 },
      stopLossPrice: 23.4,
      takeProfitPrice1: 24.9,
      takeProfitPrice2: 25.6,
      passingChecks: [],
      vetoReasons: [],
      watchReasons: ['A pontuação técnica acabou de ser aprovada，Especialistas estão divididos'],
      reasoning: ['Evidência insuficiente，Recomenda-se esperar para ver'],
      confidence: 0.68,
      createdAt: '2026-04-02T08:00:00.000Z',
      decisionSource: 'user_ignored',
      userDecisionNote: 'Não assista ainda',
    },
  ],
  positions: [{
    id: 'position-1',
    code: '600123',
    name: 'Posições de teste',
    openedAt: '2026-03-20T08:00:00.000Z',
    openDate: '2026-03-20',
    sourceSignalId: 'signal-0',
    quantity: 100,
    weight: 0.25,
    costPrice: 25.3,
    currentPrice: 24.49,
    returnPercent: -3.2,
    holdingDays: 13,
    stopLossPrice: 24.54,
    takeProfitPrice1: 26.05,
    takeProfitPrice2: 26.81,
    trailingStopEnabled: true,
    highestPriceSinceOpen: 25.8,
    action: 'stop_loss',
    actionReason: 'Stop loss acionado -3.2%',
  }],
  recentTrades: [
    { id: 'trade-1', action: 'buy', code: '600123', name: 'Posições de teste', tradeDate: '2026-03-20T08:00:00.000Z', price: 25.3, quantity: 100, weight: 0.25, sourceSignalId: 'signal-0', sourceDecision: 'user_confirmed', note: 'Abra uma posição', relatedPositionId: 'position-1', pnlPercent: null },
    { id: 'trade-2', action: 'sell', code: '600999', name: 'Fechamento de teste', tradeDate: '2026-03-28T08:00:00.000Z', price: 26.8, quantity: 100, weight: 0.25, sourceSignalId: 'signal-x', sourceDecision: 'user_confirmed', note: 'Lucro alcançado', relatedPositionId: 'position-x', pnlPercent: 5.9 },
  ],
  watchLogs: [
    {
      id: 'watch-1',
      tradeDate: '2026-03-22',
      highestSignalScore: 72,
      reason: 'Existe um 72 pontos, mas não alcançado 75 limite',
      topCandidateCode: '300789',
      topCandidateName: 'Teste espere e veja',
      tPlus1Return: -0.3,
      tPlus5Return: -2.1,
      outcome: 'correct',
      evaluatedAt: '2026-03-27T15:00:00.000Z',
      createdAt: '2026-03-22T08:00:00.000Z',
    },
  ],
  weeklySummary: [
    { weekLabel: '2026-W13', tradeCount: 3, watchDays: 2, winRate: 0.45, averageProfitLossRatio: 1.8, weeklyReturn: 1.2, cumulativeReturn: 8.5, maxDrawdown: -3.2 },
  ],
  monthlySummary: [
    { monthLabel: '2026-03', tradeCount: 6, watchDays: 7, winRate: 0.5, monthlyReturn: 3.2, cumulativeReturn: 3.2, maxDrawdown: -3.2 },
  ],
  modelGroupPerformance: [
    { group: 'claude', predictionCount: 118, winRate: 0.62, averageConfidence: 0.71, calibration: 0.85, weight: 1.2, isSimulated: true },
    { group: 'qwen', predictionCount: 42, winRate: 0.38, averageConfidence: 0.73, calibration: 0.75, weight: 1.0, isSimulated: true },
  ],
  recentReviews: [],
  riskEvents: [],
  riskLimits: {
    maxDailyLossPercent: 3,
    maxWeeklyLossPercent: 8,
    maxMonthlyLossPercent: 12,
    maxDrawdownPercent: 15,
  },
  positionEvaluations: [],
  swapSuggestions: [],
  notifications: [],
  marketLevelRisk: null,
  learnedWeights: null,
  expertPerformance: null,
  thresholdHistory: [],
  performanceDashboard: {
    convictionPassRate: 0.15,
    watchAccuracy: 0.8,
    sharpeLike: 1.4,
    bestModelGroup: 'claude',
    worstModelGroup: 'qwen',
    overrideStats: {
      totalCount: 5,
      winCount: 5,
      winRate: 1,
      averageReturn: 2.18,
      systemWinRate: 0,
      systemAverageReturn: -4.33,
    },
    alerts: ['Qwen O desempenho recente do grupo tem sido fraco'],
    tuningSuggestions: ['É recomendado qwen peso do grupo de 1.00 rebaixado para 0.80'],
  },
  systemStatus: {
    lastRunAt: '2026-04-02T08:00:00.000Z',
    lastSuccessAt: '2026-04-02T08:00:00.000Z',
    lastError: null,
    stockPoolRefreshedAt: '2026-04-02T07:55:00.000Z',
    latestSignalDate: '2026-04-02',
    runState: 'success',
    currentRun: null,
    dataState: 'ready',
    staleReasons: [],
    quoteCacheAt: '2026-04-02T08:00:00.000Z',
    indexHistoryCacheAt: '2026-04-02T08:00:00.000Z',
    isUsingFallback: false,
    riskControl: {
      paused: false,
      pauseReason: null,
      pausedAt: null,
      dailyLossPercent: 0,
      weeklyLossPercent: 0,
      monthlyLossPercent: 0,
      maxDrawdownPercent: -3.2,
      dailyLossBreached: false,
      weeklyLossBreached: false,
      monthlyLossBreached: false,
      maxDrawdownBreached: false,
      lastCheckedAt: '2026-04-02T08:00:00.000Z',
    },
    postMarketAt: null,
    intradayMonitor: {
      state: 'idle',
      lastPollAt: null,
      pollCount: 0,
      activeAlertCount: 0,
      startedAt: null,
    },
  },
}

const baseConfig: StockAnalysisStrategyConfig = {
  maxPositions: 3,
  maxSinglePosition: 0.3,
  maxTotalPosition: 0.85,
  stopLossPercent: 3,
  intradayAutoCloseLossPercent: 5,
  intradayAutoCloseProfitPercent: 10,
  takeProfitPercent1: 3,
  takeProfitPercent2: 6,
  maxHoldDays: 20,
  minTurnoverAmount20d: 50000000,
  minAmplitude20d: 5,
  maxContinuousDeclineDays: 15,
  marketThresholds: {
    bull_trend: { minCompositeScore: 72, minExpertConsensus: 0.55, minTechnicalScore: 62, minQuantScore: 58 },
    bear_trend: { minCompositeScore: 80, minExpertConsensus: 0.72, minTechnicalScore: 75, minQuantScore: 70 },
    high_volatility: { minCompositeScore: 78, minExpertConsensus: 0.68, minTechnicalScore: 72, minQuantScore: 68 },
    low_volatility_range: { minCompositeScore: 75, minExpertConsensus: 0.60, minTechnicalScore: 68, minQuantScore: 63 },
    normal_range: { minCompositeScore: 76, minExpertConsensus: 0.63, minTechnicalScore: 70, minQuantScore: 65 },
  },
}

test('buildDailyAdviceSummary returns buy sell watch sections and summary', () => {
  const summary = buildDailyAdviceSummary(baseOverview)
  assert.equal(summary.sells.length, 1)
  assert.equal(summary.buys.length, 1)
  assert.equal(summary.watches.length, 1)
  assert.equal(summary.swaps.length, 0)
  assert.match(summary.stats.summaryText, /vender 1 Caneta/)
})

test('buildWeeklyDashboardSummary derives alerts and tuning suggestions', () => {
  const summary = buildWeeklyDashboardSummary(baseOverview, baseConfig)
  assert.equal(summary.bestGroup, 'claude')
  assert.equal(summary.worstGroup, 'qwen')
  assert.match(summary.alerts.join(' | '), /Qwen O desempenho recente do grupo tem sido fraco/)
  assert.match(summary.tuningSuggestions.join(' | '), /qwen Peso do grupo/)
  // override stats
  assert.equal(summary.overrideCount, 5)
  assert.equal(summary.overrideWinRate, 1)
  assert.equal(summary.overrideAvgReturn, 2.18)
})

test('buildBehaviorProfileSummary tracks execution and override ratios', () => {
  const profile = buildBehaviorProfileSummary(baseOverview)
  assert.equal(Math.round(profile.executionRate * 100), 50)
  assert.equal(Math.round(profile.ignoreRate * 100), 50)
  assert.equal(Math.round(profile.rejectRate * 100), 0)
  assert.equal(Math.round(profile.overrideRate * 100), 0)
  assert.ok(profile.disciplineScore > 0)

  // Verifique se contém override hora do sinal overrideRate correto
  const overrideSignal = {
    ...baseOverview.topSignals[1],
    id: 'signal-3',
    decisionSource: 'user_override' as const,
    userDecisionNote: 'Os usuários viram, esperem para ver',
  }
  const overviewWithOverride = {
    ...baseOverview,
    topSignals: [...baseOverview.topSignals, overrideSignal],
  }
  const profile2 = buildBehaviorProfileSummary(overviewWithOverride)
  assert.equal(Math.round(profile2.overrideRate * 100), 33) // 1/3
})

test('buildBehaviorProfileSummary counts system auto decisions as execution and ignore', () => {
  const overviewWithAutoDecisions = {
    ...baseOverview,
    topSignals: [
      {
        ...baseOverview.topSignals[0],
        id: 'signal-auto-buy',
        decisionSource: 'system_auto_buy' as const,
      },
      {
        ...baseOverview.topSignals[1],
        id: 'signal-auto-ignore',
        decisionSource: 'system_auto_ignore' as const,
      },
    ],
  }

  const profile = buildBehaviorProfileSummary(overviewWithAutoDecisions)
  assert.equal(Math.round(profile.executionRate * 100), 50)
  assert.equal(Math.round(profile.ignoreRate * 100), 50)
  assert.equal(Math.round(profile.rejectRate * 100), 0)
  assert.equal(Math.round(profile.overrideRate * 100), 0)
})

test('buildConvictionStats exposes current threshold summary', () => {
  const stats = buildConvictionStats(baseOverview.topSignals, baseOverview.marketState)
  assert.equal(stats.buyCount, 1)
  assert.equal(stats.watchCount, 1)
  assert.match(stats.thresholdSummary, /abrangente 76/)
})

test('formatModelGroupLabel formats built-in model groups', () => {
  assert.equal(formatModelGroupLabel('rules'), 'Grupo de funções de regras')
  assert.equal(formatModelGroupLabel('gpt'), 'gpt')
  assert.equal(formatModelGroupLabel('rules', 'Grupo de funções de regras'), 'Grupo de funções de regras')
  assert.equal(formatModelGroupLabel('ZHIPU/glm-5', 'glm-5 (ZHIPU)'), 'glm-5 (ZHIPU)')
})

test('buildDailyAdviceSummary includes proactive sell signals from positionEvaluations', () => {
  const overviewWithEvals = {
    ...baseOverview,
    positionEvaluations: [{
      positionId: 'position-2',
      code: '000858',
      name: 'Wuliangye',
      currentExpertScore: 40,
      currentTechnicalScore: 35,
      currentQuantScore: 30,
      currentCompositeScore: 35,
      currentFinalScore: 35,
      buyCompositeScore: 75,
      buyFinalScore: 75,
      scoreDelta: -40,
      expertConsensus: 0.35,
      technicalBreakdown: true,
      sellRecommended: true,
      sellReason: 'score_drop' as const,
      sellReasonText: 'A avaliação geral caiu 40 apontar（limite 15），Recomendado para vender',
      reasoning: ['A classificação caiu significativamente：75 -> 35'],
    }],
  }

  const summary = buildDailyAdviceSummary(overviewWithEvals)
  // 1 reactive sell (stop_loss from position) + 1 proactive sell (from evaluation)
  assert.equal(summary.sells.length, 2)
  assert.ok(summary.sells.some((item) => item.title.includes('Wuliangye')))
  assert.ok(summary.sells.some((item) => item.title.includes('Tome a iniciativa de vender')))
})

test('buildDailyAdviceSummary includes swap suggestions', () => {
  const overviewWithSwaps = {
    ...baseOverview,
    positionEvaluations: [],
    swapSuggestions: [{
      sellPositionId: 'pos-1',
      sellCode: '600123',
      sellName: 'Posições de teste',
      sellCurrentScore: 55,
      buySignalId: 'signal-new',
      buyCode: '000001',
      buyName: 'Faça ping em um banco',
      buyFinalScore: 80,
      scoreDifference: 25,
      reasoning: 'O novo lance é maior 25 apontar',
    }],
  }

  const summary = buildDailyAdviceSummary(overviewWithSwaps)
  assert.equal(summary.swaps.length, 1)
  assert.ok(summary.swaps[0].title.includes('Faça ping em um banco'))
  assert.ok(summary.swaps[0].summary.includes('+25'))
  assert.match(summary.stats.summaryText, /Posições de câmbio 1 Caneta/)
})

test('buildDailyAdviceSummary avoids duplicate sells for same code in reactive and proactive', () => {
  const overviewWithDups = {
    ...baseOverview,
    positionEvaluations: [{
      positionId: 'position-1',
      code: '600123',
      name: 'Posições de teste',
      currentExpertScore: 40,
      currentTechnicalScore: 35,
      currentQuantScore: 30,
      currentCompositeScore: 35,
      currentFinalScore: 35,
      buyCompositeScore: 75,
      buyFinalScore: 75,
      scoreDelta: -40,
      expertConsensus: 0.35,
      technicalBreakdown: true,
      sellRecommended: true,
      sellReason: 'score_drop' as const,
      sellReasonText: 'A avaliação geral caiu 40 apontar',
      reasoning: [],
    }],
  }

  const summary = buildDailyAdviceSummary(overviewWithDups)
  // position-1 (code: 600123) already has reactive stop_loss sell, so proactive should be filtered out
  assert.equal(summary.sells.length, 1)
  assert.equal(summary.sells[0].code, '600123')
})

// ---------- Dados do gráfico de desempenho ----------

const multiWeekOverview = {
  ...baseOverview,
  weeklySummary: [
    { weekLabel: '2026-W13', tradeCount: 3, watchDays: 2, winRate: 0.45, averageProfitLossRatio: 1.8, weeklyReturn: 1.2, cumulativeReturn: 8.5, maxDrawdown: -3.2 },
    { weekLabel: '2026-W12', tradeCount: 2, watchDays: 3, winRate: 0.60, averageProfitLossRatio: 2.1, weeklyReturn: 3.5, cumulativeReturn: 7.3, maxDrawdown: -2.5 },
    { weekLabel: '2026-W11', tradeCount: 1, watchDays: 4, winRate: 0.50, averageProfitLossRatio: 1.5, weeklyReturn: -1.2, cumulativeReturn: 3.8, maxDrawdown: -1.8 },
  ],
}

test('buildCumulativeReturnChartData returns time-ascending data', () => {
  const data = buildCumulativeReturnChartData(multiWeekOverview)
  assert.equal(data.length, 3)
  // reversed from weeklySummary (newest-first) to time-ascending
  assert.equal(data[0].label, '2026-W11')
  assert.equal(data[2].label, '2026-W13')
  assert.equal(data[0].value, 3.8)
  assert.equal(data[2].value, 8.5)
})

test('buildDrawdownChartData returns negative drawdown values time-ascending', () => {
  const data = buildDrawdownChartData(multiWeekOverview)
  assert.equal(data.length, 3)
  assert.equal(data[0].label, '2026-W11')
  assert.equal(data[0].value, -1.8)
  assert.equal(data[2].value, -3.2)
})

test('buildWinRateChartData returns percentage values time-ascending', () => {
  const data = buildWinRateChartData(multiWeekOverview)
  assert.equal(data.length, 3)
  assert.equal(data[0].label, '2026-W11')
  assert.equal(data[0].value, 50)
  assert.equal(data[1].value, 60)
  assert.equal(data[2].value, 45)
})

test('buildWeeklyReturnChartData returns weekly returns time-ascending', () => {
  const data = buildWeeklyReturnChartData(multiWeekOverview)
  assert.equal(data.length, 3)
  assert.equal(data[0].label, '2026-W11')
  assert.equal(data[0].value, -1.2)
  assert.equal(data[1].value, 3.5)
  assert.equal(data[2].value, 1.2)
})

test('chart data helpers return empty array when no weekly summaries', () => {
  const emptyWeekOverview = { ...baseOverview, weeklySummary: [] }
  assert.equal(buildCumulativeReturnChartData(emptyWeekOverview).length, 0)
  assert.equal(buildDrawdownChartData(emptyWeekOverview).length, 0)
  assert.equal(buildWinRateChartData(emptyWeekOverview).length, 0)
  assert.equal(buildWeeklyReturnChartData(emptyWeekOverview).length, 0)
})

test('chart data helpers return single point when only one week', () => {
  // single week = baseOverview (has 1 weeklySummary)
  const data = buildCumulativeReturnChartData(baseOverview)
  assert.equal(data.length, 1)
  assert.equal(data[0].value, 8.5)
})
