import type {
  StockAnalysisOverview,
  StockAnalysisPosition,
  StockAnalysisPortfolioRiskLimits,
  StockAnalysisRiskControlState,
  StockAnalysisRiskEvent,
  MarketLevelRiskState,
} from '../types'
import {
  formatPercent,
  getHoldingDaysFromOpenedAt,
  isTPlusOneBlocked,
  percentTone,
  positionBadge,
  positionLabel,
  riskEventTypeBadge,
  riskEventTypeLabel,
  sentimentLabel,
  volatilityLabel,
} from '../utils'

/* ---------- Limite padrão（quando riskLimits Usado quando não fornecido） ---------- */
const DEFAULT_LIMITS: StockAnalysisPortfolioRiskLimits = {
  maxDailyLossPercent: 10,
  maxWeeklyLossPercent: 20,
  maxMonthlyLossPercent: 30,
  maxDrawdownPercent: 15,
}

/* ---------- subcomponente ---------- */

function RiskIndicator({ label, value, limit, breached }: { label: string; value: number; limit: number; breached: boolean }) {
  const ratio = Math.min(Math.abs(value) / limit, 1)
  const barColor = breached ? 'bg-red-500' : ratio > 0.7 ? 'bg-amber-400' : 'bg-green-400'
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={breached ? 'text-red-600 font-bold' : 'text-slate-500'}>
          {formatPercent(value)} / -{limit}%
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

/** Painel de controle de risco em nível de mercado — mercado de baixa extrema/extrema volatilidade/crise de liquidez */
function MarketLevelRiskPanel({ risk }: { risk: MarketLevelRiskState | null | undefined }) {
  if (!risk) return null

  const anyActive = risk.extremeBearActive || risk.extremeVolatilityActive || risk.liquidityCrisisActive
  const borderColor = anyActive ? 'border-red-300 bg-red-50/30' : 'border-green-200 bg-green-50/20'
  const headerDot = anyActive ? 'bg-red-500' : 'bg-green-500'
  const headerBadge = anyActive
    ? 'bg-red-100 text-red-700'
    : 'bg-green-100 text-green-700'

  const items: Array<{ label: string; description: string; active: boolean }> = [
    {
      label: 'mercado de baixa extrema',
      description: risk.extremeBearActive ? '20diminuição diária>10%，Limitar novas posições' : '20O declínio diário é normal',
      active: risk.extremeBearActive,
    },
    {
      label: 'extrema volatilidade',
      description: risk.extremeVolatilityActive ? 'Volatilidade>95th，O limite de posição é reduzido para50%' : 'A volatilidade está dentro da faixa normal',
      active: risk.extremeVolatilityActive,
    },
    {
      label: 'crise de liquidez',
      description: risk.liquidityCrisisActive ? 'Volume<10th，Somente venda permitida' : 'O volume de negociação é normal',
      active: risk.liquidityCrisisActive,
    },
  ]

  return (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${borderColor}`}>
      <div className="px-4 py-3 border-b border-slate-100/60 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${headerDot}`} />
          <h3 className="font-semibold text-slate-700 text-sm">Controle de risco em nível de mercado</h3>
        </div>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${headerBadge}`}>
          {anyActive ? 'Abertura de posição restrita' : 'normal'}
        </span>
      </div>
      <div className="p-3 space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.active ? 'bg-red-500' : 'bg-green-500'}`} />
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${item.active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {item.description}
              </span>
            </div>
          </div>
        ))}
        <div className="pt-1 border-t border-slate-100 mt-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Limite de posição efetivo</span>
            <span className="font-medium text-slate-700">{Math.round(risk.effectiveMaxPositionRatio * 100)}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>Permitido abrir uma posição</span>
            <span className={`font-medium ${risk.newPositionsAllowed ? 'text-green-700' : 'text-red-700'}`}>{risk.newPositionsAllowed ? 'sim' : 'não'}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>Compra permitida</span>
            <span className={`font-medium ${risk.buyAllowed ? 'text-green-700' : 'text-red-700'}`}>{risk.buyAllowed ? 'sim' : 'não'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Painel avançado de controle de risco — status de condição de veto */
function PreTradePanel({ overview }: { overview: StockAnalysisOverview }) {
  const riskControl = overview.systemStatus.riskControl
  const maxPositions = overview.stats.maxPositions ?? 3
  const currentPositions = overview.positions.length
  const isFull = currentPositions >= maxPositions
  const isPaused = riskControl?.paused ?? false

  const items: Array<{ label: string; ok: boolean; detail: string }> = [
    {
      label: 'Limites de posição',
      ok: !isFull,
      detail: isFull ? `A posição está cheia (${currentPositions}/${maxPositions})` : `${currentPositions}/${maxPositions}`,
    },
    {
      label: 'Novo limite de posição',
      ok: !isPaused,
      detail: isPaused ? 'Restrito' : 'Ilimitado',
    },
    {
      label: 'Limite de controle de risco',
      ok: !(riskControl?.dailyLossBreached || riskControl?.weeklyLossBreached || riskControl?.monthlyLossBreached || riskControl?.maxDrawdownBreached),
      detail: riskControl?.dailyLossBreached ? 'Perda intradiária excede limite' : riskControl?.weeklyLossBreached ? 'Limite semanal excedido' : riskControl?.monthlyLossBreached ? 'Excesso mensal' : riskControl?.maxDrawdownBreached ? 'A retração excede o limite' : 'normal',
    },
  ]

  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <h3 className="font-semibold text-slate-700 text-sm">Controle prévio de risco — Condição de veto</h3>
      </div>
      <div className="p-3 space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${item.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.detail}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Painel de controle de risco em nível de sistema — dia/semana/Perda mensal e distância limite */
function SystemRiskPanel({ riskControl, limits }: { riskControl: StockAnalysisRiskControlState | undefined; limits: StockAnalysisPortfolioRiskLimits }) {
  const rc = riskControl ?? {
    paused: false, pauseReason: null, pausedAt: null,
    dailyLossPercent: 0, weeklyLossPercent: 0, monthlyLossPercent: 0, maxDrawdownPercent: 0,
    dailyLossBreached: false, weeklyLossBreached: false, monthlyLossBreached: false, maxDrawdownBreached: false,
    lastCheckedAt: null,
  }

  const anyBreached = rc.dailyLossBreached || rc.weeklyLossBreached || rc.monthlyLossBreached || rc.maxDrawdownBreached
  const statusColor = rc.paused ? 'border-red-300 bg-red-50/50' : anyBreached ? 'border-amber-300 bg-amber-50/50' : 'border-green-200 bg-green-50/30'
  const statusText = rc.paused ? 'Novas vagas são limitadas' : anyBreached ? 'gatilho parcial' : 'normal'
  const statusDot = rc.paused ? 'bg-red-500' : anyBreached ? 'bg-amber-500' : 'bg-green-500'

  return (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${statusColor}`}>
      <div className="px-4 py-3 border-b border-slate-100/60 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDot}`} />
          <h3 className="font-semibold text-slate-700 text-sm">Controle de risco em nível de sistema — Limite de combinação</h3>
        </div>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${rc.paused ? 'bg-red-100 text-red-700' : anyBreached ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
          {statusText}
        </span>
      </div>
      <div className="p-3 space-y-2.5">
        {rc.paused ? (
          <div className="bg-red-100 text-red-700 text-xs p-2.5 rounded-lg">
            <p className="font-bold">O controle de risco da carteira restringiu novas posições</p>
            <p className="mt-0.5">{rc.pauseReason}</p>
          </div>
        ) : null}
        <RiskIndicator label="perda intradiária" value={rc.dailyLossPercent} limit={limits.maxDailyLossPercent} breached={rc.dailyLossBreached} />
        <RiskIndicator label="perda semanal" value={rc.weeklyLossPercent} limit={limits.maxWeeklyLossPercent} breached={rc.weeklyLossBreached} />
        <RiskIndicator label="perda mensal" value={rc.monthlyLossPercent} limit={limits.maxMonthlyLossPercent} breached={rc.monthlyLossBreached} />
        <RiskIndicator label="rebaixamento máximo" value={-rc.maxDrawdownPercent} limit={limits.maxDrawdownPercent} breached={rc.maxDrawdownBreached} />
      </div>
    </div>
  )
}

/** painel de controle de vento incidente — Monitoramento individual da posição de estoque（Com stop loss） */
function InTradePanel({ overview, onClosePosition, onReducePosition, actionLoading, tradingStatus }: { overview: StockAnalysisOverview; onClosePosition: (position: StockAnalysisPosition) => void; onReducePosition: (position: StockAnalysisPosition, weightDelta: number) => void; actionLoading: boolean; tradingStatus: { canTrade: boolean; reason: string | null } }) {
  const evaluations = overview.positionEvaluations ?? []
  const evalMap = new Map(evaluations.map((ev) => [ev.positionId, ev]))

  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 text-sm">Controle de risco — Monitoramento individual da posição de estoque</h3>
        <span className="text-xs text-slate-500">participação acionária: {overview.positions.length}/3</span>
      </div>
      {overview.positions.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma posição aberta no momento</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {overview.positions.map((position) => {
            const evaluation = evalMap.get(position.id)
            const tPlusOneBlocked = isTPlusOneBlocked(position.openedAt)
            const effectiveHoldingDays = getHoldingDaysFromOpenedAt(position.openedAt)
            const tradeBlockedReason = tPlusOneBlocked
              ? 'Acompartilhar T+1：Compre hoje，Só pode ser vendido no próximo dia de negociação'
              : (!tradingStatus.canTrade ? tradingStatus.reason ?? 'horário sem negociação' : '')
            return (
              <div key={position.id} className="px-4 py-3">
                {/* cabeça：Nome da ação + Lucro e perda + operar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{position.name}</span>
                    <span className="text-slate-400 text-xs">{position.code}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${positionBadge(position.action)}`}>
                      {positionLabel(position.action)}
                    </span>
                  </div>
                   <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${percentTone(position.returnPercent)}`}>
                      {formatPercent(position.returnPercent)}
                    </span>
                    {position.weight >= 0.02 ? (
                      <button
                        disabled={actionLoading || !tradingStatus.canTrade || tPlusOneBlocked}
                        title={tradeBlockedReason}
                        onClick={() => onReducePosition(position, position.weight / 2)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        dividido pela metade
                      </button>
                    ) : null}
                    <button
                      disabled={actionLoading || !tradingStatus.canTrade || tPlusOneBlocked}
                      title={tradeBlockedReason}
                      onClick={() => onClosePosition(position)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Fechar posição
                    </button>
                  </div>
                </div>

                {/* Detalhes da posição + Pare a perda e obtenha lucro uma linha */}
                <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
                  <span className="text-slate-500">segurar {effectiveHoldingDays} céu</span>
                  <span className="text-slate-500">comprar {new Date(position.openedAt).toLocaleString('zh-CN')}</span>
                  <span className="text-slate-500">custo {position.costPrice.toFixed(2)}</span>
                  <span className="text-slate-500">Preço atual {position.currentPrice.toFixed(2)}</span>
                  <span className="text-slate-500">posição {(position.weight * 100).toFixed(0)}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                    Obtenha lucro {position.takeProfitPrice1.toFixed(2)}/{position.takeProfitPrice2.toFixed(2)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    parar a perda {position.stopLossPrice.toFixed(2)}
                  </span>
                  {position.trailingStopEnabled ? (
                    <span className={`px-1.5 py-0.5 rounded border ${position.returnPercent >= 3 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      Parada final {position.returnPercent >= 3 ? `Ativado` : 'Para ser ativado'}
                    </span>
                  ) : null}
                  {tPlusOneBlocked ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      T+1 Restrito，Não disponível para venda hoje
                    </span>
                  ) : null}
                </div>

                {/* Mudanças de classificação em tempo real（Se houver） */}
                {evaluation ? (
                  <div className="mt-2 bg-slate-50/70 rounded-lg p-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">Base de compra <span className="font-medium text-slate-700">{evaluation.buyCompositeScore}</span></span>
                      <span className="text-slate-500">base atual <span className={`font-medium ${evaluation.scoreDelta < -10 ? 'text-red-600' : 'text-slate-700'}`}>{evaluation.currentCompositeScore}</span></span>
                      <span className="text-slate-500">Diferença básica de pontos <span className={`font-medium ${evaluation.scoreDelta < 0 ? 'text-red-600' : 'text-green-600'}`}>{evaluation.scoreDelta > 0 ? '+' : ''}{evaluation.scoreDelta}</span></span>
                      <span className="text-slate-500">final atual <span className="font-medium text-slate-700">{evaluation.currentFinalScore}</span></span>
                      <span className="text-slate-500">Consenso de especialistas <span className="font-medium text-slate-700">{evaluation.expertConsensus.toFixed(2)}</span></span>
                      {evaluation.sellRecommended ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold ml-auto">{evaluation.sellReasonText}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 ml-auto">normal</span>
                      )}
                    </div>
                  </div>
                ) : null}

                {position.actionReason ? (
                  <p className="mt-1.5 text-xs text-slate-500">{position.actionReason}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Painel de controle de risco pós-evento — Resumo da revisão */
function PostTradePanel({ overview }: { overview: StockAnalysisOverview }) {
  const reviews = overview.recentReviews ?? []
  if (reviews.length === 0) return null

  const wins = reviews.filter((r) => r.pnlPercent > 0).length
  const losses = reviews.filter((r) => r.pnlPercent < 0).length
  const avgPnl = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.pnlPercent, 0) / reviews.length : 0

  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 text-sm">Controle de risco pós-evento — Revisão de transação</h3>
        <div className="flex gap-2 text-xs text-slate-500">
          <span>excedente <span className="text-red-600 font-bold">{wins}</span></span>
          <span>déficit <span className="text-green-600 font-bold">{losses}</span></span>
          <span>todos <span className={`font-bold ${percentTone(avgPnl)}`}>{formatPercent(avgPnl)}</span></span>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {reviews.slice(0, 5).map((review) => (
          <div key={review.id} className="px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800 text-sm">{review.name}</span>
                <span className="text-slate-400 text-xs">{review.code}</span>
              </div>
              <span className={`text-sm font-bold ${review.pnlPercent >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatPercent(review.pnlPercent)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              <span>{review.holdingDays}céu</span>
              <span>comprar {review.buyPrice.toFixed(2)}</span>
              <span>Vender {review.sellPrice.toFixed(2)}</span>
              <span>Pontuação abrangente {review.buyCompositeScore}</span>
              {review.buyMarketRegime ? <span>{review.buyMarketRegime}</span> : null}
              <span>{review.sellReason}</span>
            </div>
            {review.lessonsLearned.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {review.lessonsLearned.map((lesson, index) => (
                  <span key={index} className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{lesson}</span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Cronograma do evento de controle de risco */
function RiskEventTimeline({ events }: { events: StockAnalysisRiskEvent[] }) {
  if (events.length === 0) return null

  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 text-sm">Cronograma do evento de controle de risco</h3>
        <span className="text-xs text-slate-500">recente {events.length} tira</span>
      </div>
      <div className="p-3">
        <div className="relative">
          <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-200" />
          <div className="space-y-2.5">
            {events.map((event) => (
              <div key={event.id} className="relative pl-7">
                <div className={`absolute left-1 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                  event.eventType.includes('breached') || event.eventType === 'pause_triggered' ? 'bg-red-500' :
                  event.eventType === 'trailing_stop_triggered' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <div className="bg-slate-50/70 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${riskEventTypeBadge(event.eventType)}`}>
                        {riskEventTypeLabel(event.eventType)}
                      </span>
                      {event.relatedCode ? (
                        <span className="text-xs text-slate-500 truncate">{event.relatedCode}</span>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(event.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{event.reason}</p>
                  {(event.metrics.dailyLossPercent !== undefined || event.metrics.weeklyLossPercent !== undefined || event.metrics.monthlyLossPercent !== undefined || event.metrics.maxDrawdownPercent !== undefined) ? (
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-500">
                      {event.metrics.dailyLossPercent !== undefined ? <span>dia: {formatPercent(event.metrics.dailyLossPercent)}</span> : null}
                      {event.metrics.weeklyLossPercent !== undefined ? <span>semana: {formatPercent(event.metrics.weeklyLossPercent)}</span> : null}
                      {event.metrics.monthlyLossPercent !== undefined ? <span>lua: {formatPercent(event.metrics.monthlyLossPercent)}</span> : null}
                      {event.metrics.maxDrawdownPercent !== undefined ? <span>retração: {formatPercent(-event.metrics.maxDrawdownPercent)}</span> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- componente principal ---------- */

export function RiskTab({ overview, onClosePosition, onReducePosition, actionLoading, tradingStatus }: { overview: StockAnalysisOverview; onClosePosition: (position: StockAnalysisPosition) => void; onReducePosition: (position: StockAnalysisPosition, weightDelta: number) => void; actionLoading: boolean; tradingStatus: { canTrade: boolean; reason: string | null } }) {
  const totalPosition = overview.positions.reduce((sum, position) => sum + position.weight, 0)
  const riskControl = overview.systemStatus.riskControl
  const limits = overview.riskLimits ?? DEFAULT_LIMITS
  const riskEvents = overview.riskEvents ?? []

  const pauseSuggestion = riskControl?.paused
    ? `Atualmente sob restrições combinadas de controle de risco：${riskControl.pauseReason ?? 'Verifique o status do controle de risco'}`
    : overview.stats.maxDrawdown <= -10
      ? 'Perto do limite mensal，Recomendado para defender ou limpar posições。'
      : overview.marketState.trend === 'bear_trend'
        ? 'tendência de baixa，Recomenda-se controlar a posição。'
        : 'Permitir que posições selecionadas sejam abertas，Observe os limites de posição。'

  return (
    <div className="space-y-3 pb-20">
      <h2 className="text-xl font-bold text-slate-800">Painel de controle de vento de quatro camadas</h2>

      {/* Controle de risco em nível de mercado + Controle prévio de risco + Controle de risco em nível de sistema + Resumo da posição quatro colunas */}
      <div className="grid grid-cols-4 gap-3">
        <MarketLevelRiskPanel risk={overview.marketLevelRisk} />
        <PreTradePanel overview={overview} />
        <SystemRiskPanel riskControl={riskControl} limits={limits} />

        {/* posição + retração + sugestão cartão de resumo vertical */}
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
            <h3 className="font-semibold text-slate-700 text-sm">Visão geral do portfólio</h3>
          </div>
          <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-slate-500">Ocupação de posição</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-slate-800 text-lg">{Math.round(totalPosition * 100)}%</span>
                  <span className="text-xs text-slate-400">/ {Math.round((overview.marketLevelRisk?.effectiveMaxPositionRatio ?? 1.0) * 100)}%</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">rebaixamento máximo</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-slate-800 text-lg">{formatPercent(overview.stats.maxDrawdown)}</span>
                  <span className="text-xs text-slate-400">/ -{limits.maxDrawdownPercent}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex gap-2">
                <span>flutuação: {volatilityLabel(overview.marketState.volatility)}</span>
                <span>humor: {sentimentLabel(overview.marketState.sentiment)}</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">{pauseSuggestion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controle de risco + Controle de risco pós-evento esquerda e direita50% */}
      <div className="grid grid-cols-2 gap-3">
        <InTradePanel overview={overview} onClosePosition={onClosePosition} onReducePosition={onReducePosition} actionLoading={actionLoading} tradingStatus={tradingStatus} />
        <PostTradePanel overview={overview} />
      </div>

      {/* Cronograma do evento de controle de risco */}
      <RiskEventTimeline events={riskEvents} />
    </div>
  )
}
