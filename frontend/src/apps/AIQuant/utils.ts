import type {
  MarketLiquidity,
  MarketRegime,
  MarketSentiment,
  MarketStyle,
  MarketTrend,
  MarketVolatility,
  PositionAction,
  SignalAction,
  StockAnalysisDataState,
  StockAnalysisRiskEventType,
  StockAnalysisRunState,
} from './types'

export function trendLabel(trend: MarketTrend) {
  switch (trend) {
    case 'bull_trend': return 'Tendência de alta'
    case 'bear_trend': return 'Tendência de baixa'
    case 'range_bound': return 'Mercado Lateral'
  }
}

export function volatilityLabel(volatility: MarketVolatility) {
  switch (volatility) {
    case 'high_volatility': return 'Alta volatilidade'
    case 'normal_volatility': return 'flutuações normais'
    case 'low_volatility': return 'baixa volatilidade'
  }
}

export function liquidityLabel(liquidity: MarketLiquidity) {
  switch (liquidity) {
    case 'high_liquidity': return 'Alta liquidez'
    case 'normal_liquidity': return 'liquidez normal'
    case 'low_liquidity': return 'baixa liquidez'
  }
}

export function sentimentLabel(sentiment: MarketSentiment) {
  switch (sentiment) {
    case 'optimistic': return 'Otimista'
    case 'neutral': return 'neutro'
    case 'pessimistic': return 'Mais pessimista'
  }
}

export function styleLabel(style: MarketStyle) {
  switch (style) {
    case 'large_cap': return 'Estilo de mercado'
    case 'small_cap': return 'estilo de boné pequeno'
    case 'balanced': return 'Estilo equilibrado'
  }
}

export function marketRegimeLabel(regime: MarketRegime) {
  switch (regime) {
    case 'bull_trend': return 'Tendência de alta'
    case 'bear_trend': return 'Tendência de baixa'
    case 'high_volatility': return 'Alta volatilidade'
    case 'low_volatility_range': return 'Lateralidade de baixa volatilidade'
    case 'normal_range': return 'Lateralidade normal'
  }
}

export function percentTone(value: number) {
  if (value > 0) return 'text-red-600'
  if (value < 0) return 'text-green-600'
  return 'text-slate-700'
}

export function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

/** preço de formato seguro，Compatível com campos que podem estar faltando em dados mais antigos */
export function formatPrice(value: number | undefined | null): string {
  return value != null ? value.toFixed(2) : '--'
}

export function signalBadge(signal: SignalAction) {
  switch (signal) {
    case 'strong_buy': return 'bg-red-100 text-red-700'
    case 'buy': return 'bg-indigo-100 text-indigo-700'
    case 'watch': return 'bg-amber-100 text-amber-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

export function signalLabel(signal: SignalAction) {
  switch (signal) {
    case 'strong_buy': return 'Compra forte'
    case 'buy': return 'comprar'
    case 'watch': return 'espere e veja'
    case 'sell': return 'vender'
    case 'hold': return 'segurar'
    case 'none': return 'Nenhuma ação'
  }
}

export function positionBadge(action: PositionAction) {
  switch (action) {
    case 'stop_loss': return 'bg-red-100 text-red-700'
    case 'take_profit': return 'bg-indigo-100 text-indigo-700'
    case 'reduce': return 'bg-amber-100 text-amber-700'
    case 'review': return 'bg-slate-100 text-slate-700'
    default: return 'bg-green-100 text-green-700'
  }
}

export function positionLabel(action: PositionAction) {
  switch (action) {
    case 'stop_loss': return 'parar a perda'
    case 'take_profit': return 'Obtenha lucro'
    case 'reduce': return 'Reduzir posições'
    case 'review': return 'Revisão devida'
    case 'swap': return 'Posições de câmbio'
    default: return 'continuar a segurar'
  }
}

export function dataStateLabel(state: StockAnalysisDataState) {
  switch (state) {
    case 'ready': return 'Os dados estão normais'
    case 'stale': return 'Use dados substitutos'
    case 'empty': return 'Nenhum instantâneo disponível ainda'
  }
}

export function runStateLabel(state: StockAnalysisRunState) {
  switch (state) {
    case 'idle': return 'parado'
    case 'running': return 'Correndo'
    case 'success': return 'Executado recentemente com sucesso'
    case 'failed': return 'Falha na execução recente'
  }
}

export function riskEventTypeLabel(eventType: StockAnalysisRiskEventType): string {
  switch (eventType) {
    case 'daily_loss_breached': return 'Gatilho de perda intradiária'
    case 'weekly_loss_breached': return 'Gatilho de perda semanal'
    case 'monthly_loss_breached': return 'gatilho de perda mensal'
    case 'max_drawdown_breached': return 'Gatilho de retração máxima'
    case 'pause_triggered': return 'Novo limite de posição acionado'
    case 'trailing_stop_triggered': return 'Trailing stop acionado'
    case 'veto_max_positions': return 'veto: A posição está cheia'
    case 'veto_blacklist': return 'veto: lista negra'
    case 'veto_paused': return 'veto: Suspenso'
  }
}

export function riskEventTypeBadge(eventType: StockAnalysisRiskEventType): string {
  switch (eventType) {
    case 'daily_loss_breached':
    case 'weekly_loss_breached':
    case 'monthly_loss_breached':
    case 'max_drawdown_breached':
    case 'pause_triggered':
      return 'bg-red-100 text-red-700'
    case 'trailing_stop_triggered':
      return 'bg-amber-100 text-amber-700'
    case 'veto_max_positions':
    case 'veto_blacklist':
    case 'veto_paused':
      return 'bg-slate-100 text-slate-700'
  }
}

/** Rótulos chineses para fontes de decisão + estilo（Distinguir com base em ações de sinalização"Confirmar compra"e"Confirme espere e veja"） */
export function decisionSourceLabel(source: string, signalAction?: string): { label: string; badge: string } {
  switch (source) {
    case 'user_confirmed': {
      const isWatch = signalAction === 'watch' || signalAction === 'none'
      return isWatch
        ? { label: 'Confirmado para esperar e ver', badge: 'bg-blue-100 text-blue-700' }
        : { label: 'Compra confirmada', badge: 'bg-green-100 text-green-700' }
    }
    case 'user_override': return { label: 'Já comprei ativamente', badge: 'bg-green-100 text-green-700' }
    case 'user_rejected': return { label: 'Abandonado', badge: 'bg-amber-100 text-amber-700' }
    case 'user_ignored': return { label: 'Ignorado', badge: 'bg-slate-100 text-slate-600' }
    case 'system_auto_buy': return { label: 'O sistema compra automaticamente', badge: 'bg-emerald-100 text-emerald-700' }
    case 'system_auto_ignore': return { label: 'O sistema ignora automaticamente', badge: 'bg-slate-100 text-slate-500' }
    default: return { label: 'Pendente', badge: 'bg-blue-100 text-blue-700' }
  }
}

export function isTPlusOneBlocked(openedAt: string, now: Date = new Date()) {
  return openedAt.slice(0, 10) === now.toISOString().slice(0, 10)
}

export function getHoldingDaysFromOpenedAt(openedAt: string, now: Date = new Date()) {
  const openedAtMs = new Date(openedAt).getTime()
  const diffMs = now.getTime() - openedAtMs
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}
