import { useCallback, useEffect, useState } from 'react'

import { acknowledgeAllIntradayAlerts, acknowledgeIntradayAlert, acknowledgeNotification, fetchIntradayAlerts } from '../api'
import type { AutoReportNotification, IntradayAlert, StockAnalysisOverview } from '../types'
import {
  buildConvictionStats,
  buildDailyAdviceSummary,
} from '../dashboardMeta'
import {
  formatPercent,
  liquidityLabel,
  percentTone,
  sentimentLabel,
  signalBadge,
  signalLabel,
  styleLabel,
  trendLabel,
  volatilityLabel,
} from '../utils'
import {
  AdviceSection,
  InfoRow,
  MetricCard,
} from './shared'

function NotificationBanner({ notifications, onAcknowledge }: { notifications: AutoReportNotification[]; onAcknowledge: (id: string) => void }) {
  if (notifications.length === 0) return null

  return (
    <div className="space-y-2">
      {notifications.slice(0, 3).map((n) => (
        <div
          key={n.id}
          className={`rounded-xl border px-4 py-3 text-sm ${
            n.type === 'monthly_report'
              ? 'border-purple-200 bg-purple-50/70'
              : 'border-blue-200 bg-blue-50/70'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                  n.type === 'monthly_report'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {n.type === 'monthly_report' ? 'relatório mensal' : 'semanalmente'}
                </span>
                <span className="font-semibold text-slate-800">{n.title}</span>
                <span className="text-xs text-slate-400">{new Date(n.generatedAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">{n.summary}</p>
            </div>
            <button
              onClick={() => onAcknowledge(n.id)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              Ler
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  stop_loss: 'parar a perda',
  take_profit_1: 'Obtenha lucro1',
  take_profit_2: 'Obtenha lucro2',
  trailing_stop: 'Parada final',
  daily_loss_limit: 'Limite diário de perdas',
  max_hold_days: 'Posições atrasadas',
}

function IntradayAlertBanner({ alerts, onAcknowledge, onAcknowledgeAll }: { alerts: IntradayAlert[]; onAcknowledge: (id: string) => void; onAcknowledgeAll: () => void }) {
  const unacked = alerts.filter((a) => !a.acknowledged)
  if (unacked.length === 0) return null

  return (
    <div className="space-y-2">
      {unacked.length > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-red-600 font-medium">{unacked.length} alertas não lidos</span>
          <button
            onClick={onAcknowledgeAll}
            className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs text-red-600 font-medium hover:bg-red-100"
          >
            Todos lidos
          </button>
        </div>
      ) : null}
      {unacked.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          className="rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                  {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                </span>
                <span className="font-semibold text-slate-800">{alert.name} ({alert.code})</span>
                <span className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">{alert.message}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                preço atual <span className="font-bold">{alert.currentPrice.toFixed(2)}</span>
                {' / '}preço de gatilho <span className="font-bold">{alert.triggerPrice.toFixed(2)}</span>
              </p>
            </div>
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex-shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              Ler
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function IntradayMonitorBadge({ overview }: { overview: StockAnalysisOverview }) {
  const monitor = overview.systemStatus.intradayMonitor
  if (!monitor) return null

  const stateLabels: Record<string, string> = { idle: 'espera', running: 'Correndo', paused: 'Suspenso' }
  const stateColors: Record<string, string> = {
    idle: 'bg-slate-100 text-slate-600 border-slate-200',
    running: 'bg-green-50 text-green-700 border-green-200',
    paused: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${stateColors[monitor.state] ?? stateColors.idle}`}>
      {monitor.state === 'running' ? <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> : null}
      <span className="font-medium">Monitoramento intradiário: {stateLabels[monitor.state] ?? monitor.state}</span>
      {monitor.pollCount > 0 ? <span className="text-[10px] opacity-75">votação{monitor.pollCount}Segunda categoria</span> : null}
      {monitor.activeAlertCount > 0 ? <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">{monitor.activeAlertCount}Alarme</span> : null}
    </div>
  )
}

export function DashboardTab({ overview, onOverviewUpdate }: { overview: StockAnalysisOverview; onOverviewUpdate?: (overview: StockAnalysisOverview) => void }) {
  const advice = buildDailyAdviceSummary(overview)
  const conviction = buildConvictionStats(overview.topSignals, overview.marketState)
  const [showSystemStatus, setShowSystemStatus] = useState(false)
  const [intradayAlerts, setIntradayAlerts] = useState<IntradayAlert[]>([])

  const notifications = overview.notifications ?? []
  const monitorRunning = overview.systemStatus.intradayMonitor?.state === 'running'

  // Tempo de execução do monitoramento intradiário，Todo 30 Receba alertas em segundos
  const loadAlerts = useCallback(async () => {
    try {
      const alerts = await fetchIntradayAlerts()
      setIntradayAlerts(alerts)
    } catch {
      // Falha silenciosamente
    }
  }, [])

  useEffect(() => {
    if (!monitorRunning) {
      setIntradayAlerts([])
      return
    }
    void loadAlerts()
    const timer = setInterval(() => void loadAlerts(), 30_000)
    return () => clearInterval(timer)
  }, [monitorRunning, loadAlerts])

  async function handleAcknowledge(id: string) {
    try {
      await acknowledgeNotification(id)
      if (onOverviewUpdate) {
        onOverviewUpdate({
          ...overview,
          notifications: notifications.filter((n) => n.id !== id),
        })
      }
    } catch {
      // Falha silenciosamente — Não afeta as operações do usuário
    }
  }

  async function handleAlertAcknowledge(alertId: string) {
    try {
      await acknowledgeIntradayAlert(alertId)
      setIntradayAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, acknowledged: true } : a))
    } catch {
      // Falha silenciosamente
    }
  }

  async function handleAlertAcknowledgeAll() {
    try {
      await acknowledgeAllIntradayAlerts()
      setIntradayAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))
    } catch {
      // Falha silenciosamente
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* linha do título */}
      <div className="flex items-center justify-between flex-shrink-0 mb-2">
        <h2 className="text-xl font-bold text-slate-800">Quadro de visão geral</h2>
        <span className="text-xs text-slate-400">{overview.tradeDate}</span>
      </div>

      {/* notificar / Bandeira de alerta（Só ocupa espaço quando há notificações） */}
      {(notifications.length > 0 || intradayAlerts.filter((a) => !a.acknowledged).length > 0) ? (
        <div className="flex-shrink-0 space-y-2 mb-2">
          <NotificationBanner notifications={notifications} onAcknowledge={(id) => void handleAcknowledge(id)} />
          <IntradayAlertBanner alerts={intradayAlerts} onAcknowledge={(id) => void handleAlertAcknowledge(id)} onAcknowledgeAll={() => void handleAlertAcknowledgeAll()} />
        </div>
      ) : null}

      {/* ======== Grade principal de três colunas — Preencha a altura restante ======== */}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">

        {/* ── coluna da esquerda：Sugestões de operação de hoje ── */}
        <div className="bg-white/70 border border-indigo-100 rounded-2xl p-3 shadow-sm shadow-indigo-50 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-indigo-700 text-sm">Sugestões de operação de hoje</h3>
            <span className="text-xs text-slate-500">Posição：{advice.positionUsageLabel}</span>
          </div>
          <div className="space-y-2">
            <AdviceSection title="sinal de venda" tone="red" items={advice.sells} emptyText="Atualmente não há controle de risco ou sinal de venda ativo acionado." />
            {advice.swaps.length > 0 ? <AdviceSection title="Sugestões para mudança de posição" tone="purple" items={advice.swaps} emptyText="" /> : null}
            <AdviceSection title="sinal de compra" tone="green" items={advice.buys} emptyText="Atualmente não aprovado Conviction Filter sinal de compra" />
            <AdviceSection title="espere e veja o sinal" tone="amber" items={advice.watches} emptyText="Atualmente não há metas nas quais se concentrar." />
          </div>
        </div>

        {/* ── linha do meio：Sinal mais forte hoje ── */}
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm overflow-y-auto">
          <h3 className="font-semibold text-slate-700 mb-2 text-sm">Sinal mais forte hoje</h3>
          <div className="space-y-1.5">
            {overview.topSignals.slice(0, 10).map((signal) => (
              <div key={signal.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">{signal.name} ({signal.code})</div>
                  <div className="text-xs text-slate-500">{signal.sector} | {signal.finalScore}apontar</div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${signalBadge(signal.action)}`}>{signalLabel(signal.action)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── coluna da direita：Conviction + Acompanhe esta semana + mercado de estatísticas + Status do sistema ── */}
        <div className="flex flex-col gap-2 overflow-y-auto">

          {/* Conviction Filter */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-2.5 shadow-sm space-y-1.5">
            <h3 className="font-semibold text-slate-700 text-sm">Conviction Filter</h3>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1.5 text-sm font-semibold text-indigo-700">
              {advice.stats.summaryText || 'Não há sugestões para hoje'}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <MetricCard label="Alvo de análise" value={`${advice.stats.analyzed} ações`} />
              <MetricCard label="Filtrar por" value={`${advice.stats.passed} ações`} />
              <MetricCard label="Forte Compra / Comprar" value={`${conviction.strongBuyCount} / ${conviction.buyCount}`} />
              <MetricCard label="pontuação geral média" value={conviction.avgScore.toFixed(1)} />
            </div>
          </div>

          {/* Acompanhe esta semana */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-2.5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-1.5 text-sm">Acompanhe esta semana</h3>
            <div className="space-y-1">
              {overview.weeklySummary.slice(0, 4).map((item) => (
                <div key={item.weekLabel} className="rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 text-xs">{item.weekLabel}</div>
                    <div className="text-[11px] text-slate-500">{item.tradeCount}Caneta | espere e veja{item.watchDays}céu</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${percentTone(item.weeklyReturn)}`}>{formatPercent(item.weeklyReturn)}</div>
                    <div className="text-[11px] text-slate-500">{Math.round(item.winRate * 100)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* estatísticas + situação do mercado */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-2.5 shadow-sm space-y-1.5">
            <h3 className="font-semibold text-slate-700 text-sm">estatísticas & mercado</h3>
            <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-xs">
              <span className="text-slate-500">pool de ações <span className="font-bold text-slate-800">{overview.stats.stockPoolSize}</span></span>
              <span className="text-slate-500">candidato <span className="font-bold text-slate-800">{overview.stats.candidatePoolSize}</span></span>
              <span className="text-slate-500">passar <span className="font-bold text-red-600">{overview.stats.passingSignals}</span></span>
              <span className="text-slate-500">taxa de vitórias <span className="font-bold text-red-600">{Math.round(overview.stats.winRate * 100)}%</span></span>
              <span className="text-slate-500">Total geral <span className={`font-bold ${percentTone(overview.stats.cumulativeReturn)}`}>{formatPercent(overview.stats.cumulativeReturn)}</span></span>
              <span className="text-slate-500">retração <span className={`font-bold ${percentTone(overview.stats.maxDrawdown)}`}>{formatPercent(overview.stats.maxDrawdown)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 border-t border-slate-100">
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-700">{trendLabel(overview.marketState.trend)}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-700">{volatilityLabel(overview.marketState.volatility)}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-700">{liquidityLabel(overview.marketState.liquidity)}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-700">{sentimentLabel(overview.marketState.sentiment)}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-700">{styleLabel(overview.marketState.style)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>20dia <span className={`font-bold ${percentTone(overview.marketState.csi500Return20d)}`}>{formatPercent(overview.marketState.csi500Return20d)}</span></span>
              <span>flutuação <span className="font-bold">{overview.marketState.annualizedVolatility20d.toFixed(1)}%</span></span>
              <span>ascender <span className="font-bold">{Math.round(overview.marketState.risingRatio * 100)}%</span></span>
            </div>
          </div>

          {/* Status do sistema */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSystemStatus(!showSystemStatus)}
              className="w-full px-2.5 py-2 flex items-center justify-between text-sm hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 text-sm">Status do sistema</span>
                <IntradayMonitorBadge overview={overview} />
              </div>
              <span className="text-xs text-slate-400">{showSystemStatus ? 'fechar' : 'Expandir'}</span>
            </button>
            {showSystemStatus ? (
              <div className="px-2.5 pb-2 space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-1.5">
                <InfoRow label="última corrida" value={overview.systemStatus.lastRunAt ? new Date(overview.systemStatus.lastRunAt).toLocaleString('zh-CN') : 'Não está em execução'} />
                <InfoRow label="sucesso recente" value={overview.systemStatus.lastSuccessAt ? new Date(overview.systemStatus.lastSuccessAt).toLocaleString('zh-CN') : 'Nenhum'} />
                <InfoRow label="Análise após o expediente" value={overview.systemStatus.postMarketAt ? new Date(overview.systemStatus.postMarketAt).toLocaleString('zh-CN') : 'Nenhum'} />
                <InfoRow label="Atualização do pool de estoque" value={overview.systemStatus.stockPoolRefreshedAt ? new Date(overview.systemStatus.stockPoolRefreshedAt).toLocaleString('zh-CN') : 'Nenhum'} />
                {overview.systemStatus.intradayMonitor ? (
                  <InfoRow label="Monitoramento intradiário" value={
                    overview.systemStatus.intradayMonitor.state === 'running'
                      ? `Correndo (votação${overview.systemStatus.intradayMonitor.pollCount}Segunda categoria${overview.systemStatus.intradayMonitor.lastPollAt ? `, recente ${new Date(overview.systemStatus.intradayMonitor.lastPollAt).toLocaleTimeString('zh-CN')}` : ''})`
                      : overview.systemStatus.intradayMonitor.state === 'paused' ? 'Suspenso' : 'espera'
                  } />
                ) : null}
                <InfoRow label="diretório de dados" value={overview.stockAnalysisDir} mono />
                {overview.systemStatus.lastError ? <p className="rounded-lg bg-red-50 border border-red-100 p-1.5 text-red-600 text-xs">erros recentes: {overview.systemStatus.lastError}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
