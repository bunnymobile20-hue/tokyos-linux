import fs from 'fs/promises'
import path from 'path'

import { logger } from '../../utils/logger'
import { saLog } from './sa-logger'
import type {
  AutoReportNotification,
  DataAgentConfigItem,
  DataAgentConfigStore,
  DailyEquitySnapshot,
  ExpertDailyMemoryEntry,
  ExpertMemoryStore,
  FactPool,
  IntradayAlert,
  IntradayMonitorStatus,
  LLMExtractionAgentConfig,
  LLMExtractionResult,
  MonthlyReport,
  StockAnalysisAIConfig,
  StockAnalysisDailyRunResult,
  StockAnalysisExpertPerformanceData,
  StockAnalysisHistoryCache,
  StockAnalysisIndexHistoryCache,
  StockAnalysisLearnedWeights,
  StockAnalysisMarketState,
  StockAnalysisModelGroupPerformance,
  StockAnalysisMonthlySummary,
  StockAnalysisPerformanceDashboard,
  StockAnalysisPosition,
  StockAnalysisPostMarketResult,
  StockAnalysisQuoteCache,
  StockAnalysisReviewRecord,
  StockAnalysisRiskControlState,
  StockAnalysisRiskEvent,
  StockAnalysisRuntimeStatus,
  StockAnalysisSignal,
  StockAnalysisStockPoolCacheMeta,
  StockAnalysisStrategyConfig,
  StockAnalysisThresholdHistory,
  StockAnalysisTradeRecord,
  StockAnalysisWatchLogEntry,
  StockAnalysisWatchlistCandidate,
  StockAnalysisWeeklySummary,
  UserWatchlistItem,
} from './types'

export const DEFAULT_RISK_CONTROL_STATE: StockAnalysisRiskControlState = {
  paused: false,
  pauseReason: null,
  pausedAt: null,
  dailyLossPercent: 0,
  weeklyLossPercent: 0,
  monthlyLossPercent: 0,
  maxDrawdownPercent: 0,
  dailyLossBreached: false,
  weeklyLossBreached: false,
  monthlyLossBreached: false,
  maxDrawdownBreached: false,
  lastCheckedAt: null,
}

const DEFAULT_RUNTIME_STATUS: StockAnalysisRuntimeStatus = {
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  stockPoolRefreshedAt: null,
  latestSignalDate: null,
  runState: 'idle',
  currentRun: null,
  quoteCacheAt: null,
  indexHistoryCacheAt: null,
  latestSuccessfulSignalDate: null,
  isUsingFallback: false,
  staleReasons: [],
  riskControl: DEFAULT_RISK_CONTROL_STATE,
  postMarketAt: null,
}

export const DEFAULT_STOCK_ANALYSIS_CONFIG: StockAnalysisStrategyConfig = {
  maxPositions: 3,
  maxSinglePosition: 1.0,
  maxTotalPosition: 1.0,
  stopLossPercent: 3,
  intradayAutoCloseLossPercent: 5,
  intradayAutoCloseProfitPercent: 10,
  takeProfitPercent1: 3,
  takeProfitPercent2: 6,
  maxHoldDays: 20,
  minTurnoverAmount20d: 50_000_000,
  minAmplitude20d: 5,
  maxContinuousDeclineDays: 15,
  marketThresholds: {
    bull_trend: { minCompositeScore: 70, minExpertConsensus: 0.52, minTechnicalScore: 61, minQuantScore: 57 },
    bear_trend: { minCompositeScore: 78, minExpertConsensus: 0.69, minTechnicalScore: 74, minQuantScore: 69 },
    high_volatility: { minCompositeScore: 76, minExpertConsensus: 0.65, minTechnicalScore: 71, minQuantScore: 67 },
    low_volatility_range: { minCompositeScore: 73, minExpertConsensus: 0.57, minTechnicalScore: 67, minQuantScore: 62 },
    normal_range: { minCompositeScore: 74, minExpertConsensus: 0.60, minTechnicalScore: 69, minQuantScore: 64 },
  },
  fusionWeightsByRegime: {
    bull_trend: { expert: 0.35, technical: 0.35, quant: 0.30 },
    bear_trend: { expert: 0.40, technical: 0.25, quant: 0.35 },
    high_volatility: { expert: 0.30, technical: 0.40, quant: 0.30 },
    low_volatility_range: { expert: 0.35, technical: 0.30, quant: 0.35 },
    normal_range: { expert: 0.35, technical: 0.35, quant: 0.30 },
  },
  lowLiquidityGuardrail: {
    volumePercentileThreshold: 0.10,
    crisisRisingRatioThreshold: 0.40,
    scorePenalty: 5,
    maxPositionRatio: 0.65,
    crisisMaxPositionRatio: 0.35,
  },
  trailingStop: {
    activationPercent: 3,
    pullbackPercent: 2,
  },
  portfolioRiskLimits: {
    maxDailyLossPercent: 10,
    maxWeeklyLossPercent: 20,
    maxMonthlyLossPercent: 30,
    maxDrawdownPercent: 15,
  },
}

function jsonStringify(data: unknown) {
  return `${JSON.stringify(data, null, 2)}\n`
}

/** simples per-file Bloqueio mutex assíncrono，Evitar simultaneidade read-modify-write Concorrência */
const fileLocks = new Map<string, Promise<void>>()
/** P2-D1: Promise Bloqueio de arquivo implementado em modo fila，Corrija a condição de limite onde vários garçons adquirem bloqueios ao mesmo tempo */
export async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const key = filePath
  // fila：Se houver atualmente um bloqueio，Aguarde a liberação antes de tentar novamente（corrente Promise Evite condições de corrida）
  const existingLock = fileLocks.get(key)
  let resolve!: () => void
  const myLock = new Promise<void>((r) => { resolve = r })
  fileLocks.set(key, myLock)
  if (existingLock) {
    const waitStart = Date.now()
    saLog.debug('Store', `A espera de bloqueio começa: ${path.basename(filePath)}`)
    await existingLock
    saLog.debug('Store', `A espera do bloqueio termina: ${path.basename(filePath)} espere=${Date.now() - waitStart}ms`)
  }
  try {
    return await fn()
  } finally {
    // somente se myLock Excluir somente quando o bloqueio atual ainda estiver em vigor（Impedir que os bloqueios dos garçons subsequentes sejam excluídos acidentalmente）
    if (fileLocks.get(key) === myLock) {
      fileLocks.delete(key)
    }
    resolve()
  }
}

async function writeJson(filePath: string, data: unknown) {
  const writeStart = Date.now()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${Date.now()}.${process.pid}.${Math.random().toString(36).slice(2, 6)}.tmp`
  // P2-D2: Depois de escrever fsync Certifique-se de que os dados sejam liberados para o disco，Evitar queda de energia rename O conteúdo do arquivo fica vazio após
  const fh = await fs.open(tmpPath, 'w')
  const jsonStr = jsonStringify(data)
  try {
    await fh.writeFile(jsonStr, 'utf8')
    await fh.sync()
  } finally {
    await fh.close()
  }
  await fs.rename(tmpPath, filePath)
  const sizeKb = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1)
  saLog.debug('Store', `escrever: ${path.basename(filePath)} size=${sizeKb}KB demorado=${Date.now() - writeStart}ms`)
}

/**
 * [P2-20] Limpe o restante .tmp documento（Falhas no processo podem deixar）。
 * Digitalizar o diretório especificado，Excluir mais de 1 horas .tmp documento。
 */
async function cleanupStaleTemporaryFiles(dir: string): Promise<number> {
  try {
    const files = await fs.readdir(dir)
    const now = Date.now()
    let cleaned = 0
    for (const file of files) {
      if (!file.endsWith('.tmp')) continue
      const fullPath = path.join(dir, file)
      try {
        const stat = await fs.stat(fullPath)
        const ageMs = now - stat.mtimeMs
        if (ageMs > 60 * 60 * 1000) { // Exceder 1 Hora
          await fs.unlink(fullPath)
          cleaned++
        }
      } catch {
        // stat/unlink Ignorar em caso de falha
      }
    }
    return cleaned
  } catch {
    return 0
  }
}

/**
 * [P2-22] Verifique o ticker usado para construir o caminho do arquivo/parâmetro de data。
 * evitarcaminho遍历攻击（../ espere）e injeção de caracteres especiais。
 */
function validatePathSegment(segment: string, label: string): void {
  if (!segment || !/^[A-Za-z0-9._-]{1,30}$/.test(segment)) {
    throw new Error(`${label} Contém caracteres ilegais: "${segment}"`)
  }
}

/**
 * Limpe os diretórios além maxCount de arquivos nomeados por data。
 * corresponder `prefix + YYYY-MM-DD + .json` Formatar，manter as últimas maxCount individual，Exclua o resto。
 * Nenhuma exceção será lançada se a limpeza falhar（best-effort）。
 */
async function pruneOldDateFiles(dir: string, prefix: string, maxCount: number) {
  try {
    const files = await fs.readdir(dir)
    const dated = files
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
      .map((f) => ({ name: f, date: f.slice(prefix.length, prefix.length + 10) }))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
      .sort((a, b) => b.date.localeCompare(a.date))
    if (dated.length <= maxCount) return
    const toDelete = dated.slice(maxCount)
    await Promise.allSettled(toDelete.map((d) => fs.unlink(path.join(dir, d.name))))
  } catch {
    // O diretório não existe ou outro I/O erro，negligência
  }
}

/** P1-11: Lista dos principais nomes de arquivos financeiros — Backup em caso de corrupção em vez de substituição silenciosa */
const CRITICAL_FILE_NAMES = new Set(['positions.json', 'trades.json', 'strategy.json', 'runtime-status.json'])

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  const readStart = Date.now()
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const sizeKb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)
    saLog.debug('Store', `ler: ${path.basename(filePath)} size=${sizeKb}KB demorado=${Date.now() - readStart}ms`)
    return JSON.parse(content) as T
  } catch (error: unknown) {
    const nodeErr = error as NodeJS.ErrnoException
    if (nodeErr?.code === 'ENOENT') {
      // O arquivo não existe — cena normal，Retornar silenciosamente ao valor padrão
      return fallback
    }
    // P1-11: O arquivo existe, mas está corrompido — Faça backup de arquivos críticos，Evite perdas irreversíveis durante a próxima gravação
    const fileName = path.basename(filePath)
    if (CRITICAL_FILE_NAMES.has(fileName)) {
      const backupPath = `${filePath}.corrupted.${Date.now()}`
      try {
        await fs.copyFile(filePath, backupPath)
        logger.error(`[store] Os arquivos principais estão danificados e foram copiados para backup: ${fileName} → ${path.basename(backupPath)}`, { module: 'StockAnalysis' })
      } catch {
        logger.error(`[store] Arquivos críticos estão corrompidos e os backups falham: ${fileName}`, { module: 'StockAnalysis' })
      }
    }
    logger.warn(`[store] ler JSON Falha no arquivo (${fileName}): ${nodeErr?.message ?? 'erro desconhecido'}，Usar valor padrão`)
    saLog.warn('Store', `Falha na leitura: ${fileName} error=${nodeErr?.message ?? 'erro desconhecido'} demorado=${Date.now() - readStart}ms`)
    return fallback
  }
}

function getConfigPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'strategy.json')
}

function getStatusPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'runtime-status.json')
}

function getMarketStatePath(stockAnalysisDir: string, tradeDate: string) {
  validatePathSegment(tradeDate, 'tradeDate') // [P2-22]
  return path.join(stockAnalysisDir, 'market', `${tradeDate}.json`)
}

function getSignalPath(stockAnalysisDir: string, tradeDate: string) {
  validatePathSegment(tradeDate, 'tradeDate') // [P2-22]
  return path.join(stockAnalysisDir, 'signals', `${tradeDate}.json`)
}

function getRunPath(stockAnalysisDir: string, tradeDate: string) {
  validatePathSegment(tradeDate, 'tradeDate') // [P2-22]
  return path.join(stockAnalysisDir, 'reports', 'daily-runs', `${tradeDate}.json`)
}

function getStockPoolPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'stock-pool.json')
}

function getStockPoolMetaPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'stock-pool.meta.json')
}

function getAllAStockListPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'a-stock-all.json')
}

function getAllAStockListMetaPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'a-stock-all.meta.json')
}

function getQuoteCachePath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'quotes.json')
}

function getIndexHistoryCachePath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'cache', 'index-history.json')
}

function getHistoryCachePath(stockAnalysisDir: string, code: string) {
  validatePathSegment(code, 'stock code') // [P2-22]
  return path.join(stockAnalysisDir, 'cache', 'histories', `${code}.json`)
}

function getBlacklistPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'blacklist.json')
}

function getReviewsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'journal', 'reviews.json')
}

function getRiskEventsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'journal', 'risk-events.json')
}

function getPositionsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'portfolio', 'positions.json')
}

// v1.35.0 [A8-P0-3] Instantâneo do patrimônio da conta（Escrito após o fechamento diário，para retrações/anualizado/Calmar calcular）
function getDailyEquityPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'portfolio', 'daily-equity.json')
}

function getTradesPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'journal', 'trades.json')
}

function getWatchLogsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'journal', 'watch-logs.json')
}

function getWeeklySummaryPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'reports', 'weekly-summary.json')
}

function getMonthlySummaryPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'reports', 'monthly-summary.json')
}

function getPerformanceDashboardPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'reports', 'performance-dashboard.json')
}

function getModelGroupsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'experts', 'model-groups.json')
}

function getExpertPerformancePath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'experts', 'expert-performance.json')
}

function getLearnedWeightsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'experts', 'weights.json')
}

function getThresholdHistoryPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'threshold-history.json')
}

// [L1] Cache em nível de módulo：Grave o diretório que foi inicializado，Evite duplicação toda vez que você lê e escreve mkdir + readJson
const initializedDirs = new Set<string>()

export async function ensureStockAnalysisStructure(stockAnalysisDir: string) {
  if (initializedDirs.has(stockAnalysisDir)) return

  await Promise.all([
    fs.mkdir(path.join(stockAnalysisDir, 'config'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'cache'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'market'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'signals'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'portfolio'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'journal'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'reports', 'daily-runs'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'experts'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'data-agents'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'intraday'), { recursive: true }),
    fs.mkdir(path.join(stockAnalysisDir, 'logs'), { recursive: true }),
  ])

  const config = await readJson<StockAnalysisStrategyConfig | null>(getConfigPath(stockAnalysisDir), null)
  if (!config) {
    await writeJson(getConfigPath(stockAnalysisDir), DEFAULT_STOCK_ANALYSIS_CONFIG)
  }

  const runtimeStatus = await readJson<StockAnalysisRuntimeStatus | null>(getStatusPath(stockAnalysisDir), null)
  if (!runtimeStatus) {
    await writeJson(getStatusPath(stockAnalysisDir), DEFAULT_RUNTIME_STATUS)
  }

  initializedDirs.add(stockAnalysisDir)
}

export async function readStockAnalysisConfig(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const raw = await readJson<Record<string, unknown>>(getConfigPath(stockAnalysisDir), DEFAULT_STOCK_ANALYSIS_CONFIG as unknown as Record<string, unknown>)
  const merged: StockAnalysisStrategyConfig = {
    ...DEFAULT_STOCK_ANALYSIS_CONFIG,
    ...raw,
    marketThresholds: { ...DEFAULT_STOCK_ANALYSIS_CONFIG.marketThresholds, ...(raw.marketThresholds as Record<string, unknown> ?? {}) },
    fusionWeightsByRegime: { ...DEFAULT_STOCK_ANALYSIS_CONFIG.fusionWeightsByRegime, ...(raw.fusionWeightsByRegime as Record<string, unknown> ?? {}) },
    lowLiquidityGuardrail: { ...DEFAULT_STOCK_ANALYSIS_CONFIG.lowLiquidityGuardrail, ...(raw.lowLiquidityGuardrail as Record<string, unknown> ?? {}) },
    trailingStop: { ...DEFAULT_STOCK_ANALYSIS_CONFIG.trailingStop, ...(raw.trailingStop as Record<string, unknown> ?? {}) },
    portfolioRiskLimits: { ...DEFAULT_STOCK_ANALYSIS_CONFIG.portfolioRiskLimits, ...(raw.portfolioRiskLimits as Record<string, unknown> ?? {}) },
  } as StockAnalysisStrategyConfig
  return merged
}

export async function saveStockAnalysisConfig(stockAnalysisDir: string, config: StockAnalysisStrategyConfig) {
  await writeJson(getConfigPath(stockAnalysisDir), config)
}

export async function readStockAnalysisRuntimeStatus(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const raw = await readJson<Partial<StockAnalysisRuntimeStatus>>(getStatusPath(stockAnalysisDir), DEFAULT_RUNTIME_STATUS)
  return {
    ...DEFAULT_RUNTIME_STATUS,
    ...raw,
    staleReasons: Array.isArray(raw.staleReasons) ? raw.staleReasons : DEFAULT_RUNTIME_STATUS.staleReasons,
  }
}

export async function saveStockAnalysisRuntimeStatus(stockAnalysisDir: string, status: StockAnalysisRuntimeStatus) {
  await writeJson(getStatusPath(stockAnalysisDir), status)
}

/** leitura atômica-mudar-Escrever runtimeStatus（Com bloqueio de arquivo para evitar substituição simultânea） */
export async function atomicUpdateRuntimeStatus(
  stockAnalysisDir: string,
  updater: (current: StockAnalysisRuntimeStatus) => StockAnalysisRuntimeStatus,
): Promise<StockAnalysisRuntimeStatus> {
  const filePath = getStatusPath(stockAnalysisDir)
  return withFileLock(filePath, async () => {
    const current = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
    const next = updater(current)
    await saveStockAnalysisRuntimeStatus(stockAnalysisDir, next)
    return next
  })
}

export async function readStockAnalysisMarketState(stockAnalysisDir: string, tradeDate: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisMarketState | null>(getMarketStatePath(stockAnalysisDir, tradeDate), null)
}

export async function saveStockAnalysisMarketState(stockAnalysisDir: string, state: StockAnalysisMarketState) {
  await writeJson(getMarketStatePath(stockAnalysisDir, state.asOfDate), state)
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'market'), '', MAX_MARKET_STATE_DAYS)
}

export async function readStockAnalysisSignals(stockAnalysisDir: string, tradeDate: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisSignal[]>(getSignalPath(stockAnalysisDir, tradeDate), [])
}

/** [L6] digitalização signals/ Catálogo Obtenha lista de datas disponíveis（ordem decrescente） */
export async function getAvailableSignalDates(stockAnalysisDir: string): Promise<string[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const signalsDir = path.join(stockAnalysisDir, 'signals')
  let files: string[] = []
  try {
    files = await fs.readdir(signalsDir)
  } catch {
    return []
  }
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse()
}

/** digitalização data-agents/ A aquisição de diretório tem fact-pool Lista de dados de data（ordem decrescente） */
export async function getAvailableDataCollectionDates(stockAnalysisDir: string): Promise<string[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const dataAgentsDir = path.join(stockAnalysisDir, 'data-agents')
  let files: string[] = []
  try {
    files = await fs.readdir(dataAgentsDir)
  } catch {
    return []
  }
  return files
    .filter((f) => f.startsWith('fact-pool-') && f.endsWith('.json'))
    .map((f) => f.replace('fact-pool-', '').replace('.json', ''))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse()
}

export async function readRecentFactPools(stockAnalysisDir: string, limit: number = 5): Promise<FactPool[]> {
  const dates = await getAvailableDataCollectionDates(stockAnalysisDir)
  const pools = await Promise.all(dates.slice(0, limit).map((date) => readFactPool(stockAnalysisDir, date)))
  return pools.filter((pool): pool is FactPool => Boolean(pool))
}

/**
 * v1.35.0 [A3-P0-1] Salvar arquivo de sinal：Mantenha o status de decisão das ações do usuário
 * Mesmo dia daily Ao reiniciar，Já decisionSource ∈ {user_confirmed, user_rejected, user_ignored, user_override} sinal
 * Seus campos de usuário devem ser preservados（decisionSource/userDecisionNote/realtime/dismissedAt），Cobre apenas o que o sistema infere system Sinal。
 * Caso contrário, o sinal confirmado pelo usuário será redefinido para system，Pode ser acionado novamente automaticamente/Compra manual，Causando abertura repetida de posições。
 */
export async function saveStockAnalysisSignals(stockAnalysisDir: string, tradeDate: string, signals: StockAnalysisSignal[]) {
  const filePath = getSignalPath(stockAnalysisDir, tradeDate)
  const existing = await readJson<StockAnalysisSignal[]>(filePath, [])
  const existingMap = new Map(existing.map((s) => [s.id, s]))
  const USER_DECISIONS = new Set(['user_confirmed', 'user_rejected', 'user_ignored', 'user_override'])

  const merged = signals.map((newSignal) => {
    const old = existingMap.get(newSignal.id)
    if (!old) return newSignal
    // Quando um usuário toma uma decisão，Reservar campos de usuário
    if (USER_DECISIONS.has(old.decisionSource)) {
      return {
        ...newSignal,
        decisionSource: old.decisionSource,
        userDecisionNote: old.userDecisionNote,
        // realtime do intradiário cron Mantido de forma independente，Basta manter o novo valor
      }
    }
    return newSignal
  })
  await writeJson(filePath, merged)
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'signals'), '', MAX_SIGNAL_DAYS)
}

export async function saveStockAnalysisDailyRun(stockAnalysisDir: string, result: StockAnalysisDailyRunResult) {
  await writeJson(getRunPath(stockAnalysisDir, result.tradeDate), result)
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'reports', 'daily-runs'), '', MAX_DAILY_RUN_DAYS)
}

export async function readStockAnalysisDailyRun(stockAnalysisDir: string, tradeDate: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisDailyRunResult | null>(getRunPath(stockAnalysisDir, tradeDate), null)
}

export async function readStockAnalysisStockPool(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisWatchlistCandidate[]>(getStockPoolPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisStockPool(stockAnalysisDir: string, stockPool: StockAnalysisWatchlistCandidate[]) {
  await writeJson(getStockPoolPath(stockAnalysisDir), stockPool)
}

export async function readStockAnalysisStockPoolMeta(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisStockPoolCacheMeta>(getStockPoolMetaPath(stockAnalysisDir), { refreshedAt: null })
}

export async function saveStockAnalysisStockPoolMeta(stockAnalysisDir: string, meta: StockAnalysisStockPoolCacheMeta) {
  await writeJson(getStockPoolMetaPath(stockAnalysisDir), meta)
}

export async function readAllAStockList(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisWatchlistCandidate[]>(getAllAStockListPath(stockAnalysisDir), [])
}

export async function saveAllAStockList(stockAnalysisDir: string, list: StockAnalysisWatchlistCandidate[]) {
  await writeJson(getAllAStockListPath(stockAnalysisDir), list)
}

export async function readAllAStockListMeta(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisStockPoolCacheMeta>(getAllAStockListMetaPath(stockAnalysisDir), { refreshedAt: null })
}

export async function saveAllAStockListMeta(stockAnalysisDir: string, meta: StockAnalysisStockPoolCacheMeta) {
  await writeJson(getAllAStockListMetaPath(stockAnalysisDir), meta)
}

export async function readStockAnalysisQuoteCache(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisQuoteCache | null>(getQuoteCachePath(stockAnalysisDir), null)
}

export async function saveStockAnalysisQuoteCache(stockAnalysisDir: string, quoteCache: StockAnalysisQuoteCache) {
  await writeJson(getQuoteCachePath(stockAnalysisDir), quoteCache)
}

export async function readStockAnalysisIndexHistoryCache(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisIndexHistoryCache | null>(getIndexHistoryCachePath(stockAnalysisDir), null)
}

export async function saveStockAnalysisIndexHistoryCache(stockAnalysisDir: string, indexHistoryCache: StockAnalysisIndexHistoryCache) {
  await writeJson(getIndexHistoryCachePath(stockAnalysisDir), indexHistoryCache)
}

export async function readStockAnalysisHistoryCache(stockAnalysisDir: string, code: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisHistoryCache | null>(getHistoryCachePath(stockAnalysisDir, code), null)
}

export async function saveStockAnalysisHistoryCache(stockAnalysisDir: string, code: string, historyCache: StockAnalysisHistoryCache) {
  await writeJson(getHistoryCachePath(stockAnalysisDir, code), historyCache)
}

export async function readStockAnalysisPositions(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisPosition[]>(getPositionsPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisPositions(stockAnalysisDir: string, positions: StockAnalysisPosition[]) {
  await writeJson(getPositionsPath(stockAnalysisDir), positions)
}

// v1.35.0 [A8-P0-3] daily-equity Leitura e gravação de instantâneo
const MAX_DAILY_EQUITY_DAYS = 400 // Reserve aprox. 1.5 Série anual de patrimônio líquido

export async function readStockAnalysisDailyEquity(stockAnalysisDir: string): Promise<DailyEquitySnapshot[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<DailyEquitySnapshot[]>(getDailyEquityPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisDailyEquity(stockAnalysisDir: string, equity: DailyEquitySnapshot[]): Promise<void> {
  // Salvar em ordem crescente de data，Mantenha apenas o mais recente MAX_DAILY_EQUITY_DAYS céu
  const sorted = [...equity]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_DAILY_EQUITY_DAYS)
  await writeJson(getDailyEquityPath(stockAnalysisDir), sorted)
}

/**
 * v1.35.0 [A8-P0-3] Acrescentar/Dia de substituição daily-equity entrada（de acordo com date Exclusividade e remoção de duplicatas）
 */
export async function upsertDailyEquitySnapshot(
  stockAnalysisDir: string,
  snapshot: DailyEquitySnapshot,
): Promise<void> {
  const existing = await readStockAnalysisDailyEquity(stockAnalysisDir)
  const filtered = existing.filter((item) => item.date !== snapshot.date)
  filtered.push(snapshot)
  await saveStockAnalysisDailyEquity(stockAnalysisDir, filtered)
}

export async function readStockAnalysisTrades(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisTradeRecord[]>(getTradesPath(stockAnalysisDir), [])
}

/** P2-D3: trades manter limite superior 2000 tira（sobre 2-3 volume anual de transações），Excesso de arquivo */
const MAX_TRADES = 2000

export async function saveStockAnalysisTrades(stockAnalysisDir: string, trades: StockAnalysisTradeRecord[]) {
  if (trades.length > MAX_TRADES) {
    const archived = trades.slice(MAX_TRADES)
    const archivePath = path.join(stockAnalysisDir, 'journal', `trades-archive-${Date.now()}.json`)
    await writeJson(archivePath, archived)
    logger.info(`[store] trades Exceder ${MAX_TRADES} tira，Arquivo ${archived.length} Artigo chegou ${path.basename(archivePath)}`)
    await writeJson(getTradesPath(stockAnalysisDir), trades.slice(0, MAX_TRADES))
  } else {
    await writeJson(getTradesPath(stockAnalysisDir), trades)
  }
}

export async function readStockAnalysisWatchLogs(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const logs = await readJson<StockAnalysisWatchLogEntry[]>(getWatchLogsPath(stockAnalysisDir), [])
  return logs.map((item) => ({
    ...item,
    tPlus1Return: typeof item.tPlus1Return === 'number' ? item.tPlus1Return : null,
    tPlus5Return: typeof item.tPlus5Return === 'number' ? item.tPlus5Return : null,
    outcome: item.outcome ?? 'pending',
    evaluatedAt: item.evaluatedAt ?? null,
  }))
}

/** P2-D3: watch-logs manter limite superior 1000 tira */
const MAX_WATCH_LOGS = 1000

export async function saveStockAnalysisWatchLogs(stockAnalysisDir: string, watchLogs: StockAnalysisWatchLogEntry[]) {
  const trimmed = watchLogs.length > MAX_WATCH_LOGS ? watchLogs.slice(0, MAX_WATCH_LOGS) : watchLogs
  await writeJson(getWatchLogsPath(stockAnalysisDir), trimmed)
}

export async function readStockAnalysisWeeklySummary(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisWeeklySummary[]>(getWeeklySummaryPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisWeeklySummary(stockAnalysisDir: string, weeklySummary: StockAnalysisWeeklySummary[]) {
  await writeJson(getWeeklySummaryPath(stockAnalysisDir), weeklySummary)
}

export async function readStockAnalysisMonthlySummary(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisMonthlySummary[]>(getMonthlySummaryPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisMonthlySummary(stockAnalysisDir: string, monthlySummary: StockAnalysisMonthlySummary[]) {
  await writeJson(getMonthlySummaryPath(stockAnalysisDir), monthlySummary)
}

export async function readStockAnalysisPerformanceDashboard(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisPerformanceDashboard | null>(getPerformanceDashboardPath(stockAnalysisDir), null)
}

export async function saveStockAnalysisPerformanceDashboard(stockAnalysisDir: string, dashboard: StockAnalysisPerformanceDashboard) {
  await writeJson(getPerformanceDashboardPath(stockAnalysisDir), dashboard)
}

export async function readStockAnalysisModelGroups(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisModelGroupPerformance[]>(getModelGroupsPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisModelGroups(stockAnalysisDir: string, groups: StockAnalysisModelGroupPerformance[]) {
  await writeJson(getModelGroupsPath(stockAnalysisDir), groups)
}

export async function readStockAnalysisBlacklist(stockAnalysisDir: string): Promise<string[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<string[]>(getBlacklistPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisBlacklist(stockAnalysisDir: string, blacklist: string[]) {
  await writeJson(getBlacklistPath(stockAnalysisDir), blacklist)
}

export async function readStockAnalysisReviews(stockAnalysisDir: string): Promise<StockAnalysisReviewRecord[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisReviewRecord[]>(getReviewsPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisReviews(stockAnalysisDir: string, reviews: StockAnalysisReviewRecord[]) {
  await writeJson(getReviewsPath(stockAnalysisDir), reviews)
}

const MAX_RISK_EVENTS = 200

export async function readStockAnalysisRiskEvents(stockAnalysisDir: string): Promise<StockAnalysisRiskEvent[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisRiskEvent[]>(getRiskEventsPath(stockAnalysisDir), [])
}

export async function saveStockAnalysisRiskEvents(stockAnalysisDir: string, events: StockAnalysisRiskEvent[]) {
  await writeJson(getRiskEventsPath(stockAnalysisDir), events.slice(0, MAX_RISK_EVENTS))
}

export async function readStockAnalysisLearnedWeights(stockAnalysisDir: string): Promise<StockAnalysisLearnedWeights | null> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisLearnedWeights | null>(getLearnedWeightsPath(stockAnalysisDir), null)
}

export async function saveStockAnalysisLearnedWeights(stockAnalysisDir: string, weights: StockAnalysisLearnedWeights) {
  await writeJson(getLearnedWeightsPath(stockAnalysisDir), weights)
}

const MAX_THRESHOLD_ADJUSTMENTS = 100

export async function readStockAnalysisThresholdHistory(stockAnalysisDir: string): Promise<StockAnalysisThresholdHistory> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisThresholdHistory>(getThresholdHistoryPath(stockAnalysisDir), { updatedAt: '', adjustments: [] })
}

export async function saveStockAnalysisThresholdHistory(stockAnalysisDir: string, history: StockAnalysisThresholdHistory) {
  const trimmed = { ...history, adjustments: history.adjustments.slice(0, MAX_THRESHOLD_ADJUSTMENTS) }
  await writeJson(getThresholdHistoryPath(stockAnalysisDir), trimmed)
}

// ==================== Phase 5: AI Configuração ====================

function getAIConfigPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'ai-config.json')
}

const DEFAULT_EXTRACTION_AGENTS: LLMExtractionAgentConfig[] = [
  { agentId: 'announcement_parser', label: 'analisador de anúncios', assignedModel: null, enabled: true },
  { agentId: 'news_impact_analyzer', label: 'Analisador de impacto de notícias', assignedModel: null, enabled: true },
  { agentId: 'sentiment_analyzer', label: 'Analisador de sentimento de opinião pública', assignedModel: null, enabled: true },
]

const DEFAULT_AI_CONFIG: StockAnalysisAIConfig = {
  version: 1,
  updatedAt: '',
  providers: [],
  experts: [],
  layerAssignments: [],
  extractionAgents: DEFAULT_EXTRACTION_AGENTS,
}

export async function readStockAnalysisAIConfig(stockAnalysisDir: string): Promise<StockAnalysisAIConfig> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const config = await readJson<StockAnalysisAIConfig>(getAIConfigPath(stockAnalysisDir), DEFAULT_AI_CONFIG)
  // compatível com versões anteriores：Arquivos de configuração antigos podem não ter extractionAgents Campo
  if (!Array.isArray(config.extractionAgents) || config.extractionAgents.length === 0) {
    config.extractionAgents = DEFAULT_EXTRACTION_AGENTS
  }
  return config
}

export async function saveStockAnalysisAIConfig(stockAnalysisDir: string, config: StockAnalysisAIConfig) {
  await writeJson(getAIConfigPath(stockAnalysisDir), { ...config, updatedAt: new Date().toISOString() })
}

// ==================== Phase 6: Acompanhamento de desempenho individual especializado ====================

const DEFAULT_EXPERT_PERFORMANCE: StockAnalysisExpertPerformanceData = {
  updatedAt: '',
  entries: [],
}

export async function readStockAnalysisExpertPerformance(stockAnalysisDir: string): Promise<StockAnalysisExpertPerformanceData> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisExpertPerformanceData>(getExpertPerformancePath(stockAnalysisDir), DEFAULT_EXPERT_PERFORMANCE)
}

export async function saveStockAnalysisExpertPerformance(stockAnalysisDir: string, data: StockAnalysisExpertPerformanceData) {
  await writeJson(getExpertPerformancePath(stockAnalysisDir), { ...data, updatedAt: new Date().toISOString() })
}

// ==================== Phase 7: Notificações automáticas de relatórios + relatório mensal ====================

const MAX_NOTIFICATIONS = 100
const MAX_MONTHLY_REPORTS = 24

function getNotificationsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'reports', 'notifications.json')
}

function getMonthlyReportsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'reports', 'monthly-reports.json')
}

export async function readAutoReportNotifications(stockAnalysisDir: string): Promise<AutoReportNotification[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<AutoReportNotification[]>(getNotificationsPath(stockAnalysisDir), [])
}

export async function saveAutoReportNotifications(stockAnalysisDir: string, notifications: AutoReportNotification[]) {
  await writeJson(getNotificationsPath(stockAnalysisDir), notifications.slice(0, MAX_NOTIFICATIONS))
}

export async function readMonthlyReports(stockAnalysisDir: string): Promise<MonthlyReport[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<MonthlyReport[]>(getMonthlyReportsPath(stockAnalysisDir), [])
}

export async function saveMonthlyReports(stockAnalysisDir: string, reports: MonthlyReport[]) {
  await writeJson(getMonthlyReportsPath(stockAnalysisDir), reports.slice(0, MAX_MONTHLY_REPORTS))
}

// ==================== Phase 8: conjunto de fatos + Processo fora do expediente + LLM Extrair resultados ====================

const MAX_FACT_POOL_DAYS = 30
const MAX_POST_MARKET_RESULTS = 60
const MAX_LLM_EXTRACTION_RESULTS = 60
const MAX_SIGNAL_DAYS = 90
const MAX_MARKET_STATE_DAYS = 90
const MAX_DAILY_RUN_DAYS = 60

function getFactPoolPath(stockAnalysisDir: string, tradeDate: string) {
  return path.join(stockAnalysisDir, 'data-agents', `fact-pool-${tradeDate}.json`)
}

function getPostMarketResultPath(stockAnalysisDir: string, tradeDate: string) {
  return path.join(stockAnalysisDir, 'reports', `post-market-${tradeDate}.json`)
}

function getLLMExtractionPath(stockAnalysisDir: string, tradeDate: string) {
  return path.join(stockAnalysisDir, 'data-agents', `llm-extraction-${tradeDate}.json`)
}

const DEFAULT_FACT_POOL: FactPool = {
  updatedAt: '',
  tradeDate: '',
  macroData: null,
  policyEvents: [],
  companyAnnouncements: [],
  industryNews: [],
  socialSentiment: [],
  globalMarkets: null,
  priceVolumeExtras: null,
  dataQuality: null,
  agentLogs: [],
}

export async function readFactPool(stockAnalysisDir: string, tradeDate: string): Promise<FactPool | null> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<FactPool | null>(getFactPoolPath(stockAnalysisDir, tradeDate), null)
}

export async function saveFactPool(stockAnalysisDir: string, factPool: FactPool) {
  await writeJson(getFactPoolPath(stockAnalysisDir, factPool.tradeDate), { ...factPool, updatedAt: new Date().toISOString() })
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'data-agents'), 'fact-pool-', MAX_FACT_POOL_DAYS)
}

/** Mesclar o conjunto de fatos recém-coletado no conjunto de fatos existente（Desduplicação adicional） */
export async function mergeFactPool(stockAnalysisDir: string, existing: FactPool, incoming: FactPool): Promise<FactPool> {
  const merged: FactPool = {
    updatedAt: new Date().toISOString(),
    tradeDate: existing.tradeDate,
    // dados macro：Dê prioridade aos recém-coletados（Pode ser atualizado）
    macroData: incoming.macroData ?? existing.macroData,
    // Campo de tipo de matriz：Desduplicação adicional
    policyEvents: deduplicateByKey(
      [...existing.policyEvents, ...incoming.policyEvents],
      (e) => e.id || `${e.title}::${e.source}`,
    ),
    companyAnnouncements: deduplicateByKey(
      [...existing.companyAnnouncements, ...incoming.companyAnnouncements],
      (e) => `${e.code}::${e.title}`,
    ),
    industryNews: deduplicateByKey(
      [...existing.industryNews, ...incoming.industryNews],
      (e) => e.id || `${e.title}::${e.source}`,
    ),
    socialSentiment: deduplicateByKey(
      [...existing.socialSentiment, ...incoming.socialSentiment],
      (e) => `${e.platform}::${e.collectedAt}`,
    ),
    // Tipo de objeto：Dê prioridade aos recém-coletados
    globalMarkets: incoming.globalMarkets ?? existing.globalMarkets,
    priceVolumeExtras: incoming.priceVolumeExtras ?? existing.priceVolumeExtras,
    dataQuality: incoming.dataQuality ?? existing.dataQuality,
    // agentLogs：mantenha tudo（Marcar fonte）
    agentLogs: [...existing.agentLogs, ...incoming.agentLogs],
  }
  await saveFactPool(stockAnalysisDir, merged)
  return merged
}

/** será novo LLM Mesclar resultados extraídos em resultados existentes */
export async function mergeLLMExtractionResult(
  stockAnalysisDir: string,
  existing: LLMExtractionResult,
  incoming: LLMExtractionResult,
): Promise<LLMExtractionResult> {
  const merged: LLMExtractionResult = {
    extractedAt: new Date().toISOString(),
    tradeDate: existing.tradeDate,
    announcements: deduplicateByKey(
      [...existing.announcements, ...incoming.announcements],
      (e) => `${e.company}::${e.eventType}::${e.magnitude}`,
    ),
    newsImpacts: deduplicateByKey(
      [...existing.newsImpacts, ...incoming.newsImpacts],
      (e) => `${e.topic}::${e.impactDirection}`,
    ),
    // Índice de opinião pública：O mais recente prevalecerá
    sentimentIndex: incoming.sentimentIndex ?? existing.sentimentIndex,
    llmCalls: [...existing.llmCalls, ...incoming.llmCalls],
  }
  await saveLLMExtractionResult(stockAnalysisDir, merged)
  return merged
}

/** de acordo com key Desduplicação de função，Mantenha a primeira ocorrência do elemento */
function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  return result
}

export async function readPostMarketResult(stockAnalysisDir: string, tradeDate: string): Promise<StockAnalysisPostMarketResult | null> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<StockAnalysisPostMarketResult | null>(getPostMarketResultPath(stockAnalysisDir, tradeDate), null)
}

export async function savePostMarketResult(stockAnalysisDir: string, result: StockAnalysisPostMarketResult) {
  await writeJson(getPostMarketResultPath(stockAnalysisDir, result.tradeDate), result)
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'reports'), 'post-market-', MAX_POST_MARKET_RESULTS)
}

export async function readLLMExtractionResult(stockAnalysisDir: string, tradeDate: string): Promise<LLMExtractionResult | null> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<LLMExtractionResult | null>(getLLMExtractionPath(stockAnalysisDir, tradeDate), null)
}

export async function saveLLMExtractionResult(stockAnalysisDir: string, result: LLMExtractionResult) {
  await writeJson(getLLMExtractionPath(stockAnalysisDir, result.tradeDate), result)
  await pruneOldDateFiles(path.join(stockAnalysisDir, 'data-agents'), 'llm-extraction-', MAX_LLM_EXTRACTION_RESULTS)
}

// ==================== Phase 9: Monitoramento intradiário em tempo real ====================

const MAX_INTRADAY_ALERTS = 200

function getIntradayAlertsPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'intraday', 'alerts.json')
}

function getIntradayMonitorStatusPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'intraday', 'monitor-status.json')
}

const DEFAULT_INTRADAY_MONITOR_STATUS: IntradayMonitorStatus = {
  state: 'idle',
  lastPollAt: null,
  pollCount: 0,
  alerts: [],
  startedAt: null,
}

export async function readIntradayAlerts(stockAnalysisDir: string): Promise<IntradayAlert[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<IntradayAlert[]>(getIntradayAlertsPath(stockAnalysisDir), [])
}

export async function saveIntradayAlerts(stockAnalysisDir: string, alerts: IntradayAlert[]) {
  await writeJson(getIntradayAlertsPath(stockAnalysisDir), alerts.slice(0, MAX_INTRADAY_ALERTS))
}

export async function readIntradayMonitorStatus(stockAnalysisDir: string): Promise<IntradayMonitorStatus> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<IntradayMonitorStatus>(getIntradayMonitorStatusPath(stockAnalysisDir), DEFAULT_INTRADAY_MONITOR_STATUS)
}

export async function saveIntradayMonitorStatus(stockAnalysisDir: string, status: IntradayMonitorStatus) {
  await writeJson(getIntradayMonitorStatusPath(stockAnalysisDir), status)
}

// ==================== Phase 10: sistema de memória especialista ====================

const MAX_SHORT_TERM_DAYS = 5
const MAX_DAILY_MEMORY_DAYS = 60

function getExpertMemoryStorePath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'experts', 'memory-store.json')
}

function getDailyMemoriesPath(stockAnalysisDir: string, tradeDate: string) {
  return path.join(stockAnalysisDir, 'experts', 'daily-memories', `${tradeDate}.json`)
}

const DEFAULT_EXPERT_MEMORY_STORE: ExpertMemoryStore = {
  version: 1,
  updatedAt: '',
  memories: {},
}

export async function readExpertMemoryStore(stockAnalysisDir: string): Promise<ExpertMemoryStore> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<ExpertMemoryStore>(getExpertMemoryStorePath(stockAnalysisDir), DEFAULT_EXPERT_MEMORY_STORE)
}

export async function saveExpertMemoryStore(stockAnalysisDir: string, store: ExpertMemoryStore) {
  await writeJson(getExpertMemoryStorePath(stockAnalysisDir), { ...store, updatedAt: new Date().toISOString() })
}

export async function readExpertDailyMemories(stockAnalysisDir: string, tradeDate: string): Promise<ExpertDailyMemoryEntry[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<ExpertDailyMemoryEntry[]>(getDailyMemoriesPath(stockAnalysisDir, tradeDate), [])
}

export async function saveExpertDailyMemories(stockAnalysisDir: string, tradeDate: string, entries: ExpertDailyMemoryEntry[]) {
  const dailyDir = path.join(stockAnalysisDir, 'experts', 'daily-memories')
  await fs.mkdir(dailyDir, { recursive: true })
  await writeJson(getDailyMemoriesPath(stockAnalysisDir, tradeDate), entries)
  await pruneOldDateFiles(dailyDir, '', MAX_DAILY_MEMORY_DAYS)
}

export { MAX_SHORT_TERM_DAYS, MAX_DAILY_MEMORY_DAYS }

// ==================== Phase 11: Coleta de dados Agent Configuração ====================

function getDataAgentConfigPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'data-agent-config.json')
}

const DEFAULT_DATA_AGENT_CONFIG: DataAgentConfigStore = {
  version: 1,
  updatedAt: '',
  agents: [
    { agentId: 'macro_economy', enabled: true, timeoutMs: 600_000, priority: 1, label: 'Macroeconomia' },
    { agentId: 'policy_regulation', enabled: true, timeoutMs: 600_000, priority: 2, label: 'Políticas e regulamentos' },
    { agentId: 'company_info', enabled: true, timeoutMs: 600_000, priority: 3, label: 'anúncio da empresa' },
    { agentId: 'price_volume', enabled: true, timeoutMs: 600_000, priority: 4, label: 'preço quantidade energia' },
    { agentId: 'industry_news', enabled: true, timeoutMs: 600_000, priority: 5, label: 'Notícias da indústria' },
    { agentId: 'social_sentiment', enabled: true, timeoutMs: 600_000, priority: 6, label: 'opinião pública social' },
    { agentId: 'global_markets', enabled: true, timeoutMs: 600_000, priority: 7, label: 'mercado global' },
    { agentId: 'data_quality', enabled: true, timeoutMs: 600_000, priority: 8, label: 'Qualidade dos dados' },
  ] satisfies DataAgentConfigItem[],
}

export async function readDataAgentConfig(stockAnalysisDir: string): Promise<DataAgentConfigStore> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<DataAgentConfigStore>(getDataAgentConfigPath(stockAnalysisDir), DEFAULT_DATA_AGENT_CONFIG)
}

export async function saveDataAgentConfig(stockAnalysisDir: string, config: DataAgentConfigStore) {
  await writeJson(getDataAgentConfigPath(stockAnalysisDir), { ...config, updatedAt: new Date().toISOString() })
}

export { DEFAULT_DATA_AGENT_CONFIG }

/**
 * [P2-20] Limpe resíduos em vários subdiretórios .tmp documento。
 * Na inicialização do serviço bootstrap Chamado quando。
 */
export async function cleanupAllStaleTemporaryFiles(stockAnalysisDir: string): Promise<void> {
  const dirs = ['config', 'signals', 'market', 'portfolio', 'journal', 'cache', 'reports', 'experts'].map((d) => path.join(stockAnalysisDir, d))
  let totalCleaned = 0
  for (const dir of dirs) {
    totalCleaned += await cleanupStaleTemporaryFiles(dir)
  }
  if (totalCleaned > 0) {
    logger.info(`[store] Limpo ${totalCleaned} resíduo .tmp documento`, { module: 'StockAnalysis' })
  }
}

// ── ações auto-selecionadas (Watchlist) ─────────────────────────────────

const MAX_WATCHLIST_ITEMS = 50

function getWatchlistPath(stockAnalysisDir: string) {
  return path.join(stockAnalysisDir, 'config', 'watchlist.json')
}

export async function readUserWatchlist(stockAnalysisDir: string): Promise<UserWatchlistItem[]> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  return readJson<UserWatchlistItem[]>(getWatchlistPath(stockAnalysisDir), [])
}

export async function saveUserWatchlist(stockAnalysisDir: string, items: UserWatchlistItem[]): Promise<void> {
  const trimmed = items.slice(0, MAX_WATCHLIST_ITEMS)
  await writeJson(getWatchlistPath(stockAnalysisDir), trimmed)
}
