import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowPathIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  StarIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import {
  bootstrapStockAnalysis,
  closeStockAnalysisPosition,
  confirmStockAnalysisSignal,
  dismissPositionAction,
  fetchStockAnalysisConfig,
  fetchIntradayAlerts,
  fetchStockAnalysisOverview,
  fetchTradingStatus,
  ignoreStockAnalysisSignal,
  reduceStockAnalysisPosition,
  refreshStockAnalysisStockPool,
  rejectStockAnalysisSignal,
  runStockAnalysisDaily,
  autoExecuteDailyStrategy,
  runStockAnalysisPostMarket,
  startIntradayMonitor,
  stopIntradayMonitor,
} from './AIQuant/api'
import { getAutoRefreshIntervalMs, getMsUntilNextMarketBoundary } from './AIQuant/autoRefresh'
import {
  shouldEscalateManualActionFailure,
  shouldNotifyIntradayRisk,
  shouldNotifyPositionRisk,
  shouldShowInAIRiskHistory,
} from './AIQuant/notificationPolicy'
import type {
  IntradayAlert,
  StockAnalysisOverview,
  StockAnalysisPortfolioRiskLimits,
  StockAnalysisPosition,
  StockAnalysisSignal,
  StockAnalysisStrategyConfig,
} from './AIQuant/types'
import {
  dataStateLabel,
  positionLabel,
  signalLabel,
  trendLabel,
  volatilityLabel,
} from './AIQuant/utils'
import {
  ErrorState,
  LoadingState,
  StatusBanner,
  TabButton,
} from './AIQuant/components/shared'
import type { Tab } from './AIQuant/components/shared'
import { DashboardTab } from './AIQuant/components/DashboardTab'
import { StrategiesTab } from './AIQuant/components/StrategiesTab'
import { RiskTab } from './AIQuant/components/RiskTab'
import { MemoryTab } from './AIQuant/components/MemoryTab'
import { ProfileTab } from './AIQuant/components/ProfileTab'
import { GlobalSettingsTab } from './AIQuant/components/GlobalSettingsTab'
import { AIConfigTab } from './AIQuant/components/AIConfigTab'
import { GuideTab } from './AIQuant/components/GuideTab'
import { ExpertAnalysisTab } from './AIQuant/components/ExpertAnalysisTab'
import { DataCollectionTab } from './AIQuant/components/DataCollectionTab'
import { WatchlistTab } from './AIQuant/components/WatchlistTab'
import { createAppNotifier } from './notify'
import { useNotificationStore } from '../store/useNotificationStore'

type ActionMode = 'confirm' | 'reject' | 'ignore' | 'acknowledge' | 'override_buy' | null

// ==================== Toast Sistema de notificação ====================

interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
}

const TOAST_AUTO_DISMISS_MS = 4000
let nextToastId = 1
const notifyAIQuant = createAppNotifier('aiquant')
const ACTIONABLE_POSITION_ACTIONS = new Set(['stop_loss', 'take_profit', 'reduce', 'review'])

const INTRADAY_ALERT_LABELS: Record<string, string> = {
  stop_loss: 'parar a perda',
  take_profit_1: 'Obtenha lucro1',
  take_profit_2: 'Obtenha lucro2',
  trailing_stop: 'Parada final',
  daily_loss_limit: 'Limite diário de perdas',
  max_hold_days: 'Posições atrasadas',
  volatility_spike: 'Flutuações anormais',
  sector_anomaly: 'Anomalia do setor',
}

function getIntradayAlertLevel(alertType: IntradayAlert['alertType']): 'info' | 'success' | 'warning' | 'error' {
  switch (alertType) {
    case 'stop_loss':
    case 'daily_loss_limit':
    case 'trailing_stop':
      return 'error'
    case 'take_profit_1':
    case 'take_profit_2':
      return 'success'
    default:
      return 'warning'
  }
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg animate-fade-in ${t.tone === 'success' ? 'bg-green-600' : t.tone === 'error' ? 'bg-red-600' : 'bg-slate-700'}`}
        >
          {t.tone === 'success' ? <CheckCircleIcon className="w-5 h-5 shrink-0" /> : <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />}
          <span className="flex-1 break-words">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 p-0.5 rounded hover:bg-white/20">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

type TradeConfirmState =
  | {
      kind: 'buy'
      title: string
      confirmLabel: string
      riskTone: 'critical' | 'high'
      summary: string
      bullets: string[]
      onConfirm: () => Promise<void>
    }
  | {
      kind: 'close' | 'reduce'
      title: string
      confirmLabel: string
      riskTone: 'critical' | 'high'
      summary: string
      bullets: string[]
      onConfirm: () => Promise<void>
    }

const DEFAULT_LIMITS: StockAnalysisPortfolioRiskLimits = {
  maxDailyLossPercent: 3,
  maxWeeklyLossPercent: 6,
  maxMonthlyLossPercent: 30,
  maxDrawdownPercent: 15,
}

function TradeConfirmDialog({
  state,
  overview,
  tradingStatus,
  actionLoading,
  onCancel,
  onConfirm,
}: {
  state: TradeConfirmState
  overview: StockAnalysisOverview
  tradingStatus: { canTrade: boolean; reason: string | null }
  actionLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const riskControl = overview.systemStatus.riskControl
  const limits = overview.riskLimits ?? DEFAULT_LIMITS
  const riskClass = state.riskTone === 'critical'
    ? 'border-red-200 bg-red-50/80'
    : 'border-amber-200 bg-amber-50/80'
  const badgeClass = state.riskTone === 'critical'
    ? 'bg-red-100 text-red-700'
    : 'bg-amber-100 text-amber-700'

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/60 bg-white/70 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeClass}`}>{state.riskTone === 'critical' ? 'Confirmação de alto risco' : 'Confirmação importante'}</span>
              <span className="text-xs text-slate-400">Resumo do risco pré-negociação</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800">{state.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{state.summary}</p>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className={`rounded-2xl border p-4 ${riskClass}`}>
            <div className="text-sm font-semibold text-slate-800 mb-2">A ação que você está prestes a realizar</div>
            <div className="space-y-1 text-sm text-slate-700">
              {state.bullets.map((bullet) => (
                <p key={bullet}>- {bullet}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Status de controle de risco combinado</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <p>perda intradiária：<span className={riskControl.dailyLossBreached ? 'font-bold text-red-600' : 'font-medium text-slate-800'}>{riskControl.dailyLossPercent.toFixed(2)}% / -{limits.maxDailyLossPercent}%</span></p>
                <p>perda semanal：<span className={riskControl.weeklyLossBreached ? 'font-bold text-red-600' : 'font-medium text-slate-800'}>{riskControl.weeklyLossPercent.toFixed(2)}% / -{limits.maxWeeklyLossPercent}%</span></p>
                <p>rebaixamento máximo：<span className={riskControl.maxDrawdownBreached ? 'font-bold text-red-600' : 'font-medium text-slate-800'}>{riskControl.maxDrawdownPercent.toFixed(2)}% / {limits.maxDrawdownPercent}%</span></p>
                <p>status da transação：<span className={tradingStatus.canTrade ? 'font-medium text-green-700' : 'font-bold text-red-600'}>{tradingStatus.canTrade ? 'permitir execução' : tradingStatus.reason || 'Atualmente não negociável'}</span></p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Ambiente de Mercado e Execução</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <p>tendências de mercado：<span className="font-medium text-slate-800">{trendLabel(overview.marketState.trend)}</span></p>
                <p>Estado de flutuação：<span className="font-medium text-slate-800">{volatilityLabel(overview.marketState.volatility)}</span></p>
                <p>Status dos dados：<span className={overview.systemStatus.dataState === 'ready' ? 'font-medium text-green-700' : 'font-bold text-amber-700'}>{dataStateLabel(overview.systemStatus.dataState)}</span></p>
                <p>Posição total recomendada：<span className="font-medium text-slate-800">{Math.round(overview.positions.reduce((sum, position) => sum + position.weight, 0) * 100)}%</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200/60 bg-slate-50/70 flex justify-end gap-3">
          <button onClick={onCancel} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50">Cancelar</button>
          <button onClick={onConfirm} disabled={actionLoading} className={`px-4 py-2 rounded-xl text-white font-semibold disabled:opacity-50 ${state.riskTone === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
            {actionLoading ? 'Executando...' : state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AIQuantApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [overview, setOverview] = useState<StockAnalysisOverview | null>(null)
  const [config, setConfig] = useState<StockAnalysisStrategyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<StockAnalysisSignal | null>(null)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [note, setNote] = useState('')
  const [quantity, setQuantity] = useState(100)
  const [targetWeight, setTargetWeight] = useState(30)
  const [tradingStatus, setTradingStatus] = useState<{ canTrade: boolean; reason: string | null }>({ canTrade: false, reason: 'carregando...' })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [tradeConfirmState, setTradeConfirmState] = useState<TradeConfirmState | null>(null)
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null)
  const toastTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const positionAlertSnapshotRef = useRef<Map<string, string>>(new Map())
  const riskControlSnapshotRef = useRef<{ paused: boolean; pauseReason: string | null } | null>(null)
  const dataStateSnapshotRef = useRef<{ dataState: string; staleReasonsKey: string } | null>(null)
  const swapSuggestionSnapshotRef = useRef<string>('')
  const intradayAlertSnapshotRef = useRef<Set<string>>(new Set())
  const runtimeRefreshInFlightRef = useRef(false)
  const actionLoadingRef = useRef(false)

  const safeNotify = useCallback(async (
    title: string,
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
    options?: {
      dedupeKey?: string
      dedupeWindowMs?: number
      batchKey?: string
      batchWindowMs?: number
      batchTitle?: string
      batchMessageBuilder?: (count: number, latestMessage: string) => string
      riskPriority?: 'critical' | 'high' | 'medium'
      category?: string
      metadata?: Record<string, unknown>
    },
  ) => {
    try {
      await notifyAIQuant({
        title,
        message,
        level,
        metadata: {
          riskPriority: options?.riskPriority || (level === 'error' ? 'high' : level === 'warning' ? 'medium' : 'medium'),
          category: options?.category || 'general',
          ...(options?.metadata || {}),
        },
        dedupeKey: options?.dedupeKey,
        dedupeWindowMs: options?.dedupeWindowMs,
        batchKey: options?.batchKey,
        batchWindowMs: options?.batchWindowMs,
        batchTitle: options?.batchTitle,
        batchMessageBuilder: options?.batchMessageBuilder,
      })
    } catch {
      // A falha na notificação do sistema não afeta o processo principal de negociação de ações
    }
  }, [])
  const notifications = useNotificationStore((state) => state.notifications)
  const removeNotification = useNotificationStore((state) => state.removeNotification)
  const aiRiskNotifications = useMemo(
    () => notifications
      .filter((item) => item.appId === 'aiquant')
      .filter((item) => shouldShowInAIRiskHistory(item.metadata))
      .slice(0, 8),
    [notifications],
  )

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
  }, [])

  const showToast = useCallback((tone: Toast['tone'], message: string) => {
    const id = nextToastId++
    setToasts((prev) => [...prev.slice(-4), { id, tone, message }]) // reter no máximo5tira
    const timer = setTimeout(() => dismissToast(id), TOAST_AUTO_DISMISS_MS)
    toastTimers.current.set(id, timer)
  }, [dismissToast])

  const applyRuntimeState = useCallback((data: StockAnalysisOverview, tradingData: { canTrade: boolean; reason: string | null }) => {
    setOverview(data)
    setTradingStatus(tradingData)
    setLastRefreshAt(new Date().toISOString())
    setSelectedSignal((current) => data.topSignals.find((item) => item.id === current?.id) ?? data.topSignals[0] ?? null)
  }, [])

  const loadOverview = useCallback(async () => {
    setError(null)
    const [data, configData, tradingData] = await Promise.all([
      fetchStockAnalysisOverview(),
      fetchStockAnalysisConfig(),
      fetchTradingStatus(),
    ])
    setConfig(configData)
    applyRuntimeState(data, tradingData)
  }, [applyRuntimeState])

  const refreshRuntimeState = useCallback(async (options?: { silent?: boolean }) => {
    if (runtimeRefreshInFlightRef.current || actionLoadingRef.current) {
      return
    }

    runtimeRefreshInFlightRef.current = true
    try {
      const [data, tradingData] = await Promise.all([
        fetchStockAnalysisOverview(),
        fetchTradingStatus(),
      ])
      applyRuntimeState(data, tradingData)
    } catch (requestError) {
      if (!options?.silent) {
        throw requestError
      }
    } finally {
      runtimeRefreshInFlightRef.current = false
    }
  }, [applyRuntimeState])

  useEffect(() => {
    actionLoadingRef.current = actionLoading
  }, [actionLoading])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await bootstrapStockAnalysis()
        if (cancelled) return
        await loadOverview()
      } catch (requestError) {
        if (!cancelled) {
          setError((requestError as Error).message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (loading) {
      return
    }

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return
      }
      void refreshRuntimeState({ silent: true })
    }, getAutoRefreshIntervalMs(tradingStatus.canTrade))

    return () => {
      window.clearInterval(timer)
    }
  }, [loading, refreshRuntimeState, tradingStatus.canTrade])

  useEffect(() => {
    if (loading) {
      return
    }

    const handleFocus = () => {
      void refreshRuntimeState({ silent: true })
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshRuntimeState({ silent: true })
      }
    }

    const handleOnline = () => {
      void refreshRuntimeState({ silent: true })
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [loading, refreshRuntimeState])

  useEffect(() => {
    if (loading) {
      return
    }

    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        void refreshRuntimeState({ silent: true })
      }
    }, getMsUntilNextMarketBoundary(new Date()))

    return () => {
      window.clearTimeout(timer)
    }
  }, [lastRefreshAt, loading, refreshRuntimeState])

  const topSignal = selectedSignal ?? overview?.topSignals[0] ?? null
  const totalSuggestedPosition = useMemo(() => {
    if (!overview) return 0
    return overview.positions.reduce((sum, position) => sum + position.weight, 0)
  }, [overview])
  const autoRefreshIntervalMs = useMemo(() => getAutoRefreshIntervalMs(tradingStatus.canTrade), [tradingStatus.canTrade])

  useEffect(() => {
    if (!topSignal) return
    setTargetWeight(Math.max(1, Math.round(topSignal.suggestedPosition * 100)))
  }, [topSignal])

  async function refreshAll() {
    setActionLoading(true)
    try {
      await runStockAnalysisDaily()
      await loadOverview()
      showToast('success', 'A análise de hoje foi concluída')
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha ao executar a análise: ${message}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function autoExecuteStrategy() {
    if (actionLoading) return
    const confirmed = window.confirm(
      'Execução automática com um clique：por hoje「Compra forte」Sinais abrem posições automaticamente na ordem recomendada（cada 30%，posição total 100% limite superior），e vai「comprar」「espere e veja」Os sinais são automaticamente marcados como ignorados。\n\nConfirmar execução？',
    )
    if (!confirmed) return
    setActionLoading(true)
    try {
      const result = await autoExecuteDailyStrategy()
      await loadOverview()
      const summary = `Compra automática ${result.autoBoughtCount} ações · Ignorar automaticamente ${result.autoIgnoredCount} ações · Pular ${result.skippedCount} ações`
      showToast('success', `Execução automática com um clique：${summary}`)
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha na execução automática com um clique: ${message}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function refreshStockPool() {
    setActionLoading(true)
    try {
      await refreshStockAnalysisStockPool()
      await loadOverview()
      showToast('success', 'O pool de ações foi atualizado')
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha ao atualizar o pool de estoque: ${message}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function executeSignalAction(signal: StockAnalysisSignal, mode: Exclude<ActionMode, null>, buyQuantity: number, currentNote: string) {
    setActionLoading(true)
    try {
      let successMessage = 'Processamento de sinal concluído'

      if (mode === 'confirm') {
        await confirmStockAnalysisSignal(signal.id, {
          quantity: buyQuantity,
          weight: targetWeight / 100,
          note: currentNote.trim() || 'O usuário confirma a execução AI Estratégia',
        })
        successMessage = 'Sinal de compra confirmado'
      } else if (mode === 'acknowledge') {
        await confirmStockAnalysisSignal(signal.id, {
          note: currentNote.trim() || (signal.action === 'watch' ? 'O usuário confirma esperar para ver' : 'O usuário leu'),
        })
        successMessage = signal.action === 'watch' ? 'Confirmado para esperar e ver' : 'Marcado como lido'
      } else if (mode === 'override_buy') {
        await confirmStockAnalysisSignal(signal.id, {
          quantity: buyQuantity,
          weight: targetWeight / 100,
          note: currentNote.trim() || 'O usuário anula o conselho de esperar para ver，Compre ativamente',
        })
        successMessage = 'Comprado com base em julgamento subjetivo'
      } else if (mode === 'reject') {
        await rejectStockAnalysisSignal(signal.id, currentNote.trim())
        successMessage = 'O sinal foi abandonado'
      } else if (mode === 'ignore') {
        await ignoreStockAnalysisSignal(signal.id, currentNote.trim())
        successMessage = 'O sinal foi ignorado'
      }
      setActionMode(null)
      setNote('')
      await loadOverview()
      showToast('success', successMessage)
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha na operação do sinal: ${message}`)
      if (overview && shouldEscalateManualActionFailure({
        dataState: overview.systemStatus.dataState,
        riskPaused: overview.systemStatus.riskControl.paused,
      })) {
        void safeNotify('Falha no processamento do sinal de política', `${signal.name}（${signal.code}）：${message}`, 'error', {
          batchKey: `signal-action-failed:${mode}`,
          batchTitle: 'Falha no processamento do sinal de política',
          batchMessageBuilder: (count, latestMessage) => `${latestMessage}${count > 1 ? `（No período recente, um total de ${count} Segunda categoria）` : ''}`,
          riskPriority: 'critical',
          category: 'risk',
          batchWindowMs: 15_000,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function submitSignalAction() {
    if (!topSignal || !actionMode) return
    if ((actionMode === 'confirm' || actionMode === 'override_buy') && overview) {
      const label = actionMode === 'override_buy' ? 'Forçar compra' : 'Confirmar compra'
      const capturedSignal = topSignal
      const capturedMode = actionMode
      const capturedQuantity = quantity
      const capturedNote = note
      const reasonSummary = topSignal.reasoning.slice(0, 2)
      setTradeConfirmState({
        kind: 'buy',
        title: `${label} ${topSignal.name}（${topSignal.code}）`,
        confirmLabel: label,
        riskTone: actionMode === 'override_buy' ? 'critical' : 'high',
        summary: 'Esta operação criará uma posição real，Por favor, verifique novamente o sinal da estratégia e o status do controle de risco do portfólio antes de confirmar.。',
        bullets: [
          `Comprar quantidade：${quantity} compartilhar`,
          `ação de sinalização：${signalLabel(topSignal.action)}，Pontuação abrangente ${topSignal.finalScore}`,
          `posição alvo：${targetWeight}%（AI sugestão ${Math.round(topSignal.suggestedPosition * 100)}%）`,
          `Preço de parada de perda / Obtenha lucro um：${topSignal.stopLossPrice.toFixed(2)} / ${topSignal.takeProfitPrice1.toFixed(2)}`,
          ...(reasonSummary.length > 0 ? reasonSummary : ['Por favor, confirme se o sinal está em conformidade com seu julgamento subjetivo atual e disciplina de execução']),
        ],
        onConfirm: async () => {
          setTradeConfirmState(null)
          await executeSignalAction(capturedSignal, capturedMode, capturedQuantity, capturedNote)
        },
      })
      return
    }
    await executeSignalAction(topSignal, actionMode, quantity, note)
  }

  async function executePositionClose(position: StockAnalysisPosition) {
    setActionLoading(true)
    try {
      await closeStockAnalysisPosition(position.id, {
        note: `Os usuários fecham posições manualmente de acordo com recomendações de controle de risco ${position.name}`,
      })
      await loadOverview()
      showToast('success', `${position.name} Posição fechada`)
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha ao fechar posição: ${message}`)
      if (overview && shouldEscalateManualActionFailure({
        dataState: overview.systemStatus.dataState,
        riskPaused: overview.systemStatus.riskControl.paused,
      })) {
        void safeNotify('Falha ao fechar posição', `${position.name}（${position.code}）：${message}`, 'error', {
          batchKey: 'close-position-failed',
          batchTitle: 'Falha ao fechar posição',
          batchMessageBuilder: (count, latestMessage) => `${latestMessage}${count > 1 ? `（No período recente, um total de ${count} Segunda categoria）` : ''}`,
          riskPriority: 'critical',
          category: 'risk',
          batchWindowMs: 15_000,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function submitPositionClose(position: StockAnalysisPosition) {
    if (overview && !tradeConfirmState) {
      const capturedPosition = position
      setTradeConfirmState({
        kind: 'close',
        title: `Confirme o fechamento da posição ${position.name}（${position.code}）`,
        confirmLabel: 'Confirme o fechamento da posição',
        riskTone: position.action === 'stop_loss' ? 'critical' : 'high',
        summary: 'Esta operação venderá a posição atual de uma só vez，Irreversível após execução。',
        bullets: [
          `Posição de venda：${(position.weight * 100).toFixed(2)}% （todos）`,
          `Lucro atual：${position.returnPercent.toFixed(2)}%`,
          `Sugestões de ações atuais：${positionLabel(position.action)}`,
          `Motivo da ação：${position.actionReason}`,
          `preço de custo / Preço atual：${position.costPrice.toFixed(2)} / ${position.currentPrice.toFixed(2)}`,
        ],
        onConfirm: async () => {
          setTradeConfirmState(null)
          await executePositionClose(capturedPosition)
        },
      })
      return
    }
    await executePositionClose(position)
  }

  async function executePositionReduce(position: StockAnalysisPosition, weightDelta: number) {
    setActionLoading(true)
    try {
      const reducePct = (weightDelta * 100).toFixed(2)
      await reduceStockAnalysisPosition(position.id, {
        weightDelta,
        note: `Os usuários reduzem suas posições ${position.name} ${reducePct}% posição`,
      })
      await loadOverview()
      showToast('success', `${position.name} A posição foi reduzida ${reducePct}% posição`)
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha ao reduzir a posição: ${message}`)
      if (overview && shouldEscalateManualActionFailure({
        dataState: overview.systemStatus.dataState,
        riskPaused: overview.systemStatus.riskControl.paused,
      })) {
        void safeNotify('Falha ao reduzir a posição', `${position.name}（${position.code}）：${message}`, 'error', {
          batchKey: 'reduce-position-failed',
          batchTitle: 'Falha ao reduzir a posição',
          batchMessageBuilder: (count, latestMessage) => `${latestMessage}${count > 1 ? `（No período recente, um total de ${count} Segunda categoria）` : ''}`,
          riskPriority: 'critical',
          category: 'risk',
          batchWindowMs: 15_000,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function submitPositionReduce(position: StockAnalysisPosition, weightDelta: number) {
    if (overview && !tradeConfirmState) {
      const capturedPosition = position
      const capturedWeightDelta = weightDelta
      setTradeConfirmState({
        kind: 'reduce',
        title: `Confirmar redução de posição ${position.name}（${position.code}）`,
        confirmLabel: 'Confirmar redução de posição',
        riskTone: 'high',
        summary: 'Esta operação venderá parcialmente a posição atual，Por favor, confirme se ele atende ao seu lucro/Plano de controle de posição。',
        bullets: [
          `Reduzir proporção de posição：${(weightDelta * 100).toFixed(2)}% posição`,
          `Posição atual：${(position.weight * 100).toFixed(2)}% posição`,
          `Lucro atual：${position.returnPercent.toFixed(2)}%`,
          `Sugestões de ações atuais：${positionLabel(position.action)}`,
          `Motivo da ação：${position.actionReason}`,
        ],
        onConfirm: async () => {
          setTradeConfirmState(null)
          await executePositionReduce(capturedPosition, capturedWeightDelta)
        },
      })
      return
    }
    await executePositionReduce(position, weightDelta)
  }

  async function submitPositionDismiss(position: StockAnalysisPosition) {
    setActionLoading(true)
    try {
      await dismissPositionAction(position.id, `O usuário ignora ${position.name} de${position.action === 'stop_loss' ? 'parar a perda' : position.action === 'take_profit' ? 'Obtenha lucro' : position.action === 'reduce' ? 'Reduzir posições' : 'Avaliar'}lembrar`)
      await loadOverview()
      showToast('success', `Ignorado ${position.name} alerta de venda`)
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `ignorar o fracasso: ${message}`)
      if (overview && shouldEscalateManualActionFailure({
        dataState: overview.systemStatus.dataState,
        riskPaused: overview.systemStatus.riskControl.paused,
      })) {
        void safeNotify('Ignorar alerta de venda falhou', `${position.name}（${position.code}）：${message}`, 'error', {
          batchKey: 'dismiss-action-failed',
          batchTitle: 'Ignorar alerta de venda falhou',
          batchMessageBuilder: (count, latestMessage) => `${latestMessage}${count > 1 ? `（No período recente, um total de ${count} Segunda categoria）` : ''}`,
          riskPriority: 'critical',
          category: 'risk',
          batchWindowMs: 15_000,
        })
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function runPostMarket() {
    setActionLoading(true)
    try {
      await runStockAnalysisPostMarket()
      await loadOverview()
      showToast('success', 'Análise após o expediente concluída')
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha na análise após o expediente: ${message}`)
    } finally {
      setActionLoading(false)
    }
  }

  async function toggleIntradayMonitor() {
    setActionLoading(true)
    try {
      const isRunning = overview?.systemStatus.intradayMonitor?.state === 'running'
      if (isRunning) {
        await stopIntradayMonitor()
        showToast('info', 'O monitoramento intradiário foi interrompido')
      } else {
        await startIntradayMonitor()
        showToast('success', 'O monitoramento intradiário é iniciado')
      }
      await loadOverview()
    } catch (requestError) {
      const message = (requestError as Error).message
      showToast('error', `Falha na operação de monitoramento: ${message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const intradayRunning = overview?.systemStatus.intradayMonitor?.state === 'running'

  useEffect(() => {
    if (!overview) {
      return
    }

    const nextSnapshot = new Map<string, string>()
    const nextAlerts = overview.positions.filter((position) => ACTIONABLE_POSITION_ACTIONS.has(position.action))

    for (const position of nextAlerts) {
      const signature = `${position.action}:${position.actionReason}`
      nextSnapshot.set(position.id, signature)
    }

    if (positionAlertSnapshotRef.current.size === 0) {
      positionAlertSnapshotRef.current = nextSnapshot
      return
    }

    const previousSnapshot = positionAlertSnapshotRef.current
    for (const position of nextAlerts) {
      if (!shouldNotifyPositionRisk(position.action, intradayRunning)) {
        continue
      }
      const signature = nextSnapshot.get(position.id)
      const previousSignature = previousSnapshot.get(position.id)
      if (!signature || previousSignature === signature) {
        continue
      }

      void safeNotify(
        `Novo${positionLabel(position.action)}lembrar`,
        `${position.name}（${position.code}）：${position.actionReason}`,
        position.action === 'stop_loss' ? 'error' : position.action === 'take_profit' ? 'success' : 'warning',
        {
          batchKey: 'position-sell-alert',
          batchTitle: 'Adicionar lembrete de venda pendente',
          batchMessageBuilder: (count, latestMessage) => count > 1 ? `${latestMessage}，Também ${count - 1} Alertas de venda pendentes` : latestMessage,
          riskPriority: position.action === 'stop_loss' ? 'critical' : position.action === 'take_profit' ? 'high' : 'high',
          category: 'risk',
          batchWindowMs: 15_000,
        },
      )
    }

    positionAlertSnapshotRef.current = nextSnapshot
  }, [intradayRunning, overview, safeNotify])

  useEffect(() => {
    if (!overview) {
      return
    }

    const nextSnapshot = {
      paused: overview.systemStatus.riskControl.paused,
      pauseReason: overview.systemStatus.riskControl.pauseReason,
    }

    if (!riskControlSnapshotRef.current) {
      riskControlSnapshotRef.current = nextSnapshot
      return
    }

    const previous = riskControlSnapshotRef.current
    if (!previous.paused && nextSnapshot.paused) {
      void safeNotify(
        'O controle de risco suspendeu a negociação',
        nextSnapshot.pauseReason || 'O sistema acionou o controle de risco em nível de carteira，Verifique sua posição e status de controle de risco imediatamente',
        'error',
        {
          dedupeKey: `risk-pause:${nextSnapshot.pauseReason || 'unknown'}`,
          dedupeWindowMs: 120_000,
          riskPriority: 'critical',
          category: 'risk',
        },
      )
    } else if (previous.paused && !nextSnapshot.paused) {
      void safeNotify('A suspensão do controle de risco foi levantada', 'O sistema restaurou os recursos de transação，Por favor, opere com cautela com base nas condições do mercado', 'success', {
        dedupeKey: 'risk-pause-lifted',
        dedupeWindowMs: 120_000,
        riskPriority: 'high',
        category: 'risk',
      })
    }

    riskControlSnapshotRef.current = nextSnapshot
  }, [overview, safeNotify])

  useEffect(() => {
    if (!overview) {
      return
    }

    const nextSnapshot = {
      dataState: overview.systemStatus.dataState,
      staleReasonsKey: overview.systemStatus.staleReasons.join('|'),
    }

    if (!dataStateSnapshotRef.current) {
      dataStateSnapshotRef.current = nextSnapshot
      return
    }

    const previous = dataStateSnapshotRef.current
    const enteredRiskyDataState = previous.dataState === 'ready' && nextSnapshot.dataState !== 'ready'
    const staleReasonChanged = previous.staleReasonsKey !== nextSnapshot.staleReasonsKey && nextSnapshot.dataState !== 'ready'
    const dataRecovered = previous.dataState !== 'ready' && nextSnapshot.dataState === 'ready'

    if (enteredRiskyDataState || staleReasonChanged) {
      const summary = overview.systemStatus.staleReasons.length > 0
        ? overview.systemStatus.staleReasons.slice(0, 2).join('；')
        : overview.systemStatus.lastError || 'A análise atual usa dados instáveis，Por favor, verifique primeiro antes de fazer qualquer julgamento de transação.'
      void safeNotify('AI Status anormal dos dados de negociação de ações', summary, 'warning', {
        dedupeKey: `data-state:${nextSnapshot.dataState}:${nextSnapshot.staleReasonsKey}`,
        dedupeWindowMs: 120_000,
        riskPriority: 'high',
        category: 'data',
      })
    } else if (dataRecovered) {
      void safeNotify('AI Os dados de negociação de ações foram restaurados', 'Os dados de mercado e análise voltaram ao normal，Você pode continuar consultando as recomendações do sistema', 'success', {
        dedupeKey: 'data-state-recovered',
        dedupeWindowMs: 120_000,
        riskPriority: 'medium',
        category: 'data',
      })
    }

    dataStateSnapshotRef.current = nextSnapshot
  }, [overview, safeNotify])

  useEffect(() => {
    if (!overview) {
      return
    }

    const nextKey = overview.swapSuggestions
      .map((item) => `${item.sellPositionId}:${item.buySignalId}:${item.scoreDifference}`)
      .sort()
      .join('|')

    if (!swapSuggestionSnapshotRef.current) {
      swapSuggestionSnapshotRef.current = nextKey
      return
    }

    swapSuggestionSnapshotRef.current = nextKey
  }, [overview, safeNotify])

  useEffect(() => {
    if (!intradayRunning) {
      intradayAlertSnapshotRef.current.clear()
      return
    }

    let cancelled = false

    const loadIntradayAlerts = async () => {
      try {
        const alerts = await fetchIntradayAlerts()
        if (cancelled) {
          return
        }

        const nextActiveIds = new Set(
          alerts
            .filter((alert) => !alert.acknowledged)
            .map((alert) => alert.id),
        )

        for (const alert of alerts) {
          if (!shouldNotifyIntradayRisk(alert.alertType)) {
            continue
          }
          if (alert.acknowledged || intradayAlertSnapshotRef.current.has(alert.id)) {
            continue
          }

          void safeNotify(
            `intradiário${INTRADAY_ALERT_LABELS[alert.alertType] ?? alert.alertType}aviso prévio`,
            `${alert.name}（${alert.code}）：${alert.message}`,
            getIntradayAlertLevel(alert.alertType),
            {
              batchKey: 'intraday-alert',
              batchTitle: 'Adicionado aviso intradiário',
              batchMessageBuilder: (count, latestMessage) => count > 1 ? `${latestMessage}，Também ${count - 1} aviso prévio` : latestMessage,
              riskPriority: alert.alertType === 'stop_loss' || alert.alertType === 'daily_loss_limit' ? 'critical' : 'high',
              category: 'intraday',
              batchWindowMs: 10_000,
              metadata: {
                alertType: alert.alertType,
                code: alert.code,
              },
            },
          )
        }

        intradayAlertSnapshotRef.current = nextActiveIds
      } catch {
        // A falha na pesquisa de aviso intradiário não interrompe o processo principal
      }
    }

    void loadIntradayAlerts()
    const timer = window.setInterval(() => {
      void loadIntradayAlerts()
    }, 15_000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [intradayRunning, safeNotify])

  return (
    <div className="flex h-full w-full bg-slate-50/60 backdrop-blur-md">
      <div className="w-52 border-r border-slate-200/60 bg-white/50 flex flex-col">
        <div className="p-4 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-indigo-600" />
          <h1 className="font-bold text-slate-800">AI Negociação de ações</h1>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          <TabButton tab="dashboard" icon={<ChartBarIcon className="w-5 h-5" />} label="Quadro de visão geral" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="strategies" icon={<LightBulbIcon className="w-5 h-5" />} label="estratégia diária" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="watchlist" icon={<StarIcon className="w-5 h-5" />} label="ações auto-selecionadas" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="risk" icon={<ShieldCheckIcon className="w-5 h-5" />} label="Controle de risco de posição" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="profile" icon={<UserIcon className="w-5 h-5" />} label="perfil comportamental" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="memory" icon={<ClockIcon className="w-5 h-5" />} label="revisão de memória" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="expert_analysis" icon={<MagnifyingGlassIcon className="w-5 h-5" />} label="AIAnálise especializada" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="data_collection" icon={<CircleStackIcon className="w-5 h-5" />} label="AIcoleta de dados" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="aiconfig" icon={<CpuChipIcon className="w-5 h-5" />} label="AI Configuração" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="global_settings" icon={<Cog6ToothIcon className="w-5 h-5" />} label="Configurações globais" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton tab="guide" icon={<BookOpenIcon className="w-5 h-5" />} label="Descrição do sistema" activeTab={activeTab} onClick={setActiveTab} />
        </nav>
        {overview ? <StatusBanner overview={overview} /> : null}
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="h-14 border-b border-slate-200/60 bg-white/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${overview?.marketState.trend === 'bear_trend' ? 'bg-red-500' : overview?.marketState.trend === 'bull_trend' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-sm font-medium text-slate-700">
                mercado atual: {overview ? `${trendLabel(overview.marketState.trend)} / ${volatilityLabel(overview.marketState.volatility)}` : 'Carregando'}
              </span>
            </div>
            <div className="text-sm text-slate-500">
              Posição total recomendada: <span className="font-bold text-slate-700">{Math.round(totalSuggestedPosition * 100)}%</span>
            </div>
            {overview ? (
              <div className={`text-xs px-2 py-1 rounded-full border ${overview.systemStatus.dataState === 'ready' ? 'bg-green-50 text-green-700 border-green-200' : overview.systemStatus.dataState === 'stale' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {dataStateLabel(overview.systemStatus.dataState)}
              </div>
            ) : null}
            <div className="text-xs text-slate-400">
              Atualização automática {Math.round(autoRefreshIntervalMs / 1000)}s
              {lastRefreshAt ? ` · última atualização ${new Date(lastRefreshAt).toLocaleTimeString('zh-CN')}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void toggleIntradayMonitor()} disabled={actionLoading} title={intradayRunning ? 'Pare o monitoramento intradiário em tempo real' : 'Inicie o monitoramento do disco em tempo real，Atualize regularmente as condições e avisos do mercado'} className={`px-3 py-2 rounded-lg border text-sm font-medium disabled:opacity-50 ${intradayRunning ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'}`}>
              {intradayRunning ? 'Pare de monitorar' : 'Monitoramento intradiário'}
            </button>
            <button onClick={() => void runPostMarket()} disabled={actionLoading} title="Execute a coleta de dados após o fechamento do mercado、Análise especializada e atualizações de memória" className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Análise após o expediente
            </button>
            <button onClick={() => void refreshStockPool()} disabled={actionLoading} title="Verifique novamente e atualize a lista de pools de ações a serem analisados" className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Atualizar pool de estoque
            </button>
            <button onClick={() => void refreshAll()} disabled={actionLoading} title="Execute o processo de análise completo de hoje：Coleta de dados → Voto de especialista → geração de sinal" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              <ArrowPathIcon className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              Execute a análise de hoje
            </button>
          </div>
        </div>

        <div className={`flex-1 p-6 ${activeTab === 'watchlist' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={() => void loadOverview()} /> : overview ? (
            <>
              {aiRiskNotifications.length > 0 ? (
                <div className="mb-4 rounded-2xl border border-slate-200/60 bg-white/75 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Histórico de notificações críticas</h3>
                      <p className="text-xs text-slate-500 mt-1">exibir apenas AI Principais eventos diretamente relacionados à negociação de ações e decisões com dinheiro real</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {aiRiskNotifications.map((item) => {
                      const riskPriority = typeof item.metadata.riskPriority === 'string' ? item.metadata.riskPriority : 'medium'
                      const category = typeof item.metadata.category === 'string' ? item.metadata.category : 'general'
                      const toneClass = riskPriority === 'critical'
                        ? 'border-red-200 bg-red-50/70'
                        : riskPriority === 'high'
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-slate-200 bg-slate-50/70'
                      const badgeClass = riskPriority === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : riskPriority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      const badgeText = riskPriority === 'critical' ? 'alto risco' : riskPriority === 'high' ? 'importante' : 'focar em'
                      return (
                        <div key={item.id} className={`rounded-xl border px-4 py-3 ${toneClass}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${badgeClass}`}>{badgeText}</span>
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-white/70 text-slate-600 border border-white/80">{category}</span>
                                <span className="font-semibold text-slate-800 text-sm">{item.title}</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                            </div>
                            <div className="flex items-start gap-2 flex-shrink-0">
                              <span className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(item.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              <button
                                type="button"
                                onClick={() => void removeNotification(item.id)}
                                className="rounded-md p-1 text-slate-400 hover:bg-white/70 hover:text-slate-600"
                                title="Excluir esta notificação"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {activeTab === 'dashboard' && <DashboardTab overview={overview} onOverviewUpdate={(o) => setOverview(o)} />}
              {activeTab === 'strategies' && (
                <StrategiesTab
                  overview={overview}
                  topSignal={topSignal}
                  actionMode={actionMode}
                  setActionMode={setActionMode}
                  note={note}
                  setNote={setNote}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  targetWeight={targetWeight}
                  setTargetWeight={setTargetWeight}
                  onSubmit={() => void submitSignalAction()}
                  actionLoading={actionLoading}
                  onSelectSignal={setSelectedSignal}
                  onClosePosition={(position) => void submitPositionClose(position)}
                  onReducePosition={(position, qty) => void submitPositionReduce(position, qty)}
                  onDismissAction={(position) => void submitPositionDismiss(position)}
                  tradingStatus={tradingStatus}
                  onAutoExecute={() => void autoExecuteStrategy()}
                />
              )}
              {activeTab === 'risk' && <RiskTab overview={overview} onClosePosition={(position) => void submitPositionClose(position)} onReducePosition={(position, qty) => void submitPositionReduce(position, qty)} actionLoading={actionLoading} tradingStatus={tradingStatus} />}
              {activeTab === 'memory' && <MemoryTab overview={overview} config={config} />}
              {activeTab === 'profile' && <ProfileTab overview={overview} />}
              {activeTab === 'global_settings' && <GlobalSettingsTab config={config} actionLoading={actionLoading} onConfigSaved={setConfig} onToast={showToast} />}
              {activeTab === 'aiconfig' && <AIConfigTab />}
              {activeTab === 'expert_analysis' && <ExpertAnalysisTab />}
              {activeTab === 'data_collection' && <DataCollectionTab />}
              {activeTab === 'guide' && <GuideTab />}
              {activeTab === 'watchlist' && <WatchlistTab />}
            </>
          ) : null}
        </div>
      </div>

      {tradeConfirmState && overview ? (
        <TradeConfirmDialog
          state={tradeConfirmState}
          overview={overview}
          tradingStatus={tradingStatus}
          actionLoading={actionLoading}
          onCancel={() => setTradeConfirmState(null)}
          onConfirm={() => void tradeConfirmState.onConfirm()}
        />
      ) : null}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
