export type MarketTrend = 'bull_trend' | 'bear_trend' | 'range_bound'
export type MarketVolatility = 'high_volatility' | 'normal_volatility' | 'low_volatility'
export type MarketRegime = 'bull_trend' | 'bear_trend' | 'high_volatility' | 'low_volatility_range' | 'normal_range'
export type MarketLiquidity = 'high_liquidity' | 'normal_liquidity' | 'low_liquidity'
export type MarketSentiment = 'optimistic' | 'neutral' | 'pessimistic'
export type MarketStyle = 'large_cap' | 'small_cap' | 'balanced'
export type SignalAction = 'strong_buy' | 'buy' | 'watch' | 'sell' | 'hold' | 'none'
export type PositionAction = 'hold' | 'reduce' | 'take_profit' | 'stop_loss' | 'swap' | 'review'
export type StockAnalysisRunState = 'idle' | 'running' | 'success' | 'failed'
export type StockAnalysisDataState = 'empty' | 'ready' | 'stale'

// v1.35.0 [A9-P0-1] com back-end DecisionSource perfeitamente alinhado（7 valor）
// evitar runAutoDecisions escrever 'system_auto_buy' / 'system_auto_ignore' Quando o estatístico front-end erra a contagem。
export type DecisionSource =
  | 'system'
  | 'user_confirmed'
  | 'user_rejected'
  | 'user_ignored'
  | 'user_override'
  | 'system_auto_buy'
  | 'system_auto_ignore'

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
  volatilityPercentile?: number
  volumePercentile?: number
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

export interface StockAnalysisStockSnapshot {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  sector: string
  latestPrice: number
  changePercent: number
  /** Preço de abertura do dia（Dados antigos podem estar faltando） */
  open?: number
  /** Preço mais alto do dia（Dados antigos podem estar faltando） */
  high?: number
  /** Menor preço do dia（Dados antigos podem estar faltando） */
  low?: number
  /** Preço de fechamento de ontem（Dados antigos podem estar faltando） */
  previousClose?: number
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

export interface StockAnalysisSignal {
  id: string
  tradeDate: string
  code: string
  name: string
  latestPrice: number
  sector: string
  snapshot: StockAnalysisStockSnapshot
  expert: {
    bullishCount: number
    bearishCount: number
    neutralCount: number
    consensus: number
    score: number
    highlights: string[]
    risks: string[]
    votes?: StockAnalysisExpertVote[]
    /** LLM número total de sucessos（modelo mestre + fallback LLM） */
    llmSuccessCount?: number
    /** usar fallback LLM Número de especialistas com modelos de sucesso */
    llmFallbackCount?: number
    /** Número de especialistas completamente rebaixados para o mecanismo de regras */
    ruleFallbackCount?: number
    /** @deprecated compatível com versões anteriores */
    fallbackCount?: number
    isSimulated?: boolean
    /** Proporção de rebaixamento 0-1：Downgrade baseado apenas no mecanismo de regras。0 = Downgrade sem regras */
    degradeRatio?: number
  }
  marketState: StockAnalysisMarketState
  marketRegime?: MarketRegime
  fusionWeights?: StockAnalysisFusionWeights
  thresholds: StockAnalysisThresholds
  technical: {
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
  quant: {
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
  compositeScore: number
  scoreBonus: number
  finalScore: number
  action: SignalAction
  suggestedPosition: number
  suggestedPriceRange: { min: number; max: number }
  supportResistance?: SupportResistanceLevels | null
  stopLossPrice: number
  takeProfitPrice1: number
  takeProfitPrice2: number
  passingChecks: string[]
  vetoReasons: string[]
  watchReasons: string[]
  reasoning: string[]
  confidence: number
  createdAt: string
  // v1.35.0 [A9-P0-1] com back-end types.ts DecisionSource Alinhamento（7 valor，completo system_auto_buy / system_auto_ignore）
  decisionSource: DecisionSource
  userDecisionNote: string | null
  /**
   * v1.30.2: Cotações intradiárias em tempo real（e snapshot separação，snapshot Mantenha uma linha de base histórica para o momento em que o sinal foi gerado）
   * para null/undefined Indica pré-mercado/Os feriados ainda não foram atualizados，O frontend deve voltar para snapshot/latestPrice exposição
   */
  realtime?: {
    latestPrice: number
    changePercent: number
    open: number
    high: number
    low: number
    previousClose: number
    fetchedAt: string
  } | null
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
}

export interface StockAnalysisTradeRecord {
  id: string
  action: 'buy' | 'sell'
  code: string
  name: string
  tradeDate: string
  price: number
  quantity: number
  weight: number
  sourceSignalId: string | null
  sourceDecision: 'system' | 'user_confirmed' | 'user_rejected' | 'user_ignored' | 'user_override'
  note: string
  relatedPositionId: string | null
  pnlPercent?: number | null
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
  outcome: 'correct' | 'wrong' | 'pending'
  evaluatedAt: string | null
  createdAt: string
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

export interface StockAnalysisMonthlySummary {
  monthLabel: string
  tradeCount: number
  watchDays: number
  winRate: number
  monthlyReturn: number
  cumulativeReturn: number
  maxDrawdown: number
}

export interface StockAnalysisModelGroupPerformance {
  group: string
  modelId?: string
  providerId?: string
  providerName?: string
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
  // [P2-27] Os seguintes campos backend sempre retornam，Remover desnecessário ? marcado para corresponder ao real API contrato
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
  performanceDashboard: {
    convictionPassRate: number
    watchAccuracy: number
    sharpeLike: number
    bestModelGroup: StockAnalysisModelGroupPerformance['group'] | null
    worstModelGroup: StockAnalysisModelGroupPerformance['group'] | null
    overrideStats?: {
      totalCount: number
      winCount: number
      winRate: number
      averageReturn: number
      systemWinRate: number
      systemAverageReturn: number
    }
    alerts: string[]
    tuningSuggestions: string[]
  }
  recentReviews: StockAnalysisReviewRecord[]
  riskEvents: StockAnalysisRiskEvent[]
  riskLimits: StockAnalysisPortfolioRiskLimits
  positionEvaluations: StockAnalysisPositionEvaluation[]
  swapSuggestions: StockAnalysisSwapSuggestion[]
  notifications: AutoReportNotification[]
  marketLevelRisk: MarketLevelRiskState | null
  learnedWeights: StockAnalysisLearnedWeights | null
  expertPerformance: StockAnalysisExpertPerformanceData | null
  thresholdHistory: StockAnalysisThresholdAdjustment[]
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

export interface StockAnalysisDailyRunResult {
  tradeDate: string
  generatedAt: string
  marketState: StockAnalysisMarketState
  stockPoolSize: number
  candidatePoolSize: number
  signalCount: number
  watchCount: number
  topSignals: StockAnalysisSignal[]
  usedFallbackData: boolean
  staleReasons: string[]
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
  fusionWeightsByRegime?: Record<MarketRegime, StockAnalysisFusionWeights>
  trailingStop?: StockAnalysisTrailingStopConfig
  portfolioRiskLimits?: StockAnalysisPortfolioRiskLimits
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

export type PositionSellReason =
  | 'score_drop'
  | 'expert_bearish'
  | 'swap_candidate'

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
  dimensionAnalysis?: StockAnalysisDimensionAnalysis
}

export type StockAnalysisRiskEventType =
  | 'daily_loss_breached'
  | 'weekly_loss_breached'
  | 'monthly_loss_breached'
  | 'max_drawdown_breached'
  | 'pause_triggered'
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

export interface StockAnalysisHealthStatus {
  ok: boolean
  dataState: StockAnalysisDataState
  runState: StockAnalysisRunState
  lastSuccessAt: string | null
  latestSignalDate: string | null
  staleReasons: string[]
  isUsingFallback: boolean
}

/** Phase 4.3: Resultados da análise de revisão quadridimensional */
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

// ==================== Phase 5: AI Configurar o sistema ====================

/** AI fornecedor（apoiar OpenAI Compatível com protocolos API Provedor） */
export interface StockAnalysisAIProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  enabled: boolean
  /** O número máximo de chamadas simultâneas para este provedor（padrão 3） */
  concurrency: number
  /** o fornecedor max_tokens limite superior（padrão 200000） */
  maxTokens?: number
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

/** Resultados da votação de especialistas individuais */
export interface StockAnalysisExpertVote {
  expertId: string
  expertName: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reason: string
  modelId: string
  usedFallback: boolean
  latencyMs: number
}

/** definição de especialista único */
export interface StockAnalysisExpertDefinition {
  id: string
  name: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  /** modelo atribuído（null Indica que o mecanismo de regras está em uso ou não está configurado） */
  assignedModel: StockAnalysisAIModelRef | null
  /** Palavras-chave do subconjunto de informações nas quais o especialista se concentra */
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
  extractionAgents: LLMExtractionAgentConfig[]
}

/** AI Configuração + Conjunto de modelos agregados（GET /ai-config retornar） */
export interface StockAnalysisAIConfigWithPool extends StockAnalysisAIConfig {
  modelPool: StockAnalysisAIModelRef[]
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

/** Resultados de previsão individual de especialistas */
export interface StockAnalysisExpertOutcome {
  tradeDate: string
  code: string
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  actualReturnPercent: number
  correct: boolean
}

/** Itens de desempenho individual especializado */
export interface StockAnalysisExpertPerformanceEntry {
  expertId: string
  expertName: string
  layer: StockAnalysisExpertLayer
  predictionCount: number
  correctCount: number
  winRate: number
  averageConfidence: number
  calibration: number
  weight: number
  lastPredictionDate: string
  recentOutcomes: StockAnalysisExpertOutcome[]
}

/** Dados resumidos sobre o desempenho individual de especialistas */
export interface StockAnalysisExpertPerformanceData {
  updatedAt: string
  entries: StockAnalysisExpertPerformanceEntry[]
}

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
  /** crise de liquidez：Volume<10thpercentil，Somente venda permitida */
  liquidityCrisisActive: boolean
  /** Proporção de posição máxima efetiva（padrão1.0，O usuário liberou a supressão da relação de posição；Apenas permanecem mercados em baixa extremos/Interceptação difícil de crise de liquidez） */
  effectiveMaxPositionRatio: number
  /** Se deve permitir a abertura de novas posições */
  newPositionsAllowed: boolean
  /** Comprar é permitido? */
  buyAllowed: boolean
  checkedAt: string
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

/** Sugestões de ajuste de parâmetros */
export interface TuningSuggestion {
  parameter: string
  currentValue: number
  suggestedValue: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
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

// ==================== Wave 2-4: depois do expediente/intradiário/Coleta de dados ====================

/** Status de monitoramento intradiário */
export type IntradayMonitorState = 'idle' | 'running' | 'paused'

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

/** Monitoramento em disco do status do tempo de execução */
export interface IntradayMonitorStatus {
  state: IntradayMonitorState
  lastPollAt: string | null
  pollCount: number
  alerts: IntradayAlert[]
  startedAt: string | null
}

/** Resultados de execução do agente de coleta de dados */
export interface DataAgentResult {
  agentId: string
  collectedAt: string
  dataPointCount: number
  successRate: number
  elapsedMs: number
  errors: string[]
}

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

// ==================== Coleta de dados Agent Configuração ====================

export type DataAgentId =
  | 'macro_economy'
  | 'policy_regulation'
  | 'company_info'
  | 'price_volume'
  | 'industry_news'
  | 'social_sentiment'
  | 'global_markets'
  | 'data_quality'

export interface DataAgentConfigItem {
  agentId: DataAgentId
  enabled: boolean
  timeoutMs: number
  priority: number
  label: string
}

export interface DataAgentConfigStore {
  version: number
  updatedAt: string
  agents: DataAgentConfigItem[]
}

// ==================== AI Análise especializada & Página de coleta de dados ====================

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

/** Entrada de memória especializada de um dia */
export interface ExpertDailyMemoryEntry {
  tradeDate: string
  expertId: string
  code: string
  name: string
  verdict: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reason: string
  /** Nomes de campos históricos herdados：A semântica atual é a taxa de retorno de liquidação de fechamento no dia da previsão. */
  actualReturnNextDay: number | null
  /** Nomes de campos históricos herdados：A semântica atual é se a liquidação de fechamento no dia da previsão está correta. */
  wasCorrect: boolean | null
}

/** Memória completa especializada */
export interface ExpertMemory {
  expertId: string
  shortTerm: { entries: ExpertDailyMemoryEntry[] }
  midTerm: {
    summary: string
    period: { from: string; to: string }
    winRate: number
    avgConfidence: number
    dominantVerdict: 'bullish' | 'bearish' | 'neutral'
    keyPatterns: string[]
    compressedAt: string
  } | null
  longTerm: {
    lessons: string[]
    strengths: string[]
    weaknesses: string[]
    updatedAt: string
  } | null
  updatedAt: string
}

/** AI Análise especializada API resposta */
export interface ExpertAnalysisResponse {
  tradeDate: string
  analyzedAt: string | null
  signalCount: number
  signals: Array<{
    id: string
    code: string
    name: string
    action: SignalAction
    compositeScore: number
    expert: {
      bullishCount: number
      bearishCount: number
      neutralCount: number
      consensus: number
      score: number
      highlights: string[]
      risks: string[]
      votes?: StockAnalysisExpertVote[]
      llmSuccessCount?: number
      llmFallbackCount?: number
      ruleFallbackCount?: number
      fallbackCount?: number
      isSimulated?: boolean
    }
    confidence: number
    decisionSource: DecisionSource
    vetoReasons: string[]
    watchReasons: string[]
  }>
  expertMemories: Record<string, ExpertMemory>
  expertMemoriesUpdatedAt: string
  dailyMemories: ExpertDailyMemoryEntry[]
}

/** AI coleta de dados API resposta */
export interface DataCollectionResponse {
  tradeDate: string
  factPool: FactPool | null
  llmExtraction: LLMExtractionResult | null
}

// ==================== Phase 12: ações auto-selecionadas (Watchlist) ====================

/** Entradas de estoque opcionais */
export interface UserWatchlistItem {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  industryName: string | null
  note: string
  addedAt: string
}

/** K pontos de dados de linha */
export interface KlinePoint {
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

/** Instantâneo do mercado em tempo real de ações autosselecionadas */
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
  volume: number
  klineHistory: KlinePoint[]
}

/** Resposta completa às ações auto-selecionadas */
export interface WatchlistResponse {
  items: UserWatchlistItem[]
  quotes: Record<string, WatchlistQuoteSnapshot>
  updatedAt: string
}

/** Entradas de resultados de pesquisa de ações */
export interface StockSearchResult {
  code: string
  name: string
  market: 'sh' | 'sz' | 'bj'
  exchange: string
  industryName?: string | null
}
