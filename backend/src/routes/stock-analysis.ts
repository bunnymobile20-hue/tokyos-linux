import { Router } from 'express'

import type { StockAnalysisExpertLayer, LLMExtractionAgentId, StockAnalysisAIProvider } from '../services/stock-analysis/types'
import { saLog } from '../services/stock-analysis/sa-logger'
import type { FrontendLogEntry } from '../services/stock-analysis/sa-logger'
import { checkTradingAvailability } from '../services/stock-analysis/trading-calendar'
import { logger } from '../utils/logger'
import { DEFAULT_SERVER_PATHS, getServerPaths } from '../utils/serverConfig'
import {
  acknowledgeStockAnalysisNotification,
  assignModelToExpert,
  assignModelToLayer,
  bootstrapStockAnalysis,
  buildModelPool,
  closeStockAnalysisPosition,
  confirmStockAnalysisSignal,
  generateMonthlyReport,
  generateWeeklyReport,
  getStockAnalysisAIConfig,
  getStockAnalysisConfig,
  updateStockAnalysisConfig,
  getStockAnalysisHealthStatus,
  getStockAnalysisMonthlyReports,
  getStockAnalysisNotifications,
  getStockAnalysisOverview,
  getStockAnalysisPositions,
  getStockAnalysisRuntimeStatusData,
  getStockAnalysisSignals,
  getStockAnalysisTrades,
  getStockAnalysisWatchLogs,
  dismissPositionAction,
  reduceStockAnalysisPosition,
  refreshStockAnalysisStockPool,
  rejectStockAnalysisSignal,
  runStockAnalysisDaily,
  runAutoDecisions,
  refreshSignalsRealtime,
  runStockAnalysisPostMarket,
  startIntradayMonitor,
  stopIntradayMonitor,
  getIntradayMonitorStatusData,
  getIntradayAlerts,
  acknowledgeIntradayAlert,
  acknowledgeAllIntradayAlerts,
  saveStockAnalysisAIProviders,
  testModelConnectivity,
  updateExpertSystemPrompt,
  getDataAgentConfigService,
  saveDataAgentConfigService,
  assignModelToExtractionAgent,
  getStockAnalysisAvailableDates,
  getStockAnalysisExpertAnalysis,
  getStockAnalysisDataCollection,
  getWatchlistWithQuotes,
  searchStockPool,
  addWatchlistItem,
  removeWatchlistItem,
  updateWatchlistNote,
} from '../services/stock-analysis/service'

const router = Router()

/** [L9] analisar com segurança price parâmetro，filtro NaN e números negativos */
function sanitizePrice(raw: unknown): number | undefined {
  if (raw == null) return undefined
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : undefined
}

const MAX_NOTE_LENGTH = 2000

/** Truncar note a um comprimento razoável */
function sanitizeNote(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed ? trimmed.slice(0, MAX_NOTE_LENGTH) : undefined
}

/**
 * [P2-25] Sanitização de resposta a erros：Remova conteúdo que possa revelar informações privilegiadas（caminho do arquivo、pilha、variáveis ​​de ambiente, etc.）。
 * Mantenha apenas resumos de erros seguros，Detalhes específicos são registrados no log。
 */
function sanitizeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Erro interno do serviço'
  // Remover caminho do arquivo（/home/...、C:\...）
  const cleaned = msg.replace(/(?:\/[\w./\\-]+){2,}/g, '[path]')
    .replace(/[A-Z]:\\[\w.\\-]+/g, '[path]')
  // Truncar para um comprimento razoável
  return cleaned.slice(0, 200)
}

/** [M10] máscara API Key，Mostrar apenas prefixo e cauda 4 Pedaço */
function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  const prefix = key.slice(0, Math.min(key.indexOf('-') + 1, 4)) || key.slice(0, 3)
  const suffix = key.slice(-4)
  return `${prefix}****${suffix}`
}

// L19: Cache em nível de módulo — stockAnalysisDir O caminho raramente muda durante o tempo de execução，TTL 5 minuto
let _cachedStockAnalysisDir: string | null = null
let _cachedStockAnalysisDirTs = 0
const STOCK_ANALYSIS_DIR_TTL_MS = 5 * 60 * 1000

async function getStockAnalysisDir() {
  const now = Date.now()
  if (_cachedStockAnalysisDir && now - _cachedStockAnalysisDirTs < STOCK_ANALYSIS_DIR_TTL_MS) {
    return _cachedStockAnalysisDir
  }
  const paths = await getServerPaths()
  _cachedStockAnalysisDir = paths.stockAnalysisDir || DEFAULT_SERVER_PATHS.stockAnalysisDir
  _cachedStockAnalysisDirTs = now
  return _cachedStockAnalysisDir
}

router.post('/bootstrap', async (_req, res) => {
  try {
    await bootstrapStockAnalysis(await getStockAnalysisDir())
    res.json({ success: true })
  } catch (error) {
    logger.error(`AI Negociação de ações bootstrap falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/overview', async (_req, res) => {
  try {
    const data = await getStockAnalysisOverview(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações overview falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// [L7] adicionar à try-catch Mantenha-o consistente com outras rotas
router.get('/trading-status', (_req, res) => {
  try {
    const data = checkTradingAvailability()
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha na consulta de status de negociação de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/signals', async (_req, res) => {
  try {
    const data = await getStockAnalysisSignals(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações signals falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/positions', async (_req, res) => {
  try {
    const data = await getStockAnalysisPositions(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações positions falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/trades', async (_req, res) => {
  try {
    const data = await getStockAnalysisTrades(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações trades falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/watch-logs', async (_req, res) => {
  try {
    const data = await getStockAnalysisWatchLogs(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações watch logs falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/config', async (_req, res) => {
  try {
    const data = await getStockAnalysisConfig(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações config falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.put('/config', async (req, res) => {
  try {
    const rawIntradayValue = req.body?.intradayAutoCloseLossPercent
    const rawIntradayProfitValue = req.body?.intradayAutoCloseProfitPercent
    const rawDailyValue = req.body?.portfolioRiskLimits?.maxDailyLossPercent
    const rawWeeklyValue = req.body?.portfolioRiskLimits?.maxWeeklyLossPercent
    const rawMonthlyValue = req.body?.portfolioRiskLimits?.maxMonthlyLossPercent
    const nextIntradayValue = Number(rawIntradayValue)
    const nextIntradayProfitValue = Number(rawIntradayProfitValue)
    const nextDailyValue = Number(rawDailyValue)
    const nextWeeklyValue = Number(rawWeeklyValue)
    const nextMonthlyValue = Number(rawMonthlyValue)
    if (!Number.isFinite(nextIntradayValue)) {
      res.status(400).json({ success: false, error: 'O limite de perda de liquidação automática intradiária deve ser um número' })
      return
    }
    if (!Number.isFinite(nextIntradayProfitValue)) {
      res.status(400).json({ success: false, error: 'O limite de lucro automático intradiário deve ser um número' })
      return
    }
    if (!Number.isFinite(nextDailyValue)) {
      res.status(400).json({ success: false, error: 'O limite diário de suspensão de perdas deve ser um número' })
      return
    }
    if (!Number.isFinite(nextWeeklyValue)) {
      res.status(400).json({ success: false, error: 'O limite de suspensão de perda semanal precisa ser um número' })
      return
    }
    if (!Number.isFinite(nextMonthlyValue)) {
      res.status(400).json({ success: false, error: 'O limite mensal de suspensão de perdas deve ser um número' })
      return
    }
    const data = await updateStockAnalysisConfig(await getStockAnalysisDir(), {
      intradayAutoCloseLossPercent: nextIntradayValue,
      intradayAutoCloseProfitPercent: nextIntradayProfitValue,
      portfolioRiskLimits: {
        maxDailyLossPercent: nextDailyValue,
        maxWeeklyLossPercent: nextWeeklyValue,
        maxMonthlyLossPercent: nextMonthlyValue,
      },
    })
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações update config falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/runtime-status', async (_req, res) => {
  try {
    const data = await getStockAnalysisRuntimeStatusData(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações runtime status falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/health', async (_req, res) => {
  try {
    const data = await getStockAnalysisHealthStatus(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações health falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// v1.35.0 [A6-P0-3] Roteamento de tarefas longo HTTP tempo esgotado（30 minuto，cobrir daily/postMarket Pior demorado）
const LONG_TASK_TIMEOUT_MS = 30 * 60 * 1000

router.post('/run/daily', async (req, res) => {
  try {
    // v1.35.0 [A6-P0-3] HTTP Configurações de tempo limite
    req.setTimeout(LONG_TASK_TIMEOUT_MS)
    res.setTimeout(LONG_TASK_TIMEOUT_MS)
    const data = await runStockAnalysisDaily(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações daily run falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

/**
 * Execução automática com um clique：Execute a compra automática no sinal de hoje（Compra forte）+ Ignorar automaticamente（comprar/espere e veja）
 * Não aceitando corretores，escreva apenas positions/trades/signals JSON documento
 * v1.35.0 [A6-P0-2] runAutoDecisions Já em service camada mais in-flight Trancar
 */
router.post('/auto-execute', async (req, res) => {
  try {
    req.setTimeout(LONG_TASK_TIMEOUT_MS)
    res.setTimeout(LONG_TASK_TIMEOUT_MS)
    const tradeDate = typeof req.body?.tradeDate === 'string' ? req.body.tradeDate : undefined
    const data = await runAutoDecisions(await getStockAnalysisDir(), tradeDate)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações auto-execute falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

/**
 * v1.30.2: Atualização manual signals Documentário realtime Campo（Cotações intradiárias em tempo real）
 * intradiário cron Todo 5 Atualize automaticamente a cada minuto；Essa interface é usada para acionamento manual pelo front end ou preenchimento de dados históricos.
 */
router.post('/signals/refresh-realtime', async (req, res) => {
  try {
    const tradeDate = typeof req.body?.tradeDate === 'string' ? req.body.tradeDate : undefined
    const data = await refreshSignalsRealtime(await getStockAnalysisDir(), tradeDate)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações refresh-realtime falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/stock-pool/refresh', async (_req, res) => {
  try {
    const data = await refreshStockAnalysisStockPool(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações stock pool refresh falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/signals/:id/confirm', async (req, res) => {
  try {
    // v1.34.0: Modelo de posição percentual — quantity espaço reservado（padrão 1），A posição consiste em weight Decidir
    const rawWeight = req.body?.weight != null ? Number(req.body.weight) : undefined
    const rawQty = req.body?.quantity != null ? Number(req.body.quantity) : 1
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? Math.max(1, Math.floor(rawQty)) : 1

    const data = await confirmStockAnalysisSignal(await getStockAnalysisDir(), req.params.id, {
      quantity,
      weight: rawWeight !== undefined && Number.isFinite(rawWeight) ? rawWeight : undefined,
      price: sanitizePrice(req.body?.price),
      note: sanitizeNote(req.body?.note),
    })

    if (!data) {
      return res.status(404).json({ success: false, error: 'O sinal não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações confirm signal falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/signals/:id/reject', async (req, res) => {
  try {
    const note = sanitizeNote(req.body?.note) ?? ''
    if (!note) {
      return res.status(400).json({ success: false, error: 'O motivo da derrubada não pode ficar vazio' })
    }
    const data = await rejectStockAnalysisSignal(await getStockAnalysisDir(), req.params.id, note, 'user_rejected')
    if (!data) {
      return res.status(404).json({ success: false, error: 'O sinal não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações reject signal falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/signals/:id/ignore', async (req, res) => {
  try {
    const note = sanitizeNote(req.body?.note) ?? ''
    if (!note) {
      return res.status(400).json({ success: false, error: 'Ignorar a razão não pode estar vazio' })
    }
    const data = await rejectStockAnalysisSignal(await getStockAnalysisDir(), req.params.id, note, 'user_ignored')
    if (!data) {
      return res.status(404).json({ success: false, error: 'O sinal não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações ignore signal falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/positions/:id/close', async (req, res) => {
  try {
    // v1.34.0: Modelo de posição percentual — Para fechar uma posição, venda toda a posição，Não há mais propagação quantity
    // v1.35.0 [A4-P0-2] passagem clientNonce Usado para verificação idempotente
    const clientNonce = typeof req.body?.clientNonce === 'string' && req.body.clientNonce.trim().length > 0
      ? req.body.clientNonce.trim().slice(0, 64)
      : undefined
    const data = await closeStockAnalysisPosition(await getStockAnalysisDir(), req.params.id, {
      closeAll: true,
      price: sanitizePrice(req.body?.price),
      note: sanitizeNote(req.body?.note),
      clientNonce,
    })
    if (!data) {
      return res.status(404).json({ success: false, error: 'A posição não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações close position falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/positions/:id/reduce', async (req, res) => {
  try {
    // v1.34.0: Modelo de posição percentual — de acordo com weight Iluminação proporcional
    const rawWeightDelta = Number(req.body?.weightDelta)
    if (!Number.isFinite(rawWeightDelta) || rawWeightDelta <= 0 || rawWeightDelta >= 1) {
      return res.status(400).json({ success: false, error: 'weightDelta Deve ser (0,1) intervalo decimal（como 0.05 expressar 5%）' })
    }
    // v1.35.0 [A4-P0-2] passagem clientNonce Usado para verificação idempotente（front-end uuid v4）
    const clientNonce = typeof req.body?.clientNonce === 'string' && req.body.clientNonce.trim().length > 0
      ? req.body.clientNonce.trim().slice(0, 64)
      : undefined
    const data = await reduceStockAnalysisPosition(await getStockAnalysisDir(), req.params.id, {
      weightDelta: rawWeightDelta,
      price: sanitizePrice(req.body?.price),
      note: sanitizeNote(req.body?.note),
      clientNonce,
    })
    if (!data) {
      return res.status(404).json({ success: false, error: 'A posição não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações reduce position falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/positions/:id/dismiss-action', async (req, res) => {
  try {
    const note = sanitizeNote(req.body?.note) ?? ''
    const data = await dismissPositionAction(await getStockAnalysisDir(), req.params.id, note)
    if (!data) {
      return res.status(404).json({ success: false, error: 'A posição não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações dismiss position action falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── AI Config roteamento ──────────────────────────────────────────

// ── notificar + Relatar rota ──────────────────────────────────────────

router.get('/notifications', async (_req, res) => {
  try {
    const data = await getStockAnalysisNotifications(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações notifications Falha na leitura: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/notifications/:id/acknowledge', async (req, res) => {
  try {
    const data = await acknowledgeStockAnalysisNotification(await getStockAnalysisDir(), req.params.id)
    if (!data) {
      return res.status(404).json({ success: false, error: 'Notificação não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações notification acknowledge falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/monthly-reports', async (_req, res) => {
  try {
    const data = await getStockAnalysisMonthlyReports(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações monthly-reports Falha na leitura: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/reports/generate-weekly', async (_req, res) => {
  try {
    const data = await generateWeeklyReport(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações weekly report Falha na compilação manual: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/reports/generate-monthly', async (_req, res) => {
  try {
    const data = await generateMonthlyReport(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações monthly report Falha na compilação manual: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── AI Config roteamento (Gerenciamento de modelo) ────────────────────────────────

router.get('/ai-config', async (_req, res) => {
  try {
    const dir = await getStockAnalysisDir()
    const config = await getStockAnalysisAIConfig(dir)
    const modelPool = buildModelPool(config.providers)
    // [M10] máscara API Key，Evite que o front-end vaze chaves de texto simples
    const maskedProviders = config.providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
    }))
    res.json({ success: true, data: { ...config, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config Falha na leitura: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.put('/ai-config/providers', async (req, res) => {
  try {
    const providers = req.body?.providers
    if (!Array.isArray(providers)) {
      return res.status(400).json({ success: false, error: 'providers Deve ser uma matriz' })
    }
    // [M10] restaurar mascarado apiKey：Se o front-end enviar de volta ****，Substitua pelo valor original
    const dir = await getStockAnalysisDir()
    const existingConfig = await getStockAnalysisAIConfig(dir)
    const existingKeyMap = new Map(existingConfig.providers.map((p) => [p.id, p.apiKey]))
    const mergedProviders = providers.map((p: Record<string, unknown>) => {
      const apiKey = typeof p.apiKey === 'string' ? p.apiKey : ''
      if (apiKey.includes('****')) {
        const original = existingKeyMap.get(p.id as string)
        return { ...p, apiKey: original ?? '' }
      }
      return p
    }) as unknown as StockAnalysisAIProvider[]
    const data = await saveStockAnalysisAIProviders(dir, mergedProviders)
    // e GET /ai-config Seja consistente：retornar modelPool + máscara API Key
    const modelPool = buildModelPool(data.providers)
    const maskedProviders = data.providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
    }))
    res.json({ success: true, data: { ...data, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config providers Falha ao salvar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/ai-config/layers/:layer/assign', async (req, res) => {
  try {
    const layer = req.params.layer as StockAnalysisExpertLayer
    const modelRef = req.body?.modelRef
    // [L8] Verificação da lista de permissões layer parâmetro
    const validLayers: StockAnalysisExpertLayer[] = ['industry_chain', 'company_fundamentals', 'sell_side_research', 'world_power', 'global_macro', 'risk_governance', 'sentiment', 'market_trading', 'buy_side', 'rule_functions']
    if (!validLayers.includes(layer)) {
      return res.status(400).json({ success: false, error: `Inválido layer: ${req.params.layer}` })
    }
    if (!modelRef) {
      return res.status(400).json({ success: false, error: 'modelRef obrigatório' })
    }
    const data = await assignModelToLayer(await getStockAnalysisDir(), layer, modelRef)
    const modelPool = buildModelPool(data.providers)
    const maskedProviders = data.providers.map((p) => ({ ...p, apiKey: maskApiKey(p.apiKey) }))
    res.json({ success: true, data: { ...data, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config layer assign falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/ai-config/experts/:id/assign', async (req, res) => {
  try {
    const expertId = req.params.id
    const modelRef = req.body?.modelRef
    if (!expertId || !modelRef) {
      return res.status(400).json({ success: false, error: 'expertId e modelRef obrigatório' })
    }
    const data = await assignModelToExpert(await getStockAnalysisDir(), expertId, modelRef)
    const modelPool = buildModelPool(data.providers)
    const maskedProviders = data.providers.map((p) => ({ ...p, apiKey: maskApiKey(p.apiKey) }))
    res.json({ success: true, data: { ...data, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config expert assign falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.put('/ai-config/experts/:id/system-prompt', async (req, res) => {
  try {
    const expertId = req.params.id
    const systemPrompt = req.body?.systemPrompt
    if (!expertId || typeof systemPrompt !== 'string') {
      return res.status(400).json({ success: false, error: 'expertId e systemPrompt obrigatório' })
    }
    const config = await updateExpertSystemPrompt(await getStockAnalysisDir(), expertId, systemPrompt)
    const modelPool = buildModelPool(config.providers)
    const maskedProviders = config.providers.map((p) => ({
      ...p,
      apiKey: maskApiKey(p.apiKey),
    }))
    res.json({ success: true, data: { ...config, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config expert systemPrompt Falha na atualização: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/ai-config/test-model', async (req, res) => {
  try {
    const { providerId, baseUrl, apiKey, modelId } = req.body || {}
    if (!baseUrl || !apiKey || !modelId) {
      return res.status(400).json({ success: false, error: 'baseUrl, apiKey, modelId Todos devem ser fornecidos' })
    }
    // [M11] restaurar mascarado apiKey：Se o front-end enviar de volta ****，Use o original armazenado key substituir
    let realApiKey = String(apiKey)
    if (realApiKey.includes('****')) {
      if (!providerId) {
        return res.status(400).json({ success: false, error: 'apiKey Obrigatório se mascarado providerId para recuperar a chave real' })
      }
      const dir = await getStockAnalysisDir()
      const existingConfig = await getStockAnalysisAIConfig(dir)
      const original = existingConfig.providers.find((p) => p.id === providerId)?.apiKey
      if (!original) {
        return res.status(400).json({ success: false, error: `não encontrado providerId=${providerId} Realidade correspondente apiKey` })
      }
      realApiKey = original
    }
    // SSRF proteção: verificar baseUrl Não apontando para a intranet
    const urlStr = String(baseUrl)
    try {
      const parsed = new URL(urlStr)
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        return res.status(400).json({ success: false, error: 'baseUrl Deve usar http/https protocolo' })
      }
      const host = parsed.hostname.toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0'
        || host.startsWith('10.') || host.startsWith('192.168.')
        || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
        || host.endsWith('.local') || host.endsWith('.internal')
        || host === '169.254.169.254') {
        return res.status(400).json({ success: false, error: 'baseUrl Não é permitido apontar para endereços da intranet' })
      }
    } catch {
      return res.status(400).json({ success: false, error: 'baseUrl Formato inválido' })
    }
    // Construir temporário provider Objeto usado para teste de conectividade
    const now = new Date().toISOString()
    const tempProvider = {
      id: 'test',
      name: 'test',
      baseUrl: String(baseUrl),
      apiKey: realApiKey,
      models: [String(modelId)],
      enabled: true,
      concurrency: 1,
      createdAt: now,
      updatedAt: now,
    }
    const data = await testModelConnectivity(tempProvider, String(modelId))
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações ai-config test model falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ==================== Análise após o expediente (G1) ====================

router.post('/run/post-market', async (req, res) => {
  try {
    // v1.35.0 [A6-P0-3] HTTP tempo esgotado
    req.setTimeout(LONG_TASK_TIMEOUT_MS)
    res.setTimeout(LONG_TASK_TIMEOUT_MS)
    const data = await runStockAnalysisPostMarket(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI A análise de estoque pós-mercado falhou: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ==================== Monitoramento intradiário (S1) ====================

router.post('/intraday/start', async (_req, res) => {
  try {
    const data = await startIntradayMonitor(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha ao iniciar o monitoramento intradiário de negociação de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/intraday/stop', async (_req, res) => {
  try {
    const data = await stopIntradayMonitor(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI O monitoramento intradiário da negociação de ações não conseguiu parar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/intraday/status', async (_req, res) => {
  try {
    const data = await getIntradayMonitorStatusData(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha na consulta de status de monitoramento de negociação intradiária de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/intraday/alerts', async (_req, res) => {
  try {
    const data = await getIntradayAlerts(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha na consulta de alarme intradiário de negociação de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/intraday/alerts/acknowledge-all', async (_req, res) => {
  try {
    const count = await acknowledgeAllIntradayAlerts(await getStockAnalysisDir())
    res.json({ success: true, data: { acknowledgedCount: count } })
  } catch (error) {
    logger.error(`AI Falha na confirmação em lote de alarmes de negociação intradiária de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/intraday/alerts/:id/acknowledge', async (req, res) => {
  try {
    const data = await acknowledgeIntradayAlert(await getStockAnalysisDir(), req.params.id)
    if (!data) {
      return res.status(404).json({ success: false, error: 'Alarme não existe' })
    }
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha na confirmação do alarme de negociação intradiária de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── Coleta de dados Agent Configuração ──

router.get('/data-agent-config', async (_req, res) => {
  try {
    const data = await getDataAgentConfigService(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha ao ler a configuração de coleta de dados de estoque: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.put('/data-agent-config', async (req, res) => {
  try {
    // [M11] Validação de entrada：certificar-se body é um objeto e agents é uma matriz
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, error: 'O corpo da solicitação deve ser JSON objeto' })
    }
    if (!Array.isArray(body.agents)) {
      return res.status(400).json({ success: false, error: 'agents O campo deve ser uma matriz' })
    }
    for (const agent of body.agents) {
      if (!agent || typeof agent !== 'object') {
        return res.status(400).json({ success: false, error: 'agents Os elementos da matriz devem ser objetos' })
      }
      if (typeof agent.agentId !== 'string' || !agent.agentId) {
        return res.status(400).json({ success: false, error: 'cada agent Deve conter não vazio agentId corda' })
      }
      if (typeof agent.enabled !== 'boolean') {
        return res.status(400).json({ success: false, error: `agent ${agent.agentId} de enabled Deve ser um valor booleano` })
      }
      if (typeof agent.timeoutMs !== 'number' || !Number.isFinite(agent.timeoutMs) || agent.timeoutMs < 1000 || agent.timeoutMs > 600_000) {
        return res.status(400).json({ success: false, error: `agent ${agent.agentId} de timeoutMs Deve ser 1000-600000 números entre` })
      }
    }
    const data = await saveDataAgentConfigService(await getStockAnalysisDir(), body)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Falha ao salvar a configuração de coleta de dados de negociação de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── LLM extrair Agent Atribuição de modelo ──

router.post('/ai-config/extraction-agents/:agentId/assign', async (req, res) => {
  try {
    const agentId = req.params.agentId as LLMExtractionAgentId
    const modelRef = req.body?.modelRef ?? null
    const validIds: LLMExtractionAgentId[] = ['announcement_parser', 'news_impact_analyzer', 'sentiment_analyzer']
    if (!validIds.includes(agentId)) {
      return res.status(400).json({ success: false, error: `Inválido agentId: ${agentId}` })
    }
    const config = await assignModelToExtractionAgent(await getStockAnalysisDir(), agentId, modelRef)
    const modelPool = buildModelPool(config.providers)
    const maskedProviders = config.providers.map((p) => ({ ...p, apiKey: maskApiKey(p.apiKey) }))
    res.json({ success: true, data: { ...config, providers: maskedProviders, modelPool } })
  } catch (error) {
    logger.error(`AI Negociação de ações extraction agent assign falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── Lista de datas disponíveis（type=data-collection digitalização data-agents/，Verificação padrão signals/） ──

router.get('/available-dates', async (req, res) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined
    const dates = await getStockAnalysisAvailableDates(await getStockAnalysisDir(), type)
    res.json({ success: true, data: dates })
  } catch (error) {
    logger.error(`AI Negociação de ações available-dates falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── AI Análise especializada（Retornar detalhes de votação de especialistas em sinal por data + memória especializada） ──

router.get('/expert-analysis', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Precisa fornecer válido date parâmetro（YYYY-MM-DD）' })
    }
    const data = await getStockAnalysisExpertAnalysis(await getStockAnalysisDir(), date)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações expert-analysis falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── AI coleta de dados（Retorno por data FactPool + LLM Extrair resultados） ──

router.get('/data-collection', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Precisa fornecer válido date parâmetro（YYYY-MM-DD）' })
    }
    const data = await getStockAnalysisDataCollection(await getStockAnalysisDir(), date)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`AI Negociação de ações data-collection falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── ações auto-selecionadas (Watchlist) ──

router.get('/watchlist', async (_req, res) => {
  try {
    const data = await getWatchlistWithQuotes(await getStockAnalysisDir())
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`Falha ao obter ações autosselecionadas: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.get('/watchlist/search', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : ''
    const data = await searchStockPool(await getStockAnalysisDir(), query)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`Falha na pesquisa de ações: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/watchlist/add', async (req, res) => {
  try {
    const { code, name, market, exchange, industryName, note } = req.body
    if (!code || !name || !market) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes: code, name, market' })
    }
    const data = await addWatchlistItem(await getStockAnalysisDir(), {
      code,
      name,
      market,
      exchange: exchange || '',
      industryName: industryName ?? null,
    }, sanitizeNote(note) ?? '')
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`Falha ao adicionar ações autosselecionadas: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/watchlist/remove', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ success: false, error: 'Falta code parâmetro' })
    }
    const data = await removeWatchlistItem(await getStockAnalysisDir(), code)
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`Falha ao remover ações autosselecionadas: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

router.post('/watchlist/note', async (req, res) => {
  try {
    const { code, note } = req.body
    if (!code) {
      return res.status(400).json({ success: false, error: 'Falta code parâmetro' })
    }
    const data = await updateWatchlistNote(await getStockAnalysisDir(), code, sanitizeNote(note) ?? '')
    res.json({ success: true, data })
  } catch (error) {
    logger.error(`Falha ao atualizar comentários de ações autosselecionados: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

// ── Relatórios de log de front-end ──

const MAX_CLIENT_LOG_BATCH = 100
const VALID_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error'])

router.post('/client-log', async (req, res) => {
  try {
    const body = req.body
    if (!Array.isArray(body)) {
      return res.status(400).json({ success: false, error: 'body deve ser FrontendLogEntry[]' })
    }
    if (body.length === 0) {
      return res.json({ success: true, received: 0 })
    }
    if (body.length > MAX_CLIENT_LOG_BATCH) {
      return res.status(400).json({ success: false, error: `Número máximo de vezes ${MAX_CLIENT_LOG_BATCH} registros` })
    }

    // Verifique e filtre entradas válidas
    const entries: FrontendLogEntry[] = []
    for (const item of body) {
      if (
        typeof item === 'object' && item !== null &&
        typeof item.timestamp === 'string' &&
        typeof item.component === 'string' &&
        typeof item.level === 'string' &&
        VALID_LOG_LEVELS.has(item.level) &&
        typeof item.message === 'string'
      ) {
        entries.push({
          timestamp: item.timestamp,
          component: item.component.slice(0, 100),
          level: item.level as FrontendLogEntry['level'],
          message: item.message.slice(0, 2000),
          data: typeof item.data === 'object' && item.data !== null ? item.data : undefined,
          userAgent: typeof item.userAgent === 'string' ? item.userAgent.slice(0, 500) : undefined,
        })
      }
    }

    if (entries.length > 0) {
      await saLog.frontendLog(entries)
    }

    res.json({ success: true, received: entries.length })
  } catch (error) {
    logger.error(`Falha no relatório de log de front-end: ${(error as Error).message}`, { module: 'StockAnalysis' })
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) })
  }
})

export default router
