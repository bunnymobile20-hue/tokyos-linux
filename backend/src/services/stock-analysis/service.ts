import { execFile } from 'child_process'
import { promisify } from 'util'

import { logger } from '../../utils/logger'
import { saLog, initSALogger } from './sa-logger'
import { runExpertVoting } from './llm-inference'
import type { LLMExpertScore } from './llm-inference'
import { fetchFundamentalsForCodes } from './fundamentals'
import { callProviderText } from './llm-provider-adapter'
import { aggregateSocialSentiment } from './data-agents'
import { buildExpertProfile, buildFactPoolSummary, runDailyMemoryUpdate, runLongTermMemoryUpdate } from './memory'
import { checkTradingAvailability, getRecentTradeDates, isWithinTradingHours as isWithinTradingHoursShared } from './trading-calendar'
import {
  DEFAULT_RISK_CONTROL_STATE,
  ensureStockAnalysisStructure,
  readStockAnalysisBlacklist,
  readStockAnalysisConfig,
  readStockAnalysisDailyRun,
  readStockAnalysisHistoryCache,
  readStockAnalysisIndexHistoryCache,
  readStockAnalysisLearnedWeights,
  readStockAnalysisMarketState,
  readStockAnalysisModelGroups,
  readStockAnalysisMonthlySummary,
  readStockAnalysisPerformanceDashboard,
  readStockAnalysisPositions,
  readStockAnalysisDailyEquity,
  upsertDailyEquitySnapshot,
  readStockAnalysisQuoteCache,
  readStockAnalysisReviews,
  readStockAnalysisRiskEvents,
  readStockAnalysisRuntimeStatus,
  readStockAnalysisSignals,
  readStockAnalysisStockPool,
  readStockAnalysisStockPoolMeta,
  readAllAStockList,
  readAllAStockListMeta,
  readStockAnalysisThresholdHistory,
  readStockAnalysisTrades,
  readStockAnalysisWatchLogs,
  readStockAnalysisWeeklySummary,
  saveStockAnalysisDailyRun,
  saveStockAnalysisHistoryCache,
  saveStockAnalysisIndexHistoryCache,
  saveStockAnalysisLearnedWeights,
  saveStockAnalysisMarketState,
  saveStockAnalysisModelGroups,
  saveStockAnalysisMonthlySummary,
  saveStockAnalysisPerformanceDashboard,
  saveStockAnalysisPositions,
  saveStockAnalysisQuoteCache,
  saveStockAnalysisReviews,
  saveStockAnalysisRiskEvents,
  saveStockAnalysisRuntimeStatus,
  saveStockAnalysisSignals,
  saveStockAnalysisStockPool,
  saveStockAnalysisStockPoolMeta,
  saveAllAStockList,
  saveAllAStockListMeta,
  saveStockAnalysisTrades,
  saveStockAnalysisThresholdHistory,
  saveStockAnalysisWatchLogs,
  saveStockAnalysisWeeklySummary,
  readStockAnalysisAIConfig,
  saveStockAnalysisAIConfig,
  saveStockAnalysisConfig,
  atomicUpdateRuntimeStatus,
  readStockAnalysisExpertPerformance,
  readAutoReportNotifications,
  saveAutoReportNotifications,
  readMonthlyReports,
  saveMonthlyReports,
  readFactPool,
  saveFactPool,
  mergeFactPool,
  readPostMarketResult,
  savePostMarketResult,
  readLLMExtractionResult,
  saveLLMExtractionResult,
  mergeLLMExtractionResult,
  readIntradayAlerts,
  saveIntradayAlerts,
  readIntradayMonitorStatus,
  saveIntradayMonitorStatus,
  readExpertMemoryStore,
  readExpertDailyMemories,
  getAvailableDataCollectionDates,
  getAvailableSignalDates,
  readDataAgentConfig,
  saveDataAgentConfig,
  cleanupAllStaleTemporaryFiles,
  withFileLock,
  readUserWatchlist,
  saveUserWatchlist,
} from './store'
import type {
  DecisionSource,
  MarketLiquidity,
  MarketRegime,
  DailyEquitySnapshot,
  MarketSentiment,
  MarketStyle,
  MarketTrend,
  MarketVolatility,
  PositionAction,
  StockAnalysisCurrentRun,
  StockAnalysisDailyRunResult,
  StockAnalysisDataState,
  StockAnalysisDimensionAnalysis,
  StockAnalysisFusionWeights,
  StockAnalysisHealthStatus,
  StockAnalysisHistoryCache,
  StockAnalysisIndexHistoryCache,
  StockAnalysisKlinePoint,
  StockAnalysisLearnedWeights,
  StockAnalysisMarketState,
  StockAnalysisModelGroupPerformance,
  StockAnalysisMonthlySummary,
  StockAnalysisOverview,
  StockAnalysisPerformanceDashboard,
  StockAnalysisPosition,
  StockAnalysisPositionEvaluation,
  StockAnalysisPortfolioRiskLimits,
  StockAnalysisQuoteCache,
  StockAnalysisReviewRecord,
  StockAnalysisRiskControlState,
  StockAnalysisRiskEvent,
  StockAnalysisRiskEventType,
  StockAnalysisRunState,
  StockAnalysisRuntimeStatus,
  StockAnalysisSignal,
  StockAnalysisSpotQuote,
  StockAnalysisStockSnapshot,
  StockAnalysisStrategyConfig,
  StockAnalysisSwapSuggestion,
  StockAnalysisThresholdAdjustment,
  StockAnalysisTradeRecord,
  StockAnalysisTradeRequest,
  StockAnalysisWatchLogEntry,
  StockAnalysisWatchlistCandidate,
  StockAnalysisWeeklySummary,
  StockAnalysisWeightUpdateEntry,
  StockAnalysisAIConfig,
  StockAnalysisAIModelRef,
  StockAnalysisAIProvider,
  StockAnalysisExpertDefinition,
  StockAnalysisExpertLayer,
  StockAnalysisExpertPerformanceData,
  StockAnalysisExpertPerformanceEntry,
  StockAnalysisExpertScore,
  StockAnalysisExpertStance,
  StockAnalysisExpertVote,
  StockAnalysisLayerAssignment,
  StockAnalysisModelTestResult,
  SupportResistanceLevels,
  MarketLevelRiskState,
  IntradayAlert,
  IntradayMonitorStatus,
  AutoReportNotification,
  TuningSuggestion,
  MonthlyReport,
  FactPool,
  DataAgentId,
  DataAgentResult,
  MacroEconomicData,
  GlobalMarketSnapshot,
  CompanyAnnouncement,
  IndustryNewsItem,
  SocialSentimentSnapshot,
  PolicyEvent,
  DataQualityReport,
  LLMExtractionResult,
  AnnouncementEvent,
  NewsImpactEvent,
  SentimentIndex,
  EventScreenResult,
  StockAnalysisPostMarketResult,
  ExpertProfile,
  ExpertMemoryStore,
  ExpertDailyMemoryEntry,
  FactPoolSummary,
  StockFundamentals,
  DataAgentConfigStore,  LLMExtractionAgentId,
  StockAnalysisOverrideStats,
  UserWatchlistItem,
  WatchlistQuoteSnapshot,
  WatchlistResponse,
} from './types'

const execFileAsync = promisify(execFile)

const EASTMONEY_UT = 'bd1d9ddb04089700cf9c27f6f7426281'
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000
const INDEX_HISTORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const STOCK_POOL_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12_000
const MAX_HISTORY_CONCURRENCY = 10
const INDEX_HISTORY_SEC_IDS = ['1.000905', '0.000905', '2.000905', '47.000905'] as const
export const POST_MARKET_BATCH_WINDOW_MS = 3 * 60 * 60 * 1000

let pythonUserSitePackagesPromise: Promise<string | null> | null = null
let currentRunPromise: Promise<StockAnalysisDailyRunResult> | null = null
let currentPostMarketPromise: Promise<StockAnalysisPostMarketResult> | null = null
let intradayMonitorTimer: ReturnType<typeof setInterval> | null = null

// v1.35.0 [A5-P0-1/2 + A6-P0-2] tarefa longa in-flight Trancar
// evitar morningSupplement / autoDecisions / intradayPoll Queimadura de gatilho repetida LLM token
let currentSupplementPromise: Promise<void> | null = null
let currentAutoDecisionsPromise: Promise<unknown> | null = null
let intradayPollInFlight = false

/** P0-3: Operações comerciais（Abra uma posição/Fechar posição/Reduzir posições）bloqueio mutex compartilhado key，Evitar condições de corrida simultânea */
const TRADING_LOCK_KEY = '__trading_operations_lock__'

// v1.35.0 [A4-P0-2] Reduza o cache idempotente：clientNonce → Carimbo de data e hora da primeira execução
// 60 mesmo em segundos nonce Rejeitar diretamente；Exceder 200 Limpe itens com base no tempo de expiração
const reduceIdempotencyCache = new Map<string, { ts: number; positionId: string }>()

// v1.35.0 test-only：Ignorar verificação da sessão de negociação，para testes unitários（Não afeta o ambiente de produção）
function isTradingHoursBypassedForTests(): boolean {
  return process.env.NODE_ENV === 'test' && process.env.SA_BYPASS_TRADING_HOURS === '1'
}


interface EastmoneySpotItem {
  f12: string
  f14: string
  f100?: string
  f2: number
  f3: number
  f8: number
  f15: number
  f16: number
  f17: number
  f18: number
  f20: number
  f21: number
}

interface EastmoneySpotResponse {
  data?: {
    diff?: EastmoneySpotItem[]
  }
}

interface EastmoneyKlineResponse {
  data?: {
    klines?: string[]
  }
}

interface TencentIndexKlineResponse {
  data?: Record<string, {
    day?: string[][]
    qfqday?: string[][]
  }>
}

// ── Lavar K Arame JSONP resposta ──
interface TonghuashunKlineResponse {
  data: string  // "data,abertura,fechar,Mais alto,mais baixo,Volume(compartilhar),Volume de negócios(Yuan),amplitude,,,0;..." Ponto e vírgula separa várias linhas
  num: number
}

// ── Sohu K Arame JSON resposta ──
interface SohuKlineResponse {
  status: number
  hq: string[][] // [data, abertura, fechar, Aumentar ou diminuir, Aumentar ou diminuir%, mais baixo, Mais alto, Volume(mão), Volume de negócios(Dez mil yuans), taxa de rotatividade%]
  code: string
}

// ── Sina K Arame JSON resposta ──
interface SinaKlineItem {
  day: string
  open: string
  high: string
  low: string
  close: string
  volume: string  // compartilhar
}

interface PythonJsonResult<T> {
  success: boolean
  data?: T
  error?: string
}

interface PythonConstituentItem {
   "Código de cupom de ingrediente": string
   "Nome do cupom do componente": string
   intercâmbio: string
   "Nome da indústria"?: string
}

interface PythonIndexHistoryItem {
   data: string
   fechar: number
   "Volume de negócios": number
}

interface DataEnvelope<T> {
  data: T
  fetchedAt: string | null
  usedFallback: boolean
  staleReasons: string[]
}

const CSI500_CONSTITUENTS_SCRIPT = String.raw`
import json
import akshare as ak

try:
    df = ak.index_stock_cons_csindex(symbol='000905')
    columns = [col for col in ['Código de cupom de ingrediente', 'Nome do cupom do componente', 'intercâmbio', 'Nome da indústria'] if col in df.columns]
    rows = df[columns].to_dict(orient='records')
    print(json.dumps({'success': True, 'data': rows}, ensure_ascii=False))
except Exception as exc:
    print(json.dumps({'success': False, 'error': str(exc)}, ensure_ascii=False))
`

const CSI500_INDEX_HISTORY_SCRIPT = String.raw`
import json
import akshare as ak

try:
    df = ak.index_zh_a_hist(symbol='000905', period='daily', start_date='20240101', end_date='20300101')
    rows = df[['data', 'fechar', 'Volume de negócios']].tail(40).to_dict(orient='records')
    print(json.dumps({'success': True, 'data': rows}, ensure_ascii=False, default=str))
except Exception as exc:
    print(json.dumps({'success': False, 'error': str(exc)}, ensure_ascii=False))
`

const ALL_A_STOCK_LIST_SCRIPT = String.raw`
import json
import akshare as ak

try:
    df = ak.stock_info_a_code_name()
    rows = df[['code', 'name']].to_dict(orient='records')
    print(json.dumps({'success': True, 'data': rows}, ensure_ascii=False))
except Exception as exc:
    print(json.dumps({'success': False, 'error': str(exc)}, ensure_ascii=False))
`

/** Voltar ao horário de Pequim（Asia/Shanghai）sequência de data YYYY-MM-DD */
function todayDate() {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' })
}

function nowIso() {
  return new Date().toISOString()
}

function ageMs(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }
  return Date.now() - new Date(value).getTime()
}

function isFresh(value: string | null, ttlMs: number) {
  return ageMs(value) <= ttlMs
}

function getWeekLabel(date: Date) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${temp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function getMonthLabel(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stddev(values: number[]) {
  if (values.length <= 1) {
    return 0
  }
  const avg = mean(values)
  const variance = mean(values.map((value) => (value - avg) ** 2))
  return Math.sqrt(variance)
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function safeDivide(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function getMarketFromCode(code: string): 'sh' | 'sz' | 'bj' {
  if (code.startsWith('6')) {
    return 'sh'
  }
  if (code.startsWith('8') || code.startsWith('4')) {
    return 'bj'
  }
  return 'sz'
}

function getSecId(code: string) {
  const market = getMarketFromCode(code)
  if (market === 'sh') {
    return `1.${code}`
  }
  return `0.${code}`
}

function getTencentSymbol(code: string) {
  const market = getMarketFromCode(code)
  if (market === 'sh') return `sh${code}`
  if (market === 'bj') return `bj${code}`
  return `sz${code}`
}


function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function getStaleReasonForAge(label: string, fetchedAt: string | null, ttlMs: number) {
  if (!fetchedAt) {
    return `${label}falta de cache`
  }
  if (!isFresh(fetchedAt, ttlMs)) {
    return `${label}Expiração do cache`
  }
  return null
}

async function getPythonUserSitePackages() {
  if (!pythonUserSitePackagesPromise) {
    pythonUserSitePackagesPromise = execFileAsync('python3', ['-c', 'import site; print(site.getusersitepackages())'], {
      maxBuffer: 1024 * 256,
      env: process.env,
    })
      .then(({ stdout }) => stdout.trim() || null)
      .catch(() => null)
  }

  return pythonUserSitePackagesPromise
}

async function runPythonJson<T>(script: string): Promise<T> {
  const pythonUserSite = await getPythonUserSitePackages()
  const env = { ...process.env }
  if (pythonUserSite) {
    env.PYTHONPATH = env.PYTHONPATH ? `${pythonUserSite}:${env.PYTHONPATH}` : pythonUserSite
  }

  const { stdout } = await execFileAsync('python3', ['-c', script], {
    maxBuffer: 1024 * 1024 * 8,
    env,
    timeout: 60_000,
  })
  const json = JSON.parse(stdout.trim()) as PythonJsonResult<T>
  if (!json.success) {
    throw new Error(json.error || 'Python Falha no script de dados')
  }
  if (json.data === undefined) {
    throw new Error('Python O script de dados retorna resultados vazios')
  }
  return json.data
}

async function fetchJsonWithRetry<T>(url: string, attempt = 1): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ClawOS StockAnalysis',
        Referer: 'https://quote.eastmoney.com/',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Falha na solicitação de orçamento: ${response.status}`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (attempt >= 3) {
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** (attempt - 1))))
    return fetchJsonWithRetry<T>(url, attempt + 1)
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchTextWithRetry(url: string, attempt = 1): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ClawOS StockAnalysis',
        Referer: 'https://gu.qq.com/',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Falha na solicitação de texto: ${response.status}`)
    }
    return response.text()
  } catch (error) {
    if (attempt >= 3) {
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** (attempt - 1))))
    return fetchTextWithRetry(url, attempt + 1)
  } finally {
    clearTimeout(timeout)
  }
}

async function updateRuntimeStatus(stockAnalysisDir: string, partial: Partial<StockAnalysisRuntimeStatus>) {
  return atomicUpdateRuntimeStatus(stockAnalysisDir, (current) => ({
    ...current,
    ...partial,
    staleReasons: partial.staleReasons ? dedupeStrings(partial.staleReasons) : current.staleReasons,
  }))
}

async function markRunState(stockAnalysisDir: string, runState: StockAnalysisRunState, currentRun: StockAnalysisCurrentRun | null, extra?: Partial<StockAnalysisRuntimeStatus>) {
  return updateRuntimeStatus(stockAnalysisDir, {
    runState,
    currentRun,
    ...extra,
  })
}

async function fetchCsi500ConstituentsFresh() {
   const rows = await runPythonJson<PythonConstituentItem[]>(CSI500_CONSTITUENTS_SCRIPT)
   return rows.map<StockAnalysisWatchlistCandidate>((item) => ({
     code: item["Código de cupom de ingrediente"],
     name: item["Nome do cupom do componente"],
     market: getMarketFromCode(item["Código de cupom de ingrediente"]),
     exchange: item["intercâmbio"],
     industryName: item["Nome da indústria"] ?? null,
   }))
 }

const ALL_A_STOCK_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 céu

interface PythonAllAStockItem {
  code: string
  name: string
}

async function fetchAllAStockListFresh(): Promise<StockAnalysisWatchlistCandidate[]> {
  const rows = await runPythonJson<PythonAllAStockItem[]>(ALL_A_STOCK_LIST_SCRIPT)
  return rows
    .filter((item) => typeof item.code === 'string' && typeof item.name === 'string' && item.code.length > 0)
    .map<StockAnalysisWatchlistCandidate>((item) => {
      const market = getMarketFromCode(item.code)
      const exchange = market === 'sh' ? 'Bolsa de Valores de Xangai' : market === 'bj' ? 'Bolsa de Pequim' : 'Bolsa de Valores de Shenzhen'
      return {
        code: item.code,
        name: item.name,
        market,
        exchange,
        industryName: null,
      }
    })
}

/**
 * pegar A Tabela de códigos do mercado de ações（Somente para pesquisas autosselecionadas）。
 * 7 Se houver um cache dentro de alguns dias, ele será devolvido diretamente.；Se expirar, será extraído novamente e gravado no arquivo local.。
 * Voltar para o cache antigo quando o pull falha, mas há um cache antigo；Se nenhum deles existir, um erro será gerado.。
 */
async function getAllAStockList(stockAnalysisDir: string): Promise<StockAnalysisWatchlistCandidate[]> {
  const meta = await readAllAStockListMeta(stockAnalysisDir)
  if (isFresh(meta.refreshedAt, ALL_A_STOCK_TTL_MS)) {
    const cached = await readAllAStockList(stockAnalysisDir)
    if (cached.length > 0) {
      return cached
    }
  }

  try {
    const fresh = await fetchAllAStockListFresh()
    if (fresh.length > 0) {
      await saveAllAStockList(stockAnalysisDir, fresh)
      await saveAllAStockListMeta(stockAnalysisDir, { refreshedAt: nowIso() })
      return fresh
    }
  } catch (error) {
    console.warn('[stock-analysis] puxar A Lista do mercado de ações falhou，Tente reverter o cache antigo', error)
  }

  const fallback = await readAllAStockList(stockAnalysisDir)
  return fallback
}

async function fetchCsi500IndexHistoryFresh() {
  const sourceErrors: string[] = []

  try {
    return await fetchCsi500IndexHistoryFromTencent()
  } catch (error) {
    sourceErrors.push(`Interface de índice Tencent falhou: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  try {
    return await fetchCsi500IndexHistoryFromEastmoney()
  } catch (error) {
    sourceErrors.push(`Oriental Fortune falhou diretamente: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  try {
    return await runPythonJson<PythonIndexHistoryItem[]>(CSI500_INDEX_HISTORY_SCRIPT)
  } catch (error) {
    sourceErrors.push(`AKShare Falha na fonte alternativa: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  throw new Error(sourceErrors.join('；'))
}

function parseTencentIndexHistory(rows: string[][]) {
  return rows
    .map<PythonIndexHistoryItem | null>((row) => {
      const [date, _open, close, _high, _low, volume] = row
       const closeNumber = Number(close)
       const volumeNumber = Number(volume)
       if (!date || !Number.isFinite(closeNumber)) {
         return null
       }
       return {
         data: date,
         fechar: closeNumber,
         "Volume de negócios": Number.isFinite(volumeNumber) ? Math.max(0, closeNumber * volumeNumber) : 0,
       }
    })
    .filter((item): item is PythonIndexHistoryItem => Boolean(item))
}

async function fetchCsi500IndexHistoryFromTencent() {
  const url = 'https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param=sh000905,day,,,40'
  const data = await fetchJsonWithRetry<TencentIndexKlineResponse>(url)
  const rows = data.data?.sh000905?.day ?? []
  const parsed = parseTencentIndexHistory(rows)
  if (parsed.length === 0) {
    throw new Error('Interface de índice Tencent não retorna linhas diárias válidas')
  }
  return parsed
}

function parseEastmoneyIndexHistory(lines: string[]) {
   return lines
     .map<PythonIndexHistoryItem | null>((line) => {
       const [data, _abertura, fechar, _MaisAlto, _maisBaixo, _Volume, VolumeDeNegocios] = line.split(',')
       const close = Number(fechar)
       const turnover = Number(VolumeDeNegocios)
       if (!data || !Number.isFinite(close) || !Number.isFinite(turnover)) {
         return null
       }
       return { data, fechar: close, "Volume de negócios": turnover }
     })
     .filter((item): item is PythonIndexHistoryItem => Boolean(item))
 }

async function fetchCsi500IndexHistoryFromEastmoney() {
  const failures: string[] = []

  for (const secid of INDEX_HISTORY_SEC_IDS) {
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&ut=7eea3edcaed734bea9cbfc24409ed989&klt=101&fqt=0&lmt=40&end=20500000&iscca=1&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`

    try {
      const data = await fetchJsonWithRetry<EastmoneyKlineResponse>(url)
      const items = parseEastmoneyIndexHistory(data.data?.klines ?? [])
      if (items.length > 0) {
        return items
      }
      failures.push(`${secid} Nenhum válidoKdados de linha`)
    } catch (error) {
      failures.push(`${secid} ${error instanceof Error ? error.message : 'Falha na solicitação'}`)
    }
  }

  throw new Error(failures.join(' | '))
}

async function getStockPoolData(stockAnalysisDir: string, forceRefresh = false): Promise<DataEnvelope<StockAnalysisWatchlistCandidate[]>> {
  const [cached, meta] = await Promise.all([
    readStockAnalysisStockPool(stockAnalysisDir),
    readStockAnalysisStockPoolMeta(stockAnalysisDir),
  ])

  if (!forceRefresh && cached.length > 0 && isFresh(meta.refreshedAt, STOCK_POOL_CACHE_TTL_MS)) {
    return { data: cached, fetchedAt: meta.refreshedAt, usedFallback: false, staleReasons: [] }
  }

  try {
    const fresh = await fetchCsi500ConstituentsFresh()
    const refreshedAt = nowIso()
    await Promise.all([
      saveStockAnalysisStockPool(stockAnalysisDir, fresh),
      saveStockAnalysisStockPoolMeta(stockAnalysisDir, { refreshedAt }),
      updateRuntimeStatus(stockAnalysisDir, { stockPoolRefreshedAt: refreshedAt }),
    ])
    return { data: fresh, fetchedAt: refreshedAt, usedFallback: false, staleReasons: [] }
  } catch (error) {
    if (cached.length > 0) {
      return {
        data: cached,
        fetchedAt: meta.refreshedAt,
        usedFallback: true,
        staleReasons: dedupeStrings(['Falha na atualização do pool de ações，Fallback para cache local', getStaleReasonForAge('pool de ações', meta.refreshedAt, STOCK_POOL_CACHE_TTL_MS) ?? '']),
      }
    }
    throw error
  }
}

async function getIndexHistoryData(stockAnalysisDir: string): Promise<DataEnvelope<PythonIndexHistoryItem[]>> {
  const cached = await readStockAnalysisIndexHistoryCache(stockAnalysisDir)
  if (cached && isFresh(cached.fetchedAt, INDEX_HISTORY_CACHE_TTL_MS) && cached.items.length > 0) {
    return { data: cached.items, fetchedAt: cached.fetchedAt, usedFallback: false, staleReasons: [] }
  }

  try {
    const fresh = await fetchCsi500IndexHistoryFresh()
    const fetchedAt = nowIso()
    const cache: StockAnalysisIndexHistoryCache = { fetchedAt, items: fresh }
    await Promise.all([
      saveStockAnalysisIndexHistoryCache(stockAnalysisDir, cache),
      updateRuntimeStatus(stockAnalysisDir, { indexHistoryCacheAt: fetchedAt }),
    ])
    return { data: fresh, fetchedAt, usedFallback: false, staleReasons: [] }
  } catch (error) {
    if (cached && cached.items.length > 0) {
      return {
        data: cached.items,
        fetchedAt: cached.fetchedAt,
        usedFallback: true,
        staleReasons: dedupeStrings(['Falha na atualização do histórico do índice，Fallback para cache local', getStaleReasonForAge('Histórico do índice', cached.fetchedAt, INDEX_HISTORY_CACHE_TTL_MS) ?? '']),
      }
    }
    const latestSignalDate = await getLatestAvailableSignalDate(stockAnalysisDir)
    const lastMarketState = latestSignalDate ? await readStockAnalysisMarketState(stockAnalysisDir, latestSignalDate) : null
    const staleReasons = dedupeStrings([
      'Falha na atualização do histórico do índice，Rebaixado para status de mercado simplificado',
      error instanceof Error ? error.message : 'Falha ao buscar o histórico do índice',
    ])

     if (lastMarketState) {
       return {
         data: [
           { data: lastMarketState.asOfDate, fechar: 1000 + lastMarketState.csi500Return20d, "Volume de negócios": lastMarketState.averageTurnover20d },
           { data: todayDate(), fechar: 1000, "Volume de negócios": lastMarketState.averageTurnover20d },
         ],
         fetchedAt: null,
         usedFallback: true,
         staleReasons,
       }
     }

    return {
      data: [],
      fetchedAt: null,
      usedFallback: true,
      staleReasons,
    }
  }
}

async function fetchSpotQuotesFresh(codes: string[]) {
  const quotes = new Map<string, StockAnalysisSpotQuote>()
  const chunkSize = 80
  for (let index = 0; index < codes.length; index += chunkSize) {
    const chunk = codes.slice(index, index + chunkSize)
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&ut=${EASTMONEY_UT}&fields=f12,f14,f100,f2,f3,f8,f15,f16,f17,f18,f20,f21&secids=${chunk.map(getSecId).join(',')}`
    const data = await fetchJsonWithRetry<EastmoneySpotResponse>(url)
    const items = data.data?.diff ?? []
    for (const item of items) {
      quotes.set(item.f12, {
        code: item.f12,
        name: item.f14,
        industryName: typeof item.f100 === 'string' && item.f100.trim() ? item.f100.trim() : null,
        latestPrice: safeNumber(item.f2),
        changePercent: safeNumber(item.f3),
        turnoverRate: safeNumber(item.f8),
        high: safeNumber(item.f15),
        low: safeNumber(item.f16),
        open: safeNumber(item.f17),
        previousClose: safeNumber(item.f18),
        totalMarketCap: safeNumber(item.f20),
        circulatingMarketCap: safeNumber(item.f21),
      })
    }
  }
  return quotes
}

function parseTencentQuoteLine(line: string): StockAnalysisSpotQuote | null {
  const match = /^v_([a-z]{2}\d+)="(.+)";$/.exec(line.trim())
  if (!match) {
    return null
  }
  const symbol = match[1]
  const fields = match[2].split('~')
  const code = symbol.slice(2)
  const latestPrice = Number(fields[3])
  if (!code || !Number.isFinite(latestPrice)) {
    return null
  }
  return {
    code,
    name: fields[1] || code,
    industryName: null,
    latestPrice: safeNumber(latestPrice),
    changePercent: safeNumber(Number(fields[32])),
    turnoverRate: safeNumber(Number(fields[38])),
    high: safeNumber(Number(fields[33])),
    low: safeNumber(Number(fields[34])),
    open: safeNumber(Number(fields[5])),
    previousClose: safeNumber(Number(fields[4])),
    totalMarketCap: safeNumber(Number(fields[45])),
    circulatingMarketCap: safeNumber(Number(fields[44])),
  }
}

async function fetchSpotQuotesFromTencent(codes: string[]) {
  const quotes = new Map<string, StockAnalysisSpotQuote>()
  const chunkSize = 100
  for (let index = 0; index < codes.length; index += chunkSize) {
    const chunk = codes.slice(index, index + chunkSize)
    const symbols = chunk.map(getTencentSymbol).join(',')
    const url = `https://qt.gtimg.cn/q=${symbols}`
    const text = await fetchTextWithRetry(url)
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
    for (const line of lines) {
      const quote = parseTencentQuoteLine(line)
      if (quote) {
        quotes.set(quote.code, quote)
      }
    }
  }
  if (quotes.size === 0) {
    throw new Error('A interface em tempo real da Tencent não retornou preços de mercado válidos')
  }
  return quotes
}

function mergeQuoteIndustry(
  quotes: Map<string, StockAnalysisSpotQuote>,
  candidates: StockAnalysisWatchlistCandidate[],
) {
  const candidateIndustryMap = new Map(candidates.map((candidate) => [candidate.code, candidate.industryName ?? null]))
  for (const [code, quote] of quotes) {
    if (!quote.industryName) {
      const fallbackIndustry = candidateIndustryMap.get(code) ?? null
      quotes.set(code, { ...quote, industryName: fallbackIndustry })
    }
  }
  return quotes
}

async function getQuoteData(stockAnalysisDir: string, codes: string[]): Promise<DataEnvelope<Map<string, StockAnalysisSpotQuote>>> {
  const stockPool = await readStockAnalysisStockPool(stockAnalysisDir)
  const candidates = stockPool.filter((candidate) => codes.includes(candidate.code))
  const cached = await readStockAnalysisQuoteCache(stockAnalysisDir)
  const cachedMap = new Map((cached?.quotes ?? []).map((item) => [item.code, item]))
  mergeQuoteIndustry(cachedMap, candidates)

  if (cached && isFresh(cached.fetchedAt, QUOTE_CACHE_TTL_MS) && codes.every((code) => cachedMap.has(code))) {
    return { data: cachedMap, fetchedAt: cached.fetchedAt, usedFallback: false, staleReasons: [] }
  }

  // Tencent é a principal fonte，A riqueza oriental é uma fonte de backup（Fortuna Oriental TLS existir OpenSSL 3.5.x Não compatível com）
  const sourceErrors: string[] = []

  try {
    const freshMap = mergeQuoteIndustry(await fetchSpotQuotesFromTencent(codes), candidates)
    const fetchedAt = nowIso()
    const cache: StockAnalysisQuoteCache = { fetchedAt, quotes: [...freshMap.values()] }
    await Promise.all([
      saveStockAnalysisQuoteCache(stockAnalysisDir, cache),
      updateRuntimeStatus(stockAnalysisDir, { quoteCacheAt: fetchedAt }),
    ])
    return { data: freshMap, fetchedAt, usedFallback: false, staleReasons: [] }
  } catch (error) {
    sourceErrors.push(`Interface de mercado Tencent falhou: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  try {
    const freshMap = mergeQuoteIndustry(await fetchSpotQuotesFresh(codes), candidates)
    const fetchedAt = nowIso()
    const cache: StockAnalysisQuoteCache = { fetchedAt, quotes: [...freshMap.values()] }
    await Promise.all([
      saveStockAnalysisQuoteCache(stockAnalysisDir, cache),
      updateRuntimeStatus(stockAnalysisDir, { quoteCacheAt: fetchedAt }),
    ])
    return { data: freshMap, fetchedAt, usedFallback: false, staleReasons: [] }
  } catch (error) {
    sourceErrors.push(`Falha na interface de cotação de riqueza oriental: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  saLog.audit('Service', `Todas as fontes online de cotações em tempo real falharam: ${sourceErrors.join(' | ')}`)

  if (cachedMap.size > 0) {
    return {
      data: cachedMap,
      fetchedAt: cached?.fetchedAt ?? null,
      usedFallback: true,
      staleReasons: dedupeStrings(['Falha na atualização da cotação em tempo real，Fallback para cache local', getStaleReasonForAge('Cotações em tempo real', cached?.fetchedAt ?? null, QUOTE_CACHE_TTL_MS) ?? '']),
    }
  }
  throw new Error(sourceErrors.join('；'))
}

async function fetchStockHistoryFresh(code: string, limit = 90) {
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${getSecId(code)}&klt=101&fqt=1&lmt=${limit}&end=20500000&iscca=1&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61`
  const data = await fetchJsonWithRetry<EastmoneyKlineResponse>(url)
  const lines = data.data?.klines ?? []
  return lines.map<StockAnalysisKlinePoint>((line) => {
    const [date, open, close, high, low, volume, turnover, amplitude, changePercent, changeAmount, turnoverRate] = line.split(',')
    return {
      date,
      open: Number(open),
      close: Number(close),
      high: Number(high),
      low: Number(low),
      volume: Number(volume),
      turnover: Number(turnover),
      amplitude: Number(amplitude),
      changePercent: Number(changePercent),
      changeAmount: Number(changeAmount),
      turnoverRate: Number(turnoverRate),
    }
  })
}

async function fetchStockHistoryFromTencent(code: string, limit = 90) {
  const symbol = getTencentSymbol(code)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,${limit},qfq`
  const data = await fetchJsonWithRetry<TencentIndexKlineResponse>(url)
  const rows = data.data?.[symbol]?.qfqday ?? data.data?.[symbol]?.day ?? []
  const points = rows.map<StockAnalysisKlinePoint | null>((row, index) => {
    const [date, open, close, high, low, volume] = row
    const openNumber = Number(open)
    const closeNumber = Number(close)
    const highNumber = Number(high)
    const lowNumber = Number(low)
    const volumeNumber = Number(volume)
    if (!date || !Number.isFinite(closeNumber)) {
      return null
    }
    const previousClose = index > 0 ? Number(rows[index - 1][2]) : closeNumber
    const changeAmount = closeNumber - previousClose
    const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0
    const amplitude = previousClose > 0 ? ((highNumber - lowNumber) / previousClose) * 100 : 0
    // Tencent K A interface online não fornece volume de transações e taxa de rotatividade（API Somente devolução 6 Campo: date/open/close/high/low/volume）
    // usar volume(mão) × preço médio × 100 Volume estimado de transações，erro <1%（Já nivelado/Validação cruzada de dados Sohu）
    const avgPrice = (openNumber + closeNumber + highNumber + lowNumber) / 4
    const derivedTurnover = volumeNumber > 0 && avgPrice > 0 ? round(volumeNumber * avgPrice * 100) : 0
    return {
      date,
      open: safeNumber(openNumber),
      close: safeNumber(closeNumber),
      high: safeNumber(highNumber),
      low: safeNumber(lowNumber),
      volume: safeNumber(volumeNumber),
      turnover: derivedTurnover,
      amplitude: round(amplitude),
      changePercent: round(changePercent),
      changeAmount: round(changeAmount),
      turnoverRate: 0,
    }
  }).filter((item): item is StockAnalysisKlinePoint => Boolean(item))

  if (points.length === 0) {
    throw new Error(`${code} A interface do histórico da Tencent não retornou válidaKArame`)
  }
  return points
}

// ── fonte de dados3: Lavar (10jqka) ──────────────────────────────────────
// retornar JSONP Formatar，Contém campos completos：data,abertura,fechar,Mais alto,mais baixo,Volume(compartilhar),Volume de negócios(Yuan),amplitude,taxa de rotatividade,0,0
async function fetchStockHistoryFromTonghuashun(code: string) {
  const hsCode = `hs_${code}`
  const url = `https://d.10jqka.com.cn/v6/line/${hsCode}/01/last.js`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ClawOS StockAnalysis',
        Referer: 'https://stockpage.10jqka.com.cn/',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`LavarKFalha na solicitação de linha: ${response.status}`)
    }
    const text = await response.text()
    // JSONP Formatar: quotebridge_v6_line_hs_XXXXXX_01_last({...})
    const jsonMatch = text.match(/\((\{[\s\S]+\})\)/)
    if (!jsonMatch) {
      throw new Error(`${code} LavarKExceção de formato de retorno de linha`)
    }
    const data = JSON.parse(jsonMatch[1]) as TonghuashunKlineResponse
    const rawData = data.data
    if (!rawData) {
      throw new Error(`${code} LavarKOs dados da linha estão vazios`)
    }
    const rows = rawData.split(';').filter(Boolean)
    const points = rows.map<StockAnalysisKlinePoint | null>((row, index) => {
      const parts = row.split(',')
      if (parts.length < 7) return null
      // Ordem de campo liberada: date, open, high, low, close, volume, turnover, amplitude
      const [dateRaw, openStr, highStr, lowStr, closeStr, volumeStr, turnoverStr, amplitudeStr] = parts
      const date = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
      const openNumber = Number(openStr)
      const closeNumber = Number(closeStr)
      const highNumber = Number(highStr)
      const lowNumber = Number(lowStr)
      const volumeNumber = Number(volumeStr) // compartilhar
      const turnoverNumber = Number(turnoverStr) // Yuan
      if (!date || !Number.isFinite(closeNumber)) return null
      const previousClose = index > 0 ? (() => {
        const prevParts = rows[index - 1].split(',')
        return Number(prevParts[4]) // Lavar close existir index 4
      })() : closeNumber
      const changeAmount = closeNumber - previousClose
      const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0
      const amplitude = Number(amplitudeStr) || (previousClose > 0 ? ((highNumber - lowNumber) / previousClose) * 100 : 0)
      // Lavar volume sim「compartilhar」，Converter para「mão」（1mão=100compartilhar）
      const volumeInLots = Math.round(volumeNumber / 100)
      return {
        date,
        open: safeNumber(openNumber),
        close: safeNumber(closeNumber),
        high: safeNumber(highNumber),
        low: safeNumber(lowNumber),
        volume: safeNumber(volumeInLots),
        turnover: round(turnoverNumber),
        amplitude: round(amplitude),
        changePercent: round(changePercent),
        changeAmount: round(changeAmount),
        turnoverRate: 0,
      }
    }).filter((item): item is StockAnalysisKlinePoint => Boolean(item))
    if (points.length === 0) {
      throw new Error(`${code} A interface do histórico de liberação não retornou válidaKArame`)
    }
    return points
  } finally {
    clearTimeout(timeout)
  }
}

// ── fonte de dados4: Sohu Finanças (Sohu) ──────────────────────────────────────
// JSON Formatar，Incluindo rotatividade（Dez mil yuans）e taxa de rotatividade
async function fetchStockHistoryFromSohu(code: string, limit = 90) {
  const sohuCode = `cn_${code}`
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - Math.ceil(limit * 1.8)) // Reserve espaço para férias
  const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')
  const url = `https://q.stock.sohu.com/hisHq?code=${sohuCode}&start=${formatDate(startDate)}&end=${formatDate(endDate)}&stat=1&order=A&period=d&rt=json`
  const data = await fetchJsonWithRetry<SohuKlineResponse[]>(url)
  if (!data || data.length === 0 || !data[0].hq) {
    throw new Error(`${code} SohuKOs dados da linha estão vazios`)
  }
  // Sohu hq variedade: [data, abertura, fechar, Aumentar ou diminuir, Aumentar ou diminuir%, mais baixo, Mais alto, Volume(mão), Volume de negócios(Dez mil yuans), taxa de rotatividade%]
  const rows = data[0].hq
  const points = rows.map<StockAnalysisKlinePoint | null>((row, index) => {
    const [date, openStr, closeStr, changeAmountStr, _changePercentStr, lowStr, highStr, volumeStr, turnoverStr, turnoverRateStr] = row
    const openNumber = Number(openStr)
    const closeNumber = Number(closeStr)
    const highNumber = Number(highStr)
    const lowNumber = Number(lowStr)
    const volumeNumber = Number(volumeStr) // mão
    const turnoverNumber = Number(turnoverStr) * 10000 // Dez mil yuans → Yuan
    const turnoverRate = parseFloat(turnoverRateStr) || 0
    if (!date || !Number.isFinite(closeNumber)) return null
    const previousClose = index > 0 ? Number(rows[index - 1][2]) : closeNumber
    const changeAmount = Number(changeAmountStr) || (closeNumber - previousClose)
    const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0
    const amplitude = previousClose > 0 ? ((highNumber - lowNumber) / previousClose) * 100 : 0
    return {
      date,
      open: safeNumber(openNumber),
      close: safeNumber(closeNumber),
      high: safeNumber(highNumber),
      low: safeNumber(lowNumber),
      volume: safeNumber(volumeNumber),
      turnover: round(turnoverNumber),
      amplitude: round(amplitude),
      changePercent: round(changePercent),
      changeAmount: round(changeAmount),
      turnoverRate: round(turnoverRate),
    }
  }).filter((item): item is StockAnalysisKlinePoint => Boolean(item))
  if (points.length === 0) {
    throw new Error(`${code} A interface do histórico do Sohu não retornou válidaKArame`)
  }
  return points.slice(-limit)
}

// ── fonte de dados5: Sina Finanças (Sina) ──────────────────────────────────────
// JSON Formatar，Contém apenas volume（compartilhar），Volume de negócios aprovado volume × preço médio extrapolar
async function fetchStockHistoryFromSina(code: string, limit = 90) {
  const market = getMarketFromCode(code)
  const sinaSymbol = market === 'sh' ? `sh${code}` : `sz${code}`
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaSymbol}&scale=240&ma=no&datalen=${limit}`
  const data = await fetchJsonWithRetry<SinaKlineItem[]>(url)
  if (!data || data.length === 0) {
    throw new Error(`${code} SinaKOs dados da linha estão vazios`)
  }
  const points = data.map<StockAnalysisKlinePoint | null>((item, index) => {
    const openNumber = Number(item.open)
    const closeNumber = Number(item.close)
    const highNumber = Number(item.high)
    const lowNumber = Number(item.low)
    const volumeInShares = Number(item.volume) // compartilhar
    if (!item.day || !Number.isFinite(closeNumber)) return null
    const previousClose = index > 0 ? Number(data[index - 1].close) : closeNumber
    const changeAmount = closeNumber - previousClose
    const changePercent = previousClose > 0 ? (changeAmount / previousClose) * 100 : 0
    const amplitude = previousClose > 0 ? ((highNumber - lowNumber) / previousClose) * 100 : 0
    // Sina volume sim「compartilhar」，Converter para「mão」
    const volumeInLots = Math.round(volumeInShares / 100)
    // Sina não fornece volume de transações，usar volume(compartilhar) × preço médio extrapolar（erro <1%，Já nivelado/Validação cruzada Sohu）
    const avgPrice = (openNumber + closeNumber + highNumber + lowNumber) / 4
    const derivedTurnover = volumeInShares > 0 && avgPrice > 0 ? round(volumeInShares * avgPrice) : 0
    return {
      date: item.day,
      open: safeNumber(openNumber),
      close: safeNumber(closeNumber),
      high: safeNumber(highNumber),
      low: safeNumber(lowNumber),
      volume: safeNumber(volumeInLots),
      turnover: derivedTurnover,
      amplitude: round(amplitude),
      changePercent: round(changePercent),
      changeAmount: round(changeAmount),
      turnoverRate: 0,
    }
  }).filter((item): item is StockAnalysisKlinePoint => Boolean(item))
  if (points.length === 0) {
    throw new Error(`${code} A interface do histórico do Sina não retornou válidaKArame`)
  }
  return points
}

async function getStockHistoryData(stockAnalysisDir: string, code: string): Promise<DataEnvelope<StockAnalysisKlinePoint[]>> {
  const cached = await readStockAnalysisHistoryCache(stockAnalysisDir, code)
  // Retorne diretamente quando o cache não tiver expirado e o valor da transação for válido（turnover>0 Cache representando dados ausentes não legados）
  if (cached && isFresh(cached.fetchedAt, HISTORY_CACHE_TTL_MS) && cached.items.length >= 30 && cached.items.some((item) => item.turnover > 0)) {
    return { data: cached.items, fetchedAt: cached.fetchedAt, usedFallback: false, staleReasons: [] }
  }

  // 6 fonte de dados de nível fallback corrente：Priorize o uso de fontes com valores reais de transação
  // 1. Lavar (Incluindo rotatividade/Yuan)  2. Sohu (Incluindo rotatividade/Dez mil yuans)  3. Fortuna Oriental (Incluindo rotatividade/Yuan，TLS Pode não ser compatível)
  // 4. Sina (apenas volume compartilhar，Volume estimado de transações)  5. Tencent (apenas volume mão，Volume estimado de transações)  6. Cache local
  const sourceErrors: string[] = []

  const trySaveAndReturn = async (fresh: StockAnalysisKlinePoint[], sourceName: string) => {
    const fetchedAt = nowIso()
    const cache: StockAnalysisHistoryCache = { fetchedAt, latestDate: fresh.at(-1)?.date ?? null, items: fresh }
    await saveStockAnalysisHistoryCache(stockAnalysisDir, code, cache)
    logger.debug(`${code} KFonte de dados de linha: ${sourceName} (${fresh.length}tira)`)
    return { data: fresh, fetchedAt, usedFallback: false, staleReasons: [] } satisfies DataEnvelope<StockAnalysisKlinePoint[]>
  }

  // fonte1: Lavar — Dados completos incluindo faturamento(Yuan)
  try {
    const fresh = await fetchStockHistoryFromTonghuashun(code)
    return await trySaveAndReturn(fresh, 'Lavar')
  } catch (error) {
    sourceErrors.push(`Lavar: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  // fonte2: Sohu — Incluindo rotatividade(Dez mil yuans)e taxa de rotatividade
  try {
    const fresh = await fetchStockHistoryFromSohu(code)
    return await trySaveAndReturn(fresh, 'Sohu')
  } catch (error) {
    sourceErrors.push(`Sohu: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  // fonte3: Fortuna Oriental — Contém campos completos（OpenSSL 3.5.x Abaixo TLS Pode não ser compatível）
  try {
    const fresh = await fetchStockHistoryFresh(code)
    return await trySaveAndReturn(fresh, 'Fortuna Oriental')
  } catch (error) {
    sourceErrors.push(`Fortuna Oriental: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  // fonte4: Sina — apenas volume(compartilhar)，Volume de negócios aprovado volume×preço médio extrapolar
  try {
    const fresh = await fetchStockHistoryFromSina(code)
    return await trySaveAndReturn(fresh, 'Sina(Volume estimado de transações)')
  } catch (error) {
    sourceErrors.push(`Sina: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  // fonte5: Tencent — apenas volume(mão)，Volume de negócios aprovado volume×preço médio×100 extrapolar
  try {
    const fresh = await fetchStockHistoryFromTencent(code)
    return await trySaveAndReturn(fresh, 'Tencent(Volume estimado de transações)')
  } catch (error) {
    sourceErrors.push(`Tencent: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
  }

  // fonte6: Cache local（Bastante velho，Não é possível travar）
  saLog.audit('Service', `${code} históriaKAlinhe tudo 5 fontes on-line falharam: ${sourceErrors.join(' | ')}`)

  if (cached && cached.items.length >= 30) {
    return {
      data: cached.items,
      fetchedAt: cached.fetchedAt,
      usedFallback: true,
      staleReasons: dedupeStrings([`${code} históriaKFalha na atualização da linha，Fallback para cache local`, getStaleReasonForAge(`${code} históriaKArame`, cached.fetchedAt, HISTORY_CACHE_TTL_MS) ?? '']),
    }
  }
  throw new Error(sourceErrors.join('；'))
}

async function buildIndustryTrendMapForStockPool(
  stockAnalysisDir: string,
  stockPool: StockAnalysisWatchlistCandidate[],
  quotes: Map<string, StockAnalysisSpotQuote>,
  existingHistoryMap?: Map<string, StockAnalysisKlinePoint[]>,
) {
  const historyMap = new Map<string, StockAnalysisKlinePoint[]>(existingHistoryMap ?? [])

  await runLimitedConcurrency(stockPool, MAX_HISTORY_CONCURRENCY, async (candidate) => {
    if (historyMap.has(candidate.code)) {
      return null
    }

    const cached = await readStockAnalysisHistoryCache(stockAnalysisDir, candidate.code)
    if (cached && cached.items.length >= 61) {
      historyMap.set(candidate.code, cached.items)
      return null
    }

    try {
      const historyEnvelope = await getStockHistoryData(stockAnalysisDir, candidate.code)
      if (historyEnvelope.data.length >= 61) {
        historyMap.set(candidate.code, historyEnvelope.data)
      }
    } catch (error) {
      saLog.info('Service', `Suplemento de amostra de tendência do setor falhou ${candidate.code}: ${error instanceof Error ? error.message : 'erro desconhecido'}`)
    }

    return null
  })

  return buildIndustryTrendMap(stockPool, quotes, historyMap)
}

function calculateMovingAverage(points: StockAnalysisKlinePoint[], period: number) {
  if (points.length < period) {
    return average(points.map((point) => point.close))
  }
  return average(points.slice(-period).map((point) => point.close))
}

function calculateMovingAverageSlope(points: StockAnalysisKlinePoint[], period: number, lookback = 5) {
  if (points.length < period + lookback) {
    return 0
  }
  const currentAverage = calculateMovingAverage(points, period)
  const previousAverage = calculateMovingAverage(points.slice(0, -lookback), period)
  return safeDivide(currentAverage - previousAverage, previousAverage) * 100
}

function calculateRsi(points: StockAnalysisKlinePoint[], period = 14): number | null {
  if (points.length < period + 1) {
    return null
  }

  const changes = points.slice(1).map((point, index) => point.close - points[index].close)
  const gains = changes.map((change) => Math.max(change, 0))
  const losses = changes.map((change) => Math.max(-change, 0))

  let averageGain = average(gains.slice(0, period))
  let averageLoss = average(losses.slice(0, period))

  for (let index = period; index < changes.length; index += 1) {
    averageGain = ((averageGain * (period - 1)) + gains[index]) / period
    averageLoss = ((averageLoss * (period - 1)) + losses[index]) / period
  }

  if (averageLoss === 0) {
    return averageGain === 0 ? 50 : 100
  }

  const relativeStrength = averageGain / averageLoss
  return 100 - (100 / (1 + relativeStrength))
}

function calculateEmaSeries(values: number[], period: number): number[] {
  if (values.length === 0) {
    return []
  }
  const multiplier = 2 / (period + 1)
  const initialSeed = average(values.slice(0, Math.min(period, values.length)))
  const emaSeries: number[] = [initialSeed]
  for (let index = 1; index < values.length; index += 1) {
    emaSeries.push((values[index] - emaSeries[index - 1]) * multiplier + emaSeries[index - 1])
  }
  return emaSeries
}

function calculateMacd(points: StockAnalysisKlinePoint[]) {
  if (points.length < 35) {
    return { line: null, signal: null, histogram: null }
  }
  const closes = points.map((point) => point.close)
  const ema12 = calculateEmaSeries(closes, 12)
  const ema26 = calculateEmaSeries(closes, 26)
  const macdSeries = closes.map((_, index) => ema12[index] - ema26[index])
  const signalSeries = calculateEmaSeries(macdSeries, 9)
  const line = macdSeries.at(-1) ?? null
  const signal = signalSeries.at(-1) ?? null
  const histogram = line != null && signal != null ? line - signal : null
  return { line, signal, histogram }
}

function calculateAtr(points: StockAnalysisKlinePoint[], period = 14): number | null {
  if (points.length < period + 1) {
    return null
  }
  const trueRanges = points.slice(1).map((point, index) => {
    const previousClose = points[index].close
    return Math.max(
      point.high - point.low,
      Math.abs(point.high - previousClose),
      Math.abs(point.low - previousClose),
    )
  })
  return average(trueRanges.slice(-period))
}

function countConsecutiveDeclines(points: StockAnalysisKlinePoint[]) {
  let declines = 0
  for (let index = points.length - 1; index >= 1; index -= 1) {
    if (points[index].close < points[index - 1].close) {
      declines += 1
      continue
    }
    break
  }
  return declines
}

function calculateTrailingReturn(points: StockAnalysisKlinePoint[], lookback: number) {
  if (points.length < lookback + 1) {
    return null
  }
  const latestClose = points.at(-1)?.close ?? null
  const baseClose = points.at(-(lookback + 1))?.close ?? null
  if (latestClose == null || baseClose == null || baseClose <= 0) {
    return null
  }
  return safeDivide(latestClose - baseClose, baseClose) * 100
}

function percentileRank(values: number[], target: number) {
  if (values.length === 0) {
    return 0.5
  }
  const below = values.filter((value) => value <= target).length
  return below / values.length
}

function normalizeScore(value: number, min: number, max: number) {
  if (max <= min) {
    return 50
  }
  const normalized = ((value - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, normalized))
}

function normalizePercentile(value: number | null | undefined) {
  if (value == null || !isFinite(value)) {
    return 50
  }
  return Math.max(0, Math.min(100, value * 100))
}

/** M7: Com base na média móvel + altos e baixos recentes + Suporte de áreas com uso intensivo de volume/Cálculo do nível de pressão */
function calculateSupportResistance(klines: StockAnalysisKlinePoint[], latestPrice: number): SupportResistanceLevels {
  if (klines.length < 20) {
    // Dados insuficientes，Use porcentagens simples
    return {
      support1: round(latestPrice * 0.97),
      support2: round(latestPrice * 0.94),
      resistance1: round(latestPrice * 1.03),
      resistance2: round(latestPrice * 1.06),
      method: 'ma_pivot_volume',
    }
  }

  // --- método1: suporte de média móvel/pressão ---
  const ma5 = calculateMovingAverage(klines, 5)
  const ma20 = calculateMovingAverage(klines, 20)
  const ma60 = calculateMovingAverage(klines, 60)
  const maLevels = [ma5, ma20, ma60].filter((v) => v > 0)
  const maSupports = maLevels.filter((v) => v < latestPrice).sort((a, b) => b - a) // mais próximo primeiro
  const maResistances = maLevels.filter((v) => v > latestPrice).sort((a, b) => a - b)

  // --- método2: Recentemente pivot Pontos altos e baixos（20dia + 60janela do dia） ---
  const recent20 = klines.slice(-20)
  const recent60 = klines.slice(-60)
  const pivotHighs: number[] = []
  const pivotLows: number[] = []
  for (let i = 2; i < recent60.length - 2; i++) {
    const point = recent60[i]
    if (point.high > recent60[i - 1].high && point.high > recent60[i - 2].high
      && point.high > recent60[i + 1].high && point.high > recent60[i + 2].high) {
      pivotHighs.push(point.high)
    }
    if (point.low < recent60[i - 1].low && point.low < recent60[i - 2].low
      && point.low < recent60[i + 1].low && point.low < recent60[i + 2].low) {
      pivotLows.push(point.low)
    }
  }
  const pivotSupports = pivotLows.filter((v) => v < latestPrice).sort((a, b) => b - a)
  const pivotResistances = pivotHighs.filter((v) => v > latestPrice).sort((a, b) => a - b)

  // --- método3: Área densa ponderada por volume ---
  const priceVolumeBuckets = new Map<number, number>()
  const bucketSize = latestPrice * 0.005 // 0.5% granularidade
  for (const k of recent60) {
    const mid = (k.high + k.low) / 2
    const bucket = Math.round(mid / bucketSize) * bucketSize
    priceVolumeBuckets.set(bucket, (priceVolumeBuckets.get(bucket) ?? 0) + k.volume)
  }
  const sortedBuckets = [...priceVolumeBuckets.entries()].sort((a, b) => b[1] - a[1])
  const volumeSupports = sortedBuckets.filter(([price]) => price < latestPrice).map(([price]) => price).slice(0, 3)
  const volumeResistances = sortedBuckets.filter(([price]) => price > latestPrice).map(([price]) => price).slice(0, 3)

  // --- abrangente: Ponderado para receber o suporte mais próximo/pressão ---
  const allSupports = [
    ...maSupports.map((v) => ({ price: v, weight: 1.5 })),
    ...pivotSupports.map((v) => ({ price: v, weight: 2.0 })),
    ...volumeSupports.map((v) => ({ price: v, weight: 1.0 })),
    { price: Math.min(...recent20.map((k) => k.low)), weight: 1.2 }, // 20baixa diária
  ].filter((s) => s.price > 0 && s.price < latestPrice)
    .sort((a, b) => b.price - a.price) // O mais próximo do preço atual primeiro

  const allResistances = [
    ...maResistances.map((v) => ({ price: v, weight: 1.5 })),
    ...pivotResistances.map((v) => ({ price: v, weight: 2.0 })),
    ...volumeResistances.map((v) => ({ price: v, weight: 1.0 })),
    { price: Math.max(...recent20.map((k) => k.high)), weight: 1.2 }, // 20alta diária
  ].filter((r) => r.price > 0 && r.price > latestPrice)
    .sort((a, b) => a.price - b.price) // O mais próximo do preço atual primeiro

  const support1 = allSupports[0]?.price ?? round(latestPrice * 0.97)
  const support2 = allSupports[1]?.price ?? round(latestPrice * 0.94)
  const resistance1 = allResistances[0]?.price ?? round(latestPrice * 1.03)
  const resistance2 = allResistances[1]?.price ?? round(latestPrice * 1.06)

  return {
    support1: round(support1),
    support2: round(support2),
    resistance1: round(resistance1),
    resistance2: round(resistance2),
    method: 'ma_pivot_volume',
  }
}

function detectTrend(return20d: number, sentimentScore: number = 0, sentimentSourceCount: number = 0): MarketTrend {
  if (return20d > 5 && sentimentSourceCount >= 2 && sentimentScore < -0.2) return 'range_bound'
  if (return20d > 5) return 'bull_trend'
  if (return20d < -5 && sentimentSourceCount >= 2 && sentimentScore > 0.2) return 'range_bound'
  if (return20d < -5) return 'bear_trend'
  return 'range_bound'
}

function detectVolatility(vol: number, percentile?: number): MarketVolatility {
  // [M3] Prefira usar o método percentil（75th/25th），Volte para um limite fixo quando não houver dados históricos
  if (percentile !== undefined) {
    if (percentile > 0.75) return 'high_volatility'
    if (percentile < 0.25) return 'low_volatility'
    return 'normal_volatility'
  }
  if (vol > 30) return 'high_volatility'
  if (vol < 18) return 'low_volatility'
  return 'normal_volatility'
}

function detectLiquidity(avgTurnover20d: number, percentile?: number): MarketLiquidity {
  // [M3] Prefira usar o método percentil（75th/25th），Volte para um limite fixo quando não houver dados históricos
  if (percentile !== undefined) {
    if (percentile > 0.75) return 'high_liquidity'
    if (percentile < 0.25) return 'low_liquidity'
    return 'normal_liquidity'
  }
  if (avgTurnover20d > 180_000_000_000) return 'high_liquidity'
  if (avgTurnover20d < 90_000_000_000) return 'low_liquidity'
  return 'normal_liquidity'
}

function detectSentiment(risingRatio: number, socialScore: number = 0, socialSourceCount: number = 0): MarketSentiment {
  if (socialSourceCount >= 2) {
    const combinedScore = risingRatio - 0.5 + socialScore * 0.5
    if (combinedScore > 0.1) return 'optimistic'
    if (combinedScore < -0.1) return 'pessimistic'
    return 'neutral'
  }
  if (risingRatio > 0.6) return 'optimistic'
  if (risingRatio < 0.4) return 'pessimistic'
  return 'neutral'
}

function detectStyle(avgReturn20d: number): MarketStyle {
  if (avgReturn20d > 2) return 'small_cap'
  if (avgReturn20d < -2) return 'large_cap'
  return 'balanced'
}

const UNSUPPORTED_LLM_CANDIDATES = new Set([
  'OpenCodeGo/MiMo-V2-Pro',
  'OpenCodeGo/GLM-5',
])

function isUnsupportedLLMCandidate(providerName: string, modelId: string): boolean {
  return UNSUPPORTED_LLM_CANDIDATES.has(`${providerName}/${modelId}`)
}

function describeMarketLiquidityState(marketState: StockAnalysisMarketState, config: StockAnalysisStrategyConfig): string {
  const volumePct = marketState.volumePercentile ?? 0.5
  const risingRatio = marketState.risingRatio ?? 0.5
  const isCrisis = isLiquidityCrisis(marketState, config)
  const isGuardrail = isLowLiquidityGuardrail(marketState, config)
  const mode = isCrisis ? 'crisis' : isGuardrail ? 'guardrail' : 'normal'

  return `mode=${mode} volumePct=${round(volumePct, 4)} risingRatio=${round(risingRatio, 4)} sentiment=${marketState.sentiment} threshold=${config.lowLiquidityGuardrail.volumePercentileThreshold}`
}

function isLiquidityCrisis(marketState: StockAnalysisMarketState, config: StockAnalysisStrategyConfig): boolean {
  const volumePct = marketState.volumePercentile ?? 0.5
  const risingRatio = marketState.risingRatio ?? 0.5
  const pessimistic = marketState.sentiment === 'pessimistic'
  const broadWeakness = risingRatio < config.lowLiquidityGuardrail.crisisRisingRatioThreshold

  return volumePct < config.lowLiquidityGuardrail.volumePercentileThreshold && broadWeakness && pessimistic
}

function isLowLiquidityGuardrail(marketState: StockAnalysisMarketState, config: StockAnalysisStrategyConfig): boolean {
  const volumePct = marketState.volumePercentile ?? 0.5
  return volumePct < config.lowLiquidityGuardrail.volumePercentileThreshold && !isLiquidityCrisis(marketState, config)
}

async function loadLatestSocialSentiment(stockAnalysisDir: string): Promise<{ score: number; sourceCount: number }> {
  const dates = await getAvailableDataCollectionDates(stockAnalysisDir)
  for (const date of dates.slice(0, 5)) {
    const factPool = await readFactPool(stockAnalysisDir, date)
    if (!factPool || factPool.socialSentiment.length === 0) continue
    const aggregated = aggregateSocialSentiment(factPool.socialSentiment)
    if (aggregated.sourceCount > 0) return { score: aggregated.score, sourceCount: aggregated.sourceCount }
  }
  return { score: 0, sourceCount: 0 }
}

function buildMarketState(stockPool: StockAnalysisWatchlistCandidate[], quotes: Map<string, StockAnalysisSpotQuote>, indexHistory: PythonIndexHistoryItem[], socialSentiment?: { score: number; sourceCount: number }) {
  const socialScore = socialSentiment?.score ?? 0
  const socialSourceCount = socialSentiment?.sourceCount ?? 0
  const stockReturns = stockPool
    .map((item) => quotes.get(item.code))
    .filter((item): item is StockAnalysisSpotQuote => Boolean(item))
    .map((item) => item.changePercent)

  if (indexHistory.length === 0) {
    const risingRatio = safeDivide(stockReturns.filter((value) => value > 0).length, stockReturns.length)
    const avgReturn20d = average(stockReturns)
    return {
      asOfDate: todayDate(),
      trend: 'range_bound',
      volatility: 'normal_volatility',
      liquidity: 'normal_liquidity',
      sentiment: detectSentiment(risingRatio, socialScore, socialSourceCount),
      style: detectStyle(avgReturn20d),
      csi500Return20d: 0,
      annualizedVolatility20d: 0,
      averageTurnover20d: 0,
      risingRatio: round(risingRatio, 4),
      socialSentimentScore: round(socialScore, 4),
      socialSentimentSourceCount: socialSourceCount,
    } satisfies StockAnalysisMarketState
  }

   const closes = indexHistory.map((item) => Number(item.fechar)).filter(Number.isFinite)
   const turnovers = indexHistory.map((item) => Number(item["Volume de negócios"])).filter(Number.isFinite)
  const returns = closes.slice(1).map((close, index) => safeDivide(close - closes[index], closes[index]))
  const csi500Return20d = closes.length >= 21 ? safeDivide(closes.at(-1)! - closes.at(-21)!, closes.at(-21)!) * 100 : 0
  const annualizedVolatility20d = stddev(returns.slice(-20)) * Math.sqrt(252) * 100
  const averageTurnover20d = average(turnovers.slice(-20))

  // Controle de risco em nível de mercado: Calcule percentis históricos de volatilidade e volume
  const historicalVolatilities = returns.length >= 40
    ? Array.from({ length: Math.min(returns.length - 19, 252) }, (_, i) => {
        const start = returns.length - 20 - i
        if (start < 0) return null
        return stddev(returns.slice(start, start + 20)) * Math.sqrt(252) * 100
      }).filter((v): v is number => v !== null)
    : []
  const volatilityPercentile = historicalVolatilities.length >= 20
    ? percentileRank(historicalVolatilities, annualizedVolatility20d)
    : 0.5

  const volumePercentile = turnovers.length >= 20
    ? percentileRank(turnovers.slice(-252), turnovers.at(-1) ?? 0)
    : 0.5

  const risingRatio = safeDivide(stockReturns.filter((value) => value > 0).length, stockReturns.length)
  const avgReturn20d = average(stockReturns)

  return {
    asOfDate: todayDate(),
    trend: detectTrend(csi500Return20d, socialScore, socialSourceCount),
    volatility: detectVolatility(annualizedVolatility20d, volatilityPercentile),
    liquidity: detectLiquidity(averageTurnover20d, volumePercentile),
    sentiment: detectSentiment(risingRatio, socialScore, socialSourceCount),
    style: detectStyle(avgReturn20d),
    csi500Return20d: round(csi500Return20d),
    annualizedVolatility20d: round(annualizedVolatility20d),
    averageTurnover20d: round(averageTurnover20d),
    risingRatio: round(risingRatio, 4),
    volatilityPercentile: round(volatilityPercentile, 4),
    volumePercentile: round(volumePercentile, 4),
    socialSentimentScore: round(socialScore, 4),
    socialSentimentSourceCount: socialSourceCount,
  } satisfies StockAnalysisMarketState
}

function buildSector(code: string) {
  if (code.startsWith('300') || code.startsWith('688')) return 'Tecnologia de crescimento'
  if (code.startsWith('60')) return 'Placa Principal de Xangai'
  if (code.startsWith('002')) return 'Fabricação de pequena e média capitalização'
  if (code.startsWith('00')) return 'Placa principal de Shenzhen'
  return 'CSI500'
}

type IndustryStrengthStats = {
  averageChangePercent: number
  breadth: number
  rankPercentile: number
}

type IndustryTrendStats = {
  averageReturn20d: number
  averageReturn60d: number
  rankPercentile: number
}

type CrossSectionalMomentumStats = {
  rank20d: number
  rank60d: number
}

function buildIndustryStrengthMap(
  stockPool: StockAnalysisWatchlistCandidate[],
  quotes: Map<string, StockAnalysisSpotQuote>,
) {
  const industryAggregation = new Map<string, { totalChangePercent: number; positiveCount: number; count: number }>()

  for (const candidate of stockPool) {
    const quote = quotes.get(candidate.code)
    const industryName = quote?.industryName ?? candidate.industryName ?? null
    if (!quote || !industryName) {
      continue
    }
    const existing = industryAggregation.get(industryName) ?? { totalChangePercent: 0, positiveCount: 0, count: 0 }
    existing.totalChangePercent += quote.changePercent
    existing.positiveCount += quote.changePercent > 0 ? 1 : 0
    existing.count += 1
    industryAggregation.set(industryName, existing)
  }

  const ranked = [...industryAggregation.entries()]
    .map(([industryName, stats]) => ({
      industryName,
      averageChangePercent: stats.count > 0 ? stats.totalChangePercent / stats.count : 0,
      breadth: stats.count > 0 ? stats.positiveCount / stats.count : 0,
    }))
    .sort((left, right) => right.averageChangePercent - left.averageChangePercent)

  const industryStrengthMap = new Map<string, IndustryStrengthStats>()
  ranked.forEach((item, index) => {
    const denominator = Math.max(1, ranked.length - 1)
    const rankPercentile = ranked.length === 1 ? 1 : 1 - (index / denominator)
    industryStrengthMap.set(item.industryName, {
      averageChangePercent: round(item.averageChangePercent, 4),
      breadth: round(item.breadth, 4),
      rankPercentile: round(rankPercentile, 4),
    })
  })

  return industryStrengthMap
}

function buildIndustryTrendMap(
  stockPool: StockAnalysisWatchlistCandidate[],
  quotes: Map<string, StockAnalysisSpotQuote>,
  historyMap: Map<string, StockAnalysisKlinePoint[]>,
) {
  const industryAggregation = new Map<string, {
    totalReturn20d: number
    count20d: number
    totalReturn60d: number
    count60d: number
  }>()

  for (const candidate of stockPool) {
    const industryName = quotes.get(candidate.code)?.industryName ?? candidate.industryName ?? null
    const history = historyMap.get(candidate.code)
    if (!industryName || !history || history.length < 61) {
      continue
    }

    const return20d = calculateTrailingReturn(history, 20)
    const return60d = calculateTrailingReturn(history, 60)
    const existing = industryAggregation.get(industryName) ?? {
      totalReturn20d: 0,
      count20d: 0,
      totalReturn60d: 0,
      count60d: 0,
    }

    if (return20d != null) {
      existing.totalReturn20d += return20d
      existing.count20d += 1
    }
    if (return60d != null) {
      existing.totalReturn60d += return60d
      existing.count60d += 1
    }

    industryAggregation.set(industryName, existing)
  }

  const ranked = [...industryAggregation.entries()]
    .map(([industryName, stats]) => {
      const averageReturn20d = stats.count20d > 0 ? stats.totalReturn20d / stats.count20d : null
      const averageReturn60d = stats.count60d > 0 ? stats.totalReturn60d / stats.count60d : null
      if (averageReturn20d == null || averageReturn60d == null) {
        return null
      }
      return {
        industryName,
        averageReturn20d,
        averageReturn60d,
        compositeTrend: (averageReturn20d * 0.4) + (averageReturn60d * 0.6),
      }
    })
    .filter((item): item is { industryName: string; averageReturn20d: number; averageReturn60d: number; compositeTrend: number } => Boolean(item))
    .sort((left, right) => right.compositeTrend - left.compositeTrend)

  const industryTrendMap = new Map<string, IndustryTrendStats>()
  ranked.forEach((item, index) => {
    const denominator = Math.max(1, ranked.length - 1)
    const rankPercentile = ranked.length === 1 ? 1 : 1 - (index / denominator)
    industryTrendMap.set(item.industryName, {
      averageReturn20d: round(item.averageReturn20d, 4),
      averageReturn60d: round(item.averageReturn60d, 4),
      rankPercentile: round(rankPercentile, 4),
    })
  })

  return industryTrendMap
}

function buildCrossSectionalMomentumMap(snapshots: StockAnalysisStockSnapshot[]) {
  const return20dValues = snapshots.map((snapshot) => snapshot.return20d)
  const return60dValues = snapshots.map((snapshot) => snapshot.return60d)
  const crossSectionalMomentumMap = new Map<string, CrossSectionalMomentumStats>()

  for (const snapshot of snapshots) {
    crossSectionalMomentumMap.set(snapshot.code, {
      rank20d: round(percentileRank(return20dValues, snapshot.return20d), 4),
      rank60d: round(percentileRank(return60dValues, snapshot.return60d), 4),
    })
  }

  return crossSectionalMomentumMap
}

function applyCrossSectionalMomentumRanks(
  snapshots: StockAnalysisStockSnapshot[],
  crossSectionalMomentumMap: Map<string, CrossSectionalMomentumStats>,
) {
  return snapshots.map<StockAnalysisStockSnapshot>((snapshot) => {
    const ranks = crossSectionalMomentumMap.get(snapshot.code)
    if (!ranks) {
      return snapshot
    }
    return {
      ...snapshot,
      momentumRank20d: ranks.rank20d,
      momentumRank60d: ranks.rank60d,
    }
  })
}

function buildSnapshot(
  candidate: StockAnalysisWatchlistCandidate,
  quote: StockAnalysisSpotQuote,
  history: StockAnalysisKlinePoint[],
  config: StockAnalysisStrategyConfig,
  industryStrengthMap?: Map<string, IndustryStrengthStats>,
  industryTrendMap?: Map<string, IndustryTrendStats>,
) {
  const closeValues = history.map((point) => point.close)
  const turnoverValues = history.map((point) => point.turnover)
  const volatilitySamples = history.slice(1).map((point, index) => safeDivide(point.close - history[index].close, history[index].close) * 100)
  const latest = history.at(-1)
  const close20 = history.length >= 21 ? history.at(-21)?.close ?? history[0].close : history[0]?.close ?? quote.previousClose
  const close5 = history.length >= 6 ? history.at(-6)?.close ?? history[0].close : history[0]?.close ?? quote.previousClose
  const close60 = history.length >= 61 ? history.at(-61)?.close ?? history[0]?.close ?? quote.previousClose : history[0]?.close ?? quote.previousClose
  const close120 = history.length >= 121 ? history.at(-121)?.close ?? history[0]?.close ?? quote.previousClose : history[0]?.close ?? quote.previousClose
  const avgTurnover20 = average(turnoverValues.slice(-20))
  const avgVolume20 = average(history.slice(-20).map((point) => point.volume))
  const amplitude20d = average(history.slice(-20).map((point) => point.amplitude))
  const declineDays20d = countConsecutiveDeclines(history.slice(-20))
  const volatility20d = stddev(volatilitySamples.slice(-20)) * Math.sqrt(252)
  const volatilityRank = percentileRank(volatilitySamples.map(Math.abs), Math.abs(volatilitySamples.at(-1) ?? 0))
  const latestClose = latest?.close ?? quote.latestPrice
  const max20 = Math.max(...closeValues.slice(-20))
  const min20 = Math.min(...closeValues.slice(-20))
  const position20d = max20 === min20 ? 0.5 : (latestClose - min20) / (max20 - min20)
  const movingAverage5 = round(calculateMovingAverage(history, 5))
  const movingAverage20 = round(calculateMovingAverage(history, 20))
  const movingAverage60 = round(calculateMovingAverage(history, 60))
  const movingAverage120 = round(calculateMovingAverage(history, 120))
  const movingAverage20Slope = round(calculateMovingAverageSlope(history, 20), 4)
  const movingAverage60Slope = round(calculateMovingAverageSlope(history, 60), 4)
  const rsi14 = calculateRsi(history)
  const macd = calculateMacd(history)
  const atr14 = calculateAtr(history)
  const supportResistance = history.length >= 20 ? calculateSupportResistance(history, latestClose) : null
  const industryName = quote.industryName ?? candidate.industryName ?? buildSector(candidate.code)
  const industryStrength = industryStrengthMap?.get(industryName) ?? null
  const industryTrend = industryTrendMap?.get(industryName) ?? null
  const distanceToResistance1 = supportResistance
    ? round(safeDivide(supportResistance.resistance1 - latestClose, latestClose) * 100, 4)
    : null
  const distanceToSupport1 = supportResistance
    ? round(safeDivide(latestClose - supportResistance.support1, latestClose) * 100, 4)
    : null

  const scoreReason: string[] = []
  if (avgTurnover20 >= config.minTurnoverAmount20d) scoreReason.push('Faturamento atinge meta')
  if (amplitude20d >= config.minAmplitude20d) scoreReason.push('20Amplitude diária suficiente')
  if (declineDays20d < config.maxContinuousDeclineDays) scoreReason.push('Não caiu em um declínio unilateral de longo prazo')
  if (quote.turnoverRate > 3) scoreReason.push('A taxa de rotatividade está ativa')
  if ((macd.histogram ?? 0) > 0) scoreReason.push('MACD energia cinética é positiva')
  if ((rsi14 ?? 50) >= 45 && (rsi14 ?? 50) <= 75) scoreReason.push('RSI Localizado na zona saudável')

  return {
    code: candidate.code,
    name: candidate.name,
    market: candidate.market,
    exchange: candidate.exchange,
    sector: industryName,
    latestPrice: quote.latestPrice,
    changePercent: quote.changePercent,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    turnoverRate: quote.turnoverRate,
    totalMarketCap: quote.totalMarketCap,
    circulatingMarketCap: quote.circulatingMarketCap,
    averageTurnoverAmount20d: round(avgTurnover20),
    amplitude20d: round(amplitude20d),
    declineDays20d,
    return5d: round(safeDivide(latestClose - close5, close5) * 100),
    return20d: round(safeDivide(latestClose - close20, close20) * 100),
    return60d: round(safeDivide(latestClose - close60, close60) * 100),
    return120d: round(safeDivide(latestClose - close120, close120) * 100),
    momentumRank20d: null,
    momentumRank60d: null,
    volumeBreakout: round(safeDivide(latest?.volume ?? 0, avgVolume20), 3),
    volatility20d: round(volatility20d),
    volatilityRank: round(volatilityRank, 4),
    pricePosition20d: round(position20d, 4),
    movingAverage5,
    movingAverage20,
    movingAverage60,
    movingAverage120,
    movingAverage20Slope,
    movingAverage60Slope,
    rsi14: rsi14 != null ? round(rsi14, 2) : null,
    macdLine: macd.line != null ? round(macd.line, 4) : null,
    macdSignal: macd.signal != null ? round(macd.signal, 4) : null,
    macdHistogram: macd.histogram != null ? round(macd.histogram, 4) : null,
    atr14: atr14 != null ? round(atr14, 4) : null,
    atrPercent: atr14 != null ? round(safeDivide(atr14, latestClose) * 100, 4) : null,
    distanceToResistance1,
    distanceToSupport1,
    industryStrength: industryStrength?.rankPercentile != null ? round(industryStrength.rankPercentile, 4) : null,
    industryBreadth: industryStrength?.breadth != null ? round(industryStrength.breadth, 4) : null,
    industryReturn20d: industryTrend?.averageReturn20d != null ? round(industryTrend.averageReturn20d, 4) : null,
    industryReturn60d: industryTrend?.averageReturn60d != null ? round(industryTrend.averageReturn60d, 4) : null,
    industryTrendStrength: industryTrend?.rankPercentile != null ? round(industryTrend.rankPercentile, 4) : null,
    scoreReason,
  } satisfies StockAnalysisStockSnapshot
}

/** Avaliação de especialista em simulação de fórmula de versão antiga（como LLM Opções de downgrade em caso de indisponibilidade） */
function buildExpertScoreFallback(snapshot: StockAnalysisStockSnapshot, marketState: StockAnalysisMarketState): StockAnalysisExpertScore {
  // [P2-19] A braçadeira garante bullish + bearish <= 45，evitar neutralCount tornar-se negativo
  const rawBullish = Math.max(5, Math.round(15 + snapshot.return20d / 2 + snapshot.pricePosition20d * 10))
  const rawBearish = Math.max(2, Math.round(10 - snapshot.return20d / 4 + (snapshot.declineDays20d / 3)))
  const bullishCount = Math.min(rawBullish, 40)
  const bearishCount = Math.min(rawBearish, 45 - bullishCount)
  const neutralCount = 45 - bullishCount - bearishCount
  const consensus = safeDivide(bullishCount, bullishCount + bearishCount)
  let score = consensus * 100
  if (marketState.trend === 'bull_trend') score += 4
  if (marketState.trend === 'bear_trend') score -= 6
  if (snapshot.volumeBreakout > 1.2) score += 3
  if (snapshot.declineDays20d > 10) score -= 5

  return {
    bullishCount,
    bearishCount,
    neutralCount,
    consensus: round(consensus, 4),
    score: round(Math.max(0, Math.min(100, score))),
    highlights: snapshot.scoreReason.slice(0, 3),
    risks: [
      snapshot.declineDays20d >= 10 ? 'fechar20O declínio diário contínuo dura muito tempo' : 'Ainda não há riscos estruturais significativos',
      snapshot.volatility20d > 35 ? 'A volatilidade é alta，Necessidade de controlar posições' : 'A volatilidade está dentro da faixa aceitável',
    ],
    votes: [],
    llmSuccessCount: 0,
    fallbackCount: 0,
    isSimulated: true,
  }
}

function buildTechnicalScore(snapshot: StockAnalysisStockSnapshot) {
  const latestPrice = snapshot.latestPrice
  const movingAverage120 = snapshot.movingAverage120 || snapshot.movingAverage60
  const movingAverage20Slope = Number.isFinite(snapshot.movingAverage20Slope) ? snapshot.movingAverage20Slope : 0
  const movingAverage60Slope = Number.isFinite(snapshot.movingAverage60Slope) ? snapshot.movingAverage60Slope : 0
  const rsi14 = snapshot.rsi14 ?? 50
  const macdLine = snapshot.macdLine ?? 0
  const macdSignal = snapshot.macdSignal ?? 0
  const macdHistogram = snapshot.macdHistogram ?? 0
  const atrPercent = snapshot.atrPercent ?? 4
  const distanceToResistance1 = snapshot.distanceToResistance1
  const distanceToSupport1 = snapshot.distanceToSupport1
  const trend = normalizeScore(
    Number(latestPrice > snapshot.movingAverage20)
    + Number(latestPrice > snapshot.movingAverage60)
    + Number(latestPrice > movingAverage120)
    + normalizeScore(movingAverage20Slope, -5, 5) / 100
    + normalizeScore(movingAverage60Slope, -5, 5) / 100,
    0,
    5,
  )
  const momentumConfirmation = average([
    normalizeScore(macdHistogram * 100, -15, 15),
    normalizeScore(macdLine - macdSignal, -0.8, 0.8),
    normalizeScore(rsi14, 35, 75),
  ])
  const resistanceBuffer = distanceToResistance1 == null
    ? 50
    : normalizeScore(distanceToResistance1, 0.5, 12)
  const supportBuffer = distanceToSupport1 == null
    ? 50
    : normalizeScore(12 - distanceToSupport1, 0, 12)
  const structure = average([
    normalizeScore(snapshot.pricePosition20d, 0.35, 0.95),
    normalizeScore(snapshot.return20d, -12, 20),
    resistanceBuffer,
    supportBuffer,
  ])
  const participation = average([
    normalizeScore(snapshot.volumeBreakout, 0.7, 2.5),
    normalizeScore(snapshot.turnoverRate, 1, 10),
    normalizeScore(snapshot.averageTurnoverAmount20d, 50_000_000, 3_000_000_000),
  ])
  const riskPenalty = average([
    normalizeScore(8 - atrPercent, 0, 8),
    normalizeScore(1 - snapshot.volatilityRank, 0, 1),
    normalizeScore(12 - snapshot.return5d, 0, 12),
  ])
  const total = 0.30 * trend + 0.20 * momentumConfirmation + 0.25 * structure + 0.15 * participation + 0.10 * riskPenalty
  const absolute = round(average([trend, structure]))
  const relative = round(average([momentumConfirmation, riskPenalty]))
  const sector = round(participation)
  return {
    total: round(total),
    trend: round(trend),
    momentumConfirmation: round(momentumConfirmation),
    structure: round(structure),
    participation: round(participation),
    risk: round(riskPenalty),
    absolute,
    relative,
    sector,
    notes: [
      snapshot.latestPrice > snapshot.movingAverage20 ? 'fique em pé MA20' : 'ainda MA20 abaixo',
      macdHistogram >= 0 ? 'MACD energia cinética é positiva' : 'MACD O impulso enfraquece',
      rsi14 > 75 ? 'RSI Quente，Tenha cuidado ao perseguir altos' : rsi14 < 35 ? 'RSI Fraco，Precisa esperar pelo reparo' : 'RSI Localizado na zona saudável',
      distanceToResistance1 != null && distanceToResistance1 < 2 ? 'Perto do nível de resistência superior' : 'A pressão de resistência superior é controlável',
      snapshot.volumeBreakout > 1 ? 'A quantidade pode ser amplificada' : 'Capacidade média',
    ],
  }
}

function buildQuantScore(snapshot: StockAnalysisStockSnapshot, marketState: StockAnalysisMarketState) {
  const return120d = Number.isFinite(snapshot.return120d) ? snapshot.return120d : snapshot.return60d
  const atrPercent = snapshot.atrPercent ?? 4
  const movingAverage20 = snapshot.movingAverage20 || snapshot.latestPrice
  const movingAverage60 = snapshot.movingAverage60 || snapshot.latestPrice
  let momentumWeight = 0.25
  let meanReversionWeight = 0.10
  let stabilityWeight = 0.15
  if (marketState.trend === 'bull_trend') {
    momentumWeight *= 1.2
    meanReversionWeight *= 0.8
  }
  if (marketState.trend === 'bear_trend') {
    momentumWeight *= 0.8
    meanReversionWeight *= 1.2
  }
  if (marketState.volatility === 'high_volatility') {
    stabilityWeight *= 1.3
  }

  const crossSectionalWeight = 0.20
  const liquidityWeight = 0.15
  const industryWeight = 0.15
  const fixedWeights = crossSectionalWeight + liquidityWeight + industryWeight
  const dynamicSum = momentumWeight + meanReversionWeight + stabilityWeight
  const targetDynamicSum = 1 - fixedWeights
  if (dynamicSum > 0 && Math.abs(dynamicSum - targetDynamicSum) > 0.001) {
    const scale = targetDynamicSum / dynamicSum
    momentumWeight *= scale
    meanReversionWeight *= scale
    stabilityWeight *= scale
  }

  const mediumTermMomentum = average([
    normalizeScore(snapshot.return20d, -20, 25),
    normalizeScore(snapshot.return60d, -25, 35),
    normalizeScore(return120d, -30, 45),
  ])
  const crossSectionalStrength = average([
    normalizePercentile(snapshot.momentumRank20d),
    normalizePercentile(snapshot.momentumRank60d),
    normalizePercentile(1 - snapshot.volatilityRank),
    normalizeScore(snapshot.volumeBreakout, 0.7, 2.4),
    normalizeScore(snapshot.pricePosition20d, 0.2, 0.95),
  ])
  const liquidityQuality = average([
    normalizeScore(snapshot.averageTurnoverAmount20d, 50_000_000, 3_000_000_000),
    normalizeScore(snapshot.turnoverRate, 1, 10),
    normalizeScore(snapshot.volumeBreakout, 0.8, 2.2),
  ])
  const stability = average([
    normalizeScore(1 - snapshot.volatilityRank, 0, 1),
    normalizeScore(8 - atrPercent, 0, 8),
    normalizeScore(20 - Math.abs(snapshot.return5d), 0, 20),
  ])
  const meanReversion = average([
    normalizeScore(1 - safeDivide(snapshot.latestPrice - movingAverage20, movingAverage20), -0.15, 0.15),
    normalizeScore(1 - safeDivide(snapshot.latestPrice - movingAverage60, movingAverage60), -0.3, 0.3),
  ])
  const industryStrength = average([
    normalizePercentile(snapshot.industryStrength),
    normalizePercentile(snapshot.industryBreadth),
    normalizePercentile(snapshot.industryTrendStrength),
    normalizeScore(snapshot.industryReturn20d ?? 0, -15, 20),
    normalizeScore(snapshot.industryReturn60d ?? 0, -20, 30),
  ])

  const total = momentumWeight * mediumTermMomentum
    + crossSectionalWeight * crossSectionalStrength
    + liquidityWeight * liquidityQuality
    + stabilityWeight * stability
    + meanReversionWeight * meanReversion
    + industryWeight * industryStrength

  return {
    total: round(total),
    mediumTermMomentum: round(mediumTermMomentum),
    crossSectionalStrength: round(crossSectionalStrength),
    liquidityQuality: round(liquidityQuality),
    stability: round(stability),
    meanReversion: round(meanReversion),
    momentum: round(mediumTermMomentum),
    volumeBreakout: round(crossSectionalStrength),
    volatility: round(stability),
    liquidity: round(liquidityQuality),
    value: round(meanReversion),
    notes: [
      snapshot.return60d > 0 ? 'A dinâmica de médio prazo permanece positiva' : 'O impulso de médio prazo é fraco',
      snapshot.volumeBreakout > 1 ? 'A quantidade pode estar ativa，Têm vantagens transversais' : 'A quantidade de energia não é significativamente amplificada',
      snapshot.averageTurnoverAmount20d > 200_000_000 ? 'Liquidez suficiente' : 'Liquidez média',
      (snapshot.industryTrendStrength ?? 0) >= 0.7 ? 'A indústria está em uma forte tendência de médio prazo' : (snapshot.industryStrength ?? 0) >= 0.7 ? 'A indústria está forte no dia，Mas a tendência ainda precisa ser confirmada' : 'A força da indústria é média',
      Math.abs(snapshot.return5d) > 10 ? 'Grandes flutuações de curto prazo，Tenha cuidado com o colapso do impulso' : 'Flutuações de curto prazo ainda são aceitáveis',
    ],
  }
}

function buildCandidatePoolScore(snapshot: StockAnalysisStockSnapshot) {
  const return120d = Number.isFinite(snapshot.return120d) ? snapshot.return120d : snapshot.return60d
  const movingAverage20Slope = Number.isFinite(snapshot.movingAverage20Slope) ? snapshot.movingAverage20Slope : 0
  const movingAverage60Slope = Number.isFinite(snapshot.movingAverage60Slope) ? snapshot.movingAverage60Slope : 0
  const atrPercent = snapshot.atrPercent ?? 4
  const mediumTermMomentum = average([
    normalizeScore(snapshot.return20d, -20, 25),
    normalizeScore(snapshot.return60d, -25, 35),
    normalizeScore(return120d, -30, 45),
  ])
  const technicalStructure = average([
    normalizeScore(snapshot.pricePosition20d, 0.25, 0.95),
    normalizeScore(movingAverage20Slope, -5, 5),
    normalizeScore(movingAverage60Slope, -5, 5),
  ])
  const liquidityQuality = average([
    normalizeScore(snapshot.averageTurnoverAmount20d, 50_000_000, 3_000_000_000),
    normalizeScore(snapshot.turnoverRate, 1, 10),
    normalizeScore(snapshot.volumeBreakout, 0.8, 2.2),
  ])
  const stability = average([
    normalizeScore(1 - snapshot.volatilityRank, 0, 1),
    normalizeScore(8 - atrPercent, 0, 8),
    normalizeScore(15 - Math.abs(snapshot.return5d), 0, 15),
  ])
  const industryStrength = average([
    normalizePercentile(snapshot.industryStrength),
    normalizePercentile(snapshot.industryBreadth),
    normalizePercentile(snapshot.industryTrendStrength),
    normalizeScore(snapshot.industryReturn20d ?? 0, -15, 20),
    normalizeScore(snapshot.industryReturn60d ?? 0, -20, 30),
  ])

  return round(0.30 * mediumTermMomentum + 0.20 * technicalStructure + 0.20 * liquidityQuality + 0.15 * stability + 0.15 * industryStrength, 4)
}

function getMarketRegime(marketState: StockAnalysisMarketState): MarketRegime {
  if (marketState.trend === 'bull_trend' && ((marketState.risingRatio ?? 0.5) < BULL_TREND_WEAK_BREADTH_THRESHOLD || marketState.sentiment === 'pessimistic')) return 'normal_range'
  if (marketState.trend === 'bull_trend') return 'bull_trend'
  if (marketState.trend === 'bear_trend') return 'bear_trend'
  if (marketState.volatility === 'high_volatility') return 'high_volatility'
  if (marketState.volatility === 'low_volatility') return 'low_volatility_range'
  return 'normal_range'
}

function getThresholds(config: StockAnalysisStrategyConfig, marketState: StockAnalysisMarketState) {
  const regime = getMarketRegime(marketState)
  return config.marketThresholds[regime]
}

function getFusionWeights(config: StockAnalysisStrategyConfig, marketState: StockAnalysisMarketState): StockAnalysisFusionWeights {
  const regime = getMarketRegime(marketState)
  return config.fusionWeightsByRegime[regime]
}

function calculateChaseRiskPenalty(snapshot: StockAnalysisStockSnapshot): { penalty: number; reasons: string[]; forceWatch: boolean } {
  const reasons: string[] = []
  let penalty = 0
  if ((snapshot.rsi14 ?? 0) > 70) {
    penalty += 4
    reasons.push(`RSI ${round(snapshot.rsi14 ?? 0)} > 70`)
  }
  if (snapshot.pricePosition20d > 0.95) {
    penalty += 4
    reasons.push(`20posição diurna ${round(snapshot.pricePosition20d, 2)} > 0.95`)
  }
  if (snapshot.return20d > 30) {
    penalty += 5
    reasons.push(`20aumento diário ${round(snapshot.return20d)}% > 30%`)
  }
  return { penalty, reasons, forceWatch: reasons.length >= 2 || snapshot.return20d > 45 }
}

/**
 * [M5] Kelly Criterion Cálculo de posição
 * kelly = winRate - (1 - winRate) / profitLossRatio
 * Usar metade Kelly（half-Kelly）Reduza o risco，e preso a uma faixa segura
 * Quando não há dados históricos suficientes，fallback para proporção fixa
 */
function calculateKellyPosition(action: string, learnedWeights?: StockAnalysisLearnedWeights | null, trades?: StockAnalysisTradeRecord[]): number {
  if (action !== 'strong_buy' && action !== 'buy') return 0

  // Requer pelo menos um registro histórico e tamanho de amostra >= 10 Somente ativado Kelly
  const latestEntry = learnedWeights?.history?.[0]
  if (!latestEntry || latestEntry.sampleCount < 10) {
    // Proporção fixa de fallback
    return action === 'strong_buy' ? 0.3 : 0.2
  }

  const winRate = latestEntry.winRate
  // P2-A2: Dê prioridade ao uso de dados reais de transações para calcular a relação de lucros e perdas，insuficientehorareversãovalor padrão
  const DEFAULT_PROFIT_LOSS_RATIO = 1.5
  let profitLossRatio = DEFAULT_PROFIT_LOSS_RATIO
  if (trades && trades.length >= 10) {
    const actual = calculateProfitLossRatio(trades)
    if (actual > 0 && isFinite(actual)) {
      profitLossRatio = actual
    }
  }

  // Kelly fórmula：f = p - (1-p)/b   em p=taxa de vitórias, b=relação lucro-perda
  const kellyFraction = winRate - (1 - winRate) / profitLossRatio

  // Kelly é negativo → A posição não deve ser aberta，mas action Aprovado conviction filter，Dê a posição mais baixa
  if (kellyFraction <= 0) {
    return action === 'strong_buy' ? 0.05 : 0.05
  }

  // Metade Kelly Reduza o risco
  const halfKelly = kellyFraction / 2

  // de acordo com action Digite a fixação em uma faixa razoável
  if (action === 'strong_buy') {
    return round(Math.max(0.05, Math.min(0.3, halfKelly)), 4)
  }
  return round(Math.max(0.05, Math.min(0.2, halfKelly)), 4)
}

async function buildSignal(snapshot: StockAnalysisStockSnapshot, marketState: StockAnalysisMarketState, config: StockAnalysisStrategyConfig, learnedWeights?: StockAnalysisLearnedWeights | null, aiConfig?: StockAnalysisAIConfig | null, expertWeights?: Map<string, number>, history?: StockAnalysisKlinePoint[], profileMap?: Map<string, ExpertProfile>, factPoolSummary?: FactPoolSummary, memoryStore?: ExpertMemoryStore, eventVetoCodes?: Map<string, string>, trades?: StockAnalysisTradeRecord[], factPool?: FactPool, fundamentals?: StockFundamentals | null): Promise<StockAnalysisSignal> {
  // Determine se está disponível AI Configuração（Há pelo menos um habilitado provider e especialistas com atribuições de modelo）
  const hasAI = aiConfig
    && aiConfig.providers.some((p) => p.enabled && p.apiKey)
    && aiConfig.experts.some((e) => e.enabled && e.layer !== 'rule_functions' && e.assignedModel)

  let expert: StockAnalysisExpertScore
  if (hasAI) {
    try {
      const llmResult = await runExpertVoting(snapshot, marketState, aiConfig, expertWeights, profileMap, factPoolSummary, memoryStore, history, factPool, fundamentals ?? null)
      expert = {
        bullishCount: llmResult.bullishCount,
        bearishCount: llmResult.bearishCount,
        neutralCount: llmResult.neutralCount,
        consensus: llmResult.consensus,
        score: llmResult.score,
        highlights: llmResult.highlights,
        risks: llmResult.risks,
        votes: llmResult.votes,
        llmSuccessCount: llmResult.llmSuccessCount,
        llmFallbackCount: llmResult.llmFallbackCount,
        ruleFallbackCount: llmResult.ruleFallbackCount,
        fallbackCount: llmResult.fallbackCount,
        isSimulated: llmResult.isSimulated,
      }
      logger.info(`[stock-analysis] ${snapshot.code} Votação de especialistas concluída: LLMSucesso principal=${llmResult.llmSuccessCount - llmResult.llmFallbackCount}, LLM-fallback=${llmResult.llmFallbackCount}, Downgrade de regra=${llmResult.ruleFallbackCount}, simulação=${llmResult.isSimulated}`, { module: 'StockAnalysis' })
    } catch (error) {
      logger.error(`[stock-analysis] ${snapshot.code} LLM Anomalia de votação，Downgrade para simulação de fórmula: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      expert = buildExpertScoreFallback(snapshot, marketState)
    }
  } else {
    expert = buildExpertScoreFallback(snapshot, marketState)
  }

  const technical = buildTechnicalScore(snapshot)
  const quant = buildQuantScore(snapshot, marketState)
  const thresholds = getThresholds(config, marketState)
  const regime = getMarketRegime(marketState)
  const baseWeights = getFusionWeights(config, marketState)
  const fusionWeights = getAdjustedFusionWeights(baseWeights, learnedWeights ?? null)

  // [M4] especialista fallback Delegar poder：Reduza o peso do fluxo especializado somente quando o mecanismo de regras for rebaixado
  // LLM fallback（Mude o modelo, mas ainda seja real LLM analisar）Sem redução de potência
  let effectiveWeights = { ...fusionWeights }
  const ruleFallback = expert.ruleFallbackCount ?? 0
  if (expert.isSimulated) {
    // Todas as simulações（zero LLM sucesso）：Peso do especialista reduzido pela metade，A diferença é dividida igualmente entre o fluxo técnico e o fluxo quantitativo.
    const reduction = effectiveWeights.expert * 0.5
    effectiveWeights = {
      expert: effectiveWeights.expert - reduction,
      technical: effectiveWeights.technical + reduction * 0.5,
      quant: effectiveWeights.quant + reduction * 0.5,
    }
  } else if (ruleFallback > 0 && (expert.llmSuccessCount ?? 0) > 0) {
    // Algumas regras foram rebaixadas：Reduzir apenas o peso dos especialistas de acordo com a taxa de rebaixamento da regra（LLM fallback Não é um rebaixamento）
    const llmVoterCount = (expert.llmSuccessCount ?? 0) + ruleFallback
    const degradeRatio = ruleFallback / llmVoterCount
    const reduction = effectiveWeights.expert * degradeRatio * 0.3 // Leve redução de direitos：Apenas faça downgrade de acordo com as regras30%reduzir
    effectiveWeights = {
      expert: effectiveWeights.expert - reduction,
      technical: effectiveWeights.technical + reduction * 0.5,
      quant: effectiveWeights.quant + reduction * 0.5,
    }
  }

  let compositeScore = effectiveWeights.expert * expert.score + effectiveWeights.technical * technical.total + effectiveWeights.quant * quant.total
  const passingChecks: string[] = []
  const vetoReasons: string[] = []
  const watchReasons: string[] = []

  if (marketState.trend === 'bear_trend' && marketState.csi500Return20d < -10) vetoReasons.push('mercado de baixa extrema（20diminuição diária>10%），Limitar novas posições')
  if (marketState.volatility === 'high_volatility' && (marketState.volatilityPercentile ?? 0) > 0.95) vetoReasons.push('extrema volatilidade（Volatilidade>95thpercentil），O limite de posição é reduzido para50%')
  const liquidityExplanation = describeMarketLiquidityState(marketState, config)
  if (isLiquidityCrisis(marketState, config)) {
    vetoReasons.push('crise de liquidez（encolher + Declínio geral + Ressonância do Pessimismo），Somente venda permitida')
    saLog.audit('Service', `Gatilhos da crise de liquidez ${snapshot.code}(${snapshot.name}): ${liquidityExplanation}`)
  } else if (isLowLiquidityGuardrail(marketState, config)) {
    watchReasons.push('O volume de transações é baixo，Mas não atingiu uma crise de liquidez，Não implemente o veto de um voto')
    compositeScore = Math.max(0, compositeScore - config.lowLiquidityGuardrail.scorePenalty)
    saLog.info('Service', `guarda-corpo de baixo fluxo ${snapshot.code}(${snapshot.name}): ${liquidityExplanation} scorePenalty=${config.lowLiquidityGuardrail.scorePenalty}`)
  }
  if (marketState.volatility === 'high_volatility' && marketState.annualizedVolatility20d > 35 && (marketState.volatilityPercentile ?? 0) <= 0.95) vetoReasons.push('A volatilidade do mercado é alta')
  if (marketState.trend === 'bull_trend' && ((marketState.risingRatio ?? 0.5) < BULL_TREND_WEAK_BREADTH_THRESHOLD || marketState.sentiment === 'pessimistic')) {
    watchReasons.push('Tendência de alta, mas amplitude crescente/Humor enfraquecido，Aperte de acordo com o sistema de choque comum')
  }
  // [MH1] Grandes eventos podem ser vetados com um voto：Em breve/Relatórios financeiros estão acontecendo、Levante a proibição、Ações para grandes eventos, como reestruturação
  const eventVetoReason = eventVetoCodes?.get(snapshot.code)
  if (eventVetoReason) vetoReasons.push(eventVetoReason)
  if (expert.consensus >= thresholds.minExpertConsensus) passingChecks.push('O consenso de especialistas atende aos padrões')
  else watchReasons.push(`Consenso de especialistas ${expert.consensus} abaixo do limite ${thresholds.minExpertConsensus}`)
  const extremeLowExpertConsensus = expert.consensus < EXTREME_LOW_EXPERT_CONSENSUS
  if (extremeLowExpertConsensus) watchReasons.push(`Consenso de especialistas ${expert.consensus} extremamente baixo，É proibido pressionar tecnologia/Quant atualizado separadamente para compra`)
  if (technical.total >= thresholds.minTechnicalScore) passingChecks.push('A pontuação técnica atende ao padrão')
  else watchReasons.push(`Pontos técnicos ${technical.total} abaixo do limite ${thresholds.minTechnicalScore}`)
  if (quant.total >= thresholds.minQuantScore) passingChecks.push('A pontuação quantitativa atende ao padrão')
  else watchReasons.push(`Pontuação quantitativa ${quant.total} abaixo do limite ${thresholds.minQuantScore}`)

  // P2-A1: Pontos de bônus para reparos — Remova itens que contam duas vezes com pesos de terceira categoria（volumeBreakout/consensus Já refletido na classificação de terceira categoria）
  // Apenas mantenha"Os três fluxos têm a mesma direção"pontos extras（Este é um sinal sinérgico interdimensional，Sem contagem dupla）
  const sameDirectionBonus = snapshot.return20d > 0 && technical.total > 70 && quant.total > 65 ? 5 : 0
  compositeScore += sameDirectionBonus
  if (sameDirectionBonus > 0) passingChecks.push('Pontos de bônus se as três direções forem consistentes')
  const chaseRisk = calculateChaseRiskPenalty(snapshot)
  if (chaseRisk.penalty > 0) {
    compositeScore = Math.max(0, compositeScore - chaseRisk.penalty)
    watchReasons.push(`Perseguir dedução de alto risco ${chaseRisk.penalty} apontar：${chaseRisk.reasons.join('；')}`)
  }
  if (expert.consensus > 0.75) passingChecks.push('O consenso dos especialistas é superior ao 0.75')
  if (snapshot.volumeBreakout > 1.2) passingChecks.push('Avanço de volume pesado')
  if (snapshot.pricePosition20d > 0.8) passingChecks.push('aproximar20A borda superior da faixa forte diária')

  const baseCompositeScore = Math.max(0, Math.min(100, compositeScore))
  const finalScore = baseCompositeScore
  let action: StockAnalysisSignal['action'] = 'none'

  // v1.35.0 [A3-P0-3] LLM Proteção total contra downgrade：quando expert.isSimulated=true（todos LLM Todos os modelos falharam，30 regras fallback）hora
  // downgrade forçado action para watch，O consumo automático do processo de compra é proibido strong_buy/buy Sinal。
  // regra fallback É a mesma cópia snapshot causado por perturbação 30 individual vote，não constitui um verdadeiro ensemble consenso。
  if (expert.isSimulated === true) {
    vetoReasons.push('LLM Rebaixamento total（Todos os modelos estão indisponíveis，Somente mecanismo de regras fallback），Desativar compra automática')
  }

  if (vetoReasons.length > 0) action = 'watch'
  else if (finalScore >= 80) action = 'strong_buy'
  else if (finalScore >= thresholds.minCompositeScore) action = 'buy'
  else if (finalScore >= 65) action = 'watch'

  if ((extremeLowExpertConsensus || chaseRisk.forceWatch) && (action === 'strong_buy' || action === 'buy')) {
    action = 'watch'
  }

  // Override feedback positivo：Quando o histórico do usuário override quando tiver um bom desempenho，Relaxe automaticamente aqueles que estão próximos do limite watch Sinal
  // doença：1) O julgamento atual é watch  2) Não é um veto de um voto  3) diferença de pontuação < 5 apontar  4) override taxa de vitórias > 60% E amostra >= 3
  if (action === 'watch' && vetoReasons.length === 0 && trades && trades.length > 0) {
    const scoreDelta = thresholds.minCompositeScore - finalScore
    if (scoreDelta > 0 && scoreDelta <= 5) {
      const overrideStats = buildOverrideStats(trades)
      if (overrideStats.totalCount >= 3 && overrideStats.winRate > 0.6) {
        action = 'buy'
        passingChecks.push(`Relaxamento do julgamento do usuário（overridetaxa de vitórias${Math.round(overrideStats.winRate * 100)}%，Diferença${round(scoreDelta)}apontar）`)
        saLog.info('Service', `Sinal ${snapshot.code} por usuário override O feedback positivo relaxa: finalScore=${round(finalScore)} threshold=${thresholds.minCompositeScore} delta=${round(scoreDelta)} overrideWinRate=${overrideStats.winRate}`)
      }
    }
  }

  // Registro detalhado do link de decisão de pontuação de sinal
  saLog.debug('Service', `pontuação de sinal ${snapshot.code}(${snapshot.name}): expert=${round(expert.score)} technical=${round(technical.total)} quant=${round(quant.total)} weights=[E:${round(effectiveWeights.expert,3)} T:${round(effectiveWeights.technical,3)} Q:${round(effectiveWeights.quant,3)}] bonus=${sameDirectionBonus} base=${round(baseCompositeScore)} final=${round(finalScore)} action=${action} veto=${vetoReasons.length} simulated=${expert.isSimulated ?? false} regime=${regime}`)

  return {
    id: `signal-${snapshot.code}-${todayDate()}`,
    tradeDate: todayDate(),
    code: snapshot.code,
    name: snapshot.name,
    latestPrice: snapshot.latestPrice,
    sector: snapshot.sector,
    snapshot,
    expert,
    technical,
    quant,
    marketState,
    marketRegime: regime,
    fusionWeights: effectiveWeights,
    thresholds,
    compositeScore: round(baseCompositeScore),
    scoreBonus: round(sameDirectionBonus),
    finalScore: round(finalScore),
    action,
    suggestedPosition: calculateKellyPosition(action, learnedWeights, trades),
    suggestedPriceRange: (() => {
      if (history && history.length >= 20) {
        const sr = calculateSupportResistance(history, snapshot.latestPrice)
        return { min: round(sr.support1), max: round(Math.min(snapshot.latestPrice * 1.005, sr.resistance1)) }
      }
      return { min: round(snapshot.latestPrice * 0.995), max: round(snapshot.latestPrice * 1.01) }
    })(),
    supportResistance: history && history.length >= 20 ? calculateSupportResistance(history, snapshot.latestPrice) : null,
    stopLossPrice: round(snapshot.latestPrice * (1 - config.stopLossPercent / 100)),
    takeProfitPrice1: round(snapshot.latestPrice * (1 + config.takeProfitPercent1 / 100)),
    takeProfitPrice2: round(snapshot.latestPrice * (1 + config.takeProfitPercent2 / 100)),
    passingChecks,
    vetoReasons,
    watchReasons,
    reasoning: [
      `situação do mercado：${marketState.trend} / ${marketState.volatility} / ${marketState.liquidity}（sistema：${regime}）`,
      `Peso de fusão：especialista ${fusionWeights.expert} / tecnologia ${fusionWeights.technical} / Quantificar ${fusionWeights.quant}`,
      `20Renda diária ${snapshot.return20d}% ，20amplitude diária ${snapshot.amplitude20d}% ，taxa de rotatividade ${snapshot.turnoverRate}%`,
      ...expert.highlights,
      ...technical.notes,
      ...quant.notes,
    ].slice(0, 8),
    confidence: round(Math.min(1, finalScore / 100), 4),
    createdAt: nowIso(),
    decisionSource: 'system',
    userDecisionNote: null,
  } satisfies StockAnalysisSignal
}

function updatePositionRuntime(position: StockAnalysisPosition, quote: StockAnalysisSpotQuote, config: StockAnalysisStrategyConfig) {
  const returnPercent = safeDivide(quote.latestPrice - position.costPrice, position.costPrice) * 100
  const highestPriceSinceOpen = Math.max(position.highestPriceSinceOpen, quote.high)
  // P2-C1: Calcule os dias de manutenção de posição usando dias de negociação（em vez de um dia natural），Evite o acionamento prematuro de avaliações de vencimento durante feriados prolongados
  const tradeDaysSinceOpen = getRecentTradeDates(todayDate(), 60)
  const openDateStr = position.openedAt.slice(0, 10)
  const holdingDays = Math.max(1, tradeDaysSinceOpen.filter((d) => d >= openDateStr).length)
  let action: PositionAction = 'hold'
  let actionReason = 'A posição está funcionando normalmente'
  if (quote.latestPrice <= position.stopLossPrice) {
    action = 'stop_loss'
    actionReason = 'Parada brusca acionada'
  } else if (position.trailingStopEnabled && returnPercent >= config.trailingStop.activationPercent) {
    const pullback = safeDivide(highestPriceSinceOpen - quote.latestPrice, highestPriceSinceOpen) * 100
    if (pullback >= config.trailingStop.pullbackPercent) {
      action = 'stop_loss'
      actionReason = `Trailing stop acionado（do preço mais alto ${round(highestPriceSinceOpen)} retração ${round(pullback)}%）`
    }
  }
  if (action === 'hold') {
    if (quote.latestPrice >= position.takeProfitPrice2) {
      action = 'take_profit'
      actionReason = 'O segundo take-profit foi acionado'
    } else if (quote.latestPrice >= position.takeProfitPrice1) {
      action = 'reduce'
      actionReason = 'O primeiro take-profit foi acionado，Recomenda-se reduzir a posição pela metade'
    } else if (holdingDays >= config.maxHoldDays) {
      action = 'review'
      actionReason = 'O número de dias em que a posição foi mantida atingiu o limite superior，Avaliação obrigatória necessária'
    }
  }
  // dismiss Proteger：Se o usuário ignorou o atual action，Manter hold；se action Limpar após atualização dismiss e acione um novo lembrete
  let dismissedAction = position.dismissedAction ?? null
  if (dismissedAction) {
    if (action === dismissedAction) {
      // Lembretes do mesmo nível foram ignorados，Manter hold
      action = 'hold'
      actionReason = `Usuário ignorado${dismissedAction === 'stop_loss' ? 'parar a perda' : dismissedAction === 'take_profit' ? 'Obtenha lucro' : dismissedAction === 'reduce' ? 'Reduzir posições' : 'Avaliar'}lembrar`
    } else if (action !== 'hold') {
      // action mudado（Atualizar ou fazer downgrade），Claro dismiss，Acionar novo lembrete
      dismissedAction = null
    }
  }
  return { ...position, currentPrice: quote.latestPrice, highestPriceSinceOpen, returnPercent: round(returnPercent), holdingDays, action, actionReason, dismissedAction }
}

function calculatePerformance(trades: StockAnalysisTradeRecord[]) {
  const sells = trades
    .filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
    .sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime())
  const wins = sells.filter((trade) => (trade.pnlPercent ?? 0) > 0).length
  const winRate = sells.length === 0 ? 0 : wins / sells.length
  // v1.35.0 [A8-P0-2] Renda acumulada alterada para composta：equity_t = equity_{t-1} * (1 + weight_t * pnlPct_t / 100)
  // Modelo de posição percentual，impacto de cada transação"Patrimônio da conta"proporção de = weight × Taxa única de retorno
  // rendimento cumulativo final = (equity_final / 1) - 1，Exibido como uma porcentagem。
  // Esta é a semântica financeiramente correta dos retornos compostos，Versão antiga da soma simples（12.33% + -10% = 2.33%）Há um erro de magnitude（A resposta correta deveria ser 1.10%）。
  let equity = 1
  for (const trade of sells) {
    const weight = typeof trade.weight === 'number' && trade.weight > 0 ? trade.weight : 1
    const pnlPct = (trade.pnlPercent ?? 0) / 100
    // Perceber：weight sim"O índice de exposição desta transação ao patrimônio da conta"（0-1），Os juros compostos atuam apenas sobre essa exposição
    equity *= (1 + weight * pnlPct)
  }
  const cumulativeReturn = round((equity - 1) * 100)
  return { winRate: round(winRate, 4), cumulativeReturn }
}

function calculateProfitLossRatio(trades: StockAnalysisTradeRecord[]) {
  const sells = trades.filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
  const wins = sells.map((trade) => trade.pnlPercent ?? 0).filter((value) => value > 0)
  const losses = sells.map((trade) => trade.pnlPercent ?? 0).filter((value) => value < 0).map(Math.abs)
  return round(safeDivide(average(wins), average(losses)), 3)
}

/** Avaliação de controle de risco em nível de mercado：mercado de baixa extrema/extrema volatilidade/crise de liquidez */
function evaluateMarketLevelRisk(marketState: StockAnalysisMarketState, config: StockAnalysisStrategyConfig): MarketLevelRiskState {
  const extremeBearActive = marketState.trend === 'bear_trend' && marketState.csi500Return20d < -10
  const volatilityPct = marketState.volatilityPercentile ?? 0.5
  const extremeVolatilityActive = volatilityPct > 0.95
  const liquidityCrisisActive = isLiquidityCrisis(marketState, config)
  const lowLiquidityActive = isLowLiquidityGuardrail(marketState, config)

  const newPositionsAllowed = !extremeBearActive && !liquidityCrisisActive
  const buyAllowed = !liquidityCrisisActive
  // Desbloqueie a supressão da proporção de posição com base na tomada de decisão do usuário：effectiveMaxPositionRatio Segue diretamente a configuração do usuário maxTotalPosition（padrão 1.0），
  // não mais por lowLiquidityGuardrail / extremeVolatility empurrar para baixo。mercado de baixa extrema/Crise de liquidez ainda passa newPositionsAllowed / buyAllowed interceptação difícil。
  const effectiveMaxPositionRatio = config.maxTotalPosition ?? 1.0

  return {
    extremeBearActive,
    extremeVolatilityActive,
    liquidityCrisisActive,
    lowLiquidityActive,
    effectiveMaxPositionRatio,
    newPositionsAllowed,
    buyAllowed,
    checkedAt: nowIso(),
  }
}

/**
 * v1.35.0 [A8-P0-3] Dia de construção daily-equity Instantâneo
 *
 * Cálculo do patrimônio líquido sob modelo de posição percentual：
 *   - totalEquity：de acordo com trades juros compostos（e calculatePerformance consistente）
 *   - exposure：Todas as posições abertas atuais positions de weight soma
 *   - floatingReturnPct：Σ(position.weight × position.returnPercent)，Reflete lucros e perdas flutuantes de posição aberta
 *   - realizedReturnPct：Transação de fechamento no mesmo dia Σ(weight × pnlPercent)
 *   - drawdownPct：totalEquity Retração do pico histórico
 */
function buildDailyEquitySnapshot(
  date: string,
  positions: StockAnalysisPosition[],
  trades: StockAnalysisTradeRecord[],
  existingEquity: DailyEquitySnapshot[],
): DailyEquitySnapshot {
  // calcular totalEquity（Juros compostos cumulativos，e calculatePerformance consistente）
  const sells = trades
    .filter((t) => t.action === 'sell' && typeof t.pnlPercent === 'number')
    .sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime())
  let totalEquity = 1
  for (const trade of sells) {
    const weight = typeof trade.weight === 'number' && trade.weight > 0 ? trade.weight : 1
    const pnlPct = (trade.pnlPercent ?? 0) / 100
    totalEquity *= (1 + weight * pnlPct)
  }

  // Receitas de posições fechadas no dia
  const todaySells = sells.filter((t) => t.tradeDate.slice(0, 10) === date)
  let realizedReturnPct = 0
  for (const t of todaySells) {
    const weight = typeof t.weight === 'number' && t.weight > 0 ? t.weight : 1
    realizedReturnPct += weight * (t.pnlPercent ?? 0)
  }

  // Lucros e perdas flutuantes de posição aberta + taxa de exposição
  let exposure = 0
  let floatingReturnPct = 0
  for (const pos of positions) {
    const weight = typeof pos.weight === 'number' && pos.weight > 0 ? pos.weight : 0
    exposure += weight
    floatingReturnPct += weight * (pos.returnPercent ?? 0)
  }

  // retração（pico histórico relativo）
  const historicalPeak = existingEquity.reduce((peak, item) => Math.max(peak, item.totalEquity), totalEquity)
  const drawdownPct = historicalPeak > 0 ? round(((historicalPeak - totalEquity) / historicalPeak) * 100) : 0

  return {
    date,
    totalEquity: round(totalEquity, 6),
    exposure: round(exposure, 4),
    floatingReturnPct: round(floatingReturnPct, 4),
    realizedReturnPct: round(realizedReturnPct, 4),
    drawdownPct,
    positionCount: positions.length,
    generatedAt: nowIso(),
  }
}

function calculateMaxDrawdownFromTrades(trades: StockAnalysisTradeRecord[]) {
  const sells = trades
    .filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
    .sort((left, right) => new Date(left.tradeDate).getTime() - new Date(right.tradeDate).getTime())
  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0
  for (const trade of sells) {
    cumulative += trade.pnlPercent ?? 0
    peak = Math.max(peak, cumulative)
    const drawdown = cumulative - peak
    maxDrawdown = Math.min(maxDrawdown, drawdown)
  }
  return round(maxDrawdown)
}

interface AssessPortfolioRiskResult {
  state: StockAnalysisRiskControlState
  newEvents: StockAnalysisRiskEvent[]
}

type StockAnalysisConfigPatch = Partial<Omit<StockAnalysisStrategyConfig, 'marketThresholds' | 'fusionWeightsByRegime' | 'lowLiquidityGuardrail' | 'trailingStop' | 'portfolioRiskLimits'>> & {
  marketThresholds?: Partial<StockAnalysisStrategyConfig['marketThresholds']>
  fusionWeightsByRegime?: Partial<NonNullable<StockAnalysisStrategyConfig['fusionWeightsByRegime']>>
  lowLiquidityGuardrail?: Partial<NonNullable<StockAnalysisStrategyConfig['lowLiquidityGuardrail']>>
  trailingStop?: Partial<NonNullable<StockAnalysisStrategyConfig['trailingStop']>>
  portfolioRiskLimits?: Partial<StockAnalysisPortfolioRiskLimits>
}

function assessPortfolioRisk(
  trades: StockAnalysisTradeRecord[],
  limits: StockAnalysisPortfolioRiskLimits,
  existingState: StockAnalysisRiskControlState,
): AssessPortfolioRiskResult {
  // P1-8: Use janelas de dias de negociação em vez de dias corridos
  const today = todayDate()
  const recentTradeDays = getRecentTradeDates(today, 25) // O suficiente para cobrir cerca de um mês de dias de negociação
  const oneDayAgoStr = recentTradeDays[1] ?? today // avançar1dias de negociação
  const oneWeekAgoStr = recentTradeDays[5] ?? recentTradeDays[recentTradeDays.length - 1] ?? today // avançar5dias de negociação
  const oneMonthAgoStr = recentTradeDays[22] ?? recentTradeDays[recentTradeDays.length - 1] ?? today // avançar22dias de negociação

  const sells = trades.filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')

  // P1-8: Usando comparação de strings do dia da transação（YYYY-MM-DD O formato suporta naturalmente a comparação da ordem das strings）
  const dailyLoss = sells
    .filter((trade) => trade.tradeDate.slice(0, 10) >= oneDayAgoStr)
    .reduce((sum, trade) => sum + Math.min(0, trade.pnlPercent ?? 0), 0)

  const weeklyLoss = sells
    .filter((trade) => trade.tradeDate.slice(0, 10) >= oneWeekAgoStr)
    .reduce((sum, trade) => sum + Math.min(0, trade.pnlPercent ?? 0), 0)

  const monthlyLoss = sells
    .filter((trade) => trade.tradeDate.slice(0, 10) >= oneMonthAgoStr)
    .reduce((sum, trade) => sum + Math.min(0, trade.pnlPercent ?? 0), 0)

  const maxDrawdown = Math.abs(calculateMaxDrawdownFromTrades(trades))

  const dailyLossBreached = Math.abs(dailyLoss) >= limits.maxDailyLossPercent
  const weeklyLossBreached = Math.abs(weeklyLoss) >= limits.maxWeeklyLossPercent
  const monthlyLossBreached = Math.abs(monthlyLoss) >= limits.maxMonthlyLossPercent
  const maxDrawdownBreached = maxDrawdown >= limits.maxDrawdownPercent

  const metrics = {
    dailyLossPercent: round(dailyLoss),
    weeklyLossPercent: round(weeklyLoss),
    monthlyLossPercent: round(monthlyLoss),
    maxDrawdownPercent: round(maxDrawdown),
  }

  const newEvents: StockAnalysisRiskEvent[] = []
  const timestamp = nowIso()

  function emitEvent(eventType: StockAnalysisRiskEventType, reason: string) {
    newEvents.push({
      id: `risk-${eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      eventType,
      reason,
      metrics,
    })
  }

  // Detecte transições de estado que excedem limites（de false -> true Único incidente，evite duplicação）
  if (dailyLossBreached && !existingState.dailyLossBreached) {
    emitEvent('daily_loss_breached', `perda intradiária ${round(Math.abs(dailyLoss))}% excede o limite ${limits.maxDailyLossPercent}%`)
  }
  if (weeklyLossBreached && !existingState.weeklyLossBreached) {
    emitEvent('weekly_loss_breached', `perda semanal ${round(Math.abs(weeklyLoss))}% excede o limite ${limits.maxWeeklyLossPercent}%`)
  }
  if (monthlyLossBreached && !existingState.monthlyLossBreached) {
    emitEvent('monthly_loss_breached', `perda mensal ${round(Math.abs(monthlyLoss))}% excede o limite ${limits.maxMonthlyLossPercent}%`)
  }
  if (maxDrawdownBreached && !existingState.maxDrawdownBreached) {
    emitEvent('max_drawdown_breached', `rebaixamento máximo ${round(maxDrawdown)}% excede o limite ${limits.maxDrawdownPercent}%`)
  }

  const shouldPause = maxDrawdownBreached || monthlyLossBreached
  let paused = existingState.paused
  let pauseReason = existingState.pauseReason
  let pausedAt = existingState.pausedAt

  if (shouldPause && !existingState.paused) {
    paused = true
    pausedAt = nowIso()
    if (maxDrawdownBreached) {
      pauseReason = `rebaixamento máximo ${round(maxDrawdown)}% limite excedido ${limits.maxDrawdownPercent}%`
    } else {
      pauseReason = `perda mensal ${round(Math.abs(monthlyLoss))}% limite excedido ${limits.maxMonthlyLossPercent}%`
    }
    emitEvent('pause_triggered', pauseReason)
    logger.warn(`[stock-analysis] Controle de risco desencadeia suspensão: ${pauseReason}`)
  }

  // P1-7: Mecanismo de recuperação automática de suspensão de controle de risco — Retomar automaticamente quando as condições de disparo não forem mais atendidas
  if (existingState.paused && !shouldPause) {
    paused = false
    pauseReason = null
    pausedAt = null
    emitEvent('pause_lifted', 'As condições de controle de risco voltaram ao normal，Retomar automaticamente')
    logger.info('[stock-analysis] A suspensão do controle de risco foi automaticamente levantada：A condição de acionamento não é mais atendida')
  }

  return {
    state: {
      paused,
      pauseReason,
      pausedAt,
      dailyLossPercent: round(dailyLoss),
      weeklyLossPercent: round(weeklyLoss),
      monthlyLossPercent: round(monthlyLoss),
      maxDrawdownPercent: round(maxDrawdown),
      dailyLossBreached,
      weeklyLossBreached,
      monthlyLossBreached,
      maxDrawdownBreached,
      lastCheckedAt: nowIso(),
    },
    newEvents,
  }
}

async function recomputeRiskControlState(stockAnalysisDir: string, limits: StockAnalysisPortfolioRiskLimits) {
  const [trades, runtimeStatus, existingEvents] = await Promise.all([
    readStockAnalysisTrades(stockAnalysisDir),
    readStockAnalysisRuntimeStatus(stockAnalysisDir),
    readStockAnalysisRiskEvents(stockAnalysisDir),
  ])

  const riskResult = assessPortfolioRisk(trades, limits, runtimeStatus.riskControl)
  await saveStockAnalysisRuntimeStatus(stockAnalysisDir, { ...runtimeStatus, riskControl: riskResult.state })

  if (riskResult.newEvents.length > 0) {
    await saveStockAnalysisRiskEvents(stockAnalysisDir, [...riskResult.newEvents, ...existingEvents])
  }

  return riskResult.state
}

async function buildReviewRecord(
  stockAnalysisDir: string,
  position: StockAnalysisPosition,
  sellPrice: number,
  sellReason: string,
): Promise<StockAnalysisReviewRecord> {
  let buyExpertScore = 0
  let buyTechnicalScore = 0
  let buyQuantScore = 0
  let buyCompositeScore = 0
  let buyMarketRegime: MarketRegime | null = null

  if (position.sourceSignalId) {
    try {
      const { signal: buySignal } = await findSignalByIdAcrossDates(stockAnalysisDir, position.sourceSignalId)
      if (buySignal) {
        buyExpertScore = buySignal.expert.consensus
        buyTechnicalScore = buySignal.technical.total
        buyQuantScore = buySignal.quant.total
        buyCompositeScore = buySignal.compositeScore
        buyMarketRegime = buySignal.marketRegime
      }
    } catch {
      logger.debug(`[stock-analysis] Nenhum sinal de compra encontrado ${position.sourceSignalId}，Use valores padrão para registros de revisão`)
    }
  }

  const pnlPercent = round(safeDivide(sellPrice - position.costPrice, position.costPrice) * 100)
  // P2-C1: Calcule os dias de manutenção de posição usando dias de negociação
  const reviewTradeDays = getRecentTradeDates(todayDate(), 60)
  const reviewOpenDateStr = position.openedAt.slice(0, 10)
  const holdingDays = Math.max(1, reviewTradeDays.filter((d) => d >= reviewOpenDateStr).length)

  const lessonsLearned: string[] = []
  if (pnlPercent < -5) lessonsLearned.push('Perda excede5%，É necessário verificar o tempo de entrada e as configurações de stop loss')
  if (pnlPercent > 0 && holdingDays <= 2) lessonsLearned.push('lucro a curto prazo，Confirme se a tendência está começando ou apenas uma recuperação')
  if (holdingDays >= 15) lessonsLearned.push('Período de retenção mais longo，Avalie se você perdeu a melhor oportunidade de vender')
  if (pnlPercent > 5) lessonsLearned.push('Lucro excede5%，Confirme se a realização de lucros está conforme planejado')

  return {
    id: `review-${position.code}-${Date.now()}`,
    tradeDate: nowIso(),
    code: position.code,
    name: position.name,
    action: 'sell',
    buySignalId: position.sourceSignalId,
    buyDate: position.openedAt,
    buyPrice: position.costPrice,
    sellPrice,
    holdingDays,
    pnlPercent,
    buyExpertScore,
    buyTechnicalScore,
    buyQuantScore,
    buyCompositeScore,
    buyMarketRegime,
    sellReason,
    lessonsLearned,
    createdAt: nowIso(),
    dimensionAnalysis: buildDimensionAnalysis(
      position, sellPrice, pnlPercent, holdingDays,
      buyExpertScore, buyTechnicalScore, buyQuantScore,
    ),
  }
}

/** Phase 6: Constantes de cálculo de peso dinâmico especializado */
const MIN_PREDICTIONS_FOR_WEIGHT = 5
const EXPERT_WEIGHT_MIN = 0.1
const EXPERT_WEIGHT_MAX = 2.0
const EXPERT_WEIGHT_DECAY_HALF_LIFE_DAYS = 60

/** Calcule o peso dinâmico de um especialista individual：Com base na taxa de vitória + decadência do tempo */
function computeExpertWeight(entry: StockAnalysisExpertPerformanceEntry): number {
  if (entry.predictionCount < MIN_PREDICTIONS_FOR_WEIGHT) return 1 // Amostra insuficiente，Mantenha os pesos padrão

  // Peso básico：Desvio baseado na taxa de vitória 0.5 A magnitude de
  // winRate=0.7 → baseWeight=1.4, winRate=0.3 → baseWeight=0.6, winRate=0.5 → baseWeight=1.0
  const baseWeight = 1.0 + (entry.winRate - 0.5) * 2.0

  // decadência do tempo：Pesos de previsão mais recentes
  let decayFactor = 1.0
  if (entry.recentOutcomes.length > 0) {
    const latestDate = new Date(entry.recentOutcomes[0].tradeDate)
    const ageDays = Math.max(0, (Date.now() - latestDate.getTime()) / 86400000)
    decayFactor = Math.pow(2, -ageDays / EXPERT_WEIGHT_DECAY_HALF_LIFE_DAYS)
  }

  // peso final = Peso básico * atenuação，mas mantenha-o em [0.1, 2.0] escopo
  const weight = baseWeight * (0.5 + 0.5 * decayFactor) // A atenuação afeta apenas metade da amplitude
  return round(Math.max(EXPERT_WEIGHT_MIN, Math.min(EXPERT_WEIGHT_MAX, weight)), 4)
}

/** Phase 4.3: Análise de revisão quadridimensional — Especialista em avaliação automatizada/tecnologia/Quantificar/Desvio de execução */
function buildDimensionAnalysis(
  position: StockAnalysisPosition,
  sellPrice: number,
  pnlPercent: number,
  holdingDays: number,
  buyExpertConsensus: number,
  buyTechnicalScore: number,
  buyQuantScore: number,
): StockAnalysisDimensionAnalysis {
  const priceWentUp = pnlPercent > 0

  // Dimensão especialista：direção de consenso vs Ascensão ou queda real
  const expertPredicted = buyExpertConsensus >= 0.6 ? 'bullish' as const : buyExpertConsensus <= 0.4 ? 'bearish' as const : 'neutral' as const
  const expertActual = pnlPercent > 1 ? 'up' as const : pnlPercent < -1 ? 'down' as const : 'flat' as const
  const expertCorrect = (expertPredicted === 'bullish' && expertActual === 'up')
    || (expertPredicted === 'bearish' && expertActual === 'down')
    || (expertPredicted === 'neutral' && expertActual === 'flat')
  const expertNote = expertCorrect
    ? `Consenso de especialistas ${buyExpertConsensus.toFixed(2)} Previsão correta（real${expertActual === 'up' ? 'ascender' : expertActual === 'down' ? 'cair' : 'Placa plana'}）`
    : `Consenso de especialistas ${buyExpertConsensus.toFixed(2)} Viés de previsão（prever${expertPredicted === 'bullish' ? 'otimista' : expertPredicted === 'bearish' ? 'Grosseiro' : 'neutro'}，real${expertActual === 'up' ? 'ascender' : expertActual === 'down' ? 'cair' : 'Placa plana'}）`

  // dimensão técnica：Pontos técnicos na hora de comprar vs Se o limite de lucro foi realmente alcançado?
  const priceHitTarget = sellPrice >= position.takeProfitPrice1
  const technicalNote = buyTechnicalScore >= 60
    ? (priceHitTarget ? 'A pontuação técnica é alta e o preço atinge a meta de lucro' : `Pontos técnicos ${buyTechnicalScore} Maior, mas menor que o lucro`)
    : (priceWentUp ? `Pontos técnicos ${buyTechnicalScore} Baixo, mas ainda lucrativo` : `Pontos técnicos ${buyTechnicalScore} No lado baixo，não conseguiu apoiar a ascensão`)

  // Dimensão quantitativa：O fator de momento é preciso?
  const momentumCorrect = (buyQuantScore >= 55 && priceWentUp) || (buyQuantScore < 45 && !priceWentUp)
  const quantNote = momentumCorrect
    ? `Pontuação quantitativa ${buyQuantScore} Consistente com a tendência real`
    : `Pontuação quantitativa ${buyQuantScore} inconsistente com a tendência real（${priceWentUp ? 'ascender' : 'cair'}）`

  // dimensão de execução：Deslizamento e eficiência de posição
  const slippage = round(Math.abs(sellPrice - position.currentPrice) / position.currentPrice * 100)
  // Eficiência de posição = Lucros e perdas reais / Lucro e perda máximo possível（Com base na meta de lucro）
  const maxPossiblePnl = (position.takeProfitPrice1 - position.costPrice) / position.costPrice * 100
  const holdingEfficiency = maxPossiblePnl > 0 ? round(Math.min(1, Math.max(0, pnlPercent / maxPossiblePnl)), 2) : 0
  const followedPlan = (pnlPercent < 0 && sellPrice <= position.stopLossPrice * 1.02)
    || (pnlPercent > 0 && sellPrice >= position.takeProfitPrice1 * 0.98)
    || holdingDays <= position.holdingDays
  const executionNote = followedPlan
    ? `execução de acordo com o plano（Deslizamento ${slippage.toFixed(2)}%，eficiência ${(holdingEfficiency * 100).toFixed(0)}%）`
    : `A execução se desvia do plano（Deslizamento ${slippage.toFixed(2)}%，eficiência ${(holdingEfficiency * 100).toFixed(0)}%，Precisa revisar o momento de venda）`

  return {
    expert: { predicted: expertPredicted, actual: expertActual, correct: expertCorrect, note: expertNote },
    technical: { buyScore: buyTechnicalScore, sellScore: 0, priceHitTarget, note: technicalNote },
    quant: { buyScore: buyQuantScore, momentumCorrect, note: quantNote },
    execution: { slippage, holdingEfficiency, followedPlan, note: executionNote },
  }
}

/** Phase 4.1: Calcule pesos de aprendizagem com base em registros de revisão histórica */
const WEIGHT_DECAY_HALF_LIFE_DAYS = 30
const MAX_WEIGHT_ADJUSTMENT = 0.2
const MIN_REVIEWS_FOR_LEARNING = 5
const MAX_WEIGHT_HISTORY = 50
const MIN_EXPERT_FUSION_WEIGHT = 0.32
const MAX_EXPERT_FUSION_WEIGHT = 0.45
const EXTREME_LOW_EXPERT_CONSENSUS = 0.42
const BULL_TREND_WEAK_BREADTH_THRESHOLD = 0.45

async function computeLearnedWeights(stockAnalysisDir: string): Promise<StockAnalysisLearnedWeights | null> {
  const reviews = await readStockAnalysisReviews(stockAnalysisDir)
  const reviewsWithAnalysis = reviews.filter((r) => r.dimensionAnalysis)

  if (reviewsWithAnalysis.length < MIN_REVIEWS_FOR_LEARNING) {
    logger.debug(`[stock-analysis] Registros de revisão insuficientes ${MIN_REVIEWS_FOR_LEARNING} tira（atual ${reviewsWithAnalysis.length}），Pular o cálculo do peso de aprendizagem`)
    return null
  }

  const now = Date.now()
  let expertCorrectWeighted = 0
  let technicalCorrectWeighted = 0
  let quantCorrectWeighted = 0
  let totalWeight = 0

  for (const review of reviewsWithAnalysis) {
    const analysis = review.dimensionAnalysis!
    const ageMs = now - new Date(review.createdAt).getTime()
    const ageDays = ageMs / 86400000
    // decadência exponencial: weight = 2^(-ageDays / halfLife)
    const decayWeight = Math.pow(2, -ageDays / WEIGHT_DECAY_HALF_LIFE_DAYS)

    expertCorrectWeighted += (analysis.expert.correct ? 1 : 0) * decayWeight
    technicalCorrectWeighted += (analysis.technical.priceHitTarget ? 1 : 0) * decayWeight
    quantCorrectWeighted += (analysis.quant.momentumCorrect ? 1 : 0) * decayWeight
    totalWeight += decayWeight
  }

  if (totalWeight <= 0) return null

  const expertAccuracy = round(expertCorrectWeighted / totalWeight, 4)
  const technicalAccuracy = round(technicalCorrectWeighted / totalWeight, 4)
  const quantAccuracy = round(quantCorrectWeighted / totalWeight, 4)

  // precisão normalizada → Fator de ajuste（média centrada，deslocamento máximo ±MAX_WEIGHT_ADJUSTMENT）
  const avgAccuracy = (expertAccuracy + technicalAccuracy + quantAccuracy) / 3
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
  const expertAdj = round(clamp(expertAccuracy - avgAccuracy, -MAX_WEIGHT_ADJUSTMENT, MAX_WEIGHT_ADJUSTMENT), 4)
  const technicalAdj = round(clamp(technicalAccuracy - avgAccuracy, -MAX_WEIGHT_ADJUSTMENT, MAX_WEIGHT_ADJUSTMENT), 4)
  const quantAdj = round(clamp(quantAccuracy - avgAccuracy, -MAX_WEIGHT_ADJUSTMENT, MAX_WEIGHT_ADJUSTMENT), 4)

  // Certifique-se de que a soma dos fatores de ajuste seja 0（zero e deslocamento）
  const adjSum = expertAdj + technicalAdj + quantAdj
  const expertAdjFinal = round(expertAdj - adjSum / 3, 4)
  const technicalAdjFinal = round(technicalAdj - adjSum / 3, 4)
  const quantAdjFinal = round(quantAdj - adjSum / 3, 4)

  const wins = reviewsWithAnalysis.filter((r) => r.pnlPercent > 0).length
  const winRate = round(wins / reviewsWithAnalysis.length, 4)

  const entry: StockAnalysisWeightUpdateEntry = {
    timestamp: nowIso(),
    sampleCount: reviewsWithAnalysis.length,
    winRate,
    dimensionAccuracy: { expert: expertAccuracy, technical: technicalAccuracy, quant: quantAccuracy },
    adjustmentFactors: { expert: expertAdjFinal, technical: technicalAdjFinal, quant: quantAdjFinal },
  }

  const existing = await readStockAnalysisLearnedWeights(stockAnalysisDir)
  const history = existing?.history ?? []
  history.unshift(entry)

  const result: StockAnalysisLearnedWeights = {
    updatedAt: nowIso(),
    sampleCount: reviewsWithAnalysis.length,
    dimensionAccuracy: entry.dimensionAccuracy,
    adjustmentFactors: entry.adjustmentFactors,
    history: history.slice(0, MAX_WEIGHT_HISTORY),
  }

  await saveStockAnalysisLearnedWeights(stockAnalysisDir, result)
  logger.info(`[stock-analysis] Os pesos de aprendizagem foram atualizados: amostra ${reviewsWithAnalysis.length}, precisão expert=${expertAccuracy} tech=${technicalAccuracy} quant=${quantAccuracy}, Ajuste expert=${expertAdjFinal} tech=${technicalAdjFinal} quant=${quantAdjFinal}`)
  return result
}

/** Phase 4.1: Obtenha peso de fusão（referencial institucional + Aprenda a ajustar） */
function getAdjustedFusionWeights(
  baseWeights: StockAnalysisFusionWeights,
  learnedWeights: StockAnalysisLearnedWeights | null,
): StockAnalysisFusionWeights {
  if (!learnedWeights || !learnedWeights.adjustmentFactors || learnedWeights.sampleCount < MIN_REVIEWS_FOR_LEARNING) return baseWeights
  const adj = learnedWeights.adjustmentFactors
  const rawExpert = baseWeights.expert + adj.expert
  const rawTechnical = baseWeights.technical + adj.technical
  const rawQuant = baseWeights.quant + adj.quant
  const total = rawExpert + rawTechnical + rawQuant
  if (total <= 0) return baseWeights

  const normalizedExpert = rawExpert / total
  const normalizedTechnical = rawTechnical / total
  const normalizedQuant = rawQuant / total
  const clampedExpert = Math.max(MIN_EXPERT_FUSION_WEIGHT, Math.min(MAX_EXPERT_FUSION_WEIGHT, normalizedExpert))
  const remainingWeight = 1 - clampedExpert
  const nonExpertTotal = normalizedTechnical + normalizedQuant

  if (nonExpertTotal <= 0) {
    return {
      expert: round(clampedExpert, 4),
      technical: round(remainingWeight * 0.5, 4),
      quant: round(remainingWeight * 0.5, 4),
    }
  }

  return {
    expert: round(clampedExpert, 4),
    technical: round((normalizedTechnical / nonExpertTotal) * remainingWeight, 4),
    quant: round((normalizedQuant / nonExpertTotal) * remainingWeight, 4),
  }
}

/** Phase 4.2: Ajustar automaticamente com base na taxa de vitória Conviction Filter limite */
const CONVICTION_SAMPLE_SIZE = 30
const MIN_CONVICTION_SAMPLE_SIZE = 20
const CONVICTION_BOOST = -2
const CONVICTION_TIGHTEN = 3
const MIN_COMPOSITE_SCORE_FLOOR_BY_REGIME: Record<MarketRegime, number> = {
  bull_trend: 70,
  bear_trend: 78,
  high_volatility: 76,
  low_volatility_range: 73,
  normal_range: 66,
}
const MAX_COMPOSITE_SCORE_CEIL = 85

async function adjustConvictionThresholds(stockAnalysisDir: string, config: StockAnalysisStrategyConfig, marketState: StockAnalysisMarketState): Promise<StockAnalysisThresholdAdjustment | null> {
  const trades = await readStockAnalysisTrades(stockAnalysisDir)
  const recentTrades = trades.filter((t) => t.action === 'sell' && t.pnlPercent != null).slice(0, CONVICTION_SAMPLE_SIZE)

  if (recentTrades.length < MIN_CONVICTION_SAMPLE_SIZE) {
    logger.debug(`[stock-analysis] Registros de transações insuficientes ${MIN_CONVICTION_SAMPLE_SIZE} tira（atual ${recentTrades.length}），Pular ajuste de limite`)
    return null
  }

  const wins = recentTrades.filter((t) => (t.pnlPercent ?? 0) > 0).length
  const winRate = round(wins / recentTrades.length, 4)
  const regime = getMarketRegime(marketState)
  const currentThresholds = config.marketThresholds[regime]
  const prevScore = currentThresholds.minCompositeScore

  let adjustment = 0
  let reason = ''
  const isWeakBullTrend = regime === 'bull_trend'
    && ((marketState.risingRatio ?? 0.5) < BULL_TREND_WEAK_BREADTH_THRESHOLD || marketState.sentiment === 'pessimistic')
  const floor = MIN_COMPOSITE_SCORE_FLOOR_BY_REGIME[regime] ?? 70

  if (prevScore < floor) {
    adjustment = floor - prevScore
    reason = `limite atual ${prevScore} inferior a ${regime} piso de segurança ${floor}，Limite mínimo de restauração`
  } else if (winRate > 0.6 && !isWeakBullTrend) {
    adjustment = CONVICTION_BOOST
    reason = `taxa de vitórias ${(winRate * 100).toFixed(0)}% > 60%，Relaxe moderadamente os limites para capturar mais oportunidades`
  } else if (winRate < 0.4) {
    adjustment = CONVICTION_TIGHTEN
    reason = `taxa de vitórias ${(winRate * 100).toFixed(0)}% < 40%，Restringir os limites para melhorar a qualidade da seleção de ações`
  } else {
    logger.debug(`[stock-analysis] taxa de vitórias ${(winRate * 100).toFixed(0)}% dentro da faixa normal，Sem ajuste de limite`)
    return null
  }

  const newScore = Math.max(floor, Math.min(MAX_COMPOSITE_SCORE_CEIL, prevScore + adjustment))
  if (newScore === prevScore) {
    logger.debug(`[stock-analysis] O limite atingiu o limite ${prevScore}，Não é possível continuar ajustando`)
    return null
  }

  // Aplicar ajustes（Modifique a memória config e persistir）
  config.marketThresholds[regime] = { ...currentThresholds, minCompositeScore: newScore }
  await saveStockAnalysisConfig(stockAnalysisDir, config)

  const entry: StockAnalysisThresholdAdjustment = {
    timestamp: nowIso(),
    recentWinRate: winRate,
    sampleCount: recentTrades.length,
    previousMinCompositeScore: prevScore,
    newMinCompositeScore: newScore,
    adjustment,
    regime,
    reason,
  }

  const history = await readStockAnalysisThresholdHistory(stockAnalysisDir)
  history.adjustments.unshift(entry)
  history.updatedAt = nowIso()
  await saveStockAnalysisThresholdHistory(stockAnalysisDir, history)

  logger.info(`[stock-analysis] Conviction Ajuste de limite: ${regime} minCompositeScore ${prevScore} -> ${newScore} (taxa de vitórias ${(winRate * 100).toFixed(0)}%, ${reason})`)
  return entry
}

const SCORE_DROP_THRESHOLD = 15
const SWAP_SCORE_ADVANTAGE = 10

async function evaluatePositionScores(
  position: StockAnalysisPosition,
  snapshot: StockAnalysisStockSnapshot,
  marketState: StockAnalysisMarketState,
  config: StockAnalysisStrategyConfig,
  buyCompositeScore: number,
  buyFinalScore = buyCompositeScore,
  aiConfig?: StockAnalysisAIConfig | null,
  expertWeights?: Map<string, number>,
  profileMap?: Map<string, ExpertProfile>,
  factPoolSummary?: FactPoolSummary,
  memoryStore?: ExpertMemoryStore,
  learnedWeights?: StockAnalysisLearnedWeights | null,
  history?: StockAnalysisKlinePoint[],
  factPool?: FactPool,
  fundamentals?: StockFundamentals | null,
): Promise<StockAnalysisPositionEvaluation> {
  // Determine se está disponível AI Configuração
  const hasAI = aiConfig
    && aiConfig.providers.some((p) => p.enabled && p.apiKey)
    && aiConfig.experts.some((e) => e.enabled && e.layer !== 'rule_functions' && e.assignedModel)

  let expert: StockAnalysisExpertScore
  if (hasAI) {
    try {
      const llmResult = await runExpertVoting(snapshot, marketState, aiConfig, expertWeights, profileMap, factPoolSummary, memoryStore, history, factPool, fundamentals ?? null)
      expert = {
        bullishCount: llmResult.bullishCount,
        bearishCount: llmResult.bearishCount,
        neutralCount: llmResult.neutralCount,
        consensus: llmResult.consensus,
        score: llmResult.score,
        highlights: llmResult.highlights,
        risks: llmResult.risks,
        votes: llmResult.votes,
        llmSuccessCount: llmResult.llmSuccessCount,
        llmFallbackCount: llmResult.llmFallbackCount,
        ruleFallbackCount: llmResult.ruleFallbackCount,
        fallbackCount: llmResult.fallbackCount,
        isSimulated: llmResult.isSimulated,
      }
      logger.info(`[stock-analysis] Avaliação de posição ${position.code} Votação de especialistas concluída: LLMSucesso principal=${llmResult.llmSuccessCount - llmResult.llmFallbackCount}, LLM-fallback=${llmResult.llmFallbackCount}, Downgrade de regra=${llmResult.ruleFallbackCount}`, { module: 'StockAnalysis' })
    } catch (error) {
      logger.error(`[stock-analysis] Avaliação de posição ${position.code} LLM Anomalia de votação，Downgrade para simulação de fórmula: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      expert = buildExpertScoreFallback(snapshot, marketState)
    }
  } else {
    expert = buildExpertScoreFallback(snapshot, marketState)
  }
  const technical = buildTechnicalScore(snapshot)
  const quant = buildQuantScore(snapshot, marketState)
  // P1-4: Usar com buildSignal Pesos ajustados consistentes，certificar-se scoreDelta Mais justo
  const baseWeights = getFusionWeights(config, marketState)
  const fusionWeights = learnedWeights
    ? getAdjustedFusionWeights(baseWeights, learnedWeights)
    : baseWeights
  const currentCompositeScore = round(
    fusionWeights.expert * expert.score + fusionWeights.technical * technical.total + fusionWeights.quant * quant.total,
  )
  const currentScoreBonus = snapshot.return20d > 0 && technical.total > 70 && quant.total > 65 ? 5 : 0
  const currentFinalScore = round(Math.max(0, Math.min(100, currentCompositeScore + currentScoreBonus)))
  const scoreDelta = round(currentCompositeScore - buyCompositeScore)

  const expertConsensus = expert.consensus
  const technicalBreakdown = snapshot.latestPrice < snapshot.movingAverage20
    && snapshot.latestPrice < snapshot.movingAverage60
    && technical.total < 40

  let sellRecommended = false
  let sellReason: StockAnalysisPositionEvaluation['sellReason'] = null
  let sellReasonText = 'A avaliação da posição é normal'
  const reasoning: string[] = []

  reasoning.push(`Pontuação base atual ${currentCompositeScore}，Compre pontos básicos ${buyCompositeScore}，mudar ${scoreDelta > 0 ? '+' : ''}${scoreDelta}`)
  reasoning.push(`Pontuação final atual ${currentFinalScore}（Contém pontos de bônus de sinergia ${currentScoreBonus}），comprar pontos finais ${buyFinalScore}`)
  reasoning.push(`Consenso de especialistas ${round(expertConsensus, 4)}，Pontos técnicos ${technical.total}，Pontuação quantitativa ${quant.total}`)

  if (scoreDelta <= -SCORE_DROP_THRESHOLD) {
    sellRecommended = true
    sellReason = 'score_drop'
    sellReasonText = `A avaliação geral caiu ${Math.abs(scoreDelta)} apontar（limite ${SCORE_DROP_THRESHOLD}），Recomendado para vender`
    reasoning.push(`A pontuação base caiu significativamente：${buyCompositeScore} -> ${currentCompositeScore}`)
  }

  if (expertConsensus < 0.4 && technicalBreakdown) {
    sellRecommended = true
    sellReason = 'expert_bearish'
    sellReasonText = `O consenso dos especialistas torna-se negativo（${round(expertConsensus, 4)}）E a tecnologia está quebrada（Pontos técnicos ${technical.total}），Recomendado para vender`
    reasoning.push(`Consenso de especialistas ${round(expertConsensus, 4)} < 0.4，e o preço cai abaixo MA20+MA60`)
  }

  return {
    positionId: position.id,
    code: position.code,
    name: position.name,
    currentExpertScore: expert.score,
    currentTechnicalScore: technical.total,
    currentQuantScore: quant.total,
    currentCompositeScore,
    currentFinalScore,
    buyCompositeScore,
    buyFinalScore,
    scoreDelta,
    expertConsensus,
    technicalBreakdown,
    sellRecommended,
    sellReason,
    sellReasonText,
    reasoning,
  }
}

function buildSwapSuggestions(
  evaluations: StockAnalysisPositionEvaluation[],
  signals: StockAnalysisSignal[],
  maxPositions: number,
  currentPositionCount: number,
): StockAnalysisSwapSuggestion[] {
  if (currentPositionCount < maxPositions) {
    return []
  }

  const buySignals = signals.filter((signal) => signal.action === 'strong_buy' || signal.action === 'buy')
  if (buySignals.length === 0) {
    return []
  }

  const weakestEval = evaluations
    .slice()
    .sort((left, right) => left.currentCompositeScore - right.currentCompositeScore)[0]
  if (!weakestEval) {
    return []
  }

  const suggestions: StockAnalysisSwapSuggestion[] = []
  for (const signal of buySignals) {
    if (signal.finalScore > weakestEval.currentCompositeScore + SWAP_SCORE_ADVANTAGE) {
      suggestions.push({
        sellPositionId: weakestEval.positionId,
        sellCode: weakestEval.code,
        sellName: weakestEval.name,
        sellCurrentScore: weakestEval.currentCompositeScore,
        buySignalId: signal.id,
        buyCode: signal.code,
        buyName: signal.name,
        buyFinalScore: signal.finalScore,
        scoreDifference: round(signal.finalScore - weakestEval.currentCompositeScore),
        reasoning: `novo alvo ${signal.name}(${signal.finalScore}apontar) do que a posição mais fraca ${weakestEval.name}(${weakestEval.currentCompositeScore}apontar) mais alto ${round(signal.finalScore - weakestEval.currentCompositeScore)} apontar，Excedeu o limite de troca ${SWAP_SCORE_ADVANTAGE}`,
      })
    }
  }

  return suggestions.sort((left, right) => right.scoreDifference - left.scoreDifference).slice(0, 3)
}

async function evaluateWatchLogOutcomes(stockAnalysisDir: string, watchLogs: StockAnalysisWatchLogEntry[]): Promise<StockAnalysisWatchLogEntry[]> {
  if (watchLogs.length === 0) {
    return watchLogs
  }

  const codeSet = new Set(watchLogs.filter((item) => item.topCandidateCode).map((item) => item.topCandidateCode as string))
  const histories = await Promise.all([...codeSet].map(async (code) => {
    try {
      const envelope = await getStockHistoryData(stockAnalysisDir, code)
      return { code, data: envelope.data }
    } catch {
      return { code, data: [] as StockAnalysisKlinePoint[] }
    }
  }))
  const historyMap = new Map(histories.map((item) => [item.code, item.data]))

  return watchLogs.map((item) => {
    if (!item.topCandidateCode) {
      return {
        ...item,
        tPlus1Return: null,
        tPlus5Return: null,
        outcome: (item.outcome ?? 'pending') as StockAnalysisWatchLogEntry['outcome'],
        evaluatedAt: item.evaluatedAt ?? null,
      }
    }

    const history = historyMap.get(item.topCandidateCode)
    if (!history || history.length === 0) {
      return { ...item, tPlus1Return: null, tPlus5Return: null, outcome: 'pending' as const, evaluatedAt: null }
    }

    const baseIndex = history.findIndex((point) => point.date >= item.tradeDate)
    if (baseIndex < 0) {
      return { ...item, tPlus1Return: null, tPlus5Return: null, outcome: 'pending' as const, evaluatedAt: null }
    }

    const baseClose = history[baseIndex]?.close ?? 0
    const t1Close = history[baseIndex + 1]?.close
    const t5Close = history[baseIndex + 5]?.close
    const tPlus1Return = typeof t1Close === 'number' && baseClose > 0 ? round(safeDivide(t1Close - baseClose, baseClose) * 100) : null
    const tPlus5Return = typeof t5Close === 'number' && baseClose > 0 ? round(safeDivide(t5Close - baseClose, baseClose) * 100) : null
    // [P2-16] tPlus5Return === 0 considerado neutro（Nem subindo nem caindo），Não conta correct
    // correct = preço das ações cai（Esperar e observar evita perdas），wrong = O preço das ações sobe（ganhos perdidos）
    const outcome: StockAnalysisWatchLogEntry['outcome'] = typeof tPlus5Return === 'number'
      ? (tPlus5Return < 0 ? 'correct' : tPlus5Return > 0 ? 'wrong' : 'pending')
      : 'pending'

    return {
      ...item,
      tPlus1Return,
      tPlus5Return,
      outcome,
      evaluatedAt: outcome === 'pending' ? null : nowIso(),
    }
  })
}

function buildWeeklySummary(trades: StockAnalysisTradeRecord[], watchLogs: StockAnalysisWatchLogEntry[]) {
  const weekMap = new Map<string, StockAnalysisWeeklySummary>()
  for (const trade of trades) {
    const weekLabel = getWeekLabel(new Date(trade.tradeDate))
    const current = weekMap.get(weekLabel) ?? { weekLabel, tradeCount: 0, watchDays: 0, winRate: 0, averageProfitLossRatio: 0, weeklyReturn: 0, cumulativeReturn: 0, maxDrawdown: 0 }
    current.tradeCount += 1
    if (typeof trade.pnlPercent === 'number') current.weeklyReturn = round(current.weeklyReturn + trade.pnlPercent)
    weekMap.set(weekLabel, current)
  }

  const weekTrades = new Map<string, StockAnalysisTradeRecord[]>()
  for (const trade of trades) {
    const weekLabel = getWeekLabel(new Date(trade.tradeDate))
    const list = weekTrades.get(weekLabel) ?? []
    list.push(trade)
    weekTrades.set(weekLabel, list)
  }

  for (const watchLog of watchLogs) {
    const weekLabel = getWeekLabel(new Date(watchLog.tradeDate))
    const current = weekMap.get(weekLabel) ?? { weekLabel, tradeCount: 0, watchDays: 0, winRate: 0, averageProfitLossRatio: 0, weeklyReturn: 0, cumulativeReturn: 0, maxDrawdown: 0 }
    current.watchDays += 1
    weekMap.set(weekLabel, current)
  }

  for (const [weekLabel, summary] of weekMap) {
    const tradesInWeek = weekTrades.get(weekLabel) ?? []
    summary.averageProfitLossRatio = calculateProfitLossRatio(tradesInWeek)
    summary.maxDrawdown = calculateMaxDrawdownFromTrades(tradesInWeek)
    // B1: Cálculo complementar da taxa de ganho semanal
    const sellsInWeek = tradesInWeek.filter((t) => t.action === 'sell' && typeof t.pnlPercent === 'number')
    const winsInWeek = sellsInWeek.filter((t) => (t.pnlPercent ?? 0) > 0).length
    summary.winRate = sellsInWeek.length > 0 ? round(winsInWeek / sellsInWeek.length, 4) : 0
  }

  // B2: Acumule em ordem cronológica cumulativeReturn（Soma simples）
  const sorted = [...weekMap.values()].sort((left, right) => left.weekLabel.localeCompare(right.weekLabel))
  let cumulative = 0
  for (const week of sorted) {
    cumulative = round(cumulative + week.weeklyReturn)
    week.cumulativeReturn = cumulative
  }

  return sorted.sort((left, right) => right.weekLabel.localeCompare(left.weekLabel)).slice(0, 8)
}

function buildMonthlySummary(trades: StockAnalysisTradeRecord[], watchLogs: StockAnalysisWatchLogEntry[]): StockAnalysisMonthlySummary[] {
  const monthMap = new Map<string, StockAnalysisMonthlySummary>()
  for (const trade of trades) {
    const monthLabel = getMonthLabel(new Date(trade.tradeDate))
    const current = monthMap.get(monthLabel) ?? {
      monthLabel,
      tradeCount: 0,
      watchDays: 0,
      winRate: 0,
      monthlyReturn: 0,
      cumulativeReturn: 0,
      maxDrawdown: 0,
    }
    current.tradeCount += 1
    if (typeof trade.pnlPercent === 'number') {
      current.monthlyReturn = round(current.monthlyReturn + trade.pnlPercent)
      current.cumulativeReturn = round(current.cumulativeReturn + trade.pnlPercent)
    }
    monthMap.set(monthLabel, current)
  }
  for (const watch of watchLogs) {
    const monthLabel = getMonthLabel(new Date(watch.tradeDate))
    const current = monthMap.get(monthLabel) ?? {
      monthLabel,
      tradeCount: 0,
      watchDays: 0,
      winRate: 0,
      monthlyReturn: 0,
      cumulativeReturn: 0,
      maxDrawdown: 0,
    }
    current.watchDays += 1
    monthMap.set(monthLabel, current)
  }

  // B4+B5: Calculado por mês winRate e maxDrawdown
  const monthTrades = new Map<string, StockAnalysisTradeRecord[]>()
  for (const trade of trades) {
    const monthLabel = getMonthLabel(new Date(trade.tradeDate))
    const list = monthTrades.get(monthLabel) ?? []
    list.push(trade)
    monthTrades.set(monthLabel, list)
  }
  for (const [monthLabel, summary] of monthMap) {
    const tradesInMonth = monthTrades.get(monthLabel) ?? []
    const sellsInMonth = tradesInMonth.filter((t) => t.action === 'sell' && typeof t.pnlPercent === 'number')
    const winsInMonth = sellsInMonth.filter((t) => (t.pnlPercent ?? 0) > 0).length
    summary.winRate = sellsInMonth.length > 0 ? round(winsInMonth / sellsInMonth.length, 4) : 0
    summary.maxDrawdown = calculateMaxDrawdownFromTrades(tradesInMonth)
  }

  const sorted = [...monthMap.values()].sort((left, right) => right.monthLabel.localeCompare(left.monthLabel))
  let cumulative = 0
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    cumulative = round(cumulative + sorted[index].monthlyReturn)
    sorted[index].cumulativeReturn = cumulative
  }

  return sorted.slice(0, 6)
}

function buildOverrideStats(trades: StockAnalysisTradeRecord[]): StockAnalysisOverrideStats {
  const closedTrades = trades.filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number')
  // encontrar tudo override Fechar posição：O registro de compra correspondente ao registro de venda é user_override
  // porque sell O registro em si não sourceDecision，preciso passar relatedPositionId associação buy Registro
  const buyTradesByPosition = new Map<string, StockAnalysisTradeRecord>()
  for (const trade of trades) {
    if (trade.action === 'buy' && trade.relatedPositionId) {
      buyTradesByPosition.set(trade.relatedPositionId, trade)
    }
  }

  const overrideSells: StockAnalysisTradeRecord[] = []
  const systemSells: StockAnalysisTradeRecord[] = []
  for (const sell of closedTrades) {
    const buyTrade = sell.relatedPositionId ? buyTradesByPosition.get(sell.relatedPositionId) : null
    if (buyTrade?.sourceDecision === 'user_override') {
      overrideSells.push(sell)
    } else if (buyTrade?.sourceDecision === 'user_confirmed') {
      systemSells.push(sell)
    }
  }

  const overrideReturns = overrideSells.map((trade) => trade.pnlPercent ?? 0)
  const systemReturns = systemSells.map((trade) => trade.pnlPercent ?? 0)

  return {
    totalCount: overrideSells.length,
    winCount: overrideReturns.filter((ret) => ret > 0).length,
    winRate: round(safeDivide(overrideReturns.filter((ret) => ret > 0).length, overrideSells.length), 4),
    averageReturn: round(average(overrideReturns), 2),
    systemWinRate: round(safeDivide(systemReturns.filter((ret) => ret > 0).length, systemSells.length), 4),
    systemAverageReturn: round(average(systemReturns), 2),
  }
}

function buildPerformanceDashboard(signals: StockAnalysisSignal[], watchLogs: StockAnalysisWatchLogEntry[], trades: StockAnalysisTradeRecord[], modelGroups: StockAnalysisModelGroupPerformance[], marketState: StockAnalysisMarketState): StockAnalysisPerformanceDashboard {
  const passCount = signals.filter((signal) => signal.action === 'buy' || signal.action === 'strong_buy').length
  const convictionPassRate = round(safeDivide(passCount, signals.length), 4)
  const evaluatedWatchLogs = watchLogs.filter((item) => item.outcome !== 'pending')
  const watchCorrectCount = evaluatedWatchLogs.filter((item) => item.outcome === 'correct').length
  const watchAccuracy = round(safeDivide(watchCorrectCount, evaluatedWatchLogs.length), 4)
  const sharpeLike = (() => {
    const returns = trades.filter((trade) => trade.action === 'sell' && typeof trade.pnlPercent === 'number').map((trade) => trade.pnlPercent ?? 0)
    if (returns.length <= 1) return 0
    const avg = average(returns)
    const variance = average(returns.map((value) => (value - avg) ** 2))
    return variance === 0 ? 0 : round(avg / Math.sqrt(variance), 3)
  })()
  const sortedGroups = [...modelGroups].sort((left, right) => right.winRate - left.winRate)
  const bestModelGroup = sortedGroups[0]?.group ?? null
  const worstModelGroup = sortedGroups.at(-1)?.group ?? null
  const alerts: string[] = []
  const tuningSuggestions: string[] = []

  if (convictionPassRate < 0.1) {
    alerts.push('Conviction Filter A taxa de aprovação é baixa，A estratégia recente é demasiado conservadora')
    tuningSuggestions.push('Considere reduzir o limite abrangente 1-2 e continue a observar por uma semana')
  }
  if (convictionPassRate > 0.3) {
    alerts.push('Conviction Filter A taxa de aprovação é alta，Tenha cuidado com o declínio da qualidade do sinal')
    tuningSuggestions.push('Recomenda-se aumentar o limiar abrangente 2-3 apontar，Evite negociações excessivas')
  }
  if (watchAccuracy > 0 && watchAccuracy < 0.6) {
    alerts.push('Espere e veja que a precisão é baixa，Necessidade de revisar a lógica de julgamento de esperar para ver')
    tuningSuggestions.push('Revisão prioritária do consenso de especialistas e definição de limites mínimos de pontuações técnicas')
  }
  if (worstModelGroup) {
    const group = modelGroups.find((item) => item.group === worstModelGroup)
    if (group && group.winRate < 0.45) {
      alerts.push(`${worstModelGroup} O desempenho recente do grupo tem sido fraco`)
      tuningSuggestions.push(`É recomendado ${worstModelGroup} peso do grupo de ${group.weight.toFixed(2)} rebaixado para ${Math.max(0.5, group.weight - 0.2).toFixed(2)}`)
    }
  }
  if (marketState.trend === 'bear_trend') {
    tuningSuggestions.push('Tendência atual de baixa，Recomenda-se aumentar o limite para pontuações abrangentes e consenso de especialistas')
  }

  const overrideStats = buildOverrideStats(trades)
  if (overrideStats.totalCount >= 3 && overrideStats.winRate > 0.6) {
    alerts.push(`Julgamento subjetivo do usuário sobre a taxa de vitórias ${Math.round(overrideStats.winRate * 100)}%（${overrideStats.winCount}/${overrideStats.totalCount}），Supere o sistema`)
    tuningSuggestions.push('usuário override Excelente história，A lógica de relaxamento de sinal foi incluída automaticamente')
  }

  return {
    convictionPassRate,
    watchAccuracy,
    sharpeLike,
    bestModelGroup,
    worstModelGroup,
    overrideStats,
    alerts: dedupeStrings(alerts),
    tuningSuggestions: dedupeStrings(tuningSuggestions),
  }
}

function hasModelGroupPerformanceSamples(expertPerformance?: StockAnalysisExpertPerformanceData | null) {
  return Boolean(expertPerformance && expertPerformance.entries.length > 0)
}

async function resolveModelGroupPerformance(
  stockAnalysisDir: string,
  _storedModelGroups: StockAnalysisModelGroupPerformance[],
  expertPerformance?: StockAnalysisExpertPerformanceData | null,
): Promise<StockAnalysisModelGroupPerformance[]> {
  // expert-performance Depois de ser redefinido，velho model-groups Caches não são mais confiáveis，Deve esperar que novas amostras sejam regeneradas。
  if (!hasModelGroupPerformanceSamples(expertPerformance)) {
    return []
  }
  // model-groups é uma estatística derivada，O cache persistente não é confiável；Caso contrário, troca de modelo/Depois que o histórico for preenchido, a taxa de ganhos antiga continuará a ser exibida.。
  return buildModelGroupPerformance(stockAnalysisDir, expertPerformance)
}

// ==================== S2+S3: Relatório semanal automático/Geração de relatório mensal ====================

/**
 * Gere relatórios semanais：Reutilizar buildWeeklySummary + buildPerformanceDashboard，
 * Saída estruturada AutoReportNotification e persistir
 */
export async function generateWeeklyReport(stockAnalysisDir: string): Promise<AutoReportNotification> {
  const [trades, watchLogs, signals, modelGroups, expertPerformance, config] = await Promise.all([
    readStockAnalysisTrades(stockAnalysisDir),
    readStockAnalysisWatchLogs(stockAnalysisDir),
    (async () => {
      const snapshot = await readLatestSnapshot(stockAnalysisDir)
      return snapshot?.signals ?? []
    })(),
    readStockAnalysisModelGroups(stockAnalysisDir),
    readStockAnalysisExpertPerformance(stockAnalysisDir),
    readStockAnalysisConfig(stockAnalysisDir),
  ])

  const weeklySummary = buildWeeklySummary(trades, watchLogs)
  await saveStockAnalysisWeeklySummary(stockAnalysisDir, weeklySummary)

  const modelGroupPerformance = await resolveModelGroupPerformance(stockAnalysisDir, modelGroups, expertPerformance)
  const fallbackDate = todayDate()
  const marketState = (await readStockAnalysisMarketState(stockAnalysisDir, fallbackDate)) ?? buildFallbackMarketState(fallbackDate)
  const dashboard = buildPerformanceDashboard(signals, watchLogs, trades, modelGroupPerformance, marketState)
  await saveStockAnalysisPerformanceDashboard(stockAnalysisDir, dashboard)

  const latestWeek = weeklySummary[0]
  const now = nowIso()
  const weekLabel = latestWeek?.weekLabel ?? getWeekLabel(new Date())
  const performance = calculatePerformance(trades)

  // Construa um resumo narrativo
  const summaryParts: string[] = []
  summaryParts.push(`essa semana(${weekLabel})troca ${latestWeek?.tradeCount ?? 0} Caneta，espere e veja ${latestWeek?.watchDays ?? 0} céu`)
  summaryParts.push(`renda semanal ${latestWeek?.weeklyReturn?.toFixed(2) ?? '0.00'}%，Renda acumulada ${performance.cumulativeReturn.toFixed(2)}%`)
  summaryParts.push(`Taxa geral de vitórias ${(performance.winRate * 100).toFixed(1)}%，Sharpeby ${dashboard.sharpeLike.toFixed(2)}`)
  if (dashboard.bestModelGroup) summaryParts.push(`melhor grupo de modelos: ${dashboard.bestModelGroup}`)
  if (dashboard.alerts.length > 0) summaryParts.push(`aviso prévio: ${dashboard.alerts.join('; ')}`)
  if (dashboard.tuningSuggestions.length > 0) summaryParts.push(`sugestão: ${dashboard.tuningSuggestions.join('; ')}`)

  const notification: AutoReportNotification = {
    id: `weekly-${weekLabel}-${Date.now()}`,
    type: 'weekly_report',
    generatedAt: now,
    periodLabel: weekLabel,
    title: `relatório semanal ${weekLabel}`,
    summary: summaryParts.join('。'),
    acknowledged: false,
  }

  const existing = await readAutoReportNotifications(stockAnalysisDir)
  existing.unshift(notification)
  await saveAutoReportNotifications(stockAnalysisDir, existing)

  logger.info(`[stock-analysis] Relatório semanal gerado: ${weekLabel}`)
  return notification
}

/**
 * Gere sugestões de ajuste de parâmetros com base no mecanismo de regras — corresponder v2.0 Documento de projeto nº. 6.3 regras da seção
 */
function generateTuningSuggestions(
  trades: StockAnalysisTradeRecord[],
  watchLogs: StockAnalysisWatchLogEntry[],
  modelGroups: StockAnalysisModelGroupPerformance[],
  config: StockAnalysisStrategyConfig,
  dashboard: StockAnalysisPerformanceDashboard,
): TuningSuggestion[] {
  const suggestions: TuningSuggestion[] = []
  const performance = calculatePerformance(trades)

  // regra1: taxa de vitórias < 45% → melhorar Conviction Filter limite (+3-5 apontar)
  if (performance.winRate < 0.45 && trades.length >= 5) {
    const currentThreshold = config.marketThresholds.normal_range.minCompositeScore
    suggestions.push({
      parameter: 'minCompositeScore (normal_range)',
      currentValue: currentThreshold,
      suggestedValue: currentThreshold + 3,
      reason: `taxa de vitórias ${(performance.winRate * 100).toFixed(1)}% inferior a 45% Alvo，Recomenda-se aumentar o limiar abrangente`,
      confidence: performance.winRate < 0.35 ? 'high' : 'medium',
    })
  }

  // regra2: taxa de vitórias > 65% Mas a renda semanal é baixa → Relaxe o limiar (pode ser muito conservador)
  if (performance.winRate > 0.65 && performance.cumulativeReturn < 2 && trades.length >= 5) {
    const currentThreshold = config.marketThresholds.normal_range.minCompositeScore
    suggestions.push({
      parameter: 'minCompositeScore (normal_range)',
      currentValue: currentThreshold,
      suggestedValue: Math.max(65, currentThreshold - 2),
      reason: `taxa de vitórias ${(performance.winRate * 100).toFixed(1)}% Maior, mas a renda acumulada é apenas ${performance.cumulativeReturn.toFixed(2)}%，A estratégia pode ser muito conservadora`,
      confidence: 'medium',
    })
  }

  // regra3: Um determinado grupo modelo continua a ter problemas → Reduza o peso para 0.5-0.7
  for (const group of modelGroups) {
    if (group.predictionCount >= 10 && group.winRate < 0.38 && group.weight > 0.7) {
      suggestions.push({
        parameter: `${group.group}_expert_weight`,
        currentValue: group.weight,
        suggestedValue: Math.max(0.5, group.weight - 0.2),
        reason: `${group.group} A taxa de vitórias do grupo é apenas ${(group.winRate * 100).toFixed(1)}%（${group.predictionCount} previsões），Continuamente abaixo do limite`,
        confidence: group.winRate < 0.30 ? 'high' : 'medium',
      })
    }
  }

  // regra4: Demasiada espera e observação (>80% dias) → Relaxe moderadamente o limiar (-2 apontar)
  const totalDays = trades.length + watchLogs.length
  const watchRatio = totalDays > 0 ? watchLogs.length / totalDays : 0
  if (watchRatio > 0.8 && totalDays >= 10) {
    const currentThreshold = config.marketThresholds.normal_range.minCompositeScore
    suggestions.push({
      parameter: 'minCompositeScore (all regimes)',
      currentValue: currentThreshold,
      suggestedValue: Math.max(65, currentThreshold - 2),
      reason: `proporção de esperar para ver ${(watchRatio * 100).toFixed(1)}% muito alto（>80%），O sistema é muito conservador`,
      confidence: 'medium',
    })
  }

  // regra5: Muito pouco, espere e veja (<30% dias) → Aperte o limite (+3 apontar)
  if (watchRatio < 0.3 && totalDays >= 10) {
    const currentThreshold = config.marketThresholds.normal_range.minCompositeScore
    suggestions.push({
      parameter: 'minCompositeScore (all regimes)',
      currentValue: currentThreshold,
      suggestedValue: currentThreshold + 3,
      reason: `proporção de esperar para ver ${(watchRatio * 100).toFixed(1)}% No lado baixo（<30%），O sinal pode estar muito fraco`,
      confidence: 'medium',
    })
  }

  // regra6: Stop loss acionado com frequência → Ajuste o nível de stop loss de -3% chegar -4%
  const stopLossTrades = trades.filter((t) => t.action === 'sell' && t.note?.includes('parar a perda'))
  if (stopLossTrades.length >= 3 && trades.length >= 5) {
    const stopLossRatio = stopLossTrades.length / trades.filter((t) => t.action === 'sell').length
    if (stopLossRatio > 0.4) {
      suggestions.push({
        parameter: 'stopLossPercent',
        currentValue: config.stopLossPercent,
        suggestedValue: Math.min(5, config.stopLossPercent + 1),
        reason: `Proporção de gatilho de stop loss ${(stopLossRatio * 100).toFixed(1)}% muito alto，Recomenda-se relaxar adequadamente o nível de stop loss`,
        confidence: stopLossRatio > 0.6 ? 'high' : 'medium',
      })
    }
  }

  // regra7: Conviction Filter Taxa de aprovação anormal
  if (dashboard.convictionPassRate < 0.1) {
    const currentThreshold = config.marketThresholds.normal_range.minCompositeScore
    suggestions.push({
      parameter: 'minCompositeScore (all regimes)',
      currentValue: currentThreshold,
      suggestedValue: Math.max(65, currentThreshold - 3),
      reason: `Conviction Filter A taxa de aprovação é apenas ${(dashboard.convictionPassRate * 100).toFixed(1)}%，muito conservador`,
      confidence: 'medium',
    })
  }

  return suggestions
}

/**
 * Gere relatórios mensais：Reutilizar buildMonthlySummary，Gerar sugestões de ajuste，
 * saída MonthlyReport + AutoReportNotification e persistir
 */
export async function generateMonthlyReport(stockAnalysisDir: string): Promise<AutoReportNotification> {
  const [trades, watchLogs, signals, modelGroups, expertPerformance, config] = await Promise.all([
    readStockAnalysisTrades(stockAnalysisDir),
    readStockAnalysisWatchLogs(stockAnalysisDir),
    (async () => {
      const snapshot = await readLatestSnapshot(stockAnalysisDir)
      return snapshot?.signals ?? []
    })(),
    readStockAnalysisModelGroups(stockAnalysisDir),
    readStockAnalysisExpertPerformance(stockAnalysisDir),
    readStockAnalysisConfig(stockAnalysisDir),
  ])

  const monthlySummary = buildMonthlySummary(trades, watchLogs)
  await saveStockAnalysisMonthlySummary(stockAnalysisDir, monthlySummary)

  const modelGroupPerformance = await resolveModelGroupPerformance(stockAnalysisDir, modelGroups, expertPerformance)
  const fallbackDate = todayDate()
  const marketState = (await readStockAnalysisMarketState(stockAnalysisDir, fallbackDate)) ?? buildFallbackMarketState(fallbackDate)
  const dashboard = buildPerformanceDashboard(signals, watchLogs, trades, modelGroupPerformance, marketState)
  await saveStockAnalysisPerformanceDashboard(stockAnalysisDir, dashboard)

  const latestMonth = monthlySummary[0]
  const now = nowIso()
  const monthLabel = latestMonth?.monthLabel ?? getMonthLabel(new Date())
  const performance = calculatePerformance(trades)

  // Gerar sugestões de ajuste
  const tuningSuggestions = generateTuningSuggestions(trades, watchLogs, modelGroupPerformance, config, dashboard)

  // Crie relatórios mensais
  const monthlyReport: MonthlyReport = {
    id: `monthly-${monthLabel}-${Date.now()}`,
    monthLabel,
    generatedAt: now,
    metrics: latestMonth ?? {
      monthLabel,
      tradeCount: 0,
      watchDays: 0,
      winRate: performance.winRate,
      monthlyReturn: 0,
      cumulativeReturn: performance.cumulativeReturn,
      maxDrawdown: 0,
    },
    tuningSuggestions,
    narrativeSummary: buildMonthlyNarrative(monthLabel, latestMonth, performance, dashboard, tuningSuggestions, modelGroupPerformance),
  }

  // Relatório Mensal de Persistência
  const existingReports = await readMonthlyReports(stockAnalysisDir)
  existingReports.unshift(monthlyReport)
  await saveMonthlyReports(stockAnalysisDir, existingReports)

  // Notificação de compilação
  const summaryParts: string[] = []
  summaryParts.push(`${monthLabel} relatório mensal`)
  summaryParts.push(`troca ${latestMonth?.tradeCount ?? 0} Caneta，renda mensal ${latestMonth?.monthlyReturn?.toFixed(2) ?? '0.00'}%`)
  summaryParts.push(`Renda acumulada ${performance.cumulativeReturn.toFixed(2)}%，taxa de vitórias ${(performance.winRate * 100).toFixed(1)}%`)
  if (tuningSuggestions.length > 0) {
    summaryParts.push(`gerar ${tuningSuggestions.length} Sugestões de ajuste`)
  }

  const notification: AutoReportNotification = {
    id: `monthly-${monthLabel}-${Date.now()}`,
    type: 'monthly_report',
    generatedAt: now,
    periodLabel: monthLabel,
    title: `relatório mensal ${monthLabel}`,
    summary: summaryParts.join('。'),
    acknowledged: false,
  }

  const existingNotifications = await readAutoReportNotifications(stockAnalysisDir)
  existingNotifications.unshift(notification)
  await saveAutoReportNotifications(stockAnalysisDir, existingNotifications)

  // [H4] Atualize a memória de longo prazo após a geração de relatórios mensais（Agregação da memória de médio prazo）
  const aiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
  await runLongTermMemoryUpdate(stockAnalysisDir, aiConfig)

  logger.info(`[stock-analysis] Relatório mensal gerado: ${monthLabel}，Contém ${tuningSuggestions.length} Sugestões de ajuste`)
  return notification
}

/**
 * Construa resumos narrativos mensais
 */
function buildMonthlyNarrative(
  monthLabel: string,
  latestMonth: StockAnalysisMonthlySummary | undefined,
  performance: ReturnType<typeof calculatePerformance>,
  dashboard: StockAnalysisPerformanceDashboard,
  tuningSuggestions: TuningSuggestion[],
  modelGroups: StockAnalysisModelGroupPerformance[],
): string {
  const parts: string[] = []
  parts.push(`## ${monthLabel} resumo mensal`)
  parts.push('')
  parts.push(`### Visão geral do desempenho`)
  parts.push(`- Ofertas do mês: ${latestMonth?.tradeCount ?? 0} Caneta`)
  parts.push(`- Espere e veja este mês: ${latestMonth?.watchDays ?? 0} céu`)
  parts.push(`- renda mensal: ${latestMonth?.monthlyReturn?.toFixed(2) ?? '0.00'}%`)
  parts.push(`- Renda acumulada: ${performance.cumulativeReturn.toFixed(2)}%`)
  parts.push(`- Taxa geral de vitórias: ${(performance.winRate * 100).toFixed(1)}%`)
  parts.push(`- rebaixamento máximo: ${latestMonth?.maxDrawdown?.toFixed(2) ?? '0.00'}%`)
  parts.push(`- Sharpeby: ${dashboard.sharpeLike.toFixed(2)}`)
  parts.push(`- Conviction taxa de aprovação: ${(dashboard.convictionPassRate * 100).toFixed(1)}%`)
  parts.push(`- Espere e veja a precisão: ${(dashboard.watchAccuracy * 100).toFixed(1)}%`)

  if (modelGroups.length > 0) {
    parts.push('')
    parts.push(`### Desempenho do grupo modelo`)
    for (const group of modelGroups) {
      const simTag = group.isSimulated ? ' (simulação)' : ''
      parts.push(`- ${group.group}${simTag}: taxa de vitórias ${(group.winRate * 100).toFixed(1)}%, prever ${group.predictionCount} Segunda categoria, peso ${group.weight.toFixed(2)}`)
    }
  }

  if (tuningSuggestions.length > 0) {
    parts.push('')
    parts.push(`### Sugestões de ajuste`)
    for (const suggestion of tuningSuggestions) {
      parts.push(`- **${suggestion.parameter}**: ${suggestion.currentValue} → ${suggestion.suggestedValue} (${suggestion.confidence} Confiança)`)
      parts.push(`  razão: ${suggestion.reason}`)
    }
  }

  if (dashboard.alerts.length > 0) {
    parts.push('')
    parts.push(`### aviso prévio`)
    for (const alert of dashboard.alerts) {
      parts.push(`- ${alert}`)
    }
  }

  return parts.join('\n')
}

async function buildModelGroupPerformance(stockAnalysisDir: string, expertPerformance?: StockAnalysisExpertPerformanceData | null): Promise<StockAnalysisModelGroupPerformance[]> {
  // Leia todos os arquivos históricos de sinais，Agregar tudo votes
  const dates = await getAvailableSignalDates(stockAnalysisDir)
  const allSignals: StockAnalysisSignal[] = []
  for (const date of dates) {
    const signals = await readStockAnalysisSignals(stockAnalysisDir, date)
    allSignals.push(...signals)
  }

  const allVotes = allSignals.flatMap((s) => s.expert?.votes ?? [])
  const hasRealVotes = allVotes.length > 0 && allSignals.some((s) => !s.expert?.isSimulated)

  if (!hasRealVotes) {
    const baseConfidence = allSignals.length === 0 ? 0.6 : average(allSignals.map((signal) => signal.confidence))
    return [
      { group: 'rules', predictionCount: allSignals.length, winRate: 0, averageConfidence: round(baseConfidence), calibration: 0, weight: 1, isSimulated: true },
    ]
  }

  // de AI Ler da configuração modelId → provider mapeamento，para dados antigos provider preenchimento
  const aiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
  const modelProviderMap = new Map<string, { providerIds: string[]; providerNames: string[] }>()
  if (aiConfig) {
    for (const provider of aiConfig.providers) {
      if (!provider.enabled) continue
      for (const modelId of provider.models) {
        const normalized = normalizeModelId(modelId)
        const existing = modelProviderMap.get(normalized) ?? { providerIds: [], providerNames: [] }
        if (!existing.providerIds.includes(provider.id)) {
          existing.providerIds.push(provider.id)
          existing.providerNames.push(provider.name)
        }
        modelProviderMap.set(normalized, existing)
      }
    }
  }

  // padronização modelId（Mesclar diferenças de maiúsculas e minúsculas e nomes legados）
  function normalizeModelId(id: string): string {
    const lower = id.toLowerCase()
    if (lower === 'qwen3.5-plus') return 'qwen3.6-plus'
    return lower
  }

  // Inferir o antigo da configuração vote informações do fornecedor
  function inferProvider(modelId: string): { providerId: string; providerName: string } {
    const mapping = modelProviderMap.get(modelId)
    if (!mapping || mapping.providerIds.length === 0) return { providerId: '', providerName: '' }
    if (mapping.providerIds.length === 1) return { providerId: mapping.providerIds[0], providerName: mapping.providerNames[0] }
    // Não é possível determinar quando há vários fornecedores，Sem emenda，pressione puro modelId Grupo
    return { providerId: '', providerName: '' }
  }

  function buildModelGroupKey(input: {
    modelId?: string
    providerId?: string
    providerName?: string
  }): { groupKey: string; modelId: string; providerId: string; providerName: string; displayName: string } {
    if (input.modelId === 'rule-engine') {
      return { groupKey: 'rules', modelId: 'rule-engine', providerId: '', providerName: '', displayName: 'mecanismo de regras' }
    }
    const modelId = normalizeModelId(input.modelId || 'unknown')
    let providerId = input.providerId || ''
    let providerName = input.providerName || ''

    // Dados antigos não têm provider hora，Inferido da configuração
    if (!providerId && !providerName) {
      const inferred = inferProvider(modelId)
      providerId = inferred.providerId
      providerName = inferred.providerName
    }

    const groupKey = providerId ? `${providerId}/${modelId}` : modelId
    const displayName = providerName ? `${modelId} (${providerName})` : modelId
    return { groupKey, modelId, providerId, providerName, displayName }
  }

  // Criar chave de agrupamento：providerId/modelId ou apenas modelId（Sem dados antigos provider hora）
  function getGroupKey(vote: StockAnalysisExpertVote): { groupKey: string; modelId: string; providerId: string; providerName: string; displayName: string } {
    return buildModelGroupKey(vote)
  }

  // de acordo com provider/model Estatísticas do grupo
  interface GroupStats {
    predictions: number
    totalConfidence: number
    bullishCount: number
    bearishCount: number
    neutralCount: number
    fallbacks: number
    modelId: string
    providerId: string
    providerName: string
    displayName: string
    expertIds: Set<string>
  }
  const groupMap = new Map<string, GroupStats>()

  for (const vote of allVotes) {
    const { groupKey, modelId, providerId, providerName, displayName } = getGroupKey(vote)
    const existing = groupMap.get(groupKey) ?? {
      predictions: 0, totalConfidence: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, fallbacks: 0,
      modelId, providerId, providerName, displayName, expertIds: new Set<string>(),
    }
    existing.predictions += 1
    existing.totalConfidence += vote.confidence
    if (vote.verdict === 'bullish') existing.bullishCount += 1
    else if (vote.verdict === 'bearish') existing.bearishCount += 1
    else existing.neutralCount += 1
    if (vote.usedFallback) existing.fallbacks += 1
    existing.expertIds.add(vote.expertId)
    groupMap.set(groupKey, existing)
  }

  // de expert performance de acordo com provider/model realidade agregada winRate、calibration、weight。
  // Novos calibres serão usados ​​primeiro recentOutcome real registrado em provider/model，Garanta a troca de modelo、fallback、Todos os especialistas em regras podem atribuir ao modelo de votação real。
  // velho outcome Quando não há campos de modelo，Voltar novamente expertId -> história vote groupKeys mapeamento。
  // estabelecer expertId → groupKeys mapeamento（um expert Pode ser usado por vários modelos，As taxas de ganho precisam ser atribuídas a todos os grupos de modelos relevantes）
  const expertGroupsMap = new Map<string, Set<string>>()
  for (const vote of allVotes) {
    const { groupKey } = getGroupKey(vote)
    const existing = expertGroupsMap.get(vote.expertId)
    if (existing) {
      existing.add(groupKey)
    } else {
      expertGroupsMap.set(vote.expertId, new Set([groupKey]))
    }
  }

  const modelGroupWinRates = new Map<string, { totalCorrect: number; totalPredictions: number; totalConfidence: number; totalWeight: number; weightSamples: number; expertIds: Set<string> }>()
  const expertWeightMap = new Map((expertPerformance?.entries ?? []).map((entry) => [entry.expertId, entry.weight]))
  let settledDailyMemoryCount = 0

  for (const date of dates) {
    const dailyMemories = await readExpertDailyMemories(stockAnalysisDir, date)
    for (const memoryEntry of dailyMemories) {
      if (!memoryEntry.modelId || memoryEntry.actualReturnNextDay === null || memoryEntry.wasCorrect === null) continue
      const { groupKey } = buildModelGroupKey(memoryEntry)
      const existing = modelGroupWinRates.get(groupKey) ?? { totalCorrect: 0, totalPredictions: 0, totalConfidence: 0, totalWeight: 0, weightSamples: 0, expertIds: new Set<string>() }
      existing.totalCorrect += memoryEntry.wasCorrect ? 1 : 0
      existing.totalPredictions += 1
      existing.totalConfidence += memoryEntry.confidence
      existing.totalWeight += expertWeightMap.get(memoryEntry.expertId) ?? 1
      existing.weightSamples += 1
      existing.expertIds.add(memoryEntry.expertId)
      modelGroupWinRates.set(groupKey, existing)
      settledDailyMemoryCount += 1
    }
  }

  if (expertPerformance && expertPerformance.entries.length > 0) {
    for (const entry of expertPerformance.entries) {
      if (settledDailyMemoryCount > 0) continue
      const outcomesWithModel = entry.recentOutcomes.filter((outcome) => outcome.modelId)
      if (outcomesWithModel.length > 0) {
        for (const outcome of outcomesWithModel) {
          const { groupKey } = buildModelGroupKey(outcome)
          const existing = modelGroupWinRates.get(groupKey) ?? { totalCorrect: 0, totalPredictions: 0, totalConfidence: 0, totalWeight: 0, weightSamples: 0, expertIds: new Set<string>() }
          existing.totalCorrect += outcome.correct ? 1 : 0
          existing.totalPredictions += 1
          existing.totalConfidence += outcome.confidence
          existing.totalWeight += entry.weight
          existing.weightSamples += 1
          existing.expertIds.add(entry.expertId)
          modelGroupWinRates.set(groupKey, existing)
        }
        continue
      }

      const groupKeys = expertGroupsMap.get(entry.expertId) ?? new Set(entry.layer === 'rule_functions' ? ['rules'] : ['unknown'])
      for (const groupKey of groupKeys) {
        const existing = modelGroupWinRates.get(groupKey) ?? { totalCorrect: 0, totalPredictions: 0, totalConfidence: 0, totalWeight: 0, weightSamples: 0, expertIds: new Set<string>() }
        existing.totalCorrect += entry.correctCount
        existing.totalPredictions += entry.predictionCount
        existing.totalConfidence += entry.averageConfidence * entry.predictionCount
        existing.totalWeight += entry.weight
        existing.weightSamples += 1
        existing.expertIds.add(entry.expertId)
        modelGroupWinRates.set(groupKey, existing)
      }
    }
  }

  return Array.from(groupMap.entries()).map(([groupKey, stats]) => {
    const perfStats = modelGroupWinRates.get(groupKey)
    const winRate = perfStats && perfStats.totalPredictions > 0
      ? round(perfStats.totalCorrect / perfStats.totalPredictions, 4)
      : 0
    const averageConfidenceForCalibration = perfStats && perfStats.totalPredictions > 0
      ? perfStats.totalConfidence / perfStats.totalPredictions / 100
      : null
    const calibration = averageConfidenceForCalibration !== null
      ? round(Math.abs(averageConfidenceForCalibration - winRate), 4)
      : 0
    const weight = perfStats && perfStats.weightSamples > 0
      ? round(perfStats.totalWeight / perfStats.weightSamples, 2)
      : 1

    return {
      group: groupKey,
      modelId: stats.modelId,
      providerId: stats.providerId,
      providerName: stats.providerName,
      displayName: stats.displayName,
      predictionCount: stats.predictions,
      winRate,
      averageConfidence: round(stats.predictions > 0 ? stats.totalConfidence / stats.predictions / 100 : 0, 4),
      calibration,
      weight,
      isSimulated: false,
    }
  }).sort((a, b) => b.predictionCount - a.predictionCount)
}

async function runLimitedConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let index = 0
  async function runner() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current], current)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()))
  return results
}

async function getLatestAvailableSignalDate(stockAnalysisDir: string) {
  const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
  return runtimeStatus.latestSuccessfulSignalDate || runtimeStatus.latestSignalDate || null
}

function resolveDataState(runtimeStatus: StockAnalysisRuntimeStatus): StockAnalysisDataState {
  if (!runtimeStatus.latestSuccessfulSignalDate) return 'empty'
  if (runtimeStatus.isUsingFallback || runtimeStatus.staleReasons.length > 0) return 'stale'
  return 'ready'
}

async function readLatestSnapshot(stockAnalysisDir: string) {
  const tradeDate = await getLatestAvailableSignalDate(stockAnalysisDir)
  if (!tradeDate) {
    return null
  }
  const [signals, marketState, dailyRun] = await Promise.all([
    readStockAnalysisSignals(stockAnalysisDir, tradeDate),
    readStockAnalysisMarketState(stockAnalysisDir, tradeDate),
    readStockAnalysisDailyRun(stockAnalysisDir, tradeDate),
  ])
  if (signals.length === 0 || !marketState || !dailyRun) {
    return null
  }
  return { tradeDate, signals, marketState, dailyRun }
}

function mergeStaleReasons(...reasonGroups: Array<string[]>) {
  return dedupeStrings(reasonGroups.flat())
}

async function finalizeDailyRun(stockAnalysisDir: string, result: StockAnalysisDailyRunResult, runtimeStatus: StockAnalysisRuntimeStatus) {
  await Promise.all([
    saveStockAnalysisSignals(stockAnalysisDir, result.tradeDate, result.topSignals.length > 0 ? result.topSignals : []),
    saveStockAnalysisMarketState(stockAnalysisDir, result.marketState),
    saveStockAnalysisDailyRun(stockAnalysisDir, result),
    saveStockAnalysisRuntimeStatus(stockAnalysisDir, {
      ...runtimeStatus,
      lastRunAt: result.generatedAt,
      lastSuccessAt: result.generatedAt,
      latestSignalDate: result.tradeDate,
      latestSuccessfulSignalDate: result.tradeDate,
      lastError: null,
      runState: 'success',
      currentRun: null,
      isUsingFallback: result.usedFallbackData,
      staleReasons: result.staleReasons,
    }),
  ])
}

export async function runStockAnalysisDaily(stockAnalysisDir: string): Promise<StockAnalysisDailyRunResult> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  if (currentRunPromise) {
    return currentRunPromise
  }

  currentRunPromise = (async () => {
    const initialStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
    await markRunState(stockAnalysisDir, 'running', {
      startedAt: nowIso(),
      phase: 'bootstrap',
      processedCount: 0,
      totalCount: 0,
    }, { lastRunAt: nowIso(), lastError: null })

    try {
      const config = await readStockAnalysisConfig(stockAnalysisDir)

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'stock_pool', processedCount: 0, totalCount: 0 })
      const stockPoolEnvelope = await getStockPoolData(stockAnalysisDir)
      const stockPool = stockPoolEnvelope.data

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'quotes', processedCount: 0, totalCount: stockPool.length })
      const quoteEnvelope = await getQuoteData(stockAnalysisDir, stockPool.map((item) => item.code))
      const quotes = quoteEnvelope.data

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'market_state', processedCount: 0, totalCount: stockPool.length }, {
        quoteCacheAt: quoteEnvelope.fetchedAt,
      })
      const indexHistoryEnvelope = await getIndexHistoryData(stockAnalysisDir)
      const socialSentiment = await loadLatestSocialSentiment(stockAnalysisDir)
      const marketState = buildMarketState(stockPool, quotes, indexHistoryEnvelope.data, socialSentiment)

      const [currentPositions, blacklist] = await Promise.all([
        readStockAnalysisPositions(stockAnalysisDir),
        readStockAnalysisBlacklist(stockAnalysisDir),
      ])
      const positionCodes = new Set(currentPositions.map((position) => position.code))
      const blacklistCodes = new Set(blacklist)
      const candidates = stockPool.filter((candidate) => !positionCodes.has(candidate.code) && !blacklistCodes.has(candidate.code) && !candidate.name.includes('ST'))

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'history', processedCount: 0, totalCount: candidates.length }, {
        indexHistoryCacheAt: indexHistoryEnvelope.fetchedAt,
      })

      const industryStrengthMap = buildIndustryStrengthMap(stockPool, quotes)

      const historyResults = await runLimitedConcurrency(candidates, MAX_HISTORY_CONCURRENCY, async (candidate, index) => {
        const quote = quotes.get(candidate.code)
        // [P2-17] Acelerador runtimeStatus escrever：Todo 20 candidatos atualizados uma vez，reduzir ~500 gravação em disco secundário
        if (index % 20 === 0 || index === candidates.length - 1) {
          await markRunState(stockAnalysisDir, 'running', {
            startedAt: nowIso(),
            phase: 'history',
            processedCount: index,
            totalCount: candidates.length,
          })
        }
        if (!quote || quote.latestPrice <= 0) {
          return null
        }
        // S7: Eliminação de estoques suspensos — O preço de abertura é 0 ou taxa de rotatividade 0 Indica que não há transações no dia
        if (quote.open <= 0 || quote.turnoverRate <= 0) {
          return null
        }
        try {
          const historyEnvelope = await getStockHistoryData(stockAnalysisDir, candidate.code)
          // S6: Elimine estoques sub-novos — Listagem insuficiente 60 dias de negociação（KRegistros de linha insuficientes60tira）
          if (historyEnvelope.data.length < 60) {
            return null
          }
          return {
            candidate,
            quote,
            history: historyEnvelope.data,
            staleReasons: historyEnvelope.staleReasons,
            usedFallback: historyEnvelope.usedFallback,
          }
        } catch (error) {
          logger.error(`Falha ao capturar dados históricos de ações individuais: ${(error as Error).message} (${candidate.code})`, { module: 'StockAnalysis' })
          return null
        }
      })

      const historyMap = new Map<string, StockAnalysisKlinePoint[]>()
      for (const item of historyResults) {
        if (item) {
          historyMap.set(item.candidate.code, item.history)
        }
      }
      const industryTrendMap = await buildIndustryTrendMapForStockPool(stockAnalysisDir, stockPool, quotes, historyMap)

      const allSnapshots = historyResults
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => buildSnapshot(item.candidate, item.quote, item.history, config, industryStrengthMap, industryTrendMap))
      const positionSnapshotInputs = await runLimitedConcurrency(currentPositions, MAX_HISTORY_CONCURRENCY, async (position) => {
        const posQuote = quotes.get(position.code)
        if (!posQuote || posQuote.latestPrice <= 0) {
          return null
        }
        try {
          const posHistoryEnvelope = await getStockHistoryData(stockAnalysisDir, position.code)
          if (posHistoryEnvelope.data.length < 30) {
            return null
          }
          const posCandidate: StockAnalysisWatchlistCandidate = {
            code: position.code,
            name: position.name,
            market: position.code.startsWith('6') ? 'sh' : position.code.startsWith('0') || position.code.startsWith('3') ? 'sz' : 'bj',
            exchange: position.code.startsWith('6') ? 'SSE' : 'SZSE',
          }
          return {
            code: position.code,
            snapshot: buildSnapshot(posCandidate, posQuote, posHistoryEnvelope.data, config, industryStrengthMap, industryTrendMap),
          }
        } catch {
          return null
        }
      })
      const positionBaseSnapshots = positionSnapshotInputs
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => item.snapshot)
      const crossSectionalMomentumMap = buildCrossSectionalMomentumMap([...allSnapshots, ...positionBaseSnapshots])
      const rankedSnapshots = applyCrossSectionalMomentumRanks(allSnapshots, crossSectionalMomentumMap)
      const rankedPositionSnapshotMap = new Map(
        applyCrossSectionalMomentumRanks(positionBaseSnapshots, crossSectionalMomentumMap)
          .map((snapshot) => [snapshot.code, snapshot] as const),
      )

      // gravação passo a passo hard filter Quantidade de eliminação，Fácil de diagnosticar BUG-2（candidates mergulhar）
      const noQuoteOrHistory = historyResults.filter((item) => item == null).length
      const failedTurnover = rankedSnapshots.filter((snapshot) => snapshot.averageTurnoverAmount20d < config.minTurnoverAmount20d).length
      const failedAmplitude = rankedSnapshots.filter((snapshot) => snapshot.amplitude20d < config.minAmplitude20d).length
      const failedDecline = rankedSnapshots.filter((snapshot) => snapshot.declineDays20d > config.maxContinuousDeclineDays).length
      const snapshots = rankedSnapshots
        .filter((snapshot) => snapshot.averageTurnoverAmount20d >= config.minTurnoverAmount20d && snapshot.amplitude20d >= config.minAmplitude20d && snapshot.declineDays20d <= config.maxContinuousDeclineDays)

      saLog.audit('Service', `Funil de triagem: candidato=${candidates.length}, exclusão da lista negra=${blacklist.length}, Sem citações ou histórico=${noQuoteOrHistory}, tersnapshot=${rankedSnapshots.length}, Volume de transações insuficiente=${failedTurnover}, Amplitude insuficiente=${failedAmplitude}, Declínio contínuo excede o limite=${failedDecline}, passarhardFilter=${snapshots.length}`)

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'signals', processedCount: snapshots.length, totalCount: snapshots.length })
      const candidatePool = snapshots
        .slice()
        .sort((left, right) => buildCandidatePoolScore(right) - buildCandidatePoolScore(left))
        .slice(0, 60)

      // Phase 3.5: G7 Seleção de estoque orientada a eventos — Use o after-hours do dia anterior LLM Suplemento de resultado de extração/Melhorar o pool de candidatos
      let eventScreenResults: EventScreenResult[] = []
      try {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const llmExtraction = await readLLMExtractionResult(stockAnalysisDir, yesterday)
        if (llmExtraction && (llmExtraction.announcements.length > 0 || llmExtraction.newsImpacts.length > 0)) {
          // Extraia as ações afetadas do evento de anúncio
          for (const ann of llmExtraction.announcements) {
            if (ann.sentiment > 0.3 && ann.confidence > 0.6) {
              const code = ann.company.replace(/[^\d]/g, '')
              if (code.length === 6) {
                const existsInPool = candidatePool.some((s) => s.code === code)
                eventScreenResults.push({
                  code,
                  name: ann.company,
                  matchedEvents: [{
                    source: 'announcement',
                    description: `${ann.eventType}: ${ann.magnitude}`,
                    sentiment: ann.sentiment,
                  }],
                  priorityScore: ann.sentiment * ann.confidence * 100,
                })
                // Se não estiver no grupo de candidatos，tente começar de allSnapshots Encontre e adicione
                if (!existsInPool) {
                  const matchedSnapshot = rankedSnapshots.find((s) => s.code === code)
                  if (matchedSnapshot) {
                    candidatePool.push(matchedSnapshot)
                    logger.info(`[stock-analysis] [G7] Adição orientada a eventos ao conjunto de candidatos: ${code} (${ann.eventType})`)
                  }
                }
              }
            }
          }

          // Extraia as ações afetadas do impacto das notícias
          for (const news of llmExtraction.newsImpacts) {
            if (news.impactDirection === 'bom' && news.confidence > 0.6) {
              for (const code of news.affectedStocks) {
                const cleanCode = code.replace(/[^\d]/g, '')
                if (cleanCode.length === 6) {
                  eventScreenResults.push({
                    code: cleanCode,
                    name: news.topic,
                    matchedEvents: [{
                      source: 'news',
                      description: `${news.topic} (${news.impactLevel})`,
                      sentiment: news.impactDirection === 'bom' ? 0.6 : -0.6,
                    }],
                    priorityScore: news.confidence * 80,
                  })
                  const existsInPool = candidatePool.some((s) => s.code === cleanCode)
                  if (!existsInPool) {
                    const matchedSnapshot = rankedSnapshots.find((s) => s.code === cleanCode)
                    if (matchedSnapshot) {
                      candidatePool.push(matchedSnapshot)
                      logger.info(`[stock-analysis] [G7] Notícias se juntam ao grupo de candidatos: ${cleanCode} (${news.topic})`)
                    }
                  }
                }
              }
            }
          }

          if (eventScreenResults.length > 0) {
            saLog.audit('Service', `[G7] Seleção de estoque orientada a eventos: corresponder ${eventScreenResults.length} eventos, O conjunto de candidatos estende-se até ${candidatePool.length}`)
          }
        }
      } catch (error) {
        logger.warn(`[stock-analysis] [G7] A seleção de estoque baseada em eventos falha（Não afeta os processos normais）: ${(error as Error).message}`)
      }

      // [MH1] Phase 3.6: construir"Grandes eventos podem ser vetados com um voto"juntar
      // Sobre o próximo relatório financeiro、Vendas restritas suspensas、Ações envolvidas em grandes eventos como reestruturação serão vetadas com um voto
      const eventVetoCodes = new Map<string, string>() // code -> Motivo da rejeição
      try {
        // fonte1: FactPool anúncio original（Coletado após a abertura do mercado no dia anterior）
        const today = todayDate()
        const prevDate = new Date(today)
        prevDate.setDate(prevDate.getDate() - 1)
        const prevTradeDate = prevDate.toISOString().slice(0, 10)
        const previousFactPool = await readFactPool(stockAnalysisDir, prevTradeDate)
        if (previousFactPool) {
          for (const ann of previousFactPool.companyAnnouncements) {
            if (ann.importance === 'major' && (ann.category === 'earnings' || ann.category === 'equity_change')) {
              eventVetoCodes.set(ann.code, `Em breve/Algo grande está acontecendo: ${ann.category === 'earnings' ? 'lançamento de relatório financeiro' : 'Mudanças no patrimônio'}（${ann.title.slice(0, 30)}）`)
            }
          }
        }
        // fonte2: LLM Eventos de anúncio estruturados extraídos（riskFlags Eventos não vazios ou de alta incerteza）
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const llmExtraction = await readLLMExtractionResult(stockAnalysisDir, yesterday)
        if (llmExtraction) {
          for (const ann of llmExtraction.announcements) {
            if (ann.riskFlags.length > 0 && ann.confidence > 0.5) {
              const code = ann.company.replace(/[^\d]/g, '')
              if (code.length === 6 && !eventVetoCodes.has(code)) {
                eventVetoCodes.set(code, `grandes eventos de risco: ${ann.riskFlags.join(', ')}（${ann.eventType}）`)
              }
            }
          }
        }
        if (eventVetoCodes.size > 0) {
          logger.info(`[stock-analysis] [MH1] Grandes eventos podem ser vetados com um voto: ${eventVetoCodes.size} apenas ações (${[...eventVetoCodes.keys()].join(', ')})`, { module: 'StockAnalysis' })
        }
      } catch (error) {
        logger.warn(`[stock-analysis] [MH1] Falha ao criar coleta de veto de evento（Não afeta os processos normais）: ${(error as Error).message}`)
      }

      // Phase 4: Pesos de aprendizagem + Limite adaptativo
      const learnedWeights = await computeLearnedWeights(stockAnalysisDir)
      await adjustConvictionThresholds(stockAnalysisDir, config, marketState)

      // Phase 4.5: Carregar desempenho histórico individual especializado → peso dinâmico
      let expertWeightsMap: Map<string, number> | undefined
      let expertPerformanceData: StockAnalysisExpertPerformanceData | null = null
      try {
        expertPerformanceData = await readStockAnalysisExpertPerformance(stockAnalysisDir)
        if (expertPerformanceData && expertPerformanceData.entries.length > 0) {
          expertWeightsMap = new Map(expertPerformanceData.entries.map((e) => [e.expertId, e.weight]))
          logger.info(`[stock-analysis] Carregado ${expertPerformanceData.entries.length} peso dinâmico dos especialistas`, { module: 'StockAnalysis' })
        }
      } catch (error) {
        logger.warn(`[stock-analysis] Falha ao carregar dados de desempenho de especialistas，Use pesos padrão: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      }

      // Phase 5: ler AI Configuração，usado para LLM Voto de especialista
      let aiConfig: StockAnalysisAIConfig | null = null
      try {
        aiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
        const enabledProviders = aiConfig.providers.filter((p) => p.enabled && p.apiKey).length
        const assignedExperts = aiConfig.experts.filter((e) => e.enabled && e.layer !== 'rule_functions' && e.assignedModel).length
        if (enabledProviders > 0 && assignedExperts > 0) {
          logger.info(`[stock-analysis] AI Configuração carregada: ${enabledProviders} individual provider, ${assignedExperts} individual LLM especialista`, { module: 'StockAnalysis' })
        } else {
          logger.info(`[stock-analysis] AI Configuração incompleta (providers=${enabledProviders}, experts=${assignedExperts})，será simulado usando a fórmula`, { module: 'StockAnalysis' })
          aiConfig = null
        }
      } catch (error) {
        logger.warn(`[stock-analysis] ler AI Falha na configuração，será simulado usando a fórmula: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      }

      // Phase 5.5: Carregar sistema de memória especialista + Crie um perfil de desempenho + FactPool resumo（injeção LLM prompt）
      let profileMap: Map<string, ExpertProfile> | undefined
      let factPoolSummary: FactPoolSummary | undefined
      let factPoolForExperts: FactPool | undefined
      let memoryStore: ExpertMemoryStore | undefined
      try {
        // Crie perfis de desempenho especializados（baseado em carregado expertPerformanceData）
        if (expertPerformanceData && expertPerformanceData.entries.length > 0) {
          profileMap = new Map<string, ExpertProfile>()
          for (const entry of expertPerformanceData.entries) {
            profileMap.set(entry.expertId, buildExpertProfile(entry))
          }
          logger.info(`[stock-analysis] Construído ${profileMap.size} Perfis de desempenho de especialistas`, { module: 'StockAnalysis' })
        }
      } catch (error) {
        logger.warn(`[stock-analysis] Falha ao criar perfil de desempenho especializado（Não afeta a votação）: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      }
      try {
        // P1-2: carregar recente FactPool resumo — Use o dia de negociação anterior（em vez de um dia natural -1）
        const today = todayDate()
        const recentDatesForFP = getRecentTradeDates(today, 3)
        const prevTradeDate = recentDatesForFP.length >= 2 ? recentDatesForFP[1] : today
        const previousFactPool = await readFactPool(stockAnalysisDir, prevTradeDate)
        if (previousFactPool) {
          factPoolSummary = buildFactPoolSummary(previousFactPool)
          factPoolForExperts = previousFactPool
          logger.info(`[stock-analysis] Construído FactPool resumo（dados agent: ${previousFactPool.agentLogs.length}）`, { module: 'StockAnalysis' })
        }
      } catch (error) {
        logger.warn(`[stock-analysis] carregar FactPool falhar（Não afeta a votação）: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      }
      try {
        // Carregar armazenamento de memória especializado
        memoryStore = await readExpertMemoryStore(stockAnalysisDir)
        if (memoryStore && Object.keys(memoryStore).length > 0) {
          logger.info(`[stock-analysis] Carregado ${Object.keys(memoryStore).length} dados de memória de especialistas`, { module: 'StockAnalysis' })
        }
      } catch (error) {
        logger.warn(`[stock-analysis] Falha ao carregar memória especializada（Não afeta a votação）: ${error instanceof Error ? error.message : 'erro desconhecido'}`, { module: 'StockAnalysis' })
      }

      // Phase 6: Gerar sinais estoque por estoque（Contém LLM Voto de especialista）
      // P2-A2: Carregue registros de transações antecipadamente，usado para Kelly Cálculo da relação real de lucros e perdas da fórmula
      const tradesForKelly = await readStockAnalysisTrades(stockAnalysisDir)
      // daily run Sempre execute verdadeiro LLM analisar；O fato de a posição estar completa ou não afeta apenas as decisões comerciais subsequentes.，Não afeta a geração de análise
      const positionsFull = currentPositions.length >= config.maxPositions
      if (positionsFull) {
        logger.info(`[stock-analysis] A posição está cheia (${currentPositions.length}/${config.maxPositions})，mas daily run Ainda continue a executar LLM analisar，As ações de negociação subsequentes são restritas apenas por restrições de posição`, { module: 'StockAnalysis' })
      }
      // [v1.33.0 estágio E] Pré-buscar pool de candidatos + Fundamentos de participações（PE/PB/ROE/Capitalização total de mercado），Com o cache de hoje
      const fundamentalsTargetCodes = Array.from(new Set([
        ...candidatePool.map((s) => s.code),
        ...currentPositions.map((p) => p.code),
      ]))
      const fundamentalsMap = await fetchFundamentalsForCodes(stockAnalysisDir, fundamentalsTargetCodes)
      logger.info(`[stock-analysis] Dados fundamentais prontos：Alvo ${fundamentalsTargetCodes.length} Apenas，bater ${fundamentalsMap.size} Apenas`, { module: 'StockAnalysis' })
      const signalResults = await runLimitedConcurrency(candidatePool, 3, async (snapshot, index) => {
        await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'signals', processedCount: index, totalCount: candidatePool.length })
        return buildSignal(snapshot, marketState, config, learnedWeights, aiConfig, expertWeightsMap, historyMap.get(snapshot.code), profileMap, factPoolSummary, memoryStore, eventVetoCodes, tradesForKelly, factPoolForExperts, fundamentalsMap.get(snapshot.code) ?? null)
      })
      const signals = signalResults.sort((left, right) => right.finalScore - left.finalScore)

      // --- Phase 2.3: Avaliação de posição + Lógica de comutação ---
      const positionEvaluations: StockAnalysisPositionEvaluation[] = []
      if (currentPositions.length > 0) {
        const existingSignals = await getStockAnalysisSignals(stockAnalysisDir)
        const signalMap = new Map(existingSignals.map((signal) => [signal.id, signal]))

        for (const position of currentPositions) {
          const posSnapshot = rankedPositionSnapshotMap.get(position.code)
          if (!posSnapshot) {
            logger.debug(`[stock-analysis] Avaliação de posição ignorada ${position.code}：Instantâneos insuficientes`)
            continue
          }
          try {
            const buySignal = position.sourceSignalId ? signalMap.get(position.sourceSignalId) : null
            // P2-D6: O valor padrão é alterado para 65（buy/watch linha divisória），Evite valores padrão altos que levem a informações falsas scoreDelta declínio
            const buyCompositeScore = buySignal?.compositeScore ?? 65
            const buyFinalScore = buySignal?.finalScore ?? buyCompositeScore
            const evaluation = await evaluatePositionScores(position, posSnapshot, marketState, config, buyCompositeScore, buyFinalScore, aiConfig, expertWeightsMap, profileMap, factPoolSummary, memoryStore, learnedWeights, historyMap.get(position.code), factPoolForExperts, fundamentalsMap.get(position.code) ?? null)
            positionEvaluations.push(evaluation)

            if (evaluation.sellRecommended) {
              logger.info(`[stock-analysis] Sinal de venda de posição: ${position.name}(${position.code}) - ${evaluation.sellReasonText}`)
            }
          } catch (error) {
            logger.error(`[stock-analysis] Falha na avaliação da posição ${position.code}: ${(error as Error).message}`)
          }
        }
      }

      const swapSuggestions = buildSwapSuggestions(positionEvaluations, signals, config.maxPositions, currentPositions.length)
      if (swapSuggestions.length > 0) {
        logger.info(`[stock-analysis] Sugestões para mudança de posição ${swapSuggestions.length} tira: ${swapSuggestions.map((suggestion) => `${suggestion.sellName} -> ${suggestion.buyName}`).join(', ')}`)
      }

      const watchLogs = await readStockAnalysisWatchLogs(stockAnalysisDir)
      const topSignal = signals[0]
      const nextWatchLogs = [...watchLogs]
      if (!topSignal || (topSignal.action !== 'strong_buy' && topSignal.action !== 'buy')) {
        nextWatchLogs.unshift({
          id: `watch-${todayDate()}`,
          tradeDate: todayDate(),
          highestSignalScore: topSignal?.finalScore ?? 0,
          reason: topSignal ? 'A pontuação mais alta falhou Conviction Filter Limite de compra' : 'Nenhum candidato disponível',
          topCandidateCode: topSignal?.code ?? null,
          topCandidateName: topSignal?.name ?? null,
          tPlus1Return: null,
          tPlus5Return: null,
          outcome: 'pending',
          evaluatedAt: null,
          createdAt: nowIso(),
        })
      }

      const trades = await readStockAnalysisTrades(stockAnalysisDir)
      const evaluatedWatchLogs = await evaluateWatchLogOutcomes(stockAnalysisDir, nextWatchLogs)
      const weeklySummary = buildWeeklySummary(trades, evaluatedWatchLogs)
      const monthlySummary = buildMonthlySummary(trades, evaluatedWatchLogs)
      const modelGroups = hasModelGroupPerformanceSamples(expertPerformanceData)
        ? await buildModelGroupPerformance(stockAnalysisDir, expertPerformanceData)
        : []
      const performanceDashboard = buildPerformanceDashboard(signals, evaluatedWatchLogs, trades, modelGroups, marketState)
      const staleReasons = mergeStaleReasons(
        stockPoolEnvelope.staleReasons,
        quoteEnvelope.staleReasons,
        indexHistoryEnvelope.staleReasons,
        historyResults.flatMap((item) => item?.staleReasons ?? []),
      )
      const usedFallbackData = stockPoolEnvelope.usedFallback || quoteEnvelope.usedFallback || indexHistoryEnvelope.usedFallback || historyResults.some((item) => item?.usedFallback)

      const result: StockAnalysisDailyRunResult = {
        tradeDate: todayDate(),
        generatedAt: nowIso(),
        marketState,
        stockPoolSize: stockPool.length,
        candidatePoolSize: candidatePool.length,
        signalCount: signals.length,
        watchCount: signals.filter((signal) => signal.action === 'watch').length,
        topSignals: signals.slice(0, 20),
        positionEvaluations,
        swapSuggestions,
        usedFallbackData,
        staleReasons,
      }

      await markRunState(stockAnalysisDir, 'running', { startedAt: nowIso(), phase: 'persist', processedCount: signals.length, totalCount: signals.length })
      await Promise.all([
        saveStockAnalysisSignals(stockAnalysisDir, result.tradeDate, signals),
        saveStockAnalysisMarketState(stockAnalysisDir, marketState),
        saveStockAnalysisDailyRun(stockAnalysisDir, result),
        saveStockAnalysisWatchLogs(stockAnalysisDir, evaluatedWatchLogs.slice(0, 120)),
        saveStockAnalysisModelGroups(stockAnalysisDir, modelGroups),
        saveStockAnalysisWeeklySummary(stockAnalysisDir, weeklySummary),
        saveStockAnalysisMonthlySummary(stockAnalysisDir, monthlySummary),
        saveStockAnalysisPerformanceDashboard(stockAnalysisDir, performanceDashboard),
        saveStockAnalysisRuntimeStatus(stockAnalysisDir, {
          ...initialStatus,
          lastRunAt: result.generatedAt,
          lastSuccessAt: result.generatedAt,
          lastError: null,
          stockPoolRefreshedAt: stockPoolEnvelope.fetchedAt ?? initialStatus.stockPoolRefreshedAt,
          latestSignalDate: result.tradeDate,
          runState: 'success',
          currentRun: null,
          quoteCacheAt: quoteEnvelope.fetchedAt,
          indexHistoryCacheAt: indexHistoryEnvelope.fetchedAt,
          latestSuccessfulSignalDate: result.tradeDate,
          isUsingFallback: usedFallbackData,
          staleReasons,
        }),
      ])

      saLog.audit('Service', `daily run completed: pool=${stockPool.length}, candidates=${candidatePool.length}, signals=${signals.length}, posEvals=${positionEvaluations.length}, sellSignals=${positionEvaluations.filter((evaluation) => evaluation.sellRecommended).length}, swaps=${swapSuggestions.length}, fallback=${usedFallbackData}`)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI A operação diária de negociação de ações falha'
      await updateRuntimeStatus(stockAnalysisDir, {
        lastError: message,
        runState: 'failed',
        currentRun: null,
      })
      saLog.audit('Service', `daily run failed: ${message}`)
      throw error
    } finally {
      currentRunPromise = null
    }
  })()

  return currentRunPromise
}

// ==================== G1: Processo fora do expediente ====================

export async function runStockAnalysisPostMarket(
  stockAnalysisDir: string,
  options?: { maxDurationMs?: number },
): Promise<StockAnalysisPostMarketResult> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  if (currentPostMarketPromise) {
    return currentPostMarketPromise
  }

  currentPostMarketPromise = (async () => {
    const tradeDate = todayDate()
    const postMarketStart = Date.now()
    const maxDurationMs = options?.maxDurationMs ?? POST_MARKET_BATCH_WINDOW_MS
    logger.info(`[stock-analysis] O processo fora do expediente começa: ${tradeDate}`, { module: 'StockAnalysis' })
    saLog.info('Service', `[depois do expediente] Processo começa: tradeDate=${tradeDate} janela máxima=${maxDurationMs}ms`)

    try {
      const config = await readStockAnalysisConfig(stockAnalysisDir)

      // Phase 1: Atualizar cotações de fechamento + situação do mercado
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 1 Antes')
      const stockPoolEnvelope = await getStockPoolData(stockAnalysisDir)
      const stockPool = stockPoolEnvelope.data
      const quoteEnvelope = await getQuoteData(stockAnalysisDir, stockPool.map((item) => item.code))
      const quotes = quoteEnvelope.data
      const indexHistoryEnvelope = await getIndexHistoryData(stockAnalysisDir)
      const socialSentiment = await loadLatestSocialSentiment(stockAnalysisDir)
      const marketState = buildMarketState(stockPool, quotes, indexHistoryEnvelope.data, socialSentiment)
      saLog.info('Service', `[depois do expediente] situação de liquidez do mercado: ${describeMarketLiquidityState(marketState, config)}`)

      // Phase 2: Avaliação de posição（Verificação de Stop Loss e Take Profit + Detecção de atenuação de sinal）
      // Carregue primeiro AI Configuração，usado para LLM Voto de especialista（Mantenha-se consistente com as operações diárias）
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 2 Antes')
      let postMarketAiConfig: StockAnalysisAIConfig | null = null
      try {
        const loadedAiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
        const enabledProviders = loadedAiConfig.providers.filter((p) => p.enabled && p.apiKey).length
        const assignedExperts = loadedAiConfig.experts.filter((e) => e.enabled && e.layer !== 'rule_functions' && e.assignedModel).length
        if (enabledProviders > 0 && assignedExperts > 0) {
          postMarketAiConfig = loadedAiConfig
          logger.info(`[stock-analysis] [depois do expediente] AI Configuração carregada: ${enabledProviders} individual provider, ${assignedExperts} individual LLM especialista`, { module: 'StockAnalysis' })
        }
      } catch {
        logger.warn(`[stock-analysis] [depois do expediente] ler AI Falha na configuração，A avaliação da posição será simulada usando a fórmula`, { module: 'StockAnalysis' })
      }

      const currentPositions = await readStockAnalysisPositions(stockAnalysisDir)
      const positionEvaluations: StockAnalysisPositionEvaluation[] = []

      if (currentPositions.length > 0) {
        const existingSignals = await getStockAnalysisSignals(stockAnalysisDir)
        const signalMap = new Map(existingSignals.map((signal) => [signal.id, signal]))
        // [v1.33.0 estágio E] A avaliação de posição após o expediente também busca previamente os fundamentos
        const postFundamentalsMap = await fetchFundamentalsForCodes(stockAnalysisDir, currentPositions.map((p) => p.code))
        logger.info(`[stock-analysis] [depois do expediente] Dados fundamentais prontos：Alvo ${currentPositions.length} Apenas，bater ${postFundamentalsMap.size} Apenas`, { module: 'StockAnalysis' })

        for (const position of currentPositions) {
          assertWithinPostMarketWindow(postMarketStart, maxDurationMs, `Phase 2 Avaliação de posição ${position.code} avançar`)
          const posQuote = quotes.get(position.code)
          if (!posQuote || posQuote.latestPrice <= 0) {
            continue
          }
          try {
            const posHistoryEnvelope = await getStockHistoryData(stockAnalysisDir, position.code)
            if (posHistoryEnvelope.data.length < 30) {
              continue
            }
            const posCandidate: StockAnalysisWatchlistCandidate = {
              code: position.code,
              name: position.name,
              market: position.code.startsWith('6') ? 'sh' : position.code.startsWith('0') || position.code.startsWith('3') ? 'sz' : 'bj',
              exchange: position.code.startsWith('6') ? 'SSE' : 'SZSE',
            }
            const industryStrengthMap = buildIndustryStrengthMap(stockPool, quotes)
            const posSnapshot = buildSnapshot(posCandidate, posQuote, posHistoryEnvelope.data, config, industryStrengthMap)
            const buySignal = position.sourceSignalId ? signalMap.get(position.sourceSignalId) : null
            const buyCompositeScore = buySignal?.compositeScore ?? 65
            const buyFinalScore = buySignal?.finalScore ?? buyCompositeScore
            const evaluation = await evaluatePositionScores(position, posSnapshot, marketState, config, buyCompositeScore, buyFinalScore, postMarketAiConfig, undefined, undefined, undefined, undefined, undefined, posHistoryEnvelope.data, undefined, postFundamentalsMap.get(position.code) ?? null)
            positionEvaluations.push(evaluation)

            if (evaluation.sellRecommended) {
              logger.info(`[stock-analysis] [depois do expediente] Sinal de venda de posição: ${position.name}(${position.code}) - ${evaluation.sellReasonText}`)
            }
          } catch (error) {
            logger.error(`[stock-analysis] [depois do expediente] Falha na avaliação da posição ${position.code}: ${(error as Error).message}`)
          }
        }
      }

      // Phase 3: Avaliação de controle de risco em nível de portfólio
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 3 Antes')
      const trades = await readStockAnalysisTrades(stockAnalysisDir)
      const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
      const existingRiskControl = runtimeStatus.riskControl ?? DEFAULT_RISK_CONTROL_STATE
      const { state: riskControlState, newEvents: riskEvents } = assessPortfolioRisk(trades, config.portfolioRiskLimits, existingRiskControl)

      if (riskEvents.length > 0) {
        const storedEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
        await saveStockAnalysisRiskEvents(stockAnalysisDir, [...riskEvents, ...storedEvents])
        logger.warn(`[stock-analysis] [depois do expediente] Adicione novos eventos de controle de risco ${riskEvents.length} tira`)
      }

      // Phase 4: Coleta de dados（chamar data-agents módulo）
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 4 Antes')
      let factPoolUpdated = false
      try {
        const { collectAllAgents } = await import('./data-agents')
        const agentConfig = await readDataAgentConfig(stockAnalysisDir)
        const factPool = await collectAllAgents(stockAnalysisDir, tradeDate, quotes, marketState, agentConfig)
        await saveFactPool(stockAnalysisDir, factPool)
        factPoolUpdated = true
        logger.info(`[stock-analysis] [depois do expediente] Atualização do conjunto de fatos concluída，pontos de dados: ${factPool.agentLogs.reduce((sum, log) => sum + log.dataPointCount, 0)}`)
      } catch (error) {
        logger.error(`[stock-analysis] [depois do expediente] Falha na coleta de dados: ${(error as Error).message}`)
      }

      // Phase 5: LLM extração de informações（Chamada em lote fora do horário comercial，não em tempo real）
      let llmExtractionDone = false
      if (factPoolUpdated) {
        assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 5 Antes')
        try {
          const { runLLMExtraction } = await import('./llm-extraction')
          const factPool = await readFactPool(stockAnalysisDir, tradeDate)
          if (!factPool) {
            logger.warn(`[stock-analysis] [depois do expediente] FactPool está vazio，pular sobre LLM extração de informações`)
          } else {
            const aiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
            const extractionResult = await runLLMExtraction(stockAnalysisDir, factPool, aiConfig)
            await saveLLMExtractionResult(stockAnalysisDir, extractionResult)
            llmExtractionDone = true
            logger.info(`[stock-analysis] [depois do expediente] LLM Extração de informações concluída，Evento de anúncio: ${extractionResult.announcements.length}，impacto das notícias: ${extractionResult.newsImpacts.length}`)
          }
        } catch (error) {
          logger.error(`[stock-analysis] [depois do expediente] LLM Falha na extração de informações: ${(error as Error).message}`)
        }
      }

      // Phase 7: Atualização de memória especializada（Extraia os resultados da votação do dia → Atualização de curto prazo/médio prazo/memória de longo prazo）
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 7 Antes')
      try {
        const memoryAiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
        await runDailyMemoryUpdate(stockAnalysisDir, tradeDate, memoryAiConfig)
        const refreshedExpertPerformance = await readStockAnalysisExpertPerformance(stockAnalysisDir)
        const refreshedModelGroups = hasModelGroupPerformanceSamples(refreshedExpertPerformance)
          ? await buildModelGroupPerformance(stockAnalysisDir, refreshedExpertPerformance)
          : []
        await saveStockAnalysisModelGroups(stockAnalysisDir, refreshedModelGroups)
        logger.info(`[stock-analysis] [depois do expediente] Atualização de memória especializada concluída: ${tradeDate}`, { module: 'StockAnalysis' })
      } catch (error) {
        logger.error(`[stock-analysis] [depois do expediente] Falha na atualização da memória especializada（Não afeta os resultados após o expediente）: ${(error as Error).message}`)
      }

      // Phase 6: Salve o status do mercado + Atualizar status do tempo de execução
      assertWithinPostMarketWindow(postMarketStart, maxDurationMs, 'Phase 6 antes de salvar')
      await saveStockAnalysisMarketState(stockAnalysisDir, marketState)

      // v1.35.0 [A8-P0-3] escrever daily-equity Instantâneo
      try {
        const freshPositions = await readStockAnalysisPositions(stockAnalysisDir)
        const freshTrades = await readStockAnalysisTrades(stockAnalysisDir)
        const existingEquity = await readStockAnalysisDailyEquity(stockAnalysisDir)
        const snapshot = buildDailyEquitySnapshot(tradeDate, freshPositions, freshTrades, existingEquity)
        await upsertDailyEquitySnapshot(stockAnalysisDir, snapshot)
        saLog.info('Service', `[depois do expediente] daily-equity Instantâneo salvo date=${snapshot.date} totalEquity=${snapshot.totalEquity} exposure=${snapshot.exposure} drawdown=${snapshot.drawdownPct}%`)
      } catch (error) {
        logger.error(`[stock-analysis] [depois do expediente] daily-equity Falha no instantâneo（Não afeta os resultados após o expediente）: ${(error as Error).message}`, { module: 'StockAnalysis' })
      }

      const result: StockAnalysisPostMarketResult = {
        tradeDate,
        generatedAt: nowIso(),
        runType: 'post_market',
        marketState,
        positionEvaluations,
        riskControlState,
        reviewsGenerated: 0,
        factPoolUpdated,
      }

      await savePostMarketResult(stockAnalysisDir, result)

      // Atualizar status do tempo de execução
      await saveStockAnalysisRuntimeStatus(stockAnalysisDir, {
        ...runtimeStatus,
        riskControl: riskControlState,
        postMarketAt: nowIso(),
      })

      logger.info(`[stock-analysis] Processo fora do expediente concluído: ${tradeDate}，Avaliação de posição ${positionEvaluations.length} tira，conjunto de fatos ${factPoolUpdated ? 'já' : 'ainda não'}renovar，LLMextrair ${llmExtractionDone ? 'já' : 'ainda não'}Terminar`)
      saLog.info('Service', `[depois do expediente] Processo concluído: tradeDate=${tradeDate} demorado=${Date.now() - postMarketStart}ms Avaliação de posição=${positionEvaluations.length} Conselhos de venda=${positionEvaluations.filter((e) => e.sellRecommended).length} Eventos de controle de risco=${riskEvents.length} conjunto de fatos=${factPoolUpdated ? 'atualizado' : 'Não atualizado'} LLMextrair=${llmExtractionDone ? 'Concluído' : 'Não concluído'}`)
      return result
    } catch (error) {
      logger.error(`[stock-analysis] Processo anormal após o expediente: ${(error as Error).message}`, { error })
      saLog.error('Service', `[depois do expediente] Exceção de processo: ${(error as Error).message} demorado=${Date.now() - postMarketStart}ms`)
      await updateRuntimeStatus(stockAnalysisDir, {
        lastError: `Processo anormal após o expediente: ${(error as Error).message}`,
      }).catch(() => {})
      throw error
    } finally {
      currentPostMarketPromise = null
    }
  })()

  return currentPostMarketPromise
}

// ==================== G1.5: Análise do suplemento matinal ====================

/**
 * Coleta de dados complementares pela manhã + LLM extração de informações
 *
 * no dia de negociação 07:30 acionar，Complemente as notícias geradas durante a noite do pregão anterior/Dados incrementais, como anúncios。
 * Apenas corra Phase 4（Coleta de dados）+ Phase 5（LLM extração de informações），Nenhuma avaliação de posição repetida e controle de risco。
 * Os resultados da coleta são mesclados no conjunto de fatos do dia de negociação anterior e LLM Extraindo resultados，Para uso na análise pré-mercado do dia。
 */
async function runMorningSupplementAnalysisInner(stockAnalysisDir: string): Promise<void> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const startMs = Date.now()
  const today = todayDate()

  // Obtenha a data do dia de negociação anterior（Os dados coletados pela manhã são atribuídos ao pregão anterior）
  const recentDates = getRecentTradeDates(today, 3)
  const previousTradeDate = recentDates.length >= 2 ? recentDates[1] : today
  logger.info(`[stock-analysis] [suplemento matinal] começar: today=${today} targetTradeDate=${previousTradeDate}`, { module: 'StockAnalysis' })
  saLog.info('Service', `[suplemento matinal] começar: today=${today} targetTradeDate=${previousTradeDate}`)

  try {
    // Leia cotações em cache e status do mercado（Use dados armazenados em cache após o fechamento do dia de negociação anterior）
    const quoteCache = await readStockAnalysisQuoteCache(stockAnalysisDir)
    const quotes = new Map((quoteCache?.quotes ?? []).map((q) => [q.code, q]))
    const marketState = await readStockAnalysisMarketState(stockAnalysisDir, previousTradeDate)

    if (quotes.size === 0) {
      logger.warn(`[stock-analysis] [suplemento matinal] O cache de cotações está vazio，Ignorar coleta de dados`, { module: 'StockAnalysis' })
      saLog.warn('Service', `[suplemento matinal] O cache de cotações está vazio，pular sobre`)
      return
    }

    // Phase 4: Coleta de dados（chamar data-agents módulo）
    let factPoolUpdated = false
    try {
      const { collectAllAgents } = await import('./data-agents')
      const agentConfig = await readDataAgentConfig(stockAnalysisDir)
      const incomingFactPool = await collectAllAgents(stockAnalysisDir, previousTradeDate, quotes, marketState!, agentConfig)

      // Leia um conjunto de fatos existente，Mesclar ou salvar diretamente
      const existingFactPool = await readFactPool(stockAnalysisDir, previousTradeDate)
      if (existingFactPool) {
        await mergeFactPool(stockAnalysisDir, existingFactPool, incomingFactPool)
        logger.info(`[stock-analysis] [suplemento matinal] Conjuntos de fatos mesclados，novo ponto de dados: ${incomingFactPool.agentLogs.reduce((sum, log) => sum + log.dataPointCount, 0)}`)
      } else {
        await saveFactPool(stockAnalysisDir, incomingFactPool)
        logger.info(`[stock-analysis] [suplemento matinal] conjunto de fatos salvo（primeiro），pontos de dados: ${incomingFactPool.agentLogs.reduce((sum, log) => sum + log.dataPointCount, 0)}`)
      }
      factPoolUpdated = true
    } catch (error) {
      logger.error(`[stock-analysis] [suplemento matinal] Falha na coleta de dados: ${(error as Error).message}`)
      saLog.error('Service', `[suplemento matinal] Falha na coleta de dados: ${(error as Error).message}`)
    }

    // Phase 5: LLM extração de informações
    if (factPoolUpdated) {
      try {
        const { runLLMExtraction } = await import('./llm-extraction')
        const factPool = await readFactPool(stockAnalysisDir, previousTradeDate)
        if (!factPool) {
          logger.warn(`[stock-analysis] [suplemento matinal] FactPool está vazio，pular sobre LLM extração de informações`)
        } else {
          const aiConfig = await readStockAnalysisAIConfig(stockAnalysisDir)
          const incomingExtraction = await runLLMExtraction(stockAnalysisDir, factPool, aiConfig)

          // fundir-se com o existente LLM Extrair resultados
          const existingExtraction = await readLLMExtractionResult(stockAnalysisDir, previousTradeDate)
          if (existingExtraction) {
            const merged = await mergeLLMExtractionResult(stockAnalysisDir, existingExtraction, incomingExtraction)
            logger.info(`[stock-analysis] [suplemento matinal] LLM Extração de informações mesclada，Evento de anúncio: ${merged.announcements.length}，impacto das notícias: ${merged.newsImpacts.length}`)
          } else {
            await saveLLMExtractionResult(stockAnalysisDir, incomingExtraction)
            logger.info(`[stock-analysis] [suplemento matinal] LLM Extração de informações salva（primeiro），Evento de anúncio: ${incomingExtraction.announcements.length}，impacto das notícias: ${incomingExtraction.newsImpacts.length}`)
          }
        }
      } catch (error) {
        logger.error(`[stock-analysis] [suplemento matinal] LLM Falha na extração de informações: ${(error as Error).message}`)
        saLog.error('Service', `[suplemento matinal] LLM Falha na extração de informações: ${(error as Error).message}`)
      }
    }

    const elapsedMs = Date.now() - startMs
    logger.info(`[stock-analysis] [suplemento matinal] Terminar: targetTradeDate=${previousTradeDate} demorado=${elapsedMs}ms conjunto de fatos=${factPoolUpdated ? 'atualizado' : 'Não atualizado'}`, { module: 'StockAnalysis' })
    saLog.info('Service', `[suplemento matinal] Terminar: targetTradeDate=${previousTradeDate} demorado=${elapsedMs}ms conjunto de fatos=${factPoolUpdated ? 'atualizado' : 'Não atualizado'}`)
  } catch (error) {
    const elapsedMs = Date.now() - startMs
    logger.error(`[stock-analysis] [suplemento matinal] Exceção de processo: ${(error as Error).message}`, { error })
    saLog.error('Service', `[suplemento matinal] Exceção de processo: ${(error as Error).message} demorado=${elapsedMs}ms`)
    throw error
  }
}

/**
 * v1.35.0 [A5-P0-1] Entrada externa complementar matinal：adicionar in-flight O bloqueio evita o acionamento repetido de queimadura LLM token
 */
export async function runMorningSupplementAnalysis(stockAnalysisDir: string): Promise<void> {
  if (currentSupplementPromise) {
    saLog.info('Service', `[suplemento matinal] Já existe uma tarefa em andamento，Ignorar este gatilho`)
    return currentSupplementPromise
  }
  currentSupplementPromise = runMorningSupplementAnalysisInner(stockAnalysisDir)
    .finally(() => {
      currentSupplementPromise = null
    })
  return currentSupplementPromise
}

// ==================== S1: Monitoramento intradiário em tempo real ====================

const DEFAULT_INTRADAY_POLL_INTERVAL_MS = 60_000 // padrão 1 Enquete a cada minuto

/** Determine se o horário atual está dentro do pregão（09:30-11:30 ou 13:00-15:00） — confiado a trading-calendar */
function isWithinTradingHours(): boolean {
  return isWithinTradingHoursShared()
}

function assertWithinPostMarketWindow(startedAt: number, maxDurationMs: number, phase: string): void {
  const elapsedMs = Date.now() - startedAt
  if (elapsedMs <= maxDurationMs) {
    return
  }

  saLog.error('Service', `[depois do expediente] parada de tempo limite: phase=${phase} elapsed=${elapsedMs}ms budget=${maxDurationMs}ms`)
  throw new Error(`O processo fora do expediente excede ${Math.round(maxDurationMs / 60_000)} janela de minuto，Já em${phase}parada de palco（Tempo gasto ${Math.round(elapsedMs / 60_000)} minuto）`)
}

/**
 * Pesquisa única de monitoramento intradiário — Verifique o stop loss para todas as posições/Obtenha lucro/Situação de gatilho de stop loss
 */
export async function pollIntradayOnce(stockAnalysisDir: string): Promise<IntradayAlert[]> {
  const newAlerts: IntradayAlert[] = []
  const autoClosedPositionIds = new Set<string>()
  const tradingAvailability = checkTradingAvailability()
  const canAutoCloseIntraday = tradingAvailability.canTrade

  try {
    const positions = await readStockAnalysisPositions(stockAnalysisDir)
    if (positions.length === 0) return newAlerts

    const config = await readStockAnalysisConfig(stockAnalysisDir)
    const codes = positions.map((p) => p.code)
    const quoteEnvelope = await getQuoteData(stockAnalysisDir, codes)
    const quotes = quoteEnvelope.data
    const monitorStatus = await readIntradayMonitorStatus(stockAnalysisDir)

    // Crie um conjunto de desduplicação de alarmes não reconhecidos existentes: "positionId-alertType"
    const existingAlerts = await readIntradayAlerts(stockAnalysisDir)
    const unackedAlertKeys = new Set(
      existingAlerts.filter((a) => !a.acknowledged).map((a) => `${a.positionId}-${a.alertType}`),
    )

    for (const position of positions) {
      const quote = quotes.get(position.code)
      if (!quote || quote.latestPrice <= 0) continue

      const currentPrice = quote.latestPrice
      const buyPrice = position.costPrice
      const pnlPercent = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0

      /** Remover alertas push duplicados: Mesma posição+Apenas um alarme não reconhecido do mesmo tipo é retido. */
      const pushAlertIfNew = (alertType: IntradayAlert['alertType'], triggerPrice: number, message: string) => {
        const key = `${position.id}-${alertType}`
        if (unackedAlertKeys.has(key)) return
        unackedAlertKeys.add(key) // Evitar repetições na mesma rodada
        newAlerts.push({
          id: `alert-${alertType}-${position.code}-${Date.now()}`,
          timestamp: nowIso(),
          positionId: position.id,
          code: position.code,
          name: position.name,
          alertType,
          currentPrice,
          triggerPrice,
          message,
          acknowledged: false,
        })
      }

      // Verificação de stop loss
      if (pnlPercent <= -config.stopLossPercent) {
        pushAlertIfNew('stop_loss', buyPrice * (1 - config.stopLossPercent / 100),
          `${position.name} Stop loss acionado: preço atual ${currentPrice}, Perda ${pnlPercent.toFixed(1)}% Exceder a linha de stop loss ${config.stopLossPercent}%`)
      }

      if (canAutoCloseIntraday && pnlPercent <= -config.intradayAutoCloseLossPercent) {
        try {
          await closeStockAnalysisPosition(stockAnalysisDir, position.id, {
            closeAll: true,
            price: currentPrice,
            note: `O sistema interrompe automaticamente as perdas e fecha posições durante o dia：${position.name}(${position.code}) Perda ${pnlPercent.toFixed(2)}% Exceder ${config.intradayAutoCloseLossPercent}% limite`,
            clientNonce: `intraday-auto-close-${position.id}-${monitorStatus.pollCount + 1}`,
          })
          autoClosedPositionIds.add(position.id)
          saLog.warn('Service', `[intradiário] Gatilho de fechamento automático: ${position.code} current=${currentPrice} pnl=${pnlPercent.toFixed(2)}% threshold=-${config.intradayAutoCloseLossPercent}%`)
        } catch (error) {
          logger.error(`[stock-analysis] [intradiário] Falha no fechamento automático ${position.code}: ${(error as Error).message}`, { module: 'StockAnalysis' })
          saLog.error('Service', `[intradiário] Falha no fechamento automático ${position.code}: ${(error as Error).message}`)
        }
      }

      if (canAutoCloseIntraday && pnlPercent >= config.intradayAutoCloseProfitPercent) {
        try {
          await closeStockAnalysisPosition(stockAnalysisDir, position.id, {
            closeAll: true,
            price: currentPrice,
            note: `O sistema obtém lucro automaticamente e fecha posições durante o dia.：${position.name}(${position.code}) lucro ${pnlPercent.toFixed(2)}% Exceder ${config.intradayAutoCloseProfitPercent}% limite`,
            clientNonce: `intraday-auto-take-profit-${position.id}-${monitorStatus.pollCount + 1}`,
          })
          autoClosedPositionIds.add(position.id)
          saLog.warn('Service', `[intradiário] Gatilho automático de lucro: ${position.code} current=${currentPrice} pnl=${pnlPercent.toFixed(2)}% threshold=${config.intradayAutoCloseProfitPercent}%`)
        } catch (error) {
          logger.error(`[stock-analysis] [intradiário] Falha na obtenção de lucro automático ${position.code}: ${(error as Error).message}`, { module: 'StockAnalysis' })
          saLog.error('Service', `[intradiário] Falha na obtenção de lucro automático ${position.code}: ${(error as Error).message}`)
        }
      }

      // Obtenha lucro 1 examinar
      if (pnlPercent >= config.takeProfitPercent1) {
        pushAlertIfNew('take_profit_1', buyPrice * (1 + config.takeProfitPercent1 / 100),
          `${position.name} Acionar lucro1: preço atual ${currentPrice}, lucro ${pnlPercent.toFixed(1)}% Linha de take-profit alcançada ${config.takeProfitPercent1}%`)
      }

      // Obtenha lucro 2 examinar
      if (pnlPercent >= config.takeProfitPercent2) {
        pushAlertIfNew('take_profit_2', buyPrice * (1 + config.takeProfitPercent2 / 100),
          `${position.name} Acionar lucro2: preço atual ${currentPrice}, lucro ${pnlPercent.toFixed(1)}% Linha de take-profit alcançada ${config.takeProfitPercent2}%`)
      }

      // Verificação de dias máximos de retenção
      const holdDays = Math.ceil((Date.now() - new Date(position.openedAt).getTime()) / (1000 * 60 * 60 * 24))
      if (holdDays >= config.maxHoldDays) {
        pushAlertIfNew('max_hold_days', 0,
          `${position.name} A posição foi alcançada ${holdDays} céu，Excedeu o número máximo de dias de retenção ${config.maxHoldDays} céu`)
      }

      // [MH2] Detecção de pico de volatilidade：Amplitude intradiária excede limite（6%）alarme quando
      if (quote.previousClose > 0 && quote.high > 0 && quote.low > 0) {
        const intradayAmplitude = (quote.high - quote.low) / quote.previousClose * 100
        const VOLATILITY_SPIKE_THRESHOLD = 6 // Amplitude intradiária excedida6%consideradas flutuações anormais
        if (intradayAmplitude > VOLATILITY_SPIKE_THRESHOLD) {
          pushAlertIfNew('volatility_spike', 0,
            `${position.name} Amplitude intradiária anormal: ${intradayAmplitude.toFixed(1)}% (limite ${VOLATILITY_SPIKE_THRESHOLD}%)，preço atual ${currentPrice}`)
        }
      }
    }

    // [MH2] Detecção de anormalidades no setor：Todo5Nesta enquete, verifique se existem várias ações no setor onde as ações são mantidas ao mesmo tempo.
    // Obtenha informações do setor usando dados de sinais das últimas análises diárias，Evite consultas extras de dados
    if (monitorStatus.pollCount % 5 === 0) {
      try {
        const latestSnapshot = await readLatestSnapshot(stockAnalysisDir)
        if (latestSnapshot) {
          // do sinal snapshot Estabelecido em code → sector mapeamento
          const codeSectorMap = new Map<string, string>()
          for (const signal of latestSnapshot.signals) {
            if (signal.snapshot?.sector) {
              codeSectorMap.set(signal.code, signal.snapshot.sector)
            }
          }
          // Obtenha os setores em que as ações são mantidas
          const positionSectors = new Map<string, string>()
          for (const position of positions) {
            const sector = codeSectorMap.get(position.code)
            if (sector) positionSectors.set(position.code, sector)
          }
          const sectorSet = new Set(positionSectors.values())
          if (sectorSet.size > 0) {
            // Conte o número de limites inferiores de ações no mesmo setor（Use o que já está no sinal snapshot dados，Sem solicitações adicionais）
            const sectorLimitDownCount = new Map<string, number>()
            for (const signal of latestSnapshot.signals) {
              if (!signal.snapshot?.sector || !sectorSet.has(signal.snapshot.sector)) continue
              // Usando cotações em tempo real changePercent（se houver），Caso contrário, use snapshot de
              const quote = quotes.get(signal.code)
              const changePercent = quote?.changePercent ?? signal.snapshot.changePercent
              const limitThreshold = (signal.code.startsWith('3') || signal.code.startsWith('68')) ? -19.5 : -9.5
              if (changePercent <= limitThreshold) {
                sectorLimitDownCount.set(signal.snapshot.sector, (sectorLimitDownCount.get(signal.snapshot.sector) ?? 0) + 1)
              }
            }
            // 3Somente acima do limite inferior → Alarme
            for (const [sector, count] of sectorLimitDownCount) {
              if (count >= 3) {
                const affectedPositions = positions.filter((p) => positionSectors.get(p.code) === sector)
                for (const position of affectedPositions) {
                  const sectorKey = `${position.id}-sector_anomaly`
                  if (!unackedAlertKeys.has(sectorKey)) {
                    unackedAlertKeys.add(sectorKey)
                    newAlerts.push({
                      id: `alert-sector_anomaly-${position.code}-${Date.now()}`,
                      timestamp: nowIso(),
                      positionId: position.id,
                      code: position.code,
                      name: position.name,
                      alertType: 'sector_anomaly',
                      currentPrice: quotes.get(position.code)?.latestPrice ?? 0,
                      triggerPrice: 0,
                      message: `${position.name} Seção"${sector}"Algo incomum aconteceu: ${count} Apenas as ações atingiram seu limite，Recomendado para prestar atenção`,
                      acknowledged: false,
                    })
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        logger.warn(`[stock-analysis] [intradiário] Falha na detecção de anormalidade no setor（Não afeta outros alarmes）: ${(error as Error).message}`)
      }
    }

    // Atualizar status e salvar（existingAlerts Já li acima sobre desduplicação）
    if (newAlerts.length > 0) {
      await saveIntradayAlerts(stockAnalysisDir, [...newAlerts, ...existingAlerts].slice(0, 500))
      logger.warn(`[stock-analysis] [intradiário] Novo ${newAlerts.length} alarme`, { module: 'StockAnalysis' })
      saLog.info('Service', `[intradiário] Adicionar novo alarme ${newAlerts.length} tira: ${newAlerts.map((a) => `${a.code}:${a.alertType}`).join(', ')}`)
    }

    if (autoClosedPositionIds.size > 0) {
      saLog.audit('Service', `[intradiário] Fechamento automático concluído ${autoClosedPositionIds.size} Caneta: ${positions.filter((position) => autoClosedPositionIds.has(position.id)).map((position) => position.code).join(', ')}`)
    }

    await saveIntradayMonitorStatus(stockAnalysisDir, {
      ...monitorStatus,
      lastPollAt: nowIso(),
      pollCount: monitorStatus.pollCount + 1,
      alerts: [...newAlerts, ...monitorStatus.alerts].slice(0, 100),
    })

    saLog.debug('Service', `[intradiário] votação#${monitorStatus.pollCount + 1}: Posição=${positions.length} Há uma oferta=${codes.filter((c) => quotes.has(c)).length} novo alarme=${newAlerts.length}`)
  } catch (error) {
    logger.error(`[stock-analysis] [intradiário] Falha na pesquisa: ${(error as Error).message}`, { module: 'StockAnalysis' })
    saLog.error('Service', `[intradiário] Falha na pesquisa: ${(error as Error).message}`)
  }

  return newAlerts
}

/**
 * Inicie o monitoramento do disco em tempo real — Iniciar cronômetro，Pesquise a cada minuto durante o horário de negociação
 */
export async function startIntradayMonitor(stockAnalysisDir: string): Promise<IntradayMonitorStatus> {
  // Se já estiver em execução，Pare e reinicie
  if (intradayMonitorTimer) {
    clearInterval(intradayMonitorTimer)
    intradayMonitorTimer = null
  }

  const status: IntradayMonitorStatus = {
    state: 'running',
    lastPollAt: null,
    pollCount: 0,
    alerts: [],
    startedAt: nowIso(),
  }
  await saveIntradayMonitorStatus(stockAnalysisDir, status)

  // Faça uma enquete imediatamente
  await pollIntradayOnce(stockAnalysisDir)

  // Iniciar cronômetro
  // v1.35.0 [A5-P0-4] adicionar in-flight Trancar：prevenir duas vezes tick causado pela execução sobreposta intraday/status.json race
  intradayMonitorTimer = setInterval(() => {
    if (!isWithinTradingHours()) {
      logger.info('[stock-analysis] [intradiário] horário sem negociação，Pular votação', { module: 'StockAnalysis' })
      return
    }
    if (intradayPollInFlight) {
      saLog.debug('Service', `[intradiário] A última enquete não foi concluída，Pule esse tempo tick`)
      return
    }
    intradayPollInFlight = true
    void pollIntradayOnce(stockAnalysisDir).finally(() => {
      intradayPollInFlight = false
    })
  }, DEFAULT_INTRADAY_POLL_INTERVAL_MS)

  logger.info('[stock-analysis] [intradiário] O monitoramento é iniciado', { module: 'StockAnalysis' })
  return status
}

/**
 * Pare o monitoramento intradiário em tempo real
 */
export async function stopIntradayMonitor(stockAnalysisDir: string): Promise<IntradayMonitorStatus> {
  if (intradayMonitorTimer) {
    clearInterval(intradayMonitorTimer)
    intradayMonitorTimer = null
  }

  const status = await readIntradayMonitorStatus(stockAnalysisDir)
  const updatedStatus: IntradayMonitorStatus = {
    ...status,
    state: 'idle',
  }
  await saveIntradayMonitorStatus(stockAnalysisDir, updatedStatus)

  logger.info('[stock-analysis] [intradiário] O monitoramento foi interrompido', { module: 'StockAnalysis' })
  return updatedStatus
}

/**
 * Obtenha o status de monitoramento intradiário
 */
export async function getIntradayMonitorStatusData(stockAnalysisDir: string): Promise<IntradayMonitorStatus> {
  return readIntradayMonitorStatus(stockAnalysisDir)
}

/**
 * Obtenha a lista de alarmes intradiários
 */
export async function getIntradayAlerts(stockAnalysisDir: string): Promise<IntradayAlert[]> {
  return readIntradayAlerts(stockAnalysisDir)
}

/**
 * confirmar/Fechar alarme intradiário
 */
export async function acknowledgeIntradayAlert(stockAnalysisDir: string, alertId: string): Promise<IntradayAlert | null> {
  const alerts = await readIntradayAlerts(stockAnalysisDir)
  const alert = alerts.find((a) => a.id === alertId)
  if (!alert) return null
  alert.acknowledged = true
  await saveIntradayAlerts(stockAnalysisDir, alerts)
  return alert
}

/**
 * Confirme todos os alarmes de disco não lidos em lotes
 */
export async function acknowledgeAllIntradayAlerts(stockAnalysisDir: string): Promise<number> {
  const alerts = await readIntradayAlerts(stockAnalysisDir)
  let count = 0
  for (const alert of alerts) {
    if (!alert.acknowledged) {
      alert.acknowledged = true
      count++
    }
  }
  if (count > 0) {
    await saveIntradayAlerts(stockAnalysisDir, alerts)
  }
  return count
}

function buildFallbackMarketState(tradeDate: string): StockAnalysisMarketState {
  return {
    asOfDate: tradeDate,
    trend: 'range_bound',
    volatility: 'normal_volatility',
    liquidity: 'normal_liquidity',
    sentiment: 'neutral',
    style: 'balanced',
    csi500Return20d: 0,
    annualizedVolatility20d: 0,
    averageTurnover20d: 0,
    risingRatio: 0,
  }
}

/**
 * v1.35.0 [A4-P0-3] T+1 Fuso horário unificado：openedAt sim UTC ISO，todayDate() É data de Pequim。
 * Versão antiga openedAt.slice(0, 10) Leve-o diretamente UTC sequência de data，no horário de Pequim 00:00-07:59 intervalo（UTC no dia anterior 16:00-23:59）
 * Será melhor que Pequim today Um dia a menos，levar a T+1 Verificação inválida（Pode ser vendido no mesmo dia）。
 * reparar：Pacote openedAt Converta corretamente para a data de Pequim e compare。
 * Priorize o uso ao mesmo tempo position.openDate（A data de Pequim é usada ao escrever，mais confiável）。
 */
function assertPositionCanSellToday(position: StockAnalysisPosition) {
  const tradeToday = todayDate() // Asia/Shanghai YYYY-MM-DD
  // uso prioritário openDate（Instantâneo da data de Pequim no momento da escrita），Em segundo lugar, use openedAt Mudar para o fuso horário de Pequim
  let openedDate = position.openDate
  if (!openedDate || !/^\d{4}-\d{2}-\d{2}$/.test(openedDate)) {
    openedDate = new Date(position.openedAt).toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' })
  }
  if (openedDate === tradeToday) {
    throw new Error(`Acompartilhar T+1 limite：${position.name}(${position.code}) No ${openedDate} comprar，Não pode ser vendido no mesmo dia`)
  }
}

export async function getStockAnalysisOverview(stockAnalysisDir: string): Promise<StockAnalysisOverview> {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
  const snapshot = await readLatestSnapshot(stockAnalysisDir)
  const [positions, trades, watchLogsRaw, weeklySummaryStored, monthlySummaryStored, modelGroupsStored, performanceDashboardStored, config, reviews, riskEvents, learnedWeights, thresholdHistory, expertPerformance, allNotifications, intradayStatus] = await Promise.all([
    readStockAnalysisPositions(stockAnalysisDir),
    readStockAnalysisTrades(stockAnalysisDir),
    readStockAnalysisWatchLogs(stockAnalysisDir),
    readStockAnalysisWeeklySummary(stockAnalysisDir),
    readStockAnalysisMonthlySummary(stockAnalysisDir),
    readStockAnalysisModelGroups(stockAnalysisDir),
    readStockAnalysisPerformanceDashboard(stockAnalysisDir),
    readStockAnalysisConfig(stockAnalysisDir),
    readStockAnalysisReviews(stockAnalysisDir),
    readStockAnalysisRiskEvents(stockAnalysisDir),
    readStockAnalysisLearnedWeights(stockAnalysisDir),
    readStockAnalysisThresholdHistory(stockAnalysisDir),
    readStockAnalysisExpertPerformance(stockAnalysisDir),
    readAutoReportNotifications(stockAnalysisDir),
    readIntradayMonitorStatus(stockAnalysisDir),
  ])

  const watchLogs = await evaluateWatchLogOutcomes(stockAnalysisDir, watchLogsRaw)
  if (JSON.stringify(watchLogsRaw) !== JSON.stringify(watchLogs)) {
    await saveStockAnalysisWatchLogs(stockAnalysisDir, watchLogs)
  }

  const stockPool = await readStockAnalysisStockPool(stockAnalysisDir)
  const quoteEnvelope = positions.length > 0 ? await getQuoteData(stockAnalysisDir, positions.map((position) => position.code)) : { data: new Map<string, StockAnalysisSpotQuote>(), fetchedAt: runtimeStatus.quoteCacheAt, usedFallback: false, staleReasons: [] }

  // v1.35.0 [A2-P0-1] reparar dashboard race Posições fantasmas：
  // existir TRADING_LOCK_KEY Reler dentro do bloqueio positions（pode ter sido close/reduce Rever），
  // Atualize apenas os campos de tempo de execução do mercado（currentPrice / returnPercent / action / highestPriceSinceOpen），
  // Nunca substitua completamente com base em instantâneos obsoletos positions.json。
  let livePositions = positions
  if (positions.length > 0) {
    livePositions = await withFileLock(TRADING_LOCK_KEY, async () => {
      const fresh = await readStockAnalysisPositions(stockAnalysisDir)
      const updated = fresh.map((position) => {
        const quote = quoteEnvelope.data.get(position.code)
        if (!quote) return position
        return updatePositionRuntime(position, quote, config)
      })
      if (JSON.stringify(updated) !== JSON.stringify(fresh)) {
        await saveStockAnalysisPositions(stockAnalysisDir, updated)
      }
      return updated
    })
  }

  const tradeDate = snapshot?.tradeDate ?? runtimeStatus.latestSuccessfulSignalDate ?? runtimeStatus.latestSignalDate ?? todayDate()
  const performance = calculatePerformance(trades)
  const weeklySummary = weeklySummaryStored.length > 0 ? weeklySummaryStored : buildWeeklySummary(trades, watchLogs)
  const monthlySummary = monthlySummaryStored.length > 0 ? monthlySummaryStored : buildMonthlySummary(trades, watchLogs)
  const modelGroupPerformance = await resolveModelGroupPerformance(stockAnalysisDir, modelGroupsStored, expertPerformance)
  const performanceDashboard = performanceDashboardStored ?? buildPerformanceDashboard(snapshot?.signals ?? [], watchLogs, trades, modelGroupPerformance, snapshot?.marketState ?? buildFallbackMarketState(tradeDate))
  const dataState = resolveDataState(runtimeStatus)
  const staleReasons = mergeStaleReasons(runtimeStatus.staleReasons, quoteEnvelope.staleReasons)

  const currentMarketState = snapshot?.marketState ?? buildFallbackMarketState(tradeDate)
  const currentRegime = getMarketRegime(currentMarketState)
  const baseFusionWeights = getFusionWeights(config, currentMarketState)
  const currentFusionWeights = getAdjustedFusionWeights(baseFusionWeights, learnedWeights)
  const marketLevelRisk = evaluateMarketLevelRisk(currentMarketState, config)

  // Avaliação de posição：de recente daily run Obter cache，ou cálculo em tempo real
  let positionEvaluations: StockAnalysisPositionEvaluation[] = []
  let swapSuggestions: StockAnalysisSwapSuggestion[] = []
  const latestDailyRun = snapshot?.dailyRun ?? null
  if (latestDailyRun?.positionEvaluations && latestDailyRun.positionEvaluations.length > 0) {
    positionEvaluations = latestDailyRun.positionEvaluations
    swapSuggestions = latestDailyRun.swapSuggestions ?? []
  } else if (livePositions.length > 0) {
    // [P2-18] Overview A relegação da avaliação em tempo real à simulação de fórmulas é intencional：
    // LLM Votar leva tempo 30-120 Segundo/compartilhar，Não adequado overview solicitação em tempo real。
    // Se necessário LLM Avaliar，Por favor, passe daily run ou post-market acionar（Os resultados serão armazenados em cache para dailyRun.positionEvaluations）。
    const existingSignals = snapshot?.signals ?? []
    const signalMap = new Map(existingSignals.map((signal) => [signal.id, signal]))
    for (const position of livePositions) {
      const posQuote = quoteEnvelope.data.get(position.code)
      if (!posQuote || posQuote.latestPrice <= 0) continue
      try {
        const posHistoryEnvelope = await getStockHistoryData(stockAnalysisDir, position.code)
        if (posHistoryEnvelope.data.length < 30) continue
        const posCandidate: StockAnalysisWatchlistCandidate = {
          code: position.code,
          name: position.name,
          market: position.code.startsWith('6') ? 'sh' : position.code.startsWith('0') || position.code.startsWith('3') ? 'sz' : 'bj',
          exchange: position.code.startsWith('6') ? 'SSE' : 'SZSE',
        }
        const industryStrengthMap = buildIndustryStrengthMap(stockPool, quoteEnvelope.data)
        const posSnapshot = buildSnapshot(posCandidate, posQuote, posHistoryEnvelope.data, config, industryStrengthMap)
        const buySignal = position.sourceSignalId ? signalMap.get(position.sourceSignalId) : null
        const buyCompositeScore = buySignal?.compositeScore ?? 65
        const buyFinalScore = buySignal?.finalScore ?? buyCompositeScore
        positionEvaluations.push(await evaluatePositionScores(position, posSnapshot, currentMarketState, config, buyCompositeScore, buyFinalScore))
      } catch {
        // Ignorando silenciosamente se a avaliação falhar，não afeta overview
      }
    }
    swapSuggestions = buildSwapSuggestions(positionEvaluations, snapshot?.signals ?? [], config.maxPositions, livePositions.length)
  }

  return {
    generatedAt: nowIso(),
    tradeDate,
    stockAnalysisDir,
    marketState: currentMarketState,
    marketRegime: currentRegime,
    fusionWeights: currentFusionWeights,
    stats: {
      stockPoolSize: stockPool.length,
      candidatePoolSize: snapshot?.signals.length ?? 0,
      passingSignals: (snapshot?.signals ?? []).filter((signal) => signal.action === 'buy' || signal.action === 'strong_buy').length,
      watchSignals: (snapshot?.signals ?? []).filter((signal) => signal.action === 'watch').length,
      openPositions: livePositions.length,
      tradeRecords: trades.length,
      cumulativeReturn: performance.cumulativeReturn,
      weeklyReturn: weeklySummary[0]?.weeklyReturn ?? 0,
      winRate: performance.winRate,
      maxDrawdown: weeklySummary[0]?.maxDrawdown ?? 0,
      maxPositions: config.maxPositions,
    },
    topSignals: snapshot?.signals.slice(0, 12) ?? [],
    positions: livePositions,
    recentTrades: trades.slice(0, 16),
    watchLogs: watchLogs.slice(0, 12),
    weeklySummary: weeklySummary.slice(0, 8),
    monthlySummary: monthlySummary.slice(0, 6),
    modelGroupPerformance,
    performanceDashboard,
    recentReviews: reviews.slice(0, 10),
    riskEvents: riskEvents.slice(0, 50),
    riskLimits: config.portfolioRiskLimits,
    positionEvaluations,
    swapSuggestions,
    notifications: allNotifications.filter((n) => !n.acknowledged).slice(0, 10),
    marketLevelRisk,
    learnedWeights,
    expertPerformance,
    thresholdHistory: thresholdHistory.adjustments.slice(0, 20),
    systemStatus: {
      lastRunAt: runtimeStatus.lastRunAt,
      lastSuccessAt: runtimeStatus.lastSuccessAt,
      lastError: runtimeStatus.lastError,
      stockPoolRefreshedAt: runtimeStatus.stockPoolRefreshedAt,
      latestSignalDate: runtimeStatus.latestSuccessfulSignalDate ?? runtimeStatus.latestSignalDate,
      runState: runtimeStatus.runState,
      currentRun: runtimeStatus.currentRun,
      dataState,
      staleReasons,
      quoteCacheAt: runtimeStatus.quoteCacheAt,
      indexHistoryCacheAt: runtimeStatus.indexHistoryCacheAt,
      isUsingFallback: runtimeStatus.isUsingFallback || quoteEnvelope.usedFallback,
      riskControl: runtimeStatus.riskControl ?? DEFAULT_RISK_CONTROL_STATE,
      postMarketAt: runtimeStatus.postMarketAt,
      intradayMonitor: {
        state: intradayStatus.state,
        lastPollAt: intradayStatus.lastPollAt,
        pollCount: intradayStatus.pollCount,
        activeAlertCount: intradayStatus.alerts.filter((a) => !a.acknowledged).length,
        startedAt: intradayStatus.startedAt,
      },
    },
  }
}

export async function getStockAnalysisSignals(stockAnalysisDir: string) {
  const snapshot = await readLatestSnapshot(stockAnalysisDir)
  return snapshot?.signals ?? []
}

/**
 * Encontre sinais entre datas — Verifique a data mais recente primeiro，Se não for encontrado, atravesse o mais próximo 7 arquivo de sinal diurno
 * resolver T+1 confirmar T problema de sinal diurno
 */
async function findSignalByIdAcrossDates(
  stockAnalysisDir: string,
  signalId: string,
): Promise<{ signals: StockAnalysisSignal[]; signal: StockAnalysisSignal | null }> {
  // Pesquise primeiro a partir da data mais recente（caminhos mais comuns）
  const latestSignals = await getStockAnalysisSignals(stockAnalysisDir)
  const found = latestSignals.find((item) => item.id === signalId)
  if (found) return { signals: latestSignals, signal: found }

  // Última data não encontrada，Percorrer recente 7 datas disponíveis
  const dates = await getAvailableSignalDates(stockAnalysisDir)
  for (const date of dates.slice(0, 7)) {
    const signals = await readStockAnalysisSignals(stockAnalysisDir, date)
    const match = signals.find((item) => item.id === signalId)
    if (match) return { signals, signal: match }
  }

  return { signals: [], signal: null }
}

export async function getStockAnalysisPositions(stockAnalysisDir: string) {
  return readStockAnalysisPositions(stockAnalysisDir)
}

export async function getStockAnalysisTrades(stockAnalysisDir: string) {
  return readStockAnalysisTrades(stockAnalysisDir)
}

export async function getStockAnalysisWatchLogs(stockAnalysisDir: string) {
  return readStockAnalysisWatchLogs(stockAnalysisDir)
}

// ==================== notificar + relatório mensal API função ====================

export async function getStockAnalysisNotifications(stockAnalysisDir: string): Promise<AutoReportNotification[]> {
  return readAutoReportNotifications(stockAnalysisDir)
}

export async function acknowledgeStockAnalysisNotification(stockAnalysisDir: string, notificationId: string): Promise<AutoReportNotification | null> {
  const notifications = await readAutoReportNotifications(stockAnalysisDir)
  const target = notifications.find((n) => n.id === notificationId)
  if (!target) return null
  target.acknowledged = true
  await saveAutoReportNotifications(stockAnalysisDir, notifications)
  return target
}

export async function getStockAnalysisMonthlyReports(stockAnalysisDir: string): Promise<MonthlyReport[]> {
  return readMonthlyReports(stockAnalysisDir)
}

export async function getStockAnalysisHealthStatus(stockAnalysisDir: string): Promise<StockAnalysisHealthStatus> {
  const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
  const dataState = resolveDataState(runtimeStatus)
  return {
    ok: dataState !== 'empty' || runtimeStatus.runState === 'running',
    dataState,
    runState: runtimeStatus.runState,
    lastSuccessAt: runtimeStatus.lastSuccessAt,
    latestSignalDate: runtimeStatus.latestSuccessfulSignalDate ?? runtimeStatus.latestSignalDate,
    staleReasons: runtimeStatus.staleReasons,
    isUsingFallback: runtimeStatus.isUsingFallback,
  }
}

export async function confirmStockAnalysisSignal(
  stockAnalysisDir: string,
  signalId: string,
  request: StockAnalysisTradeRequest,
  options?: { bypassTradingHours?: boolean; autoBuy?: boolean },
) {
  const { signals, signal } = await findSignalByIdAcrossDates(stockAnalysisDir, signalId)
  if (!signal) return null

  // Fix 1: O sinal que foi operado não pode ser operado novamente
  if (signal.decisionSource !== 'system') {
    throw new Error(`O sinal foi processado（${signal.decisionSource}），Nenhuma operação repetível`)
  }

  const isBuySignal = signal.action === 'strong_buy' || signal.action === 'buy'
  const isWatchOrNone = signal.action === 'watch' || signal.action === 'none'
  const hasQuantity = (request.quantity ?? 0) > 0

  // watch/none confirmar + Sem quantidade = Marcar apenas como lido，Nenhuma posição criada（Não é necessária verificação do tempo de transação）
  if (isWatchOrNone && !hasQuantity) {
    const nextSignals = signals.map((item) =>
      item.id === signalId
        ? { ...item, decisionSource: 'user_confirmed' as DecisionSource, userDecisionNote: request.note?.trim() || null }
        : item,
    )
    await saveStockAnalysisSignals(stockAnalysisDir, signal.tradeDate, nextSignals)
    saLog.audit('Service', `signal acknowledged (${signal.action}): ${signal.code} tradeDate=${signal.tradeDate}`)
    return { confirmed: true, position: null }
  }

  // buy O sinal deve ter uma quantidade
  if (isBuySignal && !hasQuantity) {
    throw new Error('O sinal de compra deve especificar a quantidade do pedido')
  }

  // Fix 2: As operações que envolvam compra real devem ocorrer dentro do horário de negociação（O processo de compra automática pode ser contornado）
  if (!options?.bypassTradingHours && !isTradingHoursBypassedForTests()) {
    const tradingCheck = checkTradingAvailability()
    if (!tradingCheck.canTrade) {
      throw new Error(`Atualmente não negociável：${tradingCheck.reason}`)
    }
  }

  // P0-3: Operação de transação mais bloqueio mutex，Evite a perda de dados causada por condições de corrida de simultaneidade
  return withFileLock(TRADING_LOCK_KEY, async () => {
    // A seguir está o processo para criar uma posição（buy/strong_buy ou substituição do usuário watch/none）
    const [positions, trades, config, blacklist, runtimeStatus] = await Promise.all([
      readStockAnalysisPositions(stockAnalysisDir),
      readStockAnalysisTrades(stockAnalysisDir),
      readStockAnalysisConfig(stockAnalysisDir),
      readStockAnalysisBlacklist(stockAnalysisDir),
      readStockAnalysisRuntimeStatus(stockAnalysisDir),
    ])

    if (positions.some((position) => position.code === signal.code)) {
      throw new Error('O alvo já está em posição')
    }
    if (positions.length >= config.maxPositions) {
      const vetoEvent: StockAnalysisRiskEvent = {
        id: `risk-veto_max_positions-${Date.now()}`,
        timestamp: nowIso(),
        eventType: 'veto_max_positions',
        reason: `O número de posições atingiu o limite superior（${config.maxPositions}），rejeitar comprar ${signal.name}(${signal.code})`,
        metrics: {},
        relatedCode: signal.code,
      }
      const existingEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
      await saveStockAnalysisRiskEvents(stockAnalysisDir, [vetoEvent, ...existingEvents])
      throw new Error(`O número de posições atingiu o limite superior（${config.maxPositions}），Por favor, feche sua posição antes de abrir uma nova`)
    }
    const latestMarketState = await readStockAnalysisMarketState(stockAnalysisDir, todayDate())
    let effectiveMaxTotalPosition = config.maxTotalPosition ?? 1.0

    // P1-5: Verifique os controles de risco em nível de mercado（mercado de baixa extrema/Prevenir a abertura de posições durante crises de liquidez）
    // Observação：Supressão de proporção de posição（lowLiquidityGuardrail.maxPositionRatio）Removido por decisão do usuário，
    // Apenas mantenha extremeBear/liquidityCrisis interceptação difícil，Apenas registros de baixa liquidez info registro
    if (latestMarketState) {
      const marketRisk = evaluateMarketLevelRisk(latestMarketState, config)
      if (marketRisk.extremeBearActive) {
        throw new Error('Controle de risco em nível de mercado：condições extremas de mercado em baixa，Novas vagas foram restritas')
      }
      if (marketRisk.liquidityCrisisActive) {
        saLog.audit('Service', `confirmSignal Interceptação de crise de liquidez em nível de mercado ${signal.code}: ${describeMarketLiquidityState(latestMarketState, config)}`)
        throw new Error('Controle de risco em nível de mercado：estado de crise de liquidez，Novas vagas foram restritas')
      }
      if (marketRisk.lowLiquidityActive) {
        saLog.info('Service', `confirmSignal Protetores de baixa liquidez em vigor ${signal.code}: ${describeMarketLiquidityState(latestMarketState, config)} maxPositionRatio=${marketRisk.effectiveMaxPositionRatio}`)
      }
    }

    // v1.35.0 [A3-P0-2] Verificação forçada weight：NaN/Infinity/valor negativo/zero/Transcendência rejeitar tudo，não faça silêncio clamp
    const requestedWeight = request.weight ?? signal.suggestedPosition
    if (!Number.isFinite(requestedWeight)) {
      throw new Error(`weight ilegal（NaN/Infinity）：${requestedWeight}`)
    }
    if (requestedWeight <= 0 || requestedWeight > 1) {
      throw new Error(`weight deve estar em (0, 1] intervalo，receber ${requestedWeight}`)
    }
    const targetWeight = round(requestedWeight, 4)
    if (targetWeight > config.maxSinglePosition) {
      throw new Error(`A posição de uma única ação não pode exceder ${(config.maxSinglePosition * 100).toFixed(0)}%`)
    }

    // P1-6: Verifique o limite de peso total da posição
    const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0)
    if (totalWeight + targetWeight > effectiveMaxTotalPosition) {
      throw new Error(`O peso total da posição atingiu o limite superior（atual ${round(totalWeight * 100)}%，Novo ${round(targetWeight * 100)}%，limite superior ${round(effectiveMaxTotalPosition * 100)}%），Por favor, reduza sua posição antes de abrir uma nova posição`)
    }
    if (blacklist.includes(signal.code)) {
      const vetoEvent: StockAnalysisRiskEvent = {
        id: `risk-veto_blacklist-${Date.now()}`,
        timestamp: nowIso(),
        eventType: 'veto_blacklist',
        reason: `Alvo ${signal.code}（${signal.name}）na lista negra，rejeitar comprar`,
        metrics: {},
        relatedCode: signal.code,
      }
      const existingEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
      await saveStockAnalysisRiskEvents(stockAnalysisDir, [vetoEvent, ...existingEvents])
      throw new Error(`Alvo ${signal.code}（${signal.name}）na lista negra，Comprar é proibido`)
    }
    if (runtimeStatus.riskControl.paused) {
      const vetoEvent: StockAnalysisRiskEvent = {
        id: `risk-veto_paused-${Date.now()}`,
        timestamp: nowIso(),
        eventType: 'veto_paused',
        reason: `O controle de risco do sistema restringiu novas posições，rejeitar comprar ${signal.name}(${signal.code})：${runtimeStatus.riskControl.pauseReason ?? 'razão desconhecida'}`,
        metrics: {},
        relatedCode: signal.code,
      }
      const existingEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
      await saveStockAnalysisRiskEvents(stockAnalysisDir, [vetoEvent, ...existingEvents])
      throw new Error(`O controle de risco do sistema restringiu novas posições：${runtimeStatus.riskControl.pauseReason ?? 'razão desconhecida'}`)
    }

    // Fix 3: É dada prioridade ao uso de cotações em tempo real para preços de compra.（Alinhe com a venda）
    let price = request.price
    if (price == null) {
      try {
        const quoteEnvelope = await getQuoteData(stockAnalysisDir, [signal.code])
        const quote = quoteEnvelope.data.get(signal.code)
        if (quote && quote.latestPrice > 0) {
          price = quote.latestPrice
          saLog.audit('Service', `confirmSignal: ${signal.code} Preço de compra no mercado em tempo real=${price}`)
        }
      } catch (error) {
        saLog.audit('Service', `confirmSignal: ${signal.code} Falha ao obter cotações em tempo real: ${error instanceof Error ? error.message : 'erro desconhecido'}，Retorno para signal.latestPrice=${signal.latestPrice}`)
      }
      // revelar todos os detalhes：Quando cotações em tempo real não estão disponíveis，prioridade signal.realtime（intradiário cron escrito T Preço real diário），
      // Chegue ao fundo novamente signal.latestPrice（Perceber：Este valor vem de quando o sinal é gerado snapshot，Gerado antes da negociação matinal=Preço de fechamento de ontem，Pode divergir da oferta real）
      if (price == null || price <= 0) {
        if (signal.realtime && signal.realtime.latestPrice > 0) {
          price = signal.realtime.latestPrice
          saLog.audit('Service', `confirmSignal: ${signal.code} Retorno para signal.realtime.latestPrice=${price}（fetchedAt=${signal.realtime.fetchedAt}）`)
        } else {
          price = signal.latestPrice
        }
      }
    }
    const quantity = request.quantity ?? 1
    const openedAt = nowIso()
    const sourceDecision: DecisionSource = options?.autoBuy
      ? 'system_auto_buy'
      : isWatchOrNone ? 'user_override' : 'user_confirmed'

    // P1-3: Recalcular os preços de stop-loss e take-profit com base no preço de compra real（Em vez de usar o preço estático no momento da geração do sinal）
    const stopLossPrice = round(price * (1 - config.stopLossPercent / 100))
    const takeProfitPrice1 = round(price * (1 + config.takeProfitPercent1 / 100))
    const takeProfitPrice2 = round(price * (1 + config.takeProfitPercent2 / 100))

    const position: StockAnalysisPosition = {
      id: `position-${signal.code}-${Date.now()}`,
      code: signal.code,
      name: signal.name,
      openedAt,
      openDate: signal.tradeDate,
      sourceSignalId: signal.id,
      quantity,
      weight: targetWeight,
      costPrice: price,
      currentPrice: price,
      returnPercent: 0,
      holdingDays: 1,
      stopLossPrice,
      takeProfitPrice1,
      takeProfitPrice2,
      trailingStopEnabled: true,
      highestPriceSinceOpen: price,
      action: 'hold',
      actionReason: options?.autoBuy ? 'O sistema abre automaticamente uma posição（Forte sinal de compra）' : isWatchOrNone ? 'Os usuários viram, esperem para ver，Tome a iniciativa de abrir uma vaga' : 'Nova posição',
    }

    const trade: StockAnalysisTradeRecord = {
      id: `trade-${Date.now()}`,
      action: 'buy',
      code: signal.code,
      name: signal.name,
      tradeDate: openedAt,
      price,
      quantity,
      weight: targetWeight,
      sourceSignalId: signal.id,
      sourceDecision,
      note: request.note?.trim() || (options?.autoBuy ? 'O sistema compra automaticamente：Abra posições automaticamente com base em fortes sinais de compra' : isWatchOrNone ? 'O usuário anula o conselho de esperar para ver，Compre ativamente' : 'O usuário confirma a execução AI Estratégia'),
      relatedPositionId: position.id,
      pnlPercent: null,
      buyDate: openedAt,
      sellDate: null,
    }

    const nextSignals = signals.map((item) =>
      item.id === signalId
        ? { ...item, decisionSource: sourceDecision, userDecisionNote: request.note?.trim() || null }
        : item,
    )
    // P0-3: gravação em série（escreva primeiro trades Escreva novamente positions），Certifique-se de que falhas não ocorram"A posição foi adicionada, mas a transação não foi registrada"
    await saveStockAnalysisTrades(stockAnalysisDir, [trade, ...trades])
    await saveStockAnalysisPositions(stockAnalysisDir, [position, ...positions])
    await saveStockAnalysisSignals(stockAnalysisDir, signal.tradeDate, nextSignals)
    saLog.audit('Service', `signal confirmed: ${signal.code} qty=${quantity} price=${price} tradeDate=${signal.tradeDate} decision=${sourceDecision}`)
    return position
  })
}

export async function rejectStockAnalysisSignal(stockAnalysisDir: string, signalId: string, note: string, decisionSource: 'user_rejected' | 'user_ignored' | 'system_auto_ignore') {
  const { signals, signal } = await findSignalByIdAcrossDates(stockAnalysisDir, signalId)
  if (!signal) return null

  // Fix 1: O sinal que foi operado não pode ser operado novamente
  if (signal.decisionSource !== 'system') {
    throw new Error(`O sinal foi processado（${signal.decisionSource}），Nenhuma operação repetível`)
  }

  const nextSignals = signals.map((item) => item.id === signalId ? { ...item, decisionSource, userDecisionNote: note.trim() } : item)
  await saveStockAnalysisSignals(stockAnalysisDir, signal.tradeDate, nextSignals)
  saLog.audit('Service', `${decisionSource}: ${signal.code} tradeDate=${signal.tradeDate} note=${note.trim()}`)
  return nextSignals.find((item) => item.id === signalId) ?? null
}

/**
 * v1.30.2: Atualizar o dia de negociação especificado signals para cada sinal no arquivo realtime Campo（Cotações intradiárias em tempo real）
 *
 * fundo：signals Arquivo do disco 08:05 cron Gerar e fazer pedidos，O mercado não está aberto neste momento，snapshot de latestPrice/
 * changePercent/open/high/low Só podem ser os dados coletados ontem，Não será atualizado automaticamente ao longo do dia。Se o front-end lê diretamente snapshot
 * exposição，O que o usuário verá será「preço de fechamento de ontem」como「Preço em tempo real de hoje」——Seriamente inconsistente com a situação oficial do mercado。
 *
 * plano：Manter snapshot constante（Serve como uma linha de base histórica para quando o sinal foi gerado，Usado para rastreamento de estratégia、Cálculo do nível de pressão de suporte, etc.），
 * Novo realtime O campo carrega cotações intradiárias em tempo real；Esta função consiste em 09:30-15:00 Todo 5 minuto cron chamar。
 *
 * Tolerância a falhas：Mantenha os dados antigos quando todas as fontes de dados estiverem inativas realtime（Não está claro），escreva apenas saLog Fácil de solucionar problemas。
 *
 * @param tradeDate Dia de negociação especificado（YYYY-MM-DD），Padrão hoje
 * @returns Atualizar estatísticas
 */
export async function refreshSignalsRealtime(
  stockAnalysisDir: string,
  tradeDate?: string,
): Promise<{ tradeDate: string; updated: number; skipped: number; fetchedAt: string | null }> {
  const targetDate = tradeDate || todayDate()
  const signals = await readStockAnalysisSignals(stockAnalysisDir, targetDate)
  if (!signals || signals.length === 0) {
    saLog.audit('RefreshRealtime', `no signals for ${targetDate}`)
    return { tradeDate: targetDate, updated: 0, skipped: 0, fetchedAt: null }
  }

  const codes = signals.map((s) => s.code)
  let quoteMap: Map<string, StockAnalysisSpotQuote>
  try {
    const envelope = await getQuoteData(stockAnalysisDir, codes)
    quoteMap = envelope.data
  } catch (error) {
    saLog.error('RefreshRealtime', `getQuoteData falhar tradeDate=${targetDate} error=${error instanceof Error ? error.message : 'desconhecido'}`)
    return { tradeDate: targetDate, updated: 0, skipped: signals.length, fetchedAt: null }
  }

  const fetchedAt = nowIso()
  let updated = 0
  let skipped = 0
  const nextSignals = signals.map((signal) => {
    const quote = quoteMap.get(signal.code)
    if (!quote || !Number.isFinite(quote.latestPrice) || quote.latestPrice <= 0) {
      skipped += 1
      return signal
    }
    updated += 1
    return {
      ...signal,
      realtime: {
        latestPrice: quote.latestPrice,
        changePercent: quote.changePercent,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        previousClose: quote.previousClose,
        fetchedAt,
      },
    }
  })

  await saveStockAnalysisSignals(stockAnalysisDir, targetDate, nextSignals)
  saLog.audit('RefreshRealtime', `tradeDate=${targetDate} updated=${updated} skipped=${skipped} fetchedAt=${fetchedAt}`)
  return { tradeDate: targetDate, updated, skipped, fetchedAt }
}

/**
 * automáticotomando uma decisão：Execute a compra automática no sinal de hoje + Ignorar automaticamente
 *
 * regra：
 *   - strong_buy Sinal：Compre automaticamente na ordem recomendada，solteiro 30% posição，Limite total de posição 100%
 *     - O alvo da posição é ignorado
 *     - Posições restantes insuficientes 30% hora，Compre de acordo com a posição restante
 *     - Posições restantes = 0 pare depois
 *   - buy / watch Sinal：marcado como system_auto_ignore，Observação「O sinal de compra não é forte o suficiente，A satisfação da condição não é alta o suficiente」
 *   - Outros sinais（sell / hold / none / Foi processado manualmente）：Pular sem se mover
 *
 * @param tradeDate Dia de negociação especificado（YYYY-MM-DD），padrão today
 */
async function runAutoDecisionsInner(stockAnalysisDir: string, tradeDate?: string) {
  const targetDate = tradeDate || todayDate()
  const dailySignals = await readStockAnalysisSignals(stockAnalysisDir, targetDate)
  if (!dailySignals || dailySignals.length === 0) {
    saLog.audit('AutoDecisions', `no signals for ${targetDate}`)
    return {
      tradeDate: targetDate,
      totalSignals: 0,
      autoBoughtCount: 0,
      autoIgnoredCount: 0,
      skippedCount: 0,
      autoBought: [] as Array<{ code: string; name: string; weight: number; price: number }>,
      autoIgnored: [] as Array<{ code: string; name: string; action: string }>,
      skipped: [] as Array<{ code: string; name: string; reason: string }>,
    }
  }

  // strong_buy de acordo com finalScore Ordem decrescente（Pedido recomendado）
  const strongBuySignals = dailySignals
    .filter((s) => s.action === 'strong_buy' && s.decisionSource === 'system')
    .sort((a, b) => b.finalScore - a.finalScore)

  // buy + watch Para ser ignorado
  const ignoreCandidates = dailySignals.filter(
    (s) => (s.action === 'buy' || s.action === 'watch') && s.decisionSource === 'system',
  )

  const autoBought: Array<{ code: string; name: string; weight: number; price: number }> = []
  const skipped: Array<{ code: string; name: string; reason: string }> = []
  const SINGLE_WEIGHT = 0.3
  const TOTAL_CAP = 1.0

  // Ciclo de compra automático
  for (const signal of strongBuySignals) {
    // As posições são relidas a cada ciclo（Último salvo）
    const positions = await readStockAnalysisPositions(stockAnalysisDir)
    if (positions.some((p) => p.code === signal.code)) {
      skipped.push({ code: signal.code, name: signal.name, reason: 'Cargo já ocupado，pular sobre' })
      continue
    }
    const totalWeight = positions.reduce((sum, p) => sum + p.weight, 0)
    const remaining = round(TOTAL_CAP - totalWeight, 4)
    if (remaining <= 0.001) {
      skipped.push({ code: signal.code, name: signal.name, reason: 'A posição total está cheia' })
      continue
    }
    const targetWeight = round(Math.min(SINGLE_WEIGHT, remaining), 4)
    // v1.34.0: O sistema usa um modelo de posição percentual（weight），Nenhum conceito de número real de ações。
    // quantity como um campo de espaço reservado（=1），Apenas para histórico de compatibilidade trade gravado quantity Campo reservado。
    // Nunca esteja certo quantity Fazer"100 Estoque de alinhamento de mão inteira"Aguardando verificação，Destruirá a capacidade de negociação。
    const placeholderQty = 1
    try {
      const result = await confirmStockAnalysisSignal(
        stockAnalysisDir,
        signal.id,
        { quantity: placeholderQty, weight: targetWeight, note: `O sistema compra automaticamente · posição ${(targetWeight * 100).toFixed(0)}%` },
        { bypassTradingHours: true, autoBuy: true },
      )
      if (result && 'code' in result) {
        autoBought.push({ code: result.code, name: result.name, weight: result.weight, price: result.costPrice })
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido'
      saLog.audit('AutoDecisions', `auto-buy failed ${signal.code}: ${reason}`)
      skipped.push({ code: signal.code, name: signal.name, reason })
    }
  }

  // Ignorar loops automaticamente
  const autoIgnored: Array<{ code: string; name: string; action: string }> = []
  const IGNORE_NOTE = 'O sinal de compra não é forte o suficiente，A satisfação da condição não é alta o suficiente'
  for (const signal of ignoreCandidates) {
    try {
      await rejectStockAnalysisSignal(stockAnalysisDir, signal.id, IGNORE_NOTE, 'system_auto_ignore')
      autoIgnored.push({ code: signal.code, name: signal.name, action: signal.action })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido'
      saLog.audit('AutoDecisions', `auto-ignore failed ${signal.code}: ${reason}`)
      skipped.push({ code: signal.code, name: signal.name, reason })
    }
  }

  saLog.audit(
    'AutoDecisions',
    `tradeDate=${targetDate} bought=${autoBought.length} ignored=${autoIgnored.length} skipped=${skipped.length}`,
  )

  return {
    tradeDate: targetDate,
    totalSignals: dailySignals.length,
    autoBoughtCount: autoBought.length,
    autoIgnoredCount: autoIgnored.length,
    skippedCount: skipped.length,
    autoBought,
    autoIgnored,
    skipped,
  }
}

/**
 * v1.35.0 [A6-P0-2] Entrada automática de execução de decisão：adicionar in-flight Trancar，evitar cron 09:31 Acionar simultaneamente com botão manual
 * Dois gatilhos executarão a lógica de compra em paralelo.，Resultando em repetidas aberturas de posições ou LLM token desperdício。
 */
export async function runAutoDecisions(stockAnalysisDir: string, tradeDate?: string) {
  if (currentAutoDecisionsPromise) {
    saLog.info('Service', `[automáticotomando uma decisão] Já existe uma tarefa em andamento，Ignorar este gatilho tradeDate=${tradeDate ?? 'today'}`)
    return currentAutoDecisionsPromise as ReturnType<typeof runAutoDecisionsInner>
  }
  const promise = runAutoDecisionsInner(stockAnalysisDir, tradeDate)
    .finally(() => {
      currentAutoDecisionsPromise = null
    })
  currentAutoDecisionsPromise = promise
  return promise
}

export async function closeStockAnalysisPosition(stockAnalysisDir: string, positionId: string, request: StockAnalysisTradeRequest) {
  // Fix 2: O fechamento da posição deve ocorrer dentro do horário de negociação
  if (!isTradingHoursBypassedForTests()) {
    const tradingCheck = checkTradingAvailability()
    if (!tradingCheck.canTrade) {
      throw new Error(`Atualmente não negociável：${tradingCheck.reason}`)
    }
  }

  // P0-3: Operação de transação mais bloqueio mutex
  return withFileLock(TRADING_LOCK_KEY, async () => {
    const positions = await readStockAnalysisPositions(stockAnalysisDir)
    const position = positions.find((item) => item.id === positionId)
    if (!position) return null
    assertPositionCanSellToday(position)

    // v1.35.0 [A4-P0-2] Proteção de idempotência：Mesma posição 2 O fechamento repetido de posições em segundos será diretamente rejeitado.
    if (position.lastTradeAt) {
      const elapsed = Date.now() - new Date(position.lastTradeAt).getTime()
      if (elapsed < 2000) {
        throw new Error(`As operações de fechamento de posição são muito frequentes（${elapsed}ms Dentro），Por favor, tente novamente mais tarde`)
      }
    }
    // v1.35.0 [A4-P0-2] clientNonce Idempotente
    if (request.clientNonce) {
      const seen = reduceIdempotencyCache.get(request.clientNonce)
      if (seen && Date.now() - seen.ts < 60_000) {
        throw new Error(`Envio repetido de pedido de liquidação（clientNonce=${request.clientNonce.slice(0, 8)}...），Rejeitado`)
      }
    }

    const [trades, config, runtimeStatus, existingReviews] = await Promise.all([
      readStockAnalysisTrades(stockAnalysisDir),
      readStockAnalysisConfig(stockAnalysisDir),
      readStockAnalysisRuntimeStatus(stockAnalysisDir),
      readStockAnalysisReviews(stockAnalysisDir),
    ])

    // A suspensão do controle de riscos proíbe apenas novos riscos，Os utilizadores não devem ser impedidos de fechar posições e sair de riscos。

    // BUG-1 fix: O final atual não é transmitido price hora，Obtenha ativamente informações de mercado em tempo real como o preço de venda
    let price = request.price
    if (price == null) {
      try {
        const quoteEnvelope = await getQuoteData(stockAnalysisDir, [position.code])
        const quote = quoteEnvelope.data.get(position.code)
        if (quote && quote.latestPrice > 0) {
          price = quote.latestPrice
          saLog.audit('Service', `closePosition: ${position.code} Preço de mercado em tempo real=${price}`)
        }
      } catch (error) {
        saLog.audit('Service', `closePosition: ${position.code} Falha ao obter cotações em tempo real: ${error instanceof Error ? error.message : 'erro desconhecido'}，Retorno para currentPrice=${position.currentPrice}`)
      }
      if (price == null || price <= 0) {
        price = position.currentPrice
      }
    }
    const quantity = position.quantity // Herdar o número de compartilhamento de posição só é compatível com auditoria
    const pnlPercent = round(safeDivide(price - position.costPrice, position.costPrice) * 100)
    const sellReason = request.note?.trim() || `O usuário fecha a posição manualmente ${pnlPercent > 0 ? 'lucro' : 'Perda'} ${pnlPercent}%`
    const soldAt = nowIso()
    const trade: StockAnalysisTradeRecord = {
      id: `trade-${Date.now()}`,
      action: 'sell',
      code: position.code,
      name: position.name,
      tradeDate: soldAt,
      price,
      quantity,
      weight: position.weight,
      sourceSignalId: position.sourceSignalId,
      sourceDecision: 'user_confirmed',
      note: sellReason,
      relatedPositionId: position.id,
      pnlPercent,
      buyDate: position.openedAt,
      sellDate: soldAt,
    }

    const updatedTrades = [trade, ...trades]
    const review = await buildReviewRecord(stockAnalysisDir, position, price, sellReason)
    const updatedReviews = [review, ...existingReviews].slice(0, 100)
    const riskResult = assessPortfolioRisk(updatedTrades, config.portfolioRiskLimits, runtimeStatus.riskControl)

    // P0-3: Grave dados críticos em série（Primeiro trades De novo positions）
    await saveStockAnalysisTrades(stockAnalysisDir, updatedTrades)
    await saveStockAnalysisPositions(stockAnalysisDir, positions.filter((item) => item.id !== positionId))
    await saveStockAnalysisReviews(stockAnalysisDir, updatedReviews)
    await saveStockAnalysisRuntimeStatus(stockAnalysisDir, { ...runtimeStatus, riskControl: riskResult.state })

    if (riskResult.newEvents.length > 0) {
      const existingEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
      await saveStockAnalysisRiskEvents(stockAnalysisDir, [...riskResult.newEvents, ...existingEvents])
    }

    // v1.35.0 [A4-P0-2] Registro nonce executado com sucesso
    if (request.clientNonce) {
      reduceIdempotencyCache.set(request.clientNonce, { ts: Date.now(), positionId })
    }

    saLog.audit('Service', `position closed: ${position.code} qty=${quantity} price=${price} pnl=${pnlPercent}% | review=${review.id}`)
    return trade
  })
}

/** Operação de redução de posição — Vender quantidade de peças，Manter as posições restantes */
export async function reduceStockAnalysisPosition(stockAnalysisDir: string, positionId: string, request: StockAnalysisTradeRequest) {
  // Fix 2: A redução de posição deve ocorrer dentro do horário de negociação
  if (!isTradingHoursBypassedForTests()) {
    const tradingCheck = checkTradingAvailability()
    if (!tradingCheck.canTrade) {
      throw new Error(`Atualmente não negociável：${tradingCheck.reason}`)
    }
  }

  // P0-3: Operação de transação mais bloqueio mutex
  return withFileLock(TRADING_LOCK_KEY, async () => {
    const positions = await readStockAnalysisPositions(stockAnalysisDir)
    const position = positions.find((item) => item.id === positionId)
    if (!position) return null
    assertPositionCanSellToday(position)

    // v1.35.0 [A4-P0-2] Proteção de idempotência：Mesma posição 2 A redução repetida de posições em segundos será diretamente rejeitada.
    if (position.lastTradeAt) {
      const elapsed = Date.now() - new Date(position.lastTradeAt).getTime()
      if (elapsed < 2000) {
        throw new Error(`As operações de redução de posição são muito frequentes（${elapsed}ms Dentro），Tente novamente mais tarde para evitar deduções repetidas`)
      }
    }

    // v1.35.0 [A4-P0-2] clientNonce Idempotente：mesmo nonce 60 considerado repetido em segundos
    if (request.clientNonce) {
      const seen = reduceIdempotencyCache.get(request.clientNonce)
      if (seen && Date.now() - seen.ts < 60_000) {
        throw new Error(`Solicitação para redução de posição é enviada repetidamente（clientNonce=${request.clientNonce.slice(0, 8)}...），Rejeitado`)
      }
      // Limpar cache expirado
      if (reduceIdempotencyCache.size > 200) {
        const now = Date.now()
        for (const [key, value] of reduceIdempotencyCache) {
          if (now - value.ts > 60_000) reduceIdempotencyCache.delete(key)
        }
      }
    }

    // v1.34.0: Pressione em vez disso weight Iluminação proporcional（Modelo de posição percentual）
    const weightDelta = typeof request.weightDelta === 'number' ? request.weightDelta : 0
    if (!Number.isFinite(weightDelta)) {
      throw new Error(`Falha ao reduzir a posição：weightDelta ilegal（NaN/Infinity）`)
    }
    if (!(weightDelta > 0)) {
      throw new Error(`Falha ao reduzir a posição：weightDelta Deve ser um número positivo（atual=${weightDelta}）`)
    }
    if (weightDelta >= position.weight) {
      throw new Error(`Reduzir proporção de posição (${(weightDelta * 100).toFixed(2)}%) Deve ser menor que a proporção de posição (${(position.weight * 100).toFixed(2)}%)，Se você quiser vender tudo, use Close Position`)
    }

    const [trades, runtimeStatus] = await Promise.all([
      readStockAnalysisTrades(stockAnalysisDir),
      readStockAnalysisRuntimeStatus(stockAnalysisDir),
    ])

    // A suspensão do controle de riscos proíbe apenas novos riscos，Os utilizadores não devem ser impedidos de reduzir as suas posições e sair de alguns dos seus riscos。

    // Obtenha preços em tempo real
    let price = request.price
    if (price == null) {
      try {
        const quoteEnvelope = await getQuoteData(stockAnalysisDir, [position.code])
        const quote = quoteEnvelope.data.get(position.code)
        if (quote && quote.latestPrice > 0) {
          price = quote.latestPrice
        }
      } catch { /* fallback to position.currentPrice */ }
      if (price == null || price <= 0) {
        price = position.currentPrice
      }
    }

    const pnlPercent = round(safeDivide(price - position.costPrice, position.costPrice) * 100)
    const remainingWeight = round(position.weight - weightDelta, 4)
    // quantity campo de espaço reservado：Corte proporcionalmente，só para história trade Exibição de registro
    const sellQuantity = Math.max(1, Math.round(position.quantity * (weightDelta / position.weight)))
    const remainingQuantity = Math.max(1, position.quantity - sellQuantity)
    const soldAt = nowIso()

    const trade: StockAnalysisTradeRecord = {
      id: `trade-${Date.now()}`,
      action: 'sell',
      code: position.code,
      name: position.name,
      tradeDate: soldAt,
      price,
      quantity: sellQuantity,
      weight: weightDelta,
      sourceSignalId: position.sourceSignalId,
      sourceDecision: 'user_confirmed',
      note: request.note?.trim() || `Os usuários reduzem suas posições ${(weightDelta * 100).toFixed(2)}% posição (Restante${(remainingWeight * 100).toFixed(2)}%) ${pnlPercent > 0 ? 'lucro' : 'Perda'} ${pnlPercent}%`,
      relatedPositionId: position.id,
      pnlPercent,
      buyDate: position.openedAt,
      sellDate: soldAt,
    }

    const updatedPosition: StockAnalysisPosition = {
      ...position,
      quantity: remainingQuantity,
      weight: remainingWeight,
      currentPrice: price,
      returnPercent: pnlPercent,
      action: 'reduce',
      actionReason: `Reduzir posições ${(weightDelta * 100).toFixed(2)}% posição @ ${price.toFixed(2)}`,
      lastTradeAt: nowIso(), // v1.35.0 [A4-P0-2] Marcadores de janela idempotentes
    }

    const updatedPositions = positions.map((item) => item.id === positionId ? updatedPosition : item)
    const updatedTrades = [trade, ...trades]

    const config = await readStockAnalysisConfig(stockAnalysisDir)
    const riskResult = assessPortfolioRisk(updatedTrades, config.portfolioRiskLimits, runtimeStatus.riskControl)

    // P0-3: Grave dados críticos em série
    await saveStockAnalysisTrades(stockAnalysisDir, updatedTrades)
    await saveStockAnalysisPositions(stockAnalysisDir, updatedPositions)
    await saveStockAnalysisRuntimeStatus(stockAnalysisDir, { ...runtimeStatus, riskControl: riskResult.state })

    // v1.35.0 [A4-P0-2] Registro nonce executado com sucesso
    if (request.clientNonce) {
      reduceIdempotencyCache.set(request.clientNonce, { ts: Date.now(), positionId })
    }

    if (riskResult.newEvents.length > 0) {
      const existingEvents = await readStockAnalysisRiskEvents(stockAnalysisDir)
      await saveStockAnalysisRiskEvents(stockAnalysisDir, [...riskResult.newEvents, ...existingEvents])
    }

    saLog.audit('Service', `position reduced: ${position.code} weightDelta=${weightDelta} remainingWeight=${remainingWeight} price=${price} pnl=${pnlPercent}%`)
    return trade
  })
}

/**
 * Ignorar ações de controle de risco para posições（parar a perda/Obtenha lucro/Reduzir posições/avaliação devida）。
 * Vai position.action redefinir para 'hold'，próxima vez updatePositionRuntime Irá reavaliar após obter condições de mercado em tempo real。
 * Não é necessário limite de tempo de negociação —— Ignore operações que não envolvam transações reais。
 */
export async function dismissPositionAction(stockAnalysisDir: string, positionId: string, note?: string): Promise<StockAnalysisPosition | null> {
  // v1.35.0 [A2-P0-3] dismissPositionAction ignorar TRADING_LOCK_KEY → Todo o pacote está embalado na fechadura
  return withFileLock(TRADING_LOCK_KEY, async () => {
    const positions = await readStockAnalysisPositions(stockAnalysisDir)
    const position = positions.find((item) => item.id === positionId)
    if (!position) return null

    if (position.action === 'hold') {
      // Já hold estado，Não há necessidade de ignorar
      return position
    }

    // v1.35.0 [A4-P0-1] Quando o controle de risco é suspenso，Rejeitar diretamente dismiss（A limpeza de alarmes não tem importância comercial）
    const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
    if (runtimeStatus.riskControl?.paused) {
      throw new Error(`O controle de risco do sistema restringiu novas posições，Remova esta restrição antes de lidar com este alarme：${runtimeStatus.riskControl.pauseReason ?? 'razão desconhecida'}`)
    }

    const previousAction = position.action
    const previousReason = position.actionReason
    const updatedPosition: StockAnalysisPosition = {
      ...position,
      action: 'hold',
      actionReason: `Usuário ignorado${previousAction === 'stop_loss' ? 'parar a perda' : previousAction === 'take_profit' ? 'Obtenha lucro' : previousAction === 'reduce' ? 'Reduzir posições' : 'Avaliar'}lembrar`,
      dismissedAction: previousAction,
    }

    const updatedPositions = positions.map((item) => item.id === positionId ? updatedPosition : item)
    await saveStockAnalysisPositions(stockAnalysisDir, updatedPositions)
    saLog.audit('Service', `position action dismissed: ${position.code} ${previousAction}(${previousReason}) → hold | note=${note?.trim() || 'nenhum'}`)
    return updatedPosition
  })
}

export async function refreshStockAnalysisStockPool(stockAnalysisDir: string) {
  const stockPoolEnvelope = await getStockPoolData(stockAnalysisDir, true)
  await updateRuntimeStatus(stockAnalysisDir, {
    stockPoolRefreshedAt: stockPoolEnvelope.fetchedAt,
    isUsingFallback: stockPoolEnvelope.usedFallback,
    staleReasons: stockPoolEnvelope.staleReasons,
  })
  saLog.audit('Service', `stock pool refreshed: ${stockPoolEnvelope.data.length}, fallback=${stockPoolEnvelope.usedFallback}`)
  return { count: stockPoolEnvelope.data.length }
}

export async function getStockAnalysisConfig(stockAnalysisDir: string) {
  return readStockAnalysisConfig(stockAnalysisDir)
}

export async function updateStockAnalysisConfig(stockAnalysisDir: string, patch: StockAnalysisConfigPatch) {
  const current = await readStockAnalysisConfig(stockAnalysisDir)
  const next: StockAnalysisStrategyConfig = {
    ...current,
    ...patch,
    marketThresholds: { ...current.marketThresholds, ...(patch.marketThresholds ?? {}) },
    fusionWeightsByRegime: { ...current.fusionWeightsByRegime, ...(patch.fusionWeightsByRegime ?? {}) },
    lowLiquidityGuardrail: { ...current.lowLiquidityGuardrail, ...(patch.lowLiquidityGuardrail ?? {}) },
    trailingStop: { ...current.trailingStop, ...(patch.trailingStop ?? {}) },
    portfolioRiskLimits: { ...current.portfolioRiskLimits, ...(patch.portfolioRiskLimits ?? {}) },
  }

  if (!Number.isFinite(next.intradayAutoCloseLossPercent) || next.intradayAutoCloseLossPercent <= 0 || next.intradayAutoCloseLossPercent > 100) {
    throw new Error('O limite de perda de liquidação automática intradiária deve estar dentro 0-100 entre')
  }

  if (!Number.isFinite(next.intradayAutoCloseProfitPercent) || next.intradayAutoCloseProfitPercent <= 0 || next.intradayAutoCloseProfitPercent > 100) {
    throw new Error('O limite de lucro automático intradiário deve estar dentro 0-100 entre')
  }

  if (!Number.isFinite(next.portfolioRiskLimits.maxDailyLossPercent) || next.portfolioRiskLimits.maxDailyLossPercent <= 0 || next.portfolioRiskLimits.maxDailyLossPercent > 100) {
    throw new Error('O limite diário de suspensão de perdas deve estar dentro 0-100 entre')
  }

  if (!Number.isFinite(next.portfolioRiskLimits.maxWeeklyLossPercent) || next.portfolioRiskLimits.maxWeeklyLossPercent <= 0 || next.portfolioRiskLimits.maxWeeklyLossPercent > 100) {
    throw new Error('O limite semanal de suspensão de perdas deve estar dentro 0-100 entre')
  }

  if (!Number.isFinite(next.portfolioRiskLimits.maxMonthlyLossPercent) || next.portfolioRiskLimits.maxMonthlyLossPercent <= 0 || next.portfolioRiskLimits.maxMonthlyLossPercent > 100) {
    throw new Error('O limite mensal de suspensão de perdas deve estar dentro 0-100 entre')
  }

  await saveStockAnalysisConfig(stockAnalysisDir, next)
  const riskControl = await recomputeRiskControlState(stockAnalysisDir, next.portfolioRiskLimits)
  saLog.audit(
    'Service',
    `stock analysis config updated: intradayAutoCloseLossPercent=${next.intradayAutoCloseLossPercent}, intradayAutoCloseProfitPercent=${next.intradayAutoCloseProfitPercent}, maxDailyLossPercent=${next.portfolioRiskLimits.maxDailyLossPercent}, maxWeeklyLossPercent=${next.portfolioRiskLimits.maxWeeklyLossPercent}, maxMonthlyLossPercent=${next.portfolioRiskLimits.maxMonthlyLossPercent}, paused=${riskControl.paused}`,
  )
  return next
}

export async function getStockAnalysisRuntimeStatusData(stockAnalysisDir: string) {
  return readStockAnalysisRuntimeStatus(stockAnalysisDir)
}

export async function bootstrapStockAnalysis(stockAnalysisDir: string) {
  await ensureStockAnalysisStructure(stockAnalysisDir)
  await initSALogger(stockAnalysisDir)
  saLog.info('Service', 'Bootstrap começar')
  // [P2-20] Limpe as sobras na inicialização .tmp documento
  void cleanupAllStaleTemporaryFiles(stockAnalysisDir).catch(() => {})
  const snapshot = await readLatestSnapshot(stockAnalysisDir)
  const runtimeStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)

  // P1-13: Detectar resíduo running status e redefinir（Depois que o processo termina de forma anormal runState pode estar preso running）
  if (runtimeStatus.runState === 'running') {
    const startedAt = runtimeStatus.lastRunAt
    const staleThresholdMs = 30 * 60 * 1000 // 30 minuto
    const isStale = !startedAt || (Date.now() - new Date(startedAt).getTime()) > staleThresholdMs
    if (isStale) {
      logger.warn(`[stock-analysis] bootstrap: Resíduos foram detectados running estado（startedAt=${startedAt}），redefinir para idle`, { module: 'StockAnalysis' })
      saLog.warn('Service', `Bootstrap: Resíduo detectado running estado startedAt=${startedAt}，redefinir para idle`)
      await atomicUpdateRuntimeStatus(stockAnalysisDir, (s) => ({
        ...s,
        runState: 'idle' as const,
      }))
    }
  }

  // P1-14: Detecte o status restante do monitoramento do disco e restaure-o（Se for atualmente uma sessão de negociação e houver uma posição）
  try {
    const monitorStatus = await readIntradayMonitorStatus(stockAnalysisDir)
    if (monitorStatus.state === 'running' && !intradayMonitorTimer) {
      const positions = await readStockAnalysisPositions(stockAnalysisDir)
      if (positions.length > 0 && isWithinTradingHoursShared()) {
        logger.info('[stock-analysis] bootstrap: Restaurando o monitoramento em disco（O último processo foi encerrado de forma anormal）', { module: 'StockAnalysis' })
        saLog.info('Service', `Bootstrap: Restaurando o monitoramento em disco，Posição=${positions.length}`)
        void startIntradayMonitor(stockAnalysisDir).catch((error) => {
          logger.error(`[stock-analysis] bootstrap Falha ao restaurar o monitoramento do disco: ${(error as Error).message}`, { module: 'StockAnalysis' })
        })
      } else {
        // Fora do pregão ou sem posição，redefinir estado
        await saveIntradayMonitorStatus(stockAnalysisDir, { ...monitorStatus, state: 'idle' })
      }
    }
  } catch (error) {
    logger.warn(`[stock-analysis] bootstrap: Falha ao verificar o status do monitoramento do disco: ${(error as Error).message}`, { module: 'StockAnalysis' })
  }

  const refreshedStatus = await readStockAnalysisRuntimeStatus(stockAnalysisDir)
  if (!snapshot && refreshedStatus.runState !== 'running') {
    saLog.info('Service', 'Bootstrap: Nenhum instantâneo existente，Acione a primeira execução diária')
    void runStockAnalysisDaily(stockAnalysisDir).catch((error) => {
      logger.error(`AI Negociação de ações bootstrap falhar: ${(error as Error).message}`, { module: 'StockAnalysis' })
    })
  }
  saLog.info('Service', `Bootstrap Terminar: hasSnapshot=${!!snapshot} runState=${refreshedStatus.runState}`)
}

// ==================== Phase 5: AI Gerenciamento de configuração ====================

/** Metadados da camada de análise：Nome chinês、Número padrão de especialistas、Atribuição de postura padrão */
const LAYER_META: Record<StockAnalysisExpertLayer, { name: string; expertCount: number }> = {
  industry_chain: { name: 'Análise da cadeia industrial', expertCount: 3 },
  company_fundamentals: { name: 'fundamentos da empresa', expertCount: 4 },
  sell_side_research: { name: 'Relatório de pesquisa do vendedor', expertCount: 3 },
  world_power: { name: 'Padrão mundial', expertCount: 3 },
  global_macro: { name: 'macro global', expertCount: 3 },
  risk_governance: { name: 'Controle de risco e governança', expertCount: 3 },
  sentiment: { name: 'lado emocional', expertCount: 4 },
  market_trading: { name: 'transação de mercado', expertCount: 3 },
  buy_side: { name: 'Perspectiva do comprador', expertCount: 4 },
  rule_functions: { name: 'Função de regra', expertCount: 15 },
}

const RULE_FUNCTION_NAMES = [
  '5impulso diário', '20impulso diário', '60impulso diário',
  'RSIreversão média', 'Regressão Média das Bandas de Bollinger', 'MA60desvio da reversão média',
  'Classificação da proporção de quantidade', 'Pontuação de rotatividade', 'Pontuação do Fluxo de Fundos',
  'ATRVolatilidade', 'quantis de volatilidade histórica',
  'impulso relativo do setor', 'Mudanças na classificação da seção',
  'risco de carteira', 'risco de ações individuais',
]

/**
 * 30 individual LLM definição independente de especialista，Cada especialista tem uma função única、Estrutura de análise e dimensões de foco。
 * princípios de design：Perspectivas complementares de especialistas da mesma camada，Perspectivas ortogonais de especialistas entre diferentes camadas。
 */
interface ExpertSeed {
  name: string
  layer: StockAnalysisExpertLayer
  stance: StockAnalysisExpertStance
  infoSubset: string[]
  systemPrompt: string
}

const LLM_EXPERT_SEEDS: ExpertSeed[] = [
  // ═══════════════ Análise da cadeia industrial (3) ═══════════════
  {
    name: 'Analista de suprimentos upstream',
    layer: 'industry_chain',
    stance: 'neutral',
    infoSubset: ['basic', 'price', 'market'],
    systemPrompt: 'Você é um analista com foco no upstream da cadeia da indústria。Sua principal habilidade é avaliar o impacto dos custos das matérias-primas e das mudanças no lado da oferta nos lucros da empresa.。\n\nEstrutura de análise：\n1. Determinar a posição da empresa na cadeia industrial com base no setor\n2. Avalie matérias-primas upstream/As tendências dos preços da energia podem pressionar o lado dos custos da empresa ou beneficiá-la\n3. Combine a capitalização de mercado e a taxa de rotatividade para determinar se o mercado precificou adequadamente as mudanças no lado da oferta.\n4. Se os preços upstream aumentarem e a empresa não conseguir repassar os custos，Grosseiro；Se o preço upstream cair para liberar margens de lucro，Demais\n\nestilo de tomada de decisão：Preste atenção às forças motrizes do lado dos custos，Extremamente sensível a mudanças nas margens de lucro。',
  },
  {
    name: 'Pesquisador de demanda downstream',
    layer: 'industry_chain',
    stance: 'bullish',
    infoSubset: ['basic', 'price', 'momentum', 'volume'],
    systemPrompt: 'Você é um pesquisador com foco na demanda final e nas tendências de consumo。Você é bom em inferir as verdadeiras mudanças na demanda downstream através da relação entre volume e preço。\n\nEstrutura de análise：\n1. O volume de transações e a taxa de rotatividade refletem o entusiasmo comercial do mercado pelas perspectivas de demanda\n2. 20A combinação do rendimento diário e do rácio de volume determina se existe um mercado de tendência impulsionado pela procura.\n3. O aumento do volume sugere melhores expectativas de demanda downstream，A redução do declínio pode ser apenas um ajuste de curto prazo\n4. Preste atenção às propriedades da seção——Consumo/ciência e tecnologia/A lógica da procura dos sectores cíclicos é diferente\n\nestilo de tomada de decisão：Tende a ser otimista em relação aos sinais de recuperação da demanda，Mas será honesto sobre as evidências da redução da demanda。',
  },
  {
    name: 'Especialista em monitoramento de política industrial',
    layer: 'industry_chain',
    stance: 'bearish',
    infoSubset: ['basic', 'market', 'volatility'],
    systemPrompt: 'Você é um especialista em política industrial e risco regulatório。Você está preocupado com o impacto e a reestruturação da estrutura da indústria devido a mudanças políticas?。\n\nEstrutura de análise：\n1. Determinar a sensibilidade da indústria aos impactos políticos com base nos setores（alto：nova energia/propriedade/financiar/educar/medicamento，Baixo：Consumo/fabricação）\n2. alta volatilidade + A tendência de baixa pode sugerir que a incerteza política está sendo precificada\n3. Quando o sentimento do mercado é pessimista，A letalidade dos riscos políticos é ampliada；É fácil ser ignorado quando você está otimista\n4. Se a indústria estiver num ciclo de aperto político e o mercado não reflectir totalmente，Grosseiro\n\nestilo de tomada de decisão：cauteloso e conservador，Fique atento aos riscos da política。Tende a ser neutro ou pessimista quando incerto。',
  },

  // ═══════════════ fundamentos da empresa (4) ═══════════════
  {
    name: 'Auditor de Qualidade de Resultados',
    layer: 'company_fundamentals',
    stance: 'bearish',
    infoSubset: ['basic', 'price', 'volatility'],
    systemPrompt: 'Você é um auditor financeiro exigente，Especializada na identificação de riscos de qualidade de lucros e de branqueamento financeiro。\n\nEstrutura de análise：\n1. alta volatilidade + alta amplitude Pode sugerir dúvidas do mercado sobre a sustentabilidade dos lucros\n2. Vários dias de descidas consecutivas reflectem normalmente o agravamento das expectativas fundamentais e não ajustamentos técnicos.\n3. O declínio anormal das empresas de grande capitalização de mercado é mais digno de vigilância（As instituições podem ser informadas antecipadamente de informações negativas）\n4. se 60 Os retornos diários são significativamente negativos, mas 5 recuperação diária，alerta"salto de gato morto"\n\nestilo de tomada de decisão：Prefiro perder a oportunidade do que cair em uma armadilha。Esteja altamente alerta a quaisquer possíveis sinais de risco financeiro。',
  },
  {
    name: 'avaliador de crescimento',
    layer: 'company_fundamentals',
    stance: 'bullish',
    infoSubset: ['basic', 'price', 'momentum'],
    systemPrompt: 'Você é um analista focado no potencial de crescimento de uma empresa，Bom em encontrar sinais iniciais de ações de crescimento em dados。\n\nEstrutura de análise：\n1. 20 Hiyori 60 O impulso diário positivo é o pré-requisito básico para melhores expectativas de crescimento\n2. Aumento de volume e preço（Aumentando em volume pesado）Esta é uma característica típica das ações de crescimento sendo reavaliadas.\n3. Capitalização de mercado pequena e média + Alta taxa de rotatividade Pode significar que as ações de crescimento recebem mais atenção\n4. fique em pé MA20 e MA60 Indica uma mudança para melhor na tendência de médio prazo，Apoie a lógica de crescimento\n\nestilo de tomada de decisão：Procure ativamente oportunidades de crescimento，Mas requer dupla confirmação de tendência e quantidade.。Não persiga rebotes que não podem ser suportados pelo volume。',
  },
  {
    name: 'Especialista em ancoragem de avaliação',
    layer: 'company_fundamentals',
    stance: 'neutral',
    infoSubset: ['basic', 'price', 'ma'],
    systemPrompt: 'Você é um especialista em avaliação de estilo de investimento em valor，Usando o desvio da média móvel como um indicador proxy para ancoragem de avaliação。\n\nEstrutura de análise：\n1. Preço atual em relação a MA60 O desvio reflete o nível de avaliação a médio prazo——Desvio excessivo significa superestimação ou subestimação\n2. MA20 e MA60 A posição relativa reflete a tendência de valorização：MA20 > MA60 é uma tendência ascendente nas avaliações\n3. 20 A posição do preço diário está próxima de 0% Representa um mínimo recente，Podem existir oportunidades de reparo de avaliação\n4. 20 A posição do preço diário está próxima de 100% É preciso ter cuidado com a superestimação de curto prazo\n\nestilo de tomada de decisão：Pensamento estrito de reversão à média。Baixa quando sobrevalorizado，Opere comprado quando subestimado，Manter a neutralidade dentro de uma faixa razoável。',
  },
  {
    name: 'Analista de cenário competitivo da indústria',
    layer: 'company_fundamentals',
    stance: 'neutral',
    infoSubset: ['basic', 'market', 'volume'],
    systemPrompt: 'Você é um analista do setor que estuda o cenário competitivo e a posição de mercado。\n\nEstrutura de análise：\n1. A grande capitalização de mercado geralmente corresponde aos líderes do setor——Os líderes são mais resilientes em mercados em baixa，A resiliência pode ser mais fraca em mercados em alta\n2. Uma alta taxa de rotatividade pode indicar fichas soltas（Ruim）Ou novos fundos entram no mercado（Lido），Precisa ser julgado com base na direção de ascensão e queda\n3. Vale a pena alocar ações líderes nas tendências de alta do mercado，O valor defensivo dos líderes é maior nas tendências de baixa\n4. A correlação entre a tendência das ações individuais dentro do setor e o mercado mais amplo reflete a posição competitiva——As ações individuais que se fortalecem de forma independente podem ter vantagens competitivas únicas\n\nestilo de tomada de decisão：Concentre-se nas vantagens relativas em vez de ganhos e perdas absolutos。Apenas vale a pena olhar para alvos com vantagens competitivas claras.。',
  },

  // ═══════════════ Relatório de pesquisa do vendedor (3) ═══════════════
  {
    name: 'estimador de preço-alvo',
    layer: 'sell_side_research',
    stance: 'neutral',
    infoSubset: ['basic', 'price', 'ma', 'volatility'],
    systemPrompt: 'Você é um analista sell-side com orientação quantitativa，Bom em calcular faixas de preços-alvo razoáveis ​​com base em aspectos técnicos。\n\nEstrutura de análise：\n1. MA5/MA20/MA60 Constituindo múltiplas camadas de níveis de pressão de suporte——Qual nível o preço das ações está acima determina a força da tendência\n2. 20 A volatilidade diária determina o quanto o preço-alvo flutua para cima e para baixo——Faixa de relaxamento de alta volatilidade，A baixa volatilidade se estreita\n3. 20 posição de preço diária + amplitude Julgar de forma abrangente a racionalidade do preço atual dentro da faixa de flutuação recente\n4. Se o preço atual tiver se desviado significativamente MA60 e em 80% Posição acima do preço，A vantagem é limitada\n\nestilo de tomada de decisão：Deixe os números falarem。Sempre conduza o raciocínio quantitativo em torno das posições de preços e das relações de média móvel。',
  },
  {
    name: 'Analista Comparativo da Indústria',
    layer: 'sell_side_research',
    stance: 'bullish',
    infoSubset: ['basic', 'momentum', 'market'],
    systemPrompt: 'Você é um pesquisador do sell-side que é bom em comparações horizontais do setor，Utilize o desempenho excessivo de ações individuais em relação ao mercado mais amplo para selecionar alvos que valem a pena recomendar.。\n\nEstrutura de análise：\n1. ações individuais 20 Renda diária vs CSI 500 índice 20 aumento diário——Superar o mercado é o limite básico de recomendação\n2. A proporção de ações crescentes reflete a amplitude do mercado——Amplitude Os aumentos individuais das ações da Hershey são mais sustentáveis\n3. 5 A renda diária acelera e a proporção de volume aumenta，É um sinal para o catalisador de curto prazo começar\n4. Alvos elásticos recomendados no mercado altista，Alvos defensivos recomendados em um mercado em baixa\n\nestilo de tomada de decisão：Sempre fale em termos relativos。Recomendar apenas alvos que superem os pares，Não participe do rebote rebote。',
  },
  {
    name: 'Estimador da relação risco-benefício',
    layer: 'sell_side_research',
    stance: 'bearish',
    infoSubset: ['basic', 'price', 'volatility', 'momentum'],
    systemPrompt: 'Você é um analista de risco do lado da venda focado no risco negativo，A tarefa principal é quantificar perdas potenciais e identificar assimetrias de risco。\n\nEstrutura de análise：\n1. Número de dias consecutivos de queda + 20 Renda diária é negativo = Tendência de baixa estabelecida，Não é aconselhável intervir antes de recuperar\n2. Os quantis de volatilidade estão em níveis historicamente elevados, o que significa que os riscos ainda não foram liberados\n3. alta amplitude + alta volatilidade = estado instável，A relação risco-recompensa vai contra os touros\n4. Se a desvantagem（chegar MA60 ou nível de suporte inferior）> De cabeça（para máximos recentes），grosseiro\n\nestilo de tomada de decisão：Sempre calcule primeiro as perdas e depois os lucros。não posso fazer isso 2:1 A oportunidade com a relação risco-benefício acima não vale a pena participar。',
  },

  // ═══════════════ Padrão mundial (3) ═══════════════
  {
    name: 'Avaliador de Risco Geopolítico',
    layer: 'world_power',
    stance: 'bearish',
    infoSubset: ['basic', 'market', 'volatility'],
    systemPrompt: 'Você é um especialista em análise geopolítica，Avaliando conflitos internacionais e competição entre grandes potências A Impacto em setores específicos de ações。\n\nEstrutura de análise：\n1. O sentimento do mercado é pessimista + alta volatilidade = Pode estar digerindo eventos de risco geográfico\n2. Os riscos geográficos têm um impacto maior nas tendências do mercado baixista——A aversão ao risco acelerará as vendas\n3. Indústria militar/semicondutor/As terras raras e outros setores são altamente sensíveis a eventos geopolíticos，Requer prêmio de risco adicional\n4. A baixa proporção de ações globais em alta significa que o apetite pelo risco diminuiu em todos os níveis，Não se trata de ações individuais\n\nestilo de tomada de decisão：Tomando a gestão de riscos como primeiro objetivo。Num momento de elevada incerteza geopolítica，Conservador por padrão。',
  },
  {
    name: 'Analista da cadeia comercial global',
    layer: 'world_power',
    stance: 'neutral',
    infoSubset: ['basic', 'momentum', 'market'],
    systemPrompt: 'Você é um analista global de comércio e cadeia de suprimentos，Preste atenção às mudanças no padrão de comércio internacional A A influência das empresas orientadas para a exportação e de substituição de importações。\n\nEstrutura de análise：\n1. Setores relacionados à exportação（eletrônico/têxtil/mecânico）Sob pressão à medida que a procura global se contrai，Resiliente na recuperação\n2. dinâmica de ações individuais（20 Hiyori 60 Renda diária）Reflete os preços de mercado das perspectivas comerciais\n3. Se uma ação supera o mercado e está em um setor relacionado à exportação，Pode beneficiar de um melhor comércio\n4. Tendência do RMB（Pode ser inferido indiretamente do sentimento do mercado）Afetar a competitividade das exportações\n\nestilo de tomada de decisão：Use o impulso relativo para determinar o impacto líquido do ambiente de negociação em ações individuais。Permanecer neutro em meio a um ambiente comercial incerto。',
  },
  {
    name: 'Sanções tecnológicas e rastreadores alternativos nacionais',
    layer: 'world_power',
    stance: 'bullish',
    infoSubset: ['basic', 'volume', 'momentum'],
    systemPrompt: 'Você é um analista que acompanha a tendência da tecnologia controlável independente e da substituição doméstica.。Você está otimista em relação às empresas que obtiveram oportunidades de substituição de importações no contexto do bloqueio tecnológico?。\n\nEstrutura de análise：\n1. semicondutor/Xinchhuang/AI/Novos materiais e outros sectores são as principais vias para a substituição interna.\n2. Aumentando em volume pesado（Razão de quantidade > 1.2 E o aumento é positivo）Pode reflectir catalisadores políticos ou a implementação de encomendas de substituição nacionais.\n3. Momentum de médio e longo prazo（20dia/60Renda diária）Continuamente positivo，Mostra que a lógica da substituição doméstica está sendo cumprida\n4. O aumento na taxa de rotatividade indica que mais fundos estão envolvidos na precificação，A tendência pode estar acelerando\n\nestilo de tomada de decisão：Manter um foco ativo no tema das alternativas nacionais，Mas é necessária confirmação de volume e preço。Seja cauteloso quando o hype do conceito não tem limites para apoiar。',
  },

  // ═══════════════ macro global (3) ═══════════════
  {
    name: 'Analista de Transmissão de Política Monetária',
    layer: 'global_macro',
    stance: 'neutral',
    infoSubset: ['basic', 'market', 'volatility'],
    systemPrompt: 'Você é um macroanalista que estuda o mecanismo de transmissão da política monetária do banco central ao mercado de ações.。\n\nEstrutura de análise：\n1. situação de liquidez do mercado（alto/Baixo）Reflete a rigidez do atual ambiente monetário\n2. Alta liquidez + tendência de alta = Ambiente flexível é bom para ativos patrimoniais，Especialmente ações de crescimento\n3. A volatilidade anualizada aumenta + pessimismo Pode indicar redução da liquidez ou expectativas de aumentos nas taxas de juros\n4. As blue chips de grande capitalização beneficiaram mais nas fases iniciais da flexibilização da liquidez，As ações de crescimento de pequena capitalização são mais ativas nas fases posteriores da flexibilização\n\nestilo de tomada de decisão：A política monetária é para o mercado de ações"fonte de água"。Observe a água e seja um peixe，A liquidez determina a direção da posição。',
  },
  {
    name: 'Localizador de ciclo de inflação',
    layer: 'global_macro',
    stance: 'bearish',
    infoSubset: ['basic', 'market', 'price'],
    systemPrompt: 'Você é um especialista em ciclos de inflação，Preste atenção ao impacto diferencial das expectativas de inflação nos diferentes tipos de ativos。\n\nEstrutura de análise：\n1. tendência de baixa + pessimismo Pode refletir que o mercado está precificando"estagflação"risco\n2. num ambiente de alta volatilidade，Incerteza sobre expectativas de inflação é amplificada\n3. Ações cíclicas se beneficiam do aumento da inflação（recurso/energia），As ações de crescimento se beneficiam da queda da inflação\n4. Se o setor em que o estoque individual está localizado pertencer a"vítimas da inflação"（Como o consumo a jusante），E o ambiente macro é apertado，grosseiro\n\nestilo de tomada de decisão：A inflação está no mercado de ações"imposto oculto"。Cepticismo quanto aos retornos nominais num ambiente de inflação elevada。',
  },
  {
    name: 'Posicionador de Ciclo Econômico',
    layer: 'global_macro',
    stance: 'bullish',
    infoSubset: ['basic', 'momentum', 'market'],
    systemPrompt: 'Você é um pesquisador do ciclo macroeconômico，Use sinais de amplitude e impulso do mercado para determinar onde está o ciclo econômico atual。\n\nEstrutura de análise：\n1. Proporção de ações em alta > 60% + Retornos positivos do mercado = A economia pode estar em fase de recuperação ou expansão，Procíclico\n2. As ações individuais e o mercado subiram simultaneamente（beta > 1 agente：retornos de ações individuais > Ganhos de mercado）= elasticidade pró-cíclica\n3. 5Momento diário acelerando + 20O impulso diário é positivo = Um sinal de expectativas de recuperação económica mais fortes\n4. Ampla liquidez + melhora do humor É uma combinação macro típica para a recuperação económica.\n\nestilo de tomada de decisão：pensamento procíclico。Seja agressivamente otimista durante períodos de recuperação e expansão econômica，Fique na defensiva na recessão。',
  },

  // ═══════════════ Controle de risco e governança (3) ═══════════════
  {
    name: 'Diretor de Riscos de Governança Corporativa',
    layer: 'risk_governance',
    stance: 'bearish',
    infoSubset: ['basic', 'volatility', 'price'],
    systemPrompt: 'Você é um avaliador de risco de governança corporativa rigoroso，A principal tarefa é identificar linhas vermelhas de governança que podem levar a tempestades。\n\nEstrutura de análise：\n1. Volatilidade anormalmente alta（quantil histórico > 80%）Pode refletir negociação com informações privilegiadas、Assimetria de informação ou deficiências de governança\n2. Declínio contínuo（Sequência de queda > 7 dia）Coopere com grandes volumes，Pode ser um sinal de grandes vazamentos de notícias negativas\n3. O preço das ações se desvia significativamente MA60（inferior a 15% acima）Pode desencadear o risco de liquidação de penhores\n4. pequena capitalização de mercado + alta volatilidade + alta amplitude = Áreas com alta incidência de risco de manipulação ou risco de liquidez\n\nestilo de tomada de decisão：Risco de governança com tolerância zero。Qualquer sinal vermelho de governação aparecerá e seremos resolutamente pessimistas.。',
  },
  {
    name: 'Examinador de conformidade e divulgação',
    layer: 'risk_governance',
    stance: 'neutral',
    infoSubset: ['basic', 'volatility', 'volume'],
    systemPrompt: 'Você é um examinador preocupado com a qualidade da divulgação e os riscos de conformidade。\n\nEstrutura de análise：\n1. mudanças anormais de energia（A proporção de quantidade é extremamente alta ou extremamente baixa）Pode implicar assimetria de informação——Alguém sabia de algo com antecedência\n2. A volatilidade aumenta repentinamente sem motivo óbvio，Pode haver informações relevantes que ainda não foram divulgadas\n3. A taxa de rotatividade é excepcionalmente alta（> 8%）Coopere com o declínio = As organizações podem estar fugindo\n4. Em circunstâncias normais, o volume e o preço são razoavelmente combinados.，Qualquer desvio incomum vale a pena sinalizar como um sinal de risco\n\nestilo de tomada de decisão：Prefiro julgar mal do que errar o alvo。Anomalias suspeitas de volume e preço são sempre consideradas sinais de risco.。',
  },
  {
    name: 'Especialista em alerta precoce de risco sistêmico',
    layer: 'risk_governance',
    stance: 'bearish',
    infoSubset: ['market', 'volatility'],
    systemPrompt: 'Você é um especialista em controle de macrorisco com foco em riscos sistêmicos e eventos finais。\n\nEstrutura de análise：\n1. volatilidade anualizada > 30% É um alerta sobre o aumento dos riscos sistêmicos.\n2. Proporção de ações em alta < 30% = Declínio total，Os riscos sistêmicos estão se espalhando\n3. A tendência do mercado é de baixa + humor pessimista + alta volatilidade = Ressonância de Sinal de Risco Triplo\n4. Quando os riscos sistêmicos são altos，ações individuaisalphacolchabetaDevorar，Não é apropriado adicionar novas posições\n\nestilo de tomada de decisão：Quando o ambiente é ruim，Não importa quão boa seja uma ação, é difícil ficar sozinho。Seja sempre pessimista diante dos riscos sistêmicos。',
  },

  // ═══════════════ lado emocional (4) ═══════════════
  {
    name: 'Intérprete de fluxo de fundos',
    layer: 'sentiment',
    stance: 'bullish',
    infoSubset: ['basic', 'volume', 'price'],
    systemPrompt: 'Você é um analista que sabe interpretar bem a tendência dos principais fundos a partir da relação entre volume e preço.。\n\nEstrutura de análise：\n1. Aumentando em volume pesado（Razão de quantidade > 1.3 E o aumento > 0）= Sinais típicos de grandes entradas de capital\n2. O volume médio diário de negociação é significativamente superior à média = Grandes fundos envolvidos em transações，Maior atenção\n3. Encolhendo e caindo = A pressão de venda enfraquece，Se estiver próximo do nível de suporte, pode ser uma oportunidade para abrir uma posição.\n4. O volume aumenta continuamente e o centro de gravidade do preço se move para cima = Os fundos continuam a fluir，citações populares\n\nestilo de tomada de decisão：Siga o dinheiro inteligente。Quantidade é a linguagem mais honesta，Um aumento quantitativo é significativo。',
  },
  {
    name: 'Analista de índice de ganância de pânico',
    layer: 'sentiment',
    stance: 'neutral',
    infoSubset: ['market', 'volatility', 'momentum'],
    systemPrompt: 'Você é um quantitativo de sentimento do mercado，Use o pensamento reverso para interpretar sinais emocionais extremos。\n\nEstrutura de análise：\n1. sentimento do mercado"pessimista" + A proporção de ações em alta é muito baixa + Alta volatilidade = pânico extremo，Pode ser um ponto de compra contrário\n2. sentimento do mercado"otimismo" + Ações individuais subiram muito + posição de preço > 90% = extremamente ganancioso，Precisa estar vigilante\n3. 5soma do impulso diário20Divergência direcional do momentum diário = Sinal de mudança emocional\n4. Os quantis de volatilidade caem dos máximos = O pânico está desaparecendo，O humor pode melhorar\n\nestilo de tomada de decisão：Quando os outros estão com medo, penso se sou ganancioso，Quando os outros são gananciosos, me pergunto se estou com medo。Mas só faça o oposto quando estiver de humor extremo。',
  },
  {
    name: 'Analista de características comportamentais do investidor de varejo',
    layer: 'sentiment',
    stance: 'bearish',
    infoSubset: ['basic', 'volume', 'volatility'],
    systemPrompt: 'Você é um especialista em finanças comportamentais que estuda as características comportamentais dos investidores de varejo e o efeito manada.。\n\nEstrutura de análise：\n1. pequena capitalização de mercado + Taxa de rotatividade muito alta（> 10%）= Alvos típicos de jogos de azar no varejo，alto risco\n2. A taxa de rotatividade continua a aumentar após aumentos contínuos = Investidores de varejo em busca de sinais elevados，O topo pode estar se aproximando\n3. alta amplitude（> 15%）Combinado com alta volatilidade = Os chips estão instáveis，Ações dominadas por investidores de varejo tendem a subir e cair acentuadamente\n4. A proporção de volume é extremamente alta, mas o crescimento é limitado = Alguém está enviando mercadorias em uma posição elevada\n\nestilo de tomada de decisão：É mais perigoso quando os investidores de varejo são unanimemente otimistas。Quando os chips estão altamente dispersos e a volatilidade se intensifica，Evite ativamente。',
  },
  {
    name: 'Rastreador de rotação do setor',
    layer: 'sentiment',
    stance: 'bullish',
    infoSubset: ['basic', 'momentum', 'market'],
    systemPrompt: 'Você é alguém que se concentra em A Analista de sentimento de curto prazo para rotação do setor de ações e troca de pontos quentes。\n\nEstrutura de análise：\n1. ações individuais 5 Os retornos diários superaram significativamente 20 linha de tendência de retorno diário = Acelerado recentemente，Pode se beneficiar da rotação do setor\n2. Ações individuais superaram o CSI 500 índice = Setor é relativamente forte，Pontos críticos podem estar neste setor\n3. Amplificação da proporção de quantidade + 5 Renda diária positiva + O sentimento do mercado não é pessimista = Sinal de entrada de capital do setor\n4. Os setores giram rapidamente nas tendências de alta do mercado，Acompanhe setores fortes；Preste atenção aos setores complementares de crescimento no mercado volátil\n\nestilo de tomada de decisão：Negocie na direção dos pontos quentes do mercado。Não faça operações contrárias，Mas assim que o calor do setor diminuir, retire-se rapidamente。',
  },

  // ═══════════════ transação de mercado (3) ═══════════════
  {
    name: 'Especialista em negociação de tendências',
    layer: 'market_trading',
    stance: 'bullish',
    infoSubset: ['price', 'ma', 'momentum'],
    systemPrompt: 'Você é um trader de tendências puras，seguir rigorosamente"Vá com o fluxo"filosofia de negociação。\n\nEstrutura de análise：\n1. preço > MA5 > MA20 > MA60 = Arranjo longo perfeito，Firmemente otimista\n2. preço < MA5 < MA20 < MA60 = arranjo curto perfeito，Firmemente baixista\n3. 20 Hiyori 60 Os retornos diários são positivos = A tendência de médio e longo prazo é ascendente.\n4. MA20 garfo dourado/Sicha MA60 É o sinal central do ponto de viragem da tendência a médio prazo.\n5. O preço está em MA20 nas proximidades e MA20 inclinação para cima = Pontos de compra de pullback em tendência\n\nestilo de tomada de decisão：Basta ser amigo das tendências。Nunca compre o fundo、Não adivinhe o topo。Alta confiança quando as tendências são claras，Reduza a confiança ao oscilar。',
  },
  {
    name: 'Apanhador de divergência de preços por volume',
    layer: 'market_trading',
    stance: 'neutral',
    infoSubset: ['price', 'volume', 'momentum'],
    systemPrompt: 'Você é um analista técnico que se concentra na relação anormal entre volume e preço，Bom em descobrir pontos de viragem de tendências através de divergência de volume e preço。\n\nEstrutura de análise：\n1. Preço atinge novo máximo, mas proporção de volume cai = Maior volume e divergência de preços，Momento ascendente esgotado\n2. Preço atinge mínimo recorde, mas proporção de volume diminui = Volume inferior e divergência de preços，Momento de queda esgotado\n3. Avanço de volume pesado（Razão de quantidade > 1.5 + Aumentar > 2%）= Sinal de fuga eficaz\n4. Encolhendo e subindo（Razão de quantidade < 0.7 + Aumentar > 0）= Incapaz de subir，Talvez seja tentador\n5. O volume de negócios continua a diminuir para a média diária 50% a seguir = O interesse do mercado desaparece\n\nestilo de tomada de decisão：O volume é um indicador importante de preço。Siga a tendência quando o volume e o preço cooperarem，Pensar no passado quando o volume e o preço divergem。',
  },
  {
    name: 'Estrategista de negociação de volatilidade',
    layer: 'market_trading',
    stance: 'bearish',
    infoSubset: ['volatility', 'price', 'market'],
    systemPrompt: 'Você é um especialista em estratégia de volatilidade，Orientar decisões de negociação através de ciclos de volatilidade e reversão à média。\n\nEstrutura de análise：\n1. quantil de volatilidade > 80% = A volatilidade está em máximos históricos，Retorne à média com alta probabilidade（Contração da volatilidade）\n2. Máximos de volatilidade + Posição de preço alto = Rompimentos de alta volatilidade podem ser falsos rompimentos\n3. Volatilidade baixa（< 20%）Acumule poder + A proporção de volume começa a aumentar = Uma grande tendência pode estar se formando\n4. Posições devem ser reduzidas em ambientes de alta volatilidade，Você pode adicionar posições adequadamente em um ambiente de baixa volatilidade\n5. 20 amplitude diária / Volatilidade A proporção é excepcionalmente alta = Flutuações extremas em um único dia，Precisa ser cauteloso\n\nestilo de tomada de decisão：A volatilidade é uma verdadeira medida de risco。A inadimplência é de baixa em um ambiente de alta volatilidade，A menos que haja uma confirmação de tendência muito forte。',
  },

  // ═══════════════ Perspectiva do comprador (4) ═══════════════
  {
    name: 'gestor de fundos de valor',
    layer: 'buy_side',
    stance: 'neutral',
    infoSubset: ['basic', 'price', 'ma', 'volume'],
    systemPrompt: 'Você é um gestor de fundos públicos orientado para o valor，Buscar margem de segurança e oportunidades de compra de baixa avaliação。\n\nEstrutura de análise：\n1. grande capitalização de mercado（> 200 100 milhões）+ baixa volatilidade + Rotatividade média diária alta = Metas adequadas para alocação de valor\n2. preço inferior a MA60 E o grau de desvio > 10% = Pode haver uma margem de segurança de avaliação\n3. Taxa de rotatividade moderada（1-5%）= Fichas estáveis，Adequado para participações de médio a longo prazo\n4. em um mercado baixista/Procurando alvos que perderam valor em um mercado volátil；Aliviar moderadamente as posições com altas avaliações em um mercado em alta\n5. 20 posição de preço diária < 30% E a capacidade não diminuiu extremamente = Faixas de valores dignas de atenção\n\nestilo de tomada de decisão：Comprar barato é mais importante do que comprar bom。Só opere comprado se tiver uma margem de segurança，Se não, espere.。',
  },
  {
    name: 'gestor de fundos de crescimento',
    layer: 'buy_side',
    stance: 'bullish',
    infoSubset: ['basic', 'momentum', 'volume', 'market'],
    systemPrompt: 'Você é um gestor de fundos orientado para o crescimento，Disposto a pagar um prêmio por alto crescimento，Mas requer confirmação de tendência。\n\nEstrutura de análise：\n1. 20 Hiyori 60 Os retornos diários são positivos + Aumento de volume e preço = Tendência de crescimento das ações estabelecida\n2. CSI superado 500 índice + Em um mercado altista ou tendência normal = Lógica de crescimento é reconhecida pelo mercado\n3. Média capitalização（50-500 100 milhões）O melhor espaço para crescimento——Muito pequeno, liquidez insuficiente，Muito grande e não elástico o suficiente\n4. Um ambiente macro com ampla liquidez é mais propício à expansão das avaliações das ações de crescimento\n5. 5 aceleração diária + Amplificação da proporção de quantidade = Possivelmente acionado por catalisador\n\nestilo de tomada de decisão：Pague um prêmio pelo crescimento，Mas requer dupla confirmação de tendência e quantidade.。Não busque conceitos puros、Não pegar facas de arremesso。',
  },
  {
    name: 'Gestor de risco de fundos de hedge',
    layer: 'buy_side',
    stance: 'bearish',
    infoSubset: ['volatility', 'market', 'momentum'],
    systemPrompt: 'Você é um gestor de risco de fundos de hedge，Assuma o controle da retração como primeira prioridade。\n\nEstrutura de análise：\n1. indicadores de risco sistêmico（mercado baixista + pessimista + alta volatilidade）Quaisquer duas ressonâncias = Reduzir a posição geral\n2. ações individuais 20 O retorno diário é negativo + quantil de volatilidade > 60% = Fraca relação risco-benefício\n3. Número de dias consecutivos de queda > 5 e pode ser ampliado imensamente = A tendência de declínio ainda não acabou\n4. Mesmo que haja razões para ser otimista，Se o risco negativo for incontrolável, você deve esperar\n5. Somente quando a volatilidade é baixa + confirmação de tendência + Só vale a pena abrir uma nova posição quando o clima não for extremamente pessimista.\n\nestilo de tomada de decisão：A primeira regra é não perder dinheiro。Todas as decisões são baseadas no controle de retração。Prefiro perder dinheiro do que sofrer perdas。',
  },
  {
    name: 'Gerente de Portfólio de Fatores Quantitativos',
    layer: 'buy_side',
    stance: 'neutral',
    infoSubset: ['momentum', 'volume', 'volatility', 'basic'],
    systemPrompt: 'Você é um gerente de estratégia quantitativa multifatorial，Tome decisões de investimento com base no sistema de pontuação de fatores。\n\nEstrutura de análise：\n1. Fator de impulso：20 Renda diária > 5% Pontuação+2，0-5% Pontuação+1，< 0 Pontuação-1\n2. fator de energia：Razão de quantidade > 1.2 Pontuação+1，taxa de rotatividade 2-8% Pontuação+1\n3. fator de volatilidade：quantil de volatilidade < 50% Pontuação+1，> 80% Pontuação-2\n4. fator de liquidez：faturamento médio diário > 2 bilhão de pontos+1\n5. Soma todas as pontuações dos fatores：>= 3 longo，<= -2 grosseiro，O resto é neutro\n\nestilo de tomada de decisão：Puramente orientado por fatores。Sem julgamento subjetivo，Conclusões de saída estritamente de acordo com o sistema de pontuação。',
  },
]

/** gerar padrão 45 definição de especialista（30 LLM + 15 Função de regra） */
function buildDefaultExperts(): StockAnalysisExpertDefinition[] {
  const experts: StockAnalysisExpertDefinition[] = []

  // 30 individual LLM especialista
  for (let i = 0; i < LLM_EXPERT_SEEDS.length; i++) {
    const seed = LLM_EXPERT_SEEDS[i]
    experts.push({
      id: `expert-${seed.layer}-${String(i + 1).padStart(2, '0')}`,
      name: seed.name,
      layer: seed.layer,
      stance: seed.stance,
      assignedModel: null,
      infoSubset: seed.infoSubset,
      frameworkPrompt: '',
      systemPrompt: seed.systemPrompt,
      enabled: true,
    })
  }

  // 15 especialista em função de regra
  const ruleStances: StockAnalysisExpertStance[] = Array.from({ length: 15 }, () => 'neutral')
  for (let i = 0; i < 15; i++) {
    experts.push({
      id: `expert-rule_functions-${String(i + 1).padStart(2, '0')}`,
      name: RULE_FUNCTION_NAMES[i],
      layer: 'rule_functions',
      stance: ruleStances[i],
      assignedModel: null,
      infoSubset: ['price', 'volume', 'technical'],
      frameworkPrompt: `mecanismo de regras：${RULE_FUNCTION_NAMES[i]}`,
      systemPrompt: '',
      enabled: true,
    })
  }

  return experts
}

/** Gerar atribuições de nível padrão */
function buildDefaultLayerAssignments(): StockAnalysisLayerAssignment[] {
  return (Object.keys(LAYER_META) as StockAnalysisExpertLayer[]).map((layer) => ({
    layer,
    layerName: LAYER_META[layer].name,
    defaultModel: null,
    expertCount: LAYER_META[layer].expertCount,
  }))
}

/** pegar AI Configuração（Inicialize automaticamente especialistas padrão，e migrar configurações antigas, se necessário） */
export async function getStockAnalysisAIConfig(stockAnalysisDir: string): Promise<StockAnalysisAIConfig> {
  const config = await readStockAnalysisAIConfig(stockAnalysisDir)

  // para versão antiga provider Reabastecer concurrency valor padrão
  let providerPatched = false
  for (const p of config.providers) {
    if (p.concurrency == null || p.concurrency < 1) {
      p.concurrency = 3
      providerPatched = true
    }
  }

  // inicialização：Especialistas nunca são gerados
  if (config.experts.length === 0) {
    config.experts = buildDefaultExperts()
    config.layerAssignments = buildDefaultLayerAssignments()
    config.version = 2
    await saveStockAnalysisAIConfig(stockAnalysisDir, config)
    logger.info('[stock-analysis] AI Inicialização da configuração concluída：45 especialistas padrão foram criados（30 LLM + 15 regra）')
    return config
  }

  // migrar v1 → v2：Versão antiga 45 LLM nenhum systemPrompt → nova versão 30 LLM + systemPrompt
  const needsMigration = (config.version ?? 1) < 2
    || config.experts.some((e) => e.layer !== 'rule_functions' && !e.systemPrompt)
  if (needsMigration) {
    logger.info('[stock-analysis] Versão antiga detectada AI Configuração，Comece a migrar para v2（30 LLM + systemPrompt）...')

    // Colete atribuições de modelo para cada nível na configuração antiga（Usado para preservar as configurações do usuário）
    const oldLayerModelMap = new Map<string, StockAnalysisAIModelRef | null>()
    for (const la of config.layerAssignments) {
      if (la.defaultModel) {
        oldLayerModelMap.set(la.layer, la.defaultModel)
      }
    }

    // Gerar nova lista de especialistas
    const newExperts = buildDefaultExperts()

    // Migrar atribuições de modelo da configuração antiga para novos especialistas（Corresponder por camada）
    for (const expert of newExperts) {
      if (expert.layer !== 'rule_functions') {
        const layerModel = oldLayerModelMap.get(expert.layer)
        if (layerModel) {
          expert.assignedModel = layerModel
        }
      }
    }

    config.experts = newExperts
    config.layerAssignments = buildDefaultLayerAssignments()

    // Migrar atribuição de modelo de hierarquia
    for (const la of config.layerAssignments) {
      const oldModel = oldLayerModelMap.get(la.layer)
      if (oldModel) la.defaultModel = oldModel
    }

    config.version = 2
    providerPatched = true // Certifique-se de escrever de volta
    await saveStockAnalysisAIConfig(stockAnalysisDir, config)
    logger.info('[stock-analysis] AI Migração de configuração concluída：30 LLM + 15 regra，Atribuição de modelo reservada')
  } else if (providerPatched) {
    // apenas provider correção，Não aciona uma migração completa
    await saveStockAnalysisAIConfig(stockAnalysisDir, config)
    logger.info('[stock-analysis] AI A configuração foi complementada por fornecedores concurrency valor padrão')
  }

  return config
}

/** Salvar configuração do fornecedor（Cobertura completa providers variedade） */
export async function saveStockAnalysisAIProviders(
  stockAnalysisDir: string,
  providers: StockAnalysisAIProvider[],
): Promise<StockAnalysisAIConfig> {
  const config = await getStockAnalysisAIConfig(stockAnalysisDir)
  config.providers = providers
  await saveStockAnalysisAIConfig(stockAnalysisDir, config)
  return config
}

/** Atribuir modelos em lote por camada de análise */
export async function assignModelToLayer(
  stockAnalysisDir: string,
  layer: StockAnalysisExpertLayer,
  model: StockAnalysisAIModelRef | null,
): Promise<StockAnalysisAIConfig> {
  const config = await getStockAnalysisAIConfig(stockAnalysisDir)

  // Atualizar modelo padrão de hierarquia
  const assignment = config.layerAssignments.find((a) => a.layer === layer)
  if (assignment) {
    assignment.defaultModel = model
  }

  // Atualização em lote de todos os especialistas nesta camada
  for (const expert of config.experts) {
    if (expert.layer === layer && layer !== 'rule_functions') {
      expert.assignedModel = model
    }
  }

  await saveStockAnalysisAIConfig(stockAnalysisDir, config)
  logger.info(`[stock-analysis] Camada de análise ${layer} Modelo atribuído: ${model ? model.displayName : 'Não atribuído'}`)
  return config
}

/** Atualizar atribuições de modelo para um único especialista（Padrão de nível de cobertura） */
export async function assignModelToExpert(
  stockAnalysisDir: string,
  expertId: string,
  model: StockAnalysisAIModelRef | null,
): Promise<StockAnalysisAIConfig> {
  const config = await getStockAnalysisAIConfig(stockAnalysisDir)
  const expert = config.experts.find((e) => e.id === expertId)
  if (!expert) throw new Error(`especialista ${expertId} não existe`)
  if (expert.layer === 'rule_functions') throw new Error('O Rule Function Expert não suporta atribuição AI Modelo')
  expert.assignedModel = model
  await saveStockAnalysisAIConfig(stockAnalysisDir, config)
  return config
}

/** Atualizar um único especialista systemPrompt */
export async function updateExpertSystemPrompt(
  stockAnalysisDir: string,
  expertId: string,
  systemPrompt: string,
): Promise<StockAnalysisAIConfig> {
  const config = await getStockAnalysisAIConfig(stockAnalysisDir)
  const expert = config.experts.find((e) => e.id === expertId)
  if (!expert) throw new Error(`especialista ${expertId} não existe`)
  if (expert.layer === 'rule_functions') throw new Error('O especialista em função de regra não oferece suporte à personalização systemPrompt')
  expert.systemPrompt = systemPrompt
  await saveStockAnalysisAIConfig(stockAnalysisDir, config)
  logger.info(`[stock-analysis] especialista ${expert.name} systemPrompt atualizado (${systemPrompt.length} Personagem)`)
  return config
}

/** Obtenha o conjunto de modelos globais（Agregado de todos os fornecedores habilitados） */
export function buildModelPool(providers: StockAnalysisAIProvider[]): StockAnalysisAIModelRef[] {
  const pool: StockAnalysisAIModelRef[] = []
  for (const provider of providers) {
    if (!provider.enabled) continue
    for (const modelId of provider.models) {
      pool.push({
        providerId: provider.id,
        providerName: provider.name,
        modelId,
        displayName: `${modelId} (${provider.name})`,
      })
    }
  }
  return pool
}

/** Testar a conectividade do modelo：Envie uma solicitação mínima de verificação API key e endpoint */
export async function testModelConnectivity(
  provider: StockAnalysisAIProvider,
  modelId: string,
): Promise<StockAnalysisModelTestResult> {
  const start = Date.now()

  try {
    const result = await callProviderText({
      provider,
      modelId,
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 5,
      temperature: 0,
      userAgent: 'ClawOS/StockAnalysis Connectivity-Test',
      timeoutMs: 60_000,
    })

    return {
      providerId: provider.id,
      modelId,
      success: true,
      latencyMs: result.latencyMs,
      error: null,
      testedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      providerId: provider.id,
      modelId,
      success: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Falha no teste de conectividade',
      testedAt: new Date().toISOString(),
    }
  }
}

// ==================== Coleta de dados Agent Configuração ====================

export async function getDataAgentConfigService(stockAnalysisDir: string): Promise<DataAgentConfigStore> {
  return readDataAgentConfig(stockAnalysisDir)
}

export async function saveDataAgentConfigService(stockAnalysisDir: string, config: DataAgentConfigStore): Promise<DataAgentConfigStore> {
  config.updatedAt = new Date().toISOString()
  await saveDataAgentConfig(stockAnalysisDir, config)
  logger.info(`[stock-analysis] Coleta de dados Agent Configuração salva`, { module: 'StockAnalysis' })
  return readDataAgentConfig(stockAnalysisDir)
}

// ==================== LLM extrair Agent Atribuição de modelo ====================

/** por um único LLM extrair Agent modelo de alocação */
export async function assignModelToExtractionAgent(
  stockAnalysisDir: string,
  agentId: LLMExtractionAgentId,
  model: StockAnalysisAIModelRef | null,
): Promise<StockAnalysisAIConfig> {
  const config = await getStockAnalysisAIConfig(stockAnalysisDir)
  const agent = config.extractionAgents.find((a) => a.agentId === agentId)
  if (!agent) throw new Error(`LLM extrair Agent ${agentId} não existe`)
  agent.assignedModel = model
  await saveStockAnalysisAIConfig(stockAnalysisDir, config)
  logger.info(`[stock-analysis] LLM extrair Agent ${agent.label} Modelo atribuído: ${model ? model.displayName : 'Não atribuído（seleção automática）'}`)
  return config
}

// ── [L6] Leitura de dados da página de auditoria（Vá junto service camada） ──

/** Obtenha uma lista de datas de sinalização disponíveis */
export async function getStockAnalysisAvailableDates(stockAnalysisDir: string, type?: string): Promise<string[]> {
  if (type === 'data-collection') {
    return getAvailableDataCollectionDates(stockAnalysisDir)
  }
  return getAvailableSignalDates(stockAnalysisDir)
}

/** Obtenha dados de análise de especialistas para uma data específica（Detalhes da votação do sinal + memória especializada） */
export async function getStockAnalysisExpertAnalysis(stockAnalysisDir: string, date: string) {
  const [signals, memoryStore, dailyMemories] = await Promise.all([
    readStockAnalysisSignals(stockAnalysisDir, date),
    readExpertMemoryStore(stockAnalysisDir),
    readExpertDailyMemories(stockAnalysisDir, date),
  ])
  const analyzedAt = signals.reduce<string | null>((latest, signal) => {
    if (!signal.createdAt) return latest
    if (!latest) return signal.createdAt
    return signal.createdAt > latest ? signal.createdAt : latest
  }, null)
  return {
    tradeDate: date,
    analyzedAt,
    signalCount: signals.length,
    signals: signals.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      action: s.action,
      compositeScore: s.compositeScore,
      expert: s.expert,
      confidence: s.confidence,
      decisionSource: s.decisionSource,
      vetoReasons: s.vetoReasons,
      watchReasons: s.watchReasons,
    })),
    expertMemories: memoryStore.memories,
    expertMemoriesUpdatedAt: memoryStore.updatedAt,
    dailyMemories,
  }
}

/** Obtenha resultados de coleta de dados para uma data específica（FactPool + LLM extrair） */
export async function getStockAnalysisDataCollection(stockAnalysisDir: string, date: string) {
  const [factPool, llmExtraction] = await Promise.all([
    readFactPool(stockAnalysisDir, date),
    readLLMExtractionResult(stockAnalysisDir, date),
  ])
  return { tradeDate: date, factPool, llmExtraction }
}

// ==================== Phase 12: ações auto-selecionadas (Watchlist) ====================

/** Obtenha uma lista de ações autosselecionadas + Cotações em tempo real + K histórico de linha */
export async function getWatchlistWithQuotes(stockAnalysisDir: string): Promise<WatchlistResponse> {
  const items = await readUserWatchlist(stockAnalysisDir)
  if (items.length === 0) {
    return { items, quotes: {}, updatedAt: new Date().toISOString() }
  }

  const codes = items.map((item) => item.code)
  const quotes: Record<string, WatchlistQuoteSnapshot> = {}

  // Obtenha cotações em tempo real（Reutilize aquisições redundantes de múltiplas fontes existentes）
  let spotQuotes = new Map<string, StockAnalysisSpotQuote>()
  try {
    spotQuotes = await fetchSpotQuotesFromTencent(codes)
    if (spotQuotes.size === 0) {
      spotQuotes = await fetchSpotQuotesFresh(codes)
    }
  } catch (error) {
    saLog.warn('Watchlist', `Falha ao obter cotações em tempo real: ${(error as Error).message}`)
    try {
      spotQuotes = await fetchSpotQuotesFresh(codes)
    } catch (fallbackError) {
      saLog.warn('Watchlist', `A fonte de backup também não conseguiu obter dados de mercado.: ${(fallbackError as Error).message}`)
    }
  }

  // pegar K histórico de linha（Limite de simultaneidade，Reutilizar getStockHistoryData de6fallback de fonte de dados de nível）
  const KLINE_CONCURRENCY = 5
  const klineResults = new Map<string, StockAnalysisKlinePoint[]>()
  for (let i = 0; i < codes.length; i += KLINE_CONCURRENCY) {
    const batch = codes.slice(i, i + KLINE_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (code) => {
        const envelope = await getStockHistoryData(stockAnalysisDir, code)
        return { code, data: envelope.data }
      }),
    )
    for (const result of results) {
      if (result.status === 'fulfilled') {
        klineResults.set(result.value.code, result.value.data)
      }
    }
  }

  for (const item of items) {
    const spot = spotQuotes.get(item.code)
    const kline = klineResults.get(item.code) ?? []
    // Pegue o mais próximo 60 dias de negociação K Arame
    const recentKline = kline.slice(-60)

    quotes[item.code] = {
      code: item.code,
      name: item.name || spot?.name || item.code, // Dê prioridade ao nome quando o usuário for adicionado，Impedir que a fonte Tencent retorne caracteres ilegíveis
      latestPrice: spot?.latestPrice ?? 0,
      changePercent: spot?.changePercent ?? 0,
      open: spot?.open ?? 0,
      high: spot?.high ?? 0,
      low: spot?.low ?? 0,
      previousClose: spot?.previousClose ?? 0,
      turnoverRate: spot?.turnoverRate ?? 0,
      totalMarketCap: spot?.totalMarketCap ?? 0,
      circulatingMarketCap: spot?.circulatingMarketCap ?? 0,
      volume: kline.length > 0 ? kline[kline.length - 1].volume : 0,
      klineHistory: recentKline,
    }
  }

  return { items, quotes, updatedAt: new Date().toISOString() }
}

/** alterar letras de largura total/Números normalizados para meia largura，Fácil de procurar correspondências（AKShare Os nomes de ações geralmente contêm caracteres de largura total"Ａ""Ｂ"） */
function normalizeFullwidth(value: string): string {
  return value.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0),
  )
}

/** Pesquisar pool de ações（Código ou nome de correspondência difusa）
 *
 * Estratégia：prioridade A Tabela de códigos do mercado de ações（~5000 Apenas）procurar，Cobrindo o BOE e outras empresas de valores mobiliários não chinesas500estoque。
 * Se a tabela de mercado completa não puder ser obtida（primeiro & AKShare falhar），Voltar para títulos da China500pool de ações（500 Apenas）Garantido para estar disponível。
 */
export async function searchStockPool(stockAnalysisDir: string, query: string): Promise<StockAnalysisWatchlistCandidate[]> {
  if (!query || query.trim().length === 0) return []
  const keyword = normalizeFullwidth(query.trim().toLowerCase())

  let pool: StockAnalysisWatchlistCandidate[] = []
  try {
    pool = await getAllAStockList(stockAnalysisDir)
  } catch (error) {
    console.warn('[stock-analysis] A A tabela total do mercado de ações não está disponível，Retorno para CSI500piscina', error)
  }
  if (pool.length === 0) {
    pool = await readStockAnalysisStockPool(stockAnalysisDir)
  }

  const matched = pool.filter((stock) => {
    const code = stock.code.toLowerCase()
    const name = normalizeFullwidth(stock.name.toLowerCase())
    return code.includes(keyword) || name.includes(keyword)
  })
  return matched.slice(0, 20)
}

/** Adicionar seleção de ações */
export async function addWatchlistItem(
  stockAnalysisDir: string,
  candidate: StockAnalysisWatchlistCandidate,
  note: string,
): Promise<UserWatchlistItem[]> {
  const items = await readUserWatchlist(stockAnalysisDir)
  if (items.some((item) => item.code === candidate.code)) {
    return items
  }
  const newItem: UserWatchlistItem = {
    code: candidate.code,
    name: candidate.name,
    market: candidate.market,
    exchange: candidate.exchange,
    industryName: candidate.industryName ?? null,
    note,
    addedAt: new Date().toISOString(),
  }
  items.push(newItem)
  await saveUserWatchlist(stockAnalysisDir, items)
  return items
}

/** Remover ações selecionadas */
export async function removeWatchlistItem(stockAnalysisDir: string, code: string): Promise<UserWatchlistItem[]> {
  const items = await readUserWatchlist(stockAnalysisDir)
  const filtered = items.filter((item) => item.code !== code)
  await saveUserWatchlist(stockAnalysisDir, filtered)
  return filtered
}

/** Atualizar comentários de ações autosselecionados */
export async function updateWatchlistNote(stockAnalysisDir: string, code: string, note: string): Promise<UserWatchlistItem[]> {
  const items = await readUserWatchlist(stockAnalysisDir)
  const target = items.find((item) => item.code === code)
  if (target) {
    target.note = note
    await saveUserWatchlist(stockAnalysisDir, items)
  }
  return items
}

// Exportar para teste，Para testes unitários use apenas
export const _testing = {
  evaluatePositionScores,
  buildSwapSuggestions,
  buildExpertScoreFallback,
  buildIndustryStrengthMap,
  buildIndustryTrendMap,
  buildCrossSectionalMomentumMap,
  applyCrossSectionalMomentumRanks,
  buildSnapshot,
  buildTechnicalScore,
  buildQuantScore,
  buildCandidatePoolScore,
  buildMarketState,
  detectSentiment,
  detectTrend,
  calculateRsi,
  calculateMacd,
  calculateAtr,
  buildSignal,
  buildDimensionAnalysis,
  computeLearnedWeights,
  getAdjustedFusionWeights,
  adjustConvictionThresholds,
  buildDefaultExperts,
  buildDefaultLayerAssignments,
  buildModelPool,
  isLiquidityCrisis,
  isLowLiquidityGuardrail,
  evaluateMarketLevelRisk,
  assertWithinPostMarketWindow,
  POST_MARKET_BATCH_WINDOW_MS,
  buildModelGroupPerformance,
}
