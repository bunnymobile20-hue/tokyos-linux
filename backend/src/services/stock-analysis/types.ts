export type MarketTrend = 'bull_trend' | 'bear_trend' | 'range_bound'
export type MarketVolatility = 'high_volatility' | 'normal_volatility' | 'low_volatility'
export type MarketRegime = 'bull_trend' | 'bear_trend' | 'high_volatility' | 'low_volatility_range' | 'normal_range'
export type MarketLiquidity = 'high_liquidity' | 'normal_liquidity' | 'low_liquidity'
export type MarketSentiment = 'optimistic' | 'neutral' | 'pessimistic'
export type MarketStyle = 'large_cap' | 'small_cap' | 'balanced'
export type SignalAction = 'strong_buy' | 'buy' | 'watch' | 'sell' | 'hold' | 'none'
export type PositionAction = 'hold' | 'reduce' | 'take_profit' | 'stop_loss' | 'swap' | 'review'
export type TradeAction = 'buy' | 'sell'
export type DecisionSource = 'system' | 'user_confirmed' | 'user_rejected' | 'user_ignored' | 'user_override' | 'system_auto_buy' | 'system_auto_ignore'
export type StockAnalysisRunState = 'idle' | 'running' | 'success' | 'failed'
export type StockAnalysisDataState = 'empty' | 'ready' | 'stale'
export type StockAnalysisWatchOutcome = 'correct' | 'wrong' | 'pending'

export interface StockAnalysisWatchlistCandidate {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  industryName?: string | null
}

export interface StockAnalysisKlinePoint {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  turnover: number
  amplitude: number
  changePercent: number
  changeAmount: number
  turnoverRate: number
}

export interface StockAnalysisSpotQuote {
  code: string
  name: string
  industryName?: string | null
  latestPrice: number
  changePercent: number
  turnoverRate: number
  high: number
  low: number
  open: number
  previousClose: number
  totalMarketCap: number
  circulatingMarketCap: number
}

/**
 * v1.30.2: Sinalize o instantâneo do mercado em tempo real
 * usado com snapshot（Linha de base histórica na qual o sinal foi gerado）separação，Permitir que o front-end exiba preços em tempo real sem contaminar os dados históricos。
 * Intradiário por cron Todo 5 Atualize a cada minuto；Antes do mercado/Feriados são null。
 */
export interface StockAnalysisSignalRealtime {
  latestPrice: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  /** Tempo de captura de dados（ISO 8601），Para exibição frontal"XX:XX renovar" */
  fetchedAt: string
}

export interface StockAnalysisMarketState {
  asOfDate: string
  trend: MarketTrend
  volatility: MarketVolatility
  liquidity: MarketLiquidity
  sentiment: MarketSentiment
  style: MarketStyle
  csi500Return20d: number
  annualizedVolatility20d: number
  averageTurnover20d: number
  risingRatio: number
  /** A volatilidade está em252percentil no histórico diário (0-1)，Usado para controle de risco em nível de mercado */
  volatilityPercentile?: number
  /** O volume de negociação está em252percentil no histórico diário (0-1)，Usado para controle de risco em nível de mercado */
  volumePercentile?: number
  /** Agregação de opinião pública multicanal，muitos=apenas，nulo=fardo。Dados antigos podem estar faltando。 */
  socialSentimentScore?: number
  /** O número de fontes válidas usadas para agregação da opinião pública。Dados antigos podem estar faltando。 */
  socialSentimentSourceCount?: number
}

export interface StockAnalysisStockSnapshot {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  sector: string
  latestPrice: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  turnoverRate: number
  totalMarketCap: number
  circulatingMarketCap: number
  averageTurnoverAmount20d: number
  amplitude20d: number
  declineDays20d: number
  return5d: number
  return20d: number
  return60d: number
  return120d: number
  momentumRank20d: number | null
  momentumRank60d: number | null
  volumeBreakout: number
  volatility20d: number
  volatilityRank: number
  pricePosition20d: number
  movingAverage5: number
  movingAverage20: number
  movingAverage60: number
  movingAverage120: number
  movingAverage20Slope: number
  movingAverage60Slope: number
  rsi14: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
  atr14: number | null
  atrPercent: number | null
  distanceToResistance1: number | null
  distanceToSupport1: number | null
  industryStrength: number | null
  industryBreadth: number | null
  industryReturn20d: number | null
  industryReturn60d: number | null
  industryTrendStrength: number | null
  scoreReason: string[]
}

export interface StockAnalysisThresholds {
  minCompositeScore: number
  minExpertConsensus: number
  minTechnicalScore: number
  minQuantScore: number
}

export interface StockAnalysisFusionWeights {
  expert: number
  technical: number
  quant: number
}

export interface StockAnalysisExpertVote {
  expertId: string
  expertName: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reason: string
  modelId: string
  /** O fornecedor real ligou ID（fallback pode estar relacionado a assignedModel diferente） */
  providerId?: string
  /** O nome real do fornecedor chamado */
  providerName?: string
  /** Modelo atribuído original na configuração especializada ID（Não sujeito a fallback Influência） */
  assignedModelId?: string
  usedFallback: boolean
  latencyMs: number
}

export interface StockAnalysisExpertScore {
  bullishCount: number
  bearishCount: number
  neutralCount: number
  consensus: number
  score: number
  highlights: string[]
  risks: string[]
  /** Votos detalhados de cada especialista（LLM Preencha após o acesso，Matriz vazia no modo de fórmula antigo） */
  votes: StockAnalysisExpertVote[]
  /** chamada bem sucedida LLM número de especialistas（modelo mestre + fallback LLM Todos considerados bem sucedidos） */
  llmSuccessCount: number
  /** usar fallback LLM Número de especialistas com modelos de sucesso */
  llmFallbackCount?: number
  /** Número de especialistas completamente rebaixados para inferência do mecanismo de regras */
  ruleFallbackCount?: number
  /** @deprecated compatível com versões anteriores：igual llmFallbackCount + ruleFallbackCount */
  fallbackCount: number
  /** Se tudo são dados simulados（zero LLM sucesso，Todos os mecanismos de regras） */
  isSimulated: boolean
}

export interface StockAnalysisTechnicalScore {
  total: number
  trend: number
  momentumConfirmation: number
  structure: number
  participation: number
  risk: number
  absolute: number
  relative: number
  sector: number
  notes: string[]
}

export interface StockAnalysisQuantScore {
  total: number
  mediumTermMomentum: number
  crossSectionalStrength: number
  liquidityQuality: number
  stability: number
  meanReversion: number
  momentum: number
  volumeBreakout: number
  volatility: number
  liquidity: number
  value: number
  notes: string[]
}

export interface StockAnalysisSignal {
  id: string
  tradeDate: string
  code: string
  name: string
  latestPrice: number
  sector: string
  snapshot: StockAnalysisStockSnapshot
  expert: StockAnalysisExpertScore
  technical: StockAnalysisTechnicalScore
  quant: StockAnalysisQuantScore
  marketState: StockAnalysisMarketState
  marketRegime: MarketRegime
  fusionWeights: StockAnalysisFusionWeights
  thresholds: StockAnalysisThresholds
  compositeScore: number
  scoreBonus: number
  finalScore: number
  action: SignalAction
  suggestedPosition: number
  suggestedPriceRange: { min: number; max: number }
  /** M7: Com base no suporte/Nível de preço chave para cálculo do nível de pressão */
  supportResistance: SupportResistanceLevels | null
  stopLossPrice: number
  takeProfitPrice1: number
  takeProfitPrice2: number
  passingChecks: string[]
  vetoReasons: string[]
  watchReasons: string[]
  reasoning: string[]
  confidence: number
  createdAt: string
  decisionSource: DecisionSource
  userDecisionNote: string | null
  /**
   * v1.30.2: Cotações intradiárias em tempo real（e snapshot separação，snapshot Mantenha uma linha de base histórica para o momento em que o sinal foi gerado）
   * para null Indica pré-mercado/Os feriados ainda não foram atualizados。
   */
  realtime?: StockAnalysisSignalRealtime | null
}

export interface StockAnalysisPosition {
  id: string
  code: string
  name: string
  openedAt: string
  openDate: string
  sourceSignalId: string | null
  quantity: number
  weight: number
  costPrice: number
  currentPrice: number
  returnPercent: number
  holdingDays: number
  stopLossPrice: number
  takeProfitPrice1: number
  takeProfitPrice2: number
  trailingStopEnabled: boolean
  highestPriceSinceOpen: number
  action: PositionAction
  actionReason: string
  /** Usuário ignorado action tipo，evitar overview Substituir no recálculo dismiss estado */
  dismissedAction?: PositionAction | null
  /** v1.35.0 [A4-P0-2] Carimbo de data/hora da última operação de transação（ISO），Usado para reduzir posições/Fechando janela idempotente */
  lastTradeAt?: string
}

/**
 * v1.35.0 [A8-P0-3] Instantâneo diário do patrimônio da conta
 * Escreva um após o fechamento de cada dia de negociação，para retração / anualizado / Calmar / As taxas de exposição são calculadas usando。
 * Sob o modelo de posição percentual：
 *   - totalEquity：Comece com 1.0 patrimônio líquido como base（Juros compostos cumulativos）
 *   - exposure：Todos os cargos ocupados no dia weight soma（0-1）
 *   - floatingReturnPct：Lucro flutuante e perda de posições abertas no dia（weight Ponderado）
 *   - realizedReturnPct：Receitas de posições fechadas no dia（weight Ponderado）
 *   - drawdownPct：Porcentagem de retração do pico histórico
 */
export interface DailyEquitySnapshot {
  /** data do instantâneo（Data de Pequim YYYY-MM-DD） */
  date: string
  /** Patrimônio líquido básico（começar=1.0） */
  totalEquity: number
  /** Cargo ocupado no dia weight soma */
  exposure: number
  /** Porcentagem flutuante de lucros e perdas（Posição aberta weighted return） */
  floatingReturnPct: number
  /** Porcentagem de lucros e perdas realizadas（Fechar posição no mesmo dia weighted return） */
  realizedReturnPct: number
  /** Porcentagem de retração do pico histórico */
  drawdownPct: number
  /** Número de posições válidas no dia */
  positionCount: number
  /** Tempo de geração do instantâneo */
  generatedAt: string
}

export interface StockAnalysisTradeRecord {
  id: string
  action: TradeAction
  code: string
  name: string
  tradeDate: string
  price: number
  quantity: number
  weight: number
  sourceSignalId: string | null
  sourceDecision: DecisionSource
  note: string
  relatedPositionId: string | null
  pnlPercent: number | null
  buyDate?: string | null
  sellDate?: string | null
}

export interface StockAnalysisWatchLogEntry {
  id: string
  tradeDate: string
  highestSignalScore: number
  reason: string
  topCandidateCode: string | null
  topCandidateName: string | null
  tPlus1Return: number | null
  tPlus5Return: number | null
  outcome: StockAnalysisWatchOutcome
  evaluatedAt: string | null
  createdAt: string
}

export interface StockAnalysisMonthlySummary {
  monthLabel: string
  tradeCount: number
  watchDays: number
  winRate: number
  monthlyReturn: number
  cumulativeReturn: number
  maxDrawdown: number
}

export interface StockAnalysisOverrideStats {
  /** override Número total de transações（Posição fechada） */
  totalCount: number
  /** override Número de transações lucrativas */
  winCount: number
  /** override taxa de vitórias (0-1) */
  winRate: number
  /** override taxa média de retorno (%) */
  averageReturn: number
  /** mesmo período system Taxa de ganho de transação recomendada (0-1)，para comparação */
  systemWinRate: number
  /** mesmo período system Retorno médio nas negociações recomendadas (%) */
  systemAverageReturn: number
}

export interface StockAnalysisPerformanceDashboard {
  convictionPassRate: number
  watchAccuracy: number
  sharpeLike: number
  bestModelGroup: StockAnalysisModelGroupPerformance['group'] | null
  worstModelGroup: StockAnalysisModelGroupPerformance['group'] | null
  overrideStats: StockAnalysisOverrideStats
  alerts: string[]
  tuningSuggestions: string[]
}

export interface StockAnalysisWeeklySummary {
  weekLabel: string
  tradeCount: number
  watchDays: number
  winRate: number
  averageProfitLossRatio: number
  weeklyReturn: number
  cumulativeReturn: number
  maxDrawdown: number
}

export interface StockAnalysisModelGroupPerformance {
  /** chave de agrupamento，O formato é "providerId/modelId" ou "rules" */
  group: string
  /** Modelo ID（como glm-5） */
  modelId?: string
  /** fornecedor ID */
  providerId?: string
  /** Nome do fornecedor（como Aliyun、OpenCodeGo） */
  providerName?: string
  /** nome de exibição（como "glm-5 (ZHIPU)"） */
  displayName?: string
  predictionCount: number
  winRate: number
  averageConfidence: number
  calibration: number
  weight: number
  isSimulated: boolean
}

export interface StockAnalysisCurrentRun {
  startedAt: string
  phase: 'bootstrap' | 'stock_pool' | 'quotes' | 'market_state' | 'history' | 'signals' | 'persist'
  processedCount: number
  totalCount: number
}

export interface StockAnalysisOverview {
  generatedAt: string
  tradeDate: string
  stockAnalysisDir: string
  marketState: StockAnalysisMarketState
  marketRegime: MarketRegime
  fusionWeights: StockAnalysisFusionWeights
  stats: {
    stockPoolSize: number
    candidatePoolSize: number
    passingSignals: number
    watchSignals: number
    openPositions: number
    tradeRecords: number
    cumulativeReturn: number
    weeklyReturn: number
    winRate: number
    maxDrawdown: number
    maxPositions: number
  }
  topSignals: StockAnalysisSignal[]
  positions: StockAnalysisPosition[]
  recentTrades: StockAnalysisTradeRecord[]
  watchLogs: StockAnalysisWatchLogEntry[]
  weeklySummary: StockAnalysisWeeklySummary[]
  monthlySummary: StockAnalysisMonthlySummary[]
  modelGroupPerformance: StockAnalysisModelGroupPerformance[]
  performanceDashboard: StockAnalysisPerformanceDashboard
  recentReviews: StockAnalysisReviewRecord[]
  riskEvents: StockAnalysisRiskEvent[]
  riskLimits: StockAnalysisPortfolioRiskLimits
  learnedWeights: StockAnalysisLearnedWeights | null
  expertPerformance: StockAnalysisExpertPerformanceData | null
  thresholdHistory: StockAnalysisThresholdAdjustment[]
  marketLevelRisk: MarketLevelRiskState
  positionEvaluations: StockAnalysisPositionEvaluation[]
  swapSuggestions: StockAnalysisSwapSuggestion[]
  notifications: AutoReportNotification[]
  systemStatus: {
    lastRunAt: string | null
    lastSuccessAt: string | null
    lastError: string | null
    stockPoolRefreshedAt: string | null
    latestSignalDate: string | null
    runState: StockAnalysisRunState
    currentRun: StockAnalysisCurrentRun | null
    dataState: StockAnalysisDataState
    staleReasons: string[]
    quoteCacheAt: string | null
    indexHistoryCacheAt: string | null
    isUsingFallback: boolean
    riskControl: StockAnalysisRiskControlState
    postMarketAt: string | null
    intradayMonitor: {
      state: IntradayMonitorState
      lastPollAt: string | null
      pollCount: number
      activeAlertCount: number
      startedAt: string | null
    }
  }
}

export interface StockAnalysisRuntimeStatus {
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  stockPoolRefreshedAt: string | null
  latestSignalDate: string | null
  runState: StockAnalysisRunState
  currentRun: StockAnalysisCurrentRun | null
  quoteCacheAt: string | null
  indexHistoryCacheAt: string | null
  latestSuccessfulSignalDate: string | null
  isUsingFallback: boolean
  staleReasons: string[]
  riskControl: StockAnalysisRiskControlState
  postMarketAt: string | null
}

export interface StockAnalysisStrategyConfig {
  maxPositions: number
  maxSinglePosition: number
  maxTotalPosition: number
  stopLossPercent: number
  intradayAutoCloseLossPercent: number
  intradayAutoCloseProfitPercent: number
  takeProfitPercent1: number
  takeProfitPercent2: number
  maxHoldDays: number
  minTurnoverAmount20d: number
  minAmplitude20d: number
  maxContinuousDeclineDays: number
  marketThresholds: Record<MarketRegime, StockAnalysisThresholds>
  fusionWeightsByRegime: Record<MarketRegime, StockAnalysisFusionWeights>
  lowLiquidityGuardrail: {
    volumePercentileThreshold: number
    crisisRisingRatioThreshold: number
    scorePenalty: number
    maxPositionRatio: number
    crisisMaxPositionRatio: number
  }
  trailingStop: StockAnalysisTrailingStopConfig
  portfolioRiskLimits: StockAnalysisPortfolioRiskLimits
}

export interface StockAnalysisDailyRunResult {
  tradeDate: string
  generatedAt: string
  marketState: StockAnalysisMarketState
  stockPoolSize: number
  candidatePoolSize: number
  signalCount: number
  watchCount: number
  topSignals: StockAnalysisSignal[]
  positionEvaluations: StockAnalysisPositionEvaluation[]
  swapSuggestions: StockAnalysisSwapSuggestion[]
  usedFallbackData: boolean
  staleReasons: string[]
}

export interface StockAnalysisTradeRequest {
  /** @deprecated A posição é baseada weight (0-1) expressar，Nenhum número real de ações。Reservado apenas para compatibilidade com chamadores legados。 */
  quantity?: number
  /** Usado ao reduzir posições：Proporção da posição a ser vendida（0-1），como 0.05 Indica a venda da posição total 5% */
  weightDelta?: number
  /** Usado ao fechar uma posição：true Indica vender toda a posição */
  closeAll?: boolean
  weight?: number
  price?: number
  note?: string
  /** v1.35.0 [A4-P0-2] Tokens idempotentes gerados pelo frontend，60 mesmo em segundos nonce Tratado como um envio duplicado */
  clientNonce?: string
}

export interface StockAnalysisDecisionRequest {
  note: string
}

export interface StockAnalysisHealthStatus {
  ok: boolean
  dataState: StockAnalysisDataState
  runState: StockAnalysisRunState
  lastSuccessAt: string | null
  latestSignalDate: string | null
  staleReasons: string[]
  isUsingFallback: boolean
}

export interface StockAnalysisQuoteCache {
  fetchedAt: string
  quotes: StockAnalysisSpotQuote[]
}

export interface StockAnalysisIndexHistoryCache {
   fetchedAt: string
   items: Array<{ data: string; fechar: number; "Volume de negócios": number }>
 }

export interface StockAnalysisHistoryCache {
  fetchedAt: string
  latestDate: string | null
  items: StockAnalysisKlinePoint[]
}

export interface StockAnalysisStockPoolCacheMeta {
  refreshedAt: string | null
}

export interface StockAnalysisRiskControlState {
  paused: boolean
  pauseReason: string | null
  pausedAt: string | null
  dailyLossPercent: number
  weeklyLossPercent: number
  monthlyLossPercent: number
  maxDrawdownPercent: number
  dailyLossBreached: boolean
  weeklyLossBreached: boolean
  monthlyLossBreached: boolean
  maxDrawdownBreached: boolean
  lastCheckedAt: string | null
}

export interface StockAnalysisTrailingStopConfig {
  activationPercent: number
  pullbackPercent: number
}

export interface StockAnalysisPortfolioRiskLimits {
  maxDailyLossPercent: number
  maxWeeklyLossPercent: number
  maxMonthlyLossPercent: number
  maxDrawdownPercent: number
}

export type PositionSellReason =
  | 'score_drop'         // A pontuação geral caiu significativamente（menor do que quando compra -15）
  | 'expert_bearish'     // O consenso dos especialistas torna-se negativo + A tecnologia quebra
  | 'swap_candidate'     // Candidatos para troca de cargos（Pode ser substituído por um mais forte）

export interface StockAnalysisPositionEvaluation {
  positionId: string
  code: string
  name: string
  currentExpertScore: number
  currentTechnicalScore: number
  currentQuantScore: number
  currentCompositeScore: number
  currentFinalScore: number
  buyCompositeScore: number
  buyFinalScore: number
  scoreDelta: number
  expertConsensus: number
  technicalBreakdown: boolean
  sellRecommended: boolean
  sellReason: PositionSellReason | null
  sellReasonText: string
  reasoning: string[]
}

export interface StockAnalysisSwapSuggestion {
  sellPositionId: string
  sellCode: string
  sellName: string
  sellCurrentScore: number
  buySignalId: string
  buyCode: string
  buyName: string
  buyFinalScore: number
  scoreDifference: number
  reasoning: string
}

export interface StockAnalysisReviewRecord {
  id: string
  tradeDate: string
  code: string
  name: string
  action: 'sell'
  buySignalId: string | null
  buyDate: string
  buyPrice: number
  sellPrice: number
  holdingDays: number
  pnlPercent: number
  buyExpertScore: number
  buyTechnicalScore: number
  buyQuantScore: number
  buyCompositeScore: number
  buyMarketRegime: MarketRegime | null
  sellReason: string
  lessonsLearned: string[]
  createdAt: string
  /** Phase 4.3: Análise de revisão quadridimensional */
  dimensionAnalysis?: StockAnalysisDimensionAnalysis
}

/** Resultados da análise de revisão quadridimensional */
export interface StockAnalysisDimensionAnalysis {
  expert: {
    predicted: 'bullish' | 'bearish' | 'neutral'
    actual: 'up' | 'down' | 'flat'
    correct: boolean
    note: string
  }
  technical: {
    buyScore: number
    sellScore: number
    priceHitTarget: boolean
    note: string
  }
  quant: {
    buyScore: number
    momentumCorrect: boolean
    note: string
  }
  execution: {
    slippage: number
    holdingEfficiency: number
    followedPlan: boolean
    note: string
  }
}

/** Phase 4.1: Registro de peso de aprendizagem */
export interface StockAnalysisLearnedWeights {
  updatedAt: string
  sampleCount: number
  dimensionAccuracy: {
    expert: number
    technical: number
    quant: number
  }
  adjustmentFactors: {
    expert: number
    technical: number
    quant: number
  }
  history: StockAnalysisWeightUpdateEntry[]
}

export interface StockAnalysisWeightUpdateEntry {
  timestamp: string
  sampleCount: number
  winRate: number
  dimensionAccuracy: {
    expert: number
    technical: number
    quant: number
  }
  adjustmentFactors: {
    expert: number
    technical: number
    quant: number
  }
}

/** Phase 6: Acompanhamento de desempenho individual especializado */
export interface StockAnalysisExpertPerformanceEntry {
  expertId: string
  expertName: string
  layer: StockAnalysisExpertLayer
  /** Número total de previsões */
  predictionCount: number
  /** Número de julgamentos corretos（bullish+ascender ou bearish+cair） */
  correctCount: number
  /** taxa de vitórias = correctCount / predictionCount */
  winRate: number
  /** confiança média (0-100) */
  averageConfidence: number
  /** Calibração：O valor absoluto do desvio entre a confiança e a taxa real de vitórias，Quanto menor melhor */
  calibration: number
  /** peso dinâmico (0.1-2.0)，Com base na taxa de vitória e decaimento */
  weight: number
  /** Data da última previsão */
  lastPredictionDate: string
  /** Últimos resultados de previsão（usado para cálculos de atenuação），reter no máximo 50 tira */
  recentOutcomes: StockAnalysisExpertOutcome[]
}

export interface StockAnalysisExpertOutcome {
  tradeDate: string
  code: string
  /** Modelo usado na votação real ID。Dados antigos podem estar faltando。 */
  modelId?: string
  /** Fornecedores usados ​​durante a votação real ID。Dados antigos podem estar faltando。 */
  providerId?: string
  /** Nome do fornecedor usado na votação real。Dados antigos podem estar faltando。 */
  providerName?: string
  /** modelo de alocação original ID。fallback Tempo e modelId pode ser diferente。 */
  assignedModelId?: string
  /** A votação é feita por fallback Geração de modelo。 */
  usedFallback?: boolean
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  /** taxa real de retorno（apenas=ascender/fardo=cair） */
  actualReturnPercent: number
  /** A previsão está correta? */
  correct: boolean
  /** Fonte de dados：daily_close=Fechamento da liquidação no dia da previsão，position=Revisão de venda de posição（Dados antigos compatíveis） */
  source?: 'daily_close' | 'position' | 'nextday' | 'fiveday'
}

export interface StockAnalysisExpertPerformanceData {
  updatedAt: string
  entries: StockAnalysisExpertPerformanceEntry[]
}

/** Phase 4.2: Registro de ajuste de limite */
export interface StockAnalysisThresholdAdjustment {
  timestamp: string
  recentWinRate: number
  sampleCount: number
  previousMinCompositeScore: number
  newMinCompositeScore: number
  adjustment: number
  regime: MarketRegime
  reason: string
}

export interface StockAnalysisThresholdHistory {
  updatedAt: string
  adjustments: StockAnalysisThresholdAdjustment[]
}

export type StockAnalysisRiskEventType =
  | 'daily_loss_breached'
  | 'weekly_loss_breached'
  | 'monthly_loss_breached'
  | 'max_drawdown_breached'
  | 'pause_triggered'
  | 'pause_lifted'
  | 'trailing_stop_triggered'
  | 'veto_max_positions'
  | 'veto_blacklist'
  | 'veto_paused'

export interface StockAnalysisRiskEvent {
  id: string
  timestamp: string
  eventType: StockAnalysisRiskEventType
  reason: string
  metrics: {
    dailyLossPercent?: number
    weeklyLossPercent?: number
    monthlyLossPercent?: number
    maxDrawdownPercent?: number
  }
  relatedCode?: string
  relatedPositionId?: string
}

// ==================== Phase 5: AI Configurar o sistema ====================

/** AI fornecedor（apoiar OpenAI Compatível com protocolos API Provedor） */
export interface StockAnalysisAIProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  /** O número máximo de solicitações simultâneas para este provedor（padrão 3） */
  concurrency: number
  /** [L5] o fornecedor max_tokens limite superior（padrão 200000，Alguns modelos podem exigir valores menores） */
  maxTokens?: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/** Um modelo disponível no conjunto de modelos globais（fornecedor + combinação de nomes de modelos） */
export interface StockAnalysisAIModelRef {
  providerId: string
  providerName: string
  modelId: string
  /** para exibição：como "gpt-4o (OpenRouter)" */
  displayName: string
}

/** Definição da camada de análise */
export type StockAnalysisExpertLayer =
  | 'industry_chain'
  | 'company_fundamentals'
  | 'sell_side_research'
  | 'world_power'
  | 'global_macro'
  | 'risk_governance'
  | 'sentiment'
  | 'market_trading'
  | 'buy_side'
  | 'rule_functions'

/** Pressuposto */
export type StockAnalysisExpertStance = 'bullish' | 'bearish' | 'neutral'

/** definição de especialista único */
export interface StockAnalysisExpertDefinition {
  id: string
  name: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  /** modelo atribuído（null Indica que o mecanismo de regras está em uso ou não está configurado） */
  assignedModel: StockAnalysisAIModelRef | null
  /** Palavras-chave do subconjunto de informações nas quais o especialista se concentra，Usado para filtrar passado LLM dimensões de dados */
  infoSubset: string[]
  /** @deprecated foi systemPrompt substituir，Manter a compatibilidade com versões anteriores */
  frameworkPrompt: string
  /** Palavra completa do prompt do sistema（Configuração de personagem + Estrutura de análise + lógica de decisão），Volte para a versão antiga quando estiver vazio layer+stance Emenda */
  systemPrompt: string
  enabled: boolean
}

/** Configuração da camada de análise：Alocação de modelo de camada completa */
export interface StockAnalysisLayerAssignment {
  layer: StockAnalysisExpertLayer
  layerName: string
  defaultModel: StockAnalysisAIModelRef | null
  expertCount: number
}

/** LLM extrair Agent ID */
export type LLMExtractionAgentId = 'announcement_parser' | 'news_impact_analyzer' | 'sentiment_analyzer'

/** solteiro LLM extrair Agent configuração do modelo */
export interface LLMExtractionAgentConfig {
  agentId: LLMExtractionAgentId
  label: string
  /** Modelo preferido atribuído（null Indica usar o primeiro disponível provider O primeiro modelo de） */
  assignedModel: StockAnalysisAIModelRef | null
  enabled: boolean
}

/** AI A estrutura de persistência completa da configuração */
export interface StockAnalysisAIConfig {
  version: number
  updatedAt: string
  providers: StockAnalysisAIProvider[]
  experts: StockAnalysisExpertDefinition[]
  layerAssignments: StockAnalysisLayerAssignment[]
  /** LLM extrair Agent configuração do modelo（per-agent Alocação opcional + automático fallback） */
  extractionAgents: LLMExtractionAgentConfig[]
}

/** Resultados do teste de conectividade do modelo */
export interface StockAnalysisModelTestResult {
  providerId: string
  modelId: string
  success: boolean
  latencyMs: number
  error: string | null
  testedAt: string
}

// ==================== Phase 4+5: Novo tipo ====================

/** M7: apoiar/nível de pressão */
export interface SupportResistanceLevels {
  support1: number
  support2: number
  resistance1: number
  resistance2: number
  method: 'ma_pivot_volume'
}

/** Status de controle de risco em nível de mercado */
export interface MarketLevelRiskState {
  /** mercado de baixa extrema：20diminuição diária>10%，Limitar novas posições */
  extremeBearActive: boolean
  /** extrema volatilidade：Volatilidade>95thpercentil，O limite de posição é reduzido para50% */
  extremeVolatilityActive: boolean
  /** crise de liquidez：encolher + Declínio geral + Ressonância do Pessimismo，Somente venda permitida */
  liquidityCrisisActive: boolean
  /** O volume de transações é baixo，mas não uma crise completa，Acionar redução de posição em vez de proibição de compra */
  lowLiquidityActive: boolean
  /** Proporção de posição máxima efetiva（normal0.85，baixa liquidez0.65，extrema volatilidade0.50，crise de liquidez0.35） */
  effectiveMaxPositionRatio: number
  /** Se deve permitir a abertura de novas posições */
  newPositionsAllowed: boolean
  /** Comprar é permitido? */
  buyAllowed: boolean
  checkedAt: string
}

/** agente de coleta de dados ID */
export type DataAgentId =
  | 'macro_economy' | 'policy_regulation' | 'company_info'
  | 'price_volume' | 'industry_news' | 'social_sentiment'
  | 'global_markets' | 'data_quality'

/** Resultados de execução do agente de coleta de dados */
export interface DataAgentResult {
  agentId: DataAgentId
  collectedAt: string
  dataPointCount: number
  successRate: number
  elapsedMs: number
  errors: string[]
}

/** dados macroeconômicos */
export interface MacroEconomicData {
  date: string
  gdpGrowth: number | null
  cpi: number | null
  pmi: number | null
  interestRate: number | null
  exchangeRateUsdCny: number | null
  treasuryYield10y: number | null
}

/** eventos políticos */
export interface PolicyEvent {
  id: string
  source: string
  title: string
  publishedAt: string
  category: 'monetary_policy' | 'regulatory' | 'industry' | 'fiscal' | 'other'
  rawText: string
  affectedSectors: string[]
}

/** Anúncios de empresas listadas */
export interface CompanyAnnouncement {
  code: string
  name: string
  title: string
  publishedAt: string
  category: 'earnings' | 'insider_trading' | 'equity_change' | 'litigation' | 'other'
  importance: 'major' | 'normal' | 'routine'
  rawText: string
}

/** Notícias da indústria */
export interface IndustryNewsItem {
  id: string
  title: string
  source: string
  publishedAt: string
  sectors: string[]
  rawSummary: string
}

/** Instantâneo de sentimento nas redes sociais */
export interface SocialSentimentSnapshot {
  collectedAt: string
  platform: 'xueqiu' | 'guba' | 'weibo' | 'eastmoney_hot'
  sourceKind: 'primary_sentiment' | 'supplementary_heat'
  /** Se é possível participar na agregação do sentimento do mercado。Lista quente/Fontes de hotspot fornecem apenas hotspots，Não deve haver um sentimento longo ou curto。 */
  contributesToMarketSentiment?: boolean
  summary: string
  hotTopics: string[]
  overallBullBearRatio: { bull: number; bear: number; neutral: number }
  topMentionedStocks: Array<{ code: string; mentionCount: number; sentiment: number }>
}

/** Instantâneo do mercado global */
export interface GlobalMarketSnapshot {
  collectedAt: string
  sp500Change: number | null
  nasdaqChange: number | null
  hsiChange: number | null
  a50FuturesChange: number | null
  usdCnyRate: number | null
  crudeOilChange: number | null
  goldChange: number | null
  us10yYieldChange: number | null
}

/** Relatório de qualidade de dados */
export interface DataQualityReport {
  checkedAt: string
  agentResults: Array<{
    agentId: DataAgentId
    isComplete: boolean
    missingFields: string[]
    anomalies: string[]
    reliabilityScore: number
  }>
  overallScore: number
}

/** [H5] Dados de fluxo de fundos（nível de estoque individual） */
export interface MoneyFlowItem {
  /** Código de estoque */
  code: string
  /** Nome da ação */
  name: string
  /** Entrada líquida principal(Dez mil) */
  mainNetInflow: number
  /** Aumentar ou diminuir(%) */
  changePercent: number
}

/** [H5] Fluxo de capital do setor */
export interface SectorFlowItem {
  /** Nome da seção */
  sectorName: string
  /** Entrada líquida do setor(Dez mil) */
  netInflow: number
}

/** [H5] Resumo da Lista de Dragões e Tigres */
export interface DragonTigerSummary {
  /** Número de ações na lista */
  stockCount: number
  /** Data de coleta */
  tradeDate: string
}

/** [H5] Resumo de grandes transações */
export interface BlockTradeSummary {
  /** Número de transações */
  tradeCount: number
  /** Data de coleta */
  tradeDate: string
}

/** [H5] Resumo da negociação de margem e empréstimo de títulos */
export interface MarginTradingSummary {
  /** Número de entradas de dados */
  recordCount: number
  /** Data de coleta */
  tradeDate: string
}

/** [H5] Agent4 Dados incrementais de energia de volume de preço */
export interface PriceVolumeExtras {
  /** Fluxo de fundos de ações individuais TOP 10 */
  moneyFlow: MoneyFlowItem[]
  /** Fluxo de capital do setor TOP 10 */
  sectorFlow: SectorFlowItem[]
  /** Resumo da Lista de Dragões e Tigres */
  dragonTiger: DragonTigerSummary | null
  /** Resumo de grandes transações */
  blockTrade: BlockTradeSummary | null
  /** Resumo da negociação de margem e empréstimo de títulos */
  marginTrading: MarginTradingSummary | null
}

/** conjunto de fatos — Saída agregada de todos os data brokers */
export interface FactPool {
  updatedAt: string
  tradeDate: string
  macroData: MacroEconomicData | null
  policyEvents: PolicyEvent[]
  companyAnnouncements: CompanyAnnouncement[]
  industryNews: IndustryNewsItem[]
  socialSentiment: SocialSentimentSnapshot[]
  globalMarkets: GlobalMarketSnapshot | null
  /** [H5] Dados incrementais de energia de volume de preço（Fluxo de fundos/Lista de Dragão e Tigre/Transações em massa, etc.） */
  priceVolumeExtras: PriceVolumeExtras | null
  dataQuality: DataQualityReport | null
  agentLogs: DataAgentResult[]
}

/** LLM extrair：Evento de anúncio */
export interface AnnouncementEvent {
  company: string
  eventType: string
  magnitude: string
  sentiment: number
  keyMetrics: Record<string, number>
  riskFlags: string[]
  confidence: number
}

/** LLM extrair：eventos de impacto de notícias */
export interface NewsImpactEvent {
  topic: string
  impactDirection: 'bom' | 'Ruim' | 'neutro'
  impactLevel: 'principal' | 'médio' | 'pouco'
  affectedSectors: string[]
  affectedStocks: string[]
  timeHorizon: 'curto prazo' | 'médio prazo' | 'longo'
  confidence: number
}

/** LLM extrair：Índice de opinião pública */
export interface SentimentIndex {
  overallSentiment: number
  bullRatio: number
  bearRatio: number
  neutralRatio: number
  hotTopics: string[]
  sentimentChange24h: number
  herdingSignal: 'none' | 'moderate' | 'extreme'
}

/** LLM Resumo dos resultados da extração */
export interface LLMExtractionResult {
  extractedAt: string
  tradeDate: string
  announcements: AnnouncementEvent[]
  newsImpacts: NewsImpactEvent[]
  sentimentIndex: SentimentIndex | null
  llmCalls: Array<{
    agent: string
    model: string
    latencyMs: number
    success: boolean
    error: string | null
  }>
}

/** Resultados de seleção de ações orientados a eventos */
export interface EventScreenResult {
  code: string
  name: string
  matchedEvents: Array<{
    source: 'announcement' | 'news' | 'sector_anomaly'
    description: string
    sentiment: number
  }>
  priorityScore: number
}

/** Tipo de execução de análise */
export type StockAnalysisRunType = 'pre_market' | 'post_market'

/** Resultados da análise após o expediente */
export interface StockAnalysisPostMarketResult {
  tradeDate: string
  generatedAt: string
  runType: 'post_market'
  marketState: StockAnalysisMarketState
  positionEvaluations: StockAnalysisPositionEvaluation[]
  riskControlState: StockAnalysisRiskControlState
  reviewsGenerated: number
  factPoolUpdated: boolean
}

/** Configuração de monitoramento intradiário */
export interface IntradayMonitorConfig {
  enabled: boolean
  pollIntervalMs: number
  tradingHoursStart: string
  tradingHoursEnd: string
  lunchBreakStart: string
  lunchBreakEnd: string
}

/** Alerta intradiário */
export interface IntradayAlert {
  id: string
  timestamp: string
  positionId: string
  code: string
  name: string
  alertType: 'stop_loss' | 'take_profit_1' | 'take_profit_2' | 'trailing_stop' | 'daily_loss_limit' | 'max_hold_days' | 'volatility_spike' | 'sector_anomaly'
  currentPrice: number
  triggerPrice: number
  message: string
  acknowledged: boolean
}

/** Status de monitoramento intradiário */
export type IntradayMonitorState = 'idle' | 'running' | 'paused'

/** Monitoramento em disco do status do tempo de execução */
export interface IntradayMonitorStatus {
  state: IntradayMonitorState
  lastPollAt: string | null
  pollCount: number
  alerts: IntradayAlert[]
  startedAt: string | null
}

/** Notificações automáticas de relatórios */
export interface AutoReportNotification {
  id: string
  type: 'weekly_report' | 'monthly_report'
  generatedAt: string
  periodLabel: string
  title: string
  summary: string
  acknowledged: boolean
}

/** relatório mensal */
export interface MonthlyReport {
  id: string
  monthLabel: string
  generatedAt: string
  metrics: StockAnalysisMonthlySummary
  tuningSuggestions: TuningSuggestion[]
  narrativeSummary: string
}

/** Sugestões de ajuste de parâmetros */
export interface TuningSuggestion {
  parameter: string
  currentValue: number
  suggestedValue: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

// ==================== Phase 10: sistema de memória especialista ====================

/** Entrada de memória especializada de um dia（Um registro da previsão de cada especialista para uma determinada ação） */
export interface ExpertDailyMemoryEntry {
  tradeDate: string
  expertId: string
  /** nome de exibição；Dados antigos podem estar faltando */
  expertName?: string
  /** Estratificação de especialistas；Dados antigos podem estar faltando */
  layer?: StockAnalysisExpertLayer
  code: string
  name: string
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reason: string
  /** Modelo usado na votação real ID。Dados antigos podem estar faltando。 */
  modelId?: string
  /** Fornecedores usados ​​durante a votação real ID。Dados antigos podem estar faltando。 */
  providerId?: string
  /** Nome do fornecedor usado na votação real。Dados antigos podem estar faltando。 */
  providerName?: string
  /** modelo de alocação original ID。fallback Tempo e modelId pode ser diferente。 */
  assignedModelId?: string
  /** A votação é feita por fallback Geração de modelo。 */
  usedFallback?: boolean
  /** Nomes de campos históricos herdados：A semântica atual é a taxa de retorno de liquidação de fechamento no dia da previsão.（Preenchimento fora do expediente） */
  actualReturnNextDay: number | null
  /** Nomes de campos históricos herdados：A semântica atual é se a liquidação de fechamento no dia da previsão está correta.（Preenchimento fora do expediente） */
  wasCorrect: boolean | null
}

/** memória de curto prazo：recente 5 Previsões detalhadas para dias de negociação+resultado */
export interface ExpertShortTermMemory {
  entries: ExpertDailyMemoryEntry[]
}

/** memória de médio prazo：recente 30 dias de negociação LLM Resumo compactado */
export interface ExpertMidTermMemory {
  /** LLM Compactar o resumo do texto resultante（~500 Personagem） */
  summary: string
  period: { from: string; to: string }
  winRate: number
  avgConfidence: number
  dominantVerdict: 'bullish' | 'bearish' | 'neutral'
  keyPatterns: string[]
  compressedAt: string
  /** [M12] Número cumulativo de amostras，para média ponderada（Opcional，Padrão quando dados antigos não possuem este campo 1） */
  sampleCount?: number
}

/** memória de longo prazo：Regras e lições básicas */
export interface ExpertLongTermMemory {
  /** Lições importantes da história (max 20) */
  lessons: string[]
  /** Bom ambiente de mercado */
  strengths: string[]
  /** Não é bom no ambiente de mercado */
  weaknesses: string[]
  updatedAt: string
}

/** Memória completa especializada */
export interface ExpertMemory {
  expertId: string
  shortTerm: ExpertShortTermMemory
  midTerm: ExpertMidTermMemory | null
  longTerm: ExpertLongTermMemory | null
  updatedAt: string
}

/** Todo o armazenamento de memória especializado */
export interface ExpertMemoryStore {
  version: number
  updatedAt: string
  memories: Record<string, ExpertMemory>
}

/** Retrato de especialista（injeção system prompt） */
export interface ExpertProfile {
  expertId: string
  expertName: string
  predictionCount: number
  winRate: number
  avgConfidence: number
  /** Calibração：Desvio entre a confiança e a taxa real de vitórias，Quanto menor melhor */
  calibration: number
  bestMarketRegime: string | null
  worstMarketRegime: string | null
  /** Sequência de vitórias recente/Descrição da seqüência de derrotas */
  recentStreak: string
}

/** FactPool resumo（injeção user message） */
export interface FactPoolSummary {
  macroSummary: string | null
  policySummary: string | null
  announcementHighlights: string[]
  industryHighlights: string[]
  sentimentSummary: string | null
  globalMarketSummary: string | null
  /** [H5] Resumo do fluxo de fundos */
  moneyFlowSummary: string | null
}

// ==================== Phase 11: Coleta de dados Agent Configuração ====================

/** Coleta única de dados Agent configuração */
export interface DataAgentConfigItem {
  agentId: DataAgentId
  enabled: boolean
  timeoutMs: number
  priority: number
  label: string
}

/** Coleta de dados Agent Armazenamento de configuração */
export interface DataAgentConfigStore {
  version: number
  updatedAt: string
  agents: DataAgentConfigItem[]
}

// ==================== Phase 12: ações auto-selecionadas (Watchlist) ====================

/** Entradas de estoque opcionais */
export interface UserWatchlistItem {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  industryName: string | null
  /** Observações do usuário */
  note: string
  /** Adicionar tempo ISO corda */
  addedAt: string
}

/** Cotações em tempo real de ações autosselecionadas（mesclar SpotQuote + Khistórico de linha） */
export interface WatchlistQuoteSnapshot {
  code: string
  name: string
  latestPrice: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  turnoverRate: number
  totalMarketCap: number
  circulatingMarketCap: number
  /** Volume（mão） — de K Cálculo de dados de linha ou aquisição direta de mercado */
  volume: number
  /** fechar N dia K histórico de linha（usado paraapontarhora图） */
  klineHistory: StockAnalysisKlinePoint[]
}

/** Resposta completa às ações auto-selecionadas（lista + Cotações em tempo real） */
export interface WatchlistResponse {
  items: UserWatchlistItem[]
  quotes: Record<string, WatchlistQuoteSnapshot>
  updatedAt: string
}

/** [v1.33.0 estágio E] Instantâneo dos fundamentos das ações（PE/PB/Capitalização total de mercado/ROE） */
export interface StockFundamentals {
  code: string
  /** Relação preço/lucro TTM */
  peRatio: number | null
  /** relação preço/livro */
  pbRatio: number | null
  /** Capitalização total de mercado（bilhão） */
  totalMarketCapYi: number | null
  /** ROE percentagem */
  roePercent: number | null
  /** Dia de captura de dados（YYYY-MM-DD），Usado para julgamento de falha durante a noite */
  fetchedDate: string
  /** Buscar carimbo de data/hora（ISO） */
  fetchedAt: string
  /** fonte de dados */
  source: 'tencent' | 'fallback'
}
