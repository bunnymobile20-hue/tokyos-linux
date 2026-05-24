/**
 * G2 Oito principais coletas de dados Agent — Coleta de dados em lote fora do expediente
 *
 * 8 individual Agent Execute de forma independente，Não interfira um com o outro。Após a conclusão da coleta, os dados são gravados no conjunto de fatos compartilhado。
 * Não faça previsões ou julgamentos，Apenas coleta e organização de dados。
 * Marcar automaticamente quando a fonte de dados está anormal e tentar soluções alternativas（cada Agent Pelo menos 5 fontes de backup）。
 *
 * Agent lista：
 * 1. macro_economy   — Monitorização Macroeconómica（GDP/CPI/PMI/taxa de juro/taxa de câmbio）
 * 2. policy_regulation — Rastreamento de políticas e regulamentos
 * 3. company_info     — Anúncios de empresas listadas
 * 4. price_volume     — Monitoramento de volume de preços（KArame/fluxo de capital/Lista de Dragão e Tigre）
 * 5. industry_news    — Análise de notícias do setor
 * 6. social_sentiment — sentimento de mídia social
 * 7. global_markets   — Ligação ao mercado global
 * 8. data_quality     — Verificação da qualidade dos dados
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

import { logger } from '../../utils/logger'
import { saLog } from './sa-logger'
import { readRecentFactPools } from './store'
import type {
  BlockTradeSummary,
  CompanyAnnouncement,
  DataAgentConfigStore,
  DataAgentId,
  DataAgentResult,
  DataQualityReport,
  DragonTigerSummary,
  FactPool,
  GlobalMarketSnapshot,
  IndustryNewsItem,
  MacroEconomicData,
  MarginTradingSummary,
  MoneyFlowItem,
  PolicyEvent,
  PriceVolumeExtras,
  SectorFlowItem,
  SocialSentimentSnapshot,
  StockAnalysisMarketState,
  StockAnalysisSpotQuote,
} from './types'

const execFileAsync = promisify(execFile)

const DEFAULT_REQUEST_TIMEOUT_MS = 600_000

// ==================== Função utilitária ====================

function nowIso(): string {
  return new Date().toISOString()
}

let pythonUserSiteCache: string | null = null

const PYTHON_TIMEOUT_MS = 60_000 // Python Tempo limite do processo filho 60 Segundo

/**
 * [P2-5] AKShare Compatibilidade de versão：Detectar na inicialização AKShare versão e registro。
 * quando API Ao ser renomeado，A mensagem de erro conterá "has no attribute"，Isto permite um posicionamento rápido。
 * Atualmente verificado para ser compatível akshare >= 1.14.x
 */
const AKSHARE_MIN_VERSION = '1.14.0'
let akshareVersionChecked = false

async function checkAkShareVersion(): Promise<void> {
  if (akshareVersionChecked) return
  akshareVersionChecked = true
  try {
    const version = await runPythonJson<string>(`
import json
try:
    import akshare as ak
    print(json.dumps({"success": True, "data": ak.__version__}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`, 10_000)
    const parts = version.split('.').map(Number)
    const minParts = AKSHARE_MIN_VERSION.split('.').map(Number)
    const isOld = parts[0] < minParts[0] || (parts[0] === minParts[0] && parts[1] < minParts[1])
    if (isOld) {
      logger.warn(`[data-agents] AKShare Versão ${version} Versão inferior à recomendada ${AKSHARE_MIN_VERSION}，papel API Pode não ser compatível`, { module: 'StockAnalysis' })
    } else {
      logger.info(`[data-agents] AKShare Versão: ${version}`, { module: 'StockAnalysis' })
    }
  } catch (err) {
    logger.warn(`[data-agents] Não foi possível detectar AKShare Versão: ${(err as Error).message}`, { module: 'StockAnalysis' })
  }
}

/**
 * [P2-6] Verificação de plausibilidade numérica：examinar AKShare Se o valor retornado está dentro de um intervalo razoável。
 * Valores fora da faixa são considerados dados sujos，retornar null。
 */
function validateNumericRange(value: unknown, min: number, max: number, label: string): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value < min || value > max) {
    logger.warn(`[data-agents] Falha na verificação de plausibilidade numérica: ${label}=${value} fora do alcance [${min}, ${max}]`)
    return null
  }
  return value
}

async function getPythonUserSitePackages(): Promise<string | null> {
  if (pythonUserSiteCache !== null) return pythonUserSiteCache
  try {
    const { stdout } = await execFileAsync('python3', ['-c', 'import site; print(site.getusersitepackages())'], {
      maxBuffer: 1024 * 256,
      timeout: 10_000,
      env: process.env,
    })
    pythonUserSiteCache = stdout.trim() || null
  } catch {
    pythonUserSiteCache = null
  }
  return pythonUserSiteCache
}

/** Verifique o formato do código de estoque，evitar Python injeção de código */
function validateStockCode(code: string): boolean {
  return /^[A-Za-z0-9.]{1,20}$/.test(code)
}

interface PythonJsonResult<T> {
  success: boolean
  data?: T
  error?: string
}

async function runPythonJson<T>(script: string, timeoutMs: number = PYTHON_TIMEOUT_MS): Promise<T> {
  const pythonUserSite = await getPythonUserSitePackages()
  const env = { ...process.env }
  if (pythonUserSite) {
    env.PYTHONPATH = env.PYTHONPATH ? `${pythonUserSite}:${env.PYTHONPATH}` : pythonUserSite
  }

  const { stdout } = await execFileAsync('python3', ['-c', script], {
    maxBuffer: 1024 * 1024 * 8,
    timeout: timeoutMs,
    env,
  })
  let json: PythonJsonResult<T>
  try {
    json = JSON.parse(stdout.trim()) as PythonJsonResult<T>
  } catch (parseError) {
    const preview = stdout.trim().slice(0, 200)
    throw new Error(`Python A saída do script não é JSON: "${preview}..." (${parseError instanceof Error ? parseError.message : 'Falha na análise'})`)
  }
  if (!json.success) {
    throw new Error(json.error || 'Python Falha no script de dados')
  }
  if (json.data === undefined) {
    throw new Error('Python O script de dados retorna resultados vazios')
  }
  return json.data
}

async function fetchJsonWithTimeout<T>(url: string, headers?: Record<string, string>, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        ...(headers ?? {}),
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json() as T
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Notícias sobre riqueza oriental JSONP interface — substituir expirou getNewsByColumns API。
 * URL Formatar: https://newsapi.eastmoney.com/kuaixun/v1/getlist_{column}_ajaxResult_{pageSize}_{page}_.html
 * retornar JSONP: var ajaxResult={...}
 */
async function fetchEastmoneyKuaixun(
  column: number,
  pageSize: number = 15,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Array<{ title: string; showtime: string; digest: string }>> {
  const url = `https://newsapi.eastmoney.com/kuaixun/v1/getlist_${column}_ajaxResult_${pageSize}_1_.html`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: 'https://kuaixun.eastmoney.com/',
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const raw = await response.text()
    // JSONP Formatar: "var ajaxResult={...}" — extrair JSON papel
    const match = /var\s+ajaxResult\s*=\s*(\{[\s\S]*\})/.exec(raw)
    if (!match) throw new Error('Não foi possível analisar kuaixun JSONP resposta')
    const data = JSON.parse(match[1]) as { LivesList?: Array<{ title?: string; showtime?: string; digest?: string }> }
    const list = data.LivesList ?? []
    return list.map((item) => ({
      title: item.title ?? '',
      showtime: item.showtime ?? '',
      digest: item.digest ?? '',
    }))
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fortuna Oriental push2his Inquérito ao mercado único de títulos — substituir expirou clist Interface em massa（índice global/Futuros de commodities）。
 * f170 = Aumentar ou diminuir * 100（como f170=44 expressar 0.44%）
 */
async function fetchEastmoneyQuote(
  secid: string,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<{ code: string; name: string; changePercent: number } | null> {
  const url = `https://push2his.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f57,f58,f170`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Referer: 'https://quote.eastmoney.com/',
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const resp = await response.json() as { rc?: number; data?: { f57?: string; f58?: string; f170?: number } | null }
    if (resp.rc !== 0 || !resp.data) return null
    return {
      code: resp.data.f57 ?? '',
      name: resp.data.f58 ?? '',
      changePercent: (resp.data.f170 ?? 0) / 100, // f170 É a ascensão ou queda*100，Porcentagem de reversão
    }
  } finally {
    clearTimeout(timer)
  }
}

function shouldReportGlobalIndexError(snapshot: GlobalMarketSnapshot, eastmoneyGlobalMissing: boolean) {
  if (!eastmoneyGlobalMissing) {
    return false
  }
  return snapshot.sp500Change === null && snapshot.nasdaqChange === null && snapshot.hsiChange === null
}

/** Execução segura de uma única fonte de dados，retornar null Indica falha */
/** P2-D5: Chamada de fonte de dados com nova tentativa（Geralmente tem sucesso na segunda vez quando a rede está instável） */
async function trySource<T>(sourceName: string, agentId: DataAgentId, fn: () => Promise<T>): Promise<T | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === 1) {
        logger.debug(`[data-agents][${agentId}] fonte de dados ${sourceName} Não. 1 fracassado，1 Tente novamente em segundos: ${(error as Error).message}`)
        await new Promise((r) => setTimeout(r, 1000))
      } else {
        logger.warn(`[data-agents][${agentId}] fonte de dados ${sourceName} Ainda falhou depois de tentar novamente: ${(error as Error).message}`)
      }
    }
  }
  return null
}

// ==================== Agent corredor ====================

/**
 * v1.35.0 [A1-P0-4] successRate Calcular correção de calibre。
 *
 * Versão antiga bug：successRate = dataPointCount / (dataPointCount + errors.length)。
 * 5 fontes 4 tempo de inatividade、1 retorna 100 Tempo，successRate = 100/(100+4) ≈ 96%，Mascare completamente as falhas no nível da fonte。
 *
 * nova versão：uso prioritário"Taxa de sucesso no nível de origem"——sourceSuccesses / sourceAttempts（como 1/5 = 20%）。
 * Quando o chamador não passa o número de origem, ele volta ao calibre antigo.（compatível com versões anteriores），mas neste caso errors.length aumento de peso
 * （cada error Equivalente 10 pontos de dados），deixar successRate Mais sensível a falhas de origem。
 *
 * dataPointCount Somente para exibição，Não é mais usado como taxa de sucesso"Denominador"。
 */
interface AgentResultOptions {
  /** O número total de fontes de dados que tentaram ligar（Contém sucesso e fracasso）。Uma vez repassado, será contabilizado como tal. successRate。 */
  sourceAttempts?: number
  /** Volte pelo menos 1 Número de dados ou fontes de dados que não geraram erros。 */
  sourceSuccesses?: number
}

function createAgentResult(
  agentId: DataAgentId,
  startMs: number,
  dataPointCount: number,
  errors: string[],
  options?: AgentResultOptions,
): DataAgentResult {
  return {
    agentId,
    collectedAt: nowIso(),
    dataPointCount,
    successRate: computeSuccessRate(dataPointCount, errors.length, options),
    elapsedMs: Date.now() - startMs,
    errors,
  }
}

function computeSuccessRate(dataPointCount: number, errorCount: number, options?: AgentResultOptions): number {
  // v1.35.0 [A1-P0-4] Priorize a taxa de sucesso no nível da fonte
  if (options && typeof options.sourceAttempts === 'number' && options.sourceAttempts > 0) {
    const successes = typeof options.sourceSuccesses === 'number'
      ? Math.max(0, Math.min(options.sourceAttempts, options.sourceSuccesses))
      : Math.max(0, options.sourceAttempts - errorCount)
    return successes / options.sourceAttempts
  }
  // Compatível com versões anteriores de calibres mais antigos，Mas coloque error O peso é aumentado para 10 Peso negativo equivalente de pontos de dados，evitar 90%+ Falsamente alto
  const ERROR_WEIGHT = 10
  const denominator = dataPointCount + errorCount * ERROR_WEIGHT
  return denominator === 0 ? 0 : Math.max(0, dataPointCount / denominator)
}

function computeChangePercentFromSeries(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => Number.isFinite(value ?? NaN))
  if (numeric.length < 2) {
    return null
  }
  const previous = numeric[numeric.length - 2]
  const current = numeric[numeric.length - 1]
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous === 0) {
    return null
  }
  return Math.round(((current - previous) / previous * 100) * 10_000) / 10_000
}

function countNonNullValues(values: Array<unknown>): number {
  return values.filter((value) => value !== null && value !== undefined).length
}

async function getRecentFactPoolBackup(stockAnalysisDir: string, tradeDate: string): Promise<FactPool | null> {
  const pools = await readRecentFactPools(stockAnalysisDir, 7)
  return pools.find((pool) => pool.tradeDate !== tradeDate) ?? null
}

function countMacroDataPoints(data: MacroEconomicData | null | undefined): number {
  if (!data) return 0
  return countNonNullValues([
    data.gdpGrowth,
    data.cpi,
    data.pmi,
    data.interestRate,
    data.exchangeRateUsdCny,
    data.treasuryYield10y,
  ])
}

function countGlobalMarketDataPoints(data: GlobalMarketSnapshot | null | undefined): number {
  if (!data) return 0
  return countNonNullValues([
    data.sp500Change,
    data.nasdaqChange,
    data.hsiChange,
    data.a50FuturesChange,
    data.usdCnyRate,
    data.crudeOilChange,
    data.goldChange,
    data.us10yYieldChange,
  ])
}

function appendFallbackError(log: DataAgentResult, message: string) {
  if (!log.errors.includes(message)) {
    log.errors = [...log.errors, message]
  }
}

function applyFactPoolBackups(
  tradeDate: string,
  backupFactPool: FactPool | null,
  results: {
    macroResult: { data: MacroEconomicData | null; log: DataAgentResult }
    sentimentResult: { data: SocialSentimentSnapshot[]; log: DataAgentResult }
    globalResult: { data: GlobalMarketSnapshot | null; log: DataAgentResult }
  },
): void {
  if (!backupFactPool) {
    return
  }

  if (backupFactPool.macroData && countMacroDataPoints(results.macroResult.data) <= 1) {
    results.macroResult.data = {
      ...backupFactPool.macroData,
      date: tradeDate,
    }
    results.macroResult.log.dataPointCount = countMacroDataPoints(results.macroResult.data)
    appendFallbackError(results.macroResult.log, `Revertido para o instantâneo de macro bem-sucedido mais recente(${backupFactPool.tradeDate})`)
    results.macroResult.log.successRate = computeSuccessRate(results.macroResult.log.dataPointCount, results.macroResult.log.errors.length)
  }

  if (backupFactPool.socialSentiment.length > 0 && results.sentimentResult.data.length < 3) {
    results.sentimentResult.data = backupFactPool.socialSentiment.map((item) => ({
      ...item,
      collectedAt: nowIso(),
    }))
    results.sentimentResult.log.dataPointCount = results.sentimentResult.data.length
    appendFallbackError(results.sentimentResult.log, `Revertido para o instantâneo de opinião social de sucesso mais recente(${backupFactPool.tradeDate})`)
    results.sentimentResult.log.successRate = computeSuccessRate(results.sentimentResult.log.dataPointCount, results.sentimentResult.log.errors.length)
  }

  if (backupFactPool.globalMarkets && countGlobalMarketDataPoints(results.globalResult.data) === 0) {
    results.globalResult.data = {
      ...backupFactPool.globalMarkets,
      collectedAt: nowIso(),
    }
    results.globalResult.log.dataPointCount = countGlobalMarketDataPoints(results.globalResult.data)
    appendFallbackError(results.globalResult.log, `Revertido para o mais recente instantâneo de sucesso do mercado global(${backupFactPool.tradeDate})`)
    results.globalResult.log.successRate = computeSuccessRate(results.globalResult.log.dataPointCount, results.globalResult.log.errors.length)
  }
}

async function fetchYahooFinanceChangePercent(symbol: string, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<number | null> {
  const encodedSymbol = encodeURIComponent(symbol)
  const response = await fetchJsonWithTimeout<{
    chart?: {
      result?: Array<{
        indicators?: { quote?: Array<{ close?: Array<number | null> }> }
      }>
      error?: { description?: string } | null
    }
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=5d`, {
    Referer: 'https://finance.yahoo.com/',
  }, timeoutMs)
  const closes = response.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
  return computeChangePercentFromSeries(closes)
}

async function fetchYahooFinanceLastClose(symbol: string, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<number | null> {
  const encodedSymbol = encodeURIComponent(symbol)
  const response = await fetchJsonWithTimeout<{
    chart?: {
      result?: Array<{
        indicators?: { quote?: Array<{ close?: Array<number | null> }> }
      }>
    }
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=5d`, {
    Referer: 'https://finance.yahoo.com/',
  }, timeoutMs)
  const closes = response.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
  const numeric = closes.filter((value): value is number => Number.isFinite(value ?? NaN))
  return numeric.length > 0 ? numeric[numeric.length - 1] : null
}

// ==================== Agent 1: Monitorização Macroeconómica ====================

async function collectMacroEconomy(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<{ data: MacroEconomicData | null; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'macro_economy'
  const errors: string[] = []
  let dataPoints = 0
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  const macro: MacroEconomicData = {
    date: new Date().toISOString().slice(0, 10),
    gdpGrowth: null,
    cpi: null,
    pmi: null,
    interestRate: null,
    exchangeRateUsdCny: null,
    treasuryYield10y: null,
  }

  // [L17] Coleta paralela de fontes de dados independentes，fallback A fonte de dados permanece serial
  const [akMacro, fxResult, sinaYield, akRate] = await Promise.all([
    // fonte de dados 1: AKShare — indicadores macroeconômicos
    trySource('AKShare-macro', agentId, async () => {
      return runPythonJson<{ cpi?: number; pmi?: number; gdp_growth?: number }>(`
import akshare as ak, json
result = {}
try:
    cpi_df = ak.macro_china_cpi_monthly()
    if not cpi_df.empty:
        row = cpi_df.iloc[-1]
        for col in ['crescimento ano a ano', 'Aumento ano a ano', 'Em todo o país-Ano após ano']:
            if col in row.index:
                result['cpi'] = float(row[col]); break
except Exception as e:
    import sys; print(f"AKShare cpi error: {e}", file=sys.stderr)
try:
    pmi_df = ak.macro_china_pmi()
    if not pmi_df.empty:
        row = pmi_df.iloc[-1]
        for col in ['fabricação', 'fabricaçãoPMI', 'PMI']:
            if col in row.index:
                result['pmi'] = float(row[col]); break
except Exception as e:
    import sys; print(f"AKShare pmi error: {e}", file=sys.stderr)
try:
    gdp_df = ak.macro_china_gdp()
    if not gdp_df.empty:
        row = gdp_df.iloc[-1]
        for col in ['crescimento ano a ano', 'Aumento ano a ano', 'GDPAno após ano']:
            if col in row.index:
                result['gdp_growth'] = float(row[col]); break
except Exception as e:
    import sys; print(f"AKShare gdp error: {e}", file=sys.stderr)
print(json.dumps({"success": True, "data": result}))
`, timeoutMs)
    }),
    // fonte de dados 2+3+fallback: taxa de câmbio（Fortuna Oriental → AKShare-Banco da China → AKShare-taxa de câmbio em tempo real cadeia serial）
    (async () => {
      const emFx = await trySource('Eastmoney-fx', agentId, async () => {
        const resp = await fetchJson<{ rc: number; data?: { diff?: Array<{ f2?: number }> } }>(
          'https://push2.eastmoney.com/api/qt/clist/get?fid=f2&po=1&pz=1&pn=1&np=1&fltt=2&fs=m:119+t:1+c:USDCNY',
        )
        return resp.data?.diff?.[0]?.f2 ?? null
      })
      if (emFx !== null) return { value: emFx, source: 'Eastmoney-fx' as const }
      // fallback 1: AKShare Taxa de câmbio do Banco da China（Nome do parâmetro start_date/end_date，Aprovado recentemente 7 intervalo de dias）
      const akFx = await trySource('AKShare-fx', agentId, async () => {
        return runPythonJson<number>(`
import akshare as ak, json
from datetime import datetime, timedelta
end = datetime.now().strftime("%Y%m%d")
start = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")
df = ak.currency_boc_sina(symbol="Dólar", start_date=start, end_date=end)
rate = float(df.iloc[-1]['Preço de conversão do Banco da China']) / 100 if not df.empty else None
print(json.dumps({"success": True, "data": rate}))
`, timeoutMs)
      })
      if (akFx !== null) return { value: akFx, source: 'AKShare-fx' as const }
      // fallback 2: AKShare Cotações de câmbio em tempo real
      const akFxSpot = await trySource('AKShare-fx-spot', agentId, async () => {
        return runPythonJson<number>(`
import akshare as ak, json
try:
    df = ak.fx_spot_quote()
    row = df[df['par de moedas'].str.contains('USD/CNY')]
    rate = float(row.iloc[0]['preço mais recente']) if not row.empty else None
    print(json.dumps({"success": True, "data": rate}))
except Exception as e:
    print(json.dumps({"success": False, "error": f"fx_spot_quote failed: {e}"}))
`, timeoutMs)
      })
      if (akFxSpot !== null) return { value: akFxSpot, source: 'AKShare-fx-spot' as const }
      return null
    })(),
    // fonte de dados 4+fallback: Rendimento do Tesouro（AKShare-ChinaBond → Cotações de títulos nacionais da Oriental Fortune cadeia serial）
    (async () => {
      const akYield = await trySource('AKShare-yield', agentId, async () => {
        return runPythonJson<number>(`
import akshare as ak, json
from datetime import datetime, timedelta
end = datetime.now().strftime("%Y%m%d")
start = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")
df = ak.bond_china_yield(start_date=start, end_date=end)
if not df.empty:
    subset = df[df['Nome da curva']=='Curva de rendimento dos títulos do Tesouro ChinaBond']
    if not subset.empty:
        val = float(subset.iloc[-1].get('10Ano', 0))
        print(json.dumps({"success": True, "data": val}))
    else:
        print(json.dumps({"success": True, "data": None}))
else:
    print(json.dumps({"success": True, "data": None}))
`, timeoutMs)
      })
      if (akYield !== null) return akYield
      // fallback: Cotações em tempo real do Tesouro Oriental Fortune
      const emYield = await trySource('Eastmoney-yield', agentId, async () => {
        const resp = await fetchJson<{ data?: { diff?: Array<{ f12?: string; f2?: number }> } }>(
          'https://push2.eastmoney.com/api/qt/clist/get?fid=f3&po=1&pz=10&pn=1&np=1&fltt=2&fs=b:MK0354',
        )
        const list = resp.data?.diff ?? []
        for (const item of list) {
          const code = item.f12 ?? ''
          if (code.includes('10') || code === '019547') {
            return item.f2 ?? null
          }
        }
        return null
      })
      return emYield
    })(),
    // fonte de dados 5: AKShare — taxa de juro（LPR）
    trySource('AKShare-lpr', agentId, async () => {
      return runPythonJson<number>(`
import akshare as ak, json
df = ak.macro_china_lpr()
rate = float(df.iloc[-1]['LPR1Y']) if not df.empty else None
print(json.dumps({"success": True, "data": rate}))
`, timeoutMs)
    }),
  ])

  // Processando resultados + [P2-6] Verificação de plausibilidade numérica
  if (akMacro) {
    const cpi = validateNumericRange(akMacro.cpi, -10, 30, 'CPI')
    const pmi = validateNumericRange(akMacro.pmi, 20, 80, 'PMI')
    const gdp = validateNumericRange(akMacro.gdp_growth, -30, 30, 'GDPaumentar')
    if (cpi !== null) { macro.cpi = cpi; dataPoints++ }
    if (pmi !== null) { macro.pmi = pmi; dataPoints++ }
    if (gdp !== null) { macro.gdpGrowth = gdp; dataPoints++ }
  } else {
    errors.push('AKShare-macro falhar')
  }

  if (fxResult !== null) {
    const fx = validateNumericRange(fxResult.value, 4, 12, 'USD para RMB')
    if (fx !== null) { macro.exchangeRateUsdCny = fx; dataPoints++ }
  } else { errors.push('Todas as fontes de dados de taxas de câmbio falham') }

  if (sinaYield !== null) {
    const yld = validateNumericRange(sinaYield, -2, 20, '10rendimento anual dos títulos do tesouro')
    if (yld !== null) { macro.treasuryYield10y = yld; dataPoints++ }
  } else { errors.push('Todas as fontes de dados de rendimento do Tesouro falham') }

  if (akRate !== null) {
    const rate = validateNumericRange(akRate, 0, 20, 'LPRtaxa de juro')
    if (rate !== null) { macro.interestRate = rate; dataPoints++ }
  } else { errors.push('AKShare-lpr falhar') }

  return { data: dataPoints > 0 ? macro : null, log: createAgentResult(agentId, start, dataPoints, errors) }
}

// ==================== Agent 2: Rastreamento de políticas e regulamentos ====================

async function collectPolicyRegulation(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<{ data: PolicyEvent[]; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'policy_regulation'
  const errors: string[] = []
  const events: PolicyEvent[] = []
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  // fonte de dados 1: AKShare — Transcrição da rede de notícias (sinal político，Experimente hoje e ontem)
  const akNews = await trySource('AKShare-news', agentId, async () => {
    return runPythonJson<Array<{ title: string; date: string; content: string }>>(`
import akshare as ak, json
from datetime import datetime, timedelta
items = []
# Experimente as notícias de hoje e de ontem（Pode não ter sido atualizado hoje）
for delta in [0, 1]:
    try:
        d = (datetime.now() - timedelta(days=delta)).strftime("%Y%m%d")
        df = ak.news_cctv(date=d)
        for _, row in df.head(10).iterrows():
            items.append({"title": str(row.get('title','')), "date": str(row.get('date','')), "content": str(row.get('content',''))[:500]})
        if items:
            break
    except Exception:
        pass
print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
`, timeoutMs)
  })
  if (akNews && akNews.length > 0) {
    for (const item of akNews) {
      events.push({
        id: `policy-cctv-${item.date}-${events.length}`,
        source: 'CCTVnoticiário',
        title: item.title,
        publishedAt: item.date,
        category: classifyPolicyCategory(item.title, item.content),
        rawText: item.content,
        affectedSectors: classifyNewsSectors(item.title, item.content),
      })
    }
  } else {
    errors.push('AKShare-news Sem dados')
  }

  // fonte de dados 2: Fortuna Oriental — notícias financeiras（kuaixun JSONP interface，substituir expirou getNewsByColumns）
  const emNews = await trySource('Eastmoney-news', agentId, async () => {
    return fetchEastmoneyKuaixun(102, 15, timeoutMs)
  })
  if (emNews && emNews.length > 0) {
    for (const item of emNews) {
      events.push({
        id: `policy-em-${events.length}`,
        source: 'Notícias da Fortuna Oriental',
        title: item.title,
        publishedAt: item.showtime || nowIso(),
        category: classifyPolicyCategory(item.title, item.digest),
        rawText: item.digest,
        affectedSectors: classifyNewsSectors(item.title, item.digest),
      })
    }
  } else {
    errors.push('Eastmoney-news Sem dados')
  }

  // fonte de dados 3: Sina Finanças — notícias nacionais
  await trySource('Sina-news', agentId, async () => {
    const resp = await fetchJson<{ result?: { data?: Array<{ title?: string; ctime?: string; intro?: string }> } }>(
      'https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2509&k=&num=10&page=1',
    )
    const list = resp.result?.data ?? []
    for (const item of list) {
      events.push({
        id: `policy-sina-${events.length}`,
        source: 'Sina Finanças',
        title: item.title ?? '',
        publishedAt: item.ctime ?? nowIso(),
        category: classifyPolicyCategory(item.title ?? '', item.intro ?? ''),
        rawText: item.intro ?? '',
        affectedSectors: classifyNewsSectors(item.title ?? '', item.intro ?? ''),
      })
    }
    return list.length
  })

  // fonte de dados 4: Tencent Finanças
  await trySource('Tencent-news', agentId, async () => {
    const resp = await fetchJson<{ data?: { articleList?: Array<{ title?: string; pubtime?: string; abstract?: string }> } }>(
      'https://r.inews.qq.com/getSimpleNews?ids=finance_caijingyaowen&imei=1&num=10',
    )
    const list = resp.data?.articleList ?? []
    for (const item of list) {
      events.push({
        id: `policy-qq-${events.length}`,
        source: 'Tencent Finanças',
        title: item.title ?? '',
        publishedAt: item.pubtime ?? nowIso(),
        category: classifyPolicyCategory(item.title ?? '', item.abstract ?? ''),
        rawText: item.abstract ?? '',
        affectedSectors: classifyNewsSectors(item.title ?? '', item.abstract ?? ''),
      })
    }
    return list.length
  })

  // fonte de dados 5: AKShare — operações de mercado aberto do banco central
  await trySource('AKShare-pboc', agentId, async () => {
    const items = await runPythonJson<Array<{ title: string; date: string }>>(`
import akshare as ak, json
try:
    df = ak.macro_china_money_supply()
    items = []
    for _, row in df.tail(5).iterrows():
        items.append({"title": f"oferta de dinheiro: M2Ano após ano{row.get('M2-Ano após ano','')}%, M1Ano após ano{row.get('M1-Ano após ano','')}%", "date": str(row.get('mês',''))})
    print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": f"macro_china_money_supply failed: {e}"}))
`, timeoutMs)
    for (const item of items) {
      events.push({
        id: `policy-pboc-${events.length}`,
        source: 'oferta monetária do banco central',
        title: item.title,
        publishedAt: item.date,
        category: 'monetary_policy',
        rawText: item.title,
        affectedSectors: [],
      })
    }
    return items.length
  })

  return { data: events, log: createAgentResult(agentId, start, events.length, errors) }
}

// ==================== Agent 3: Anúncios de empresas listadas ====================

async function collectCompanyInfo(
  quotes: Map<string, StockAnalysisSpotQuote>,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<{ data: CompanyAnnouncement[]; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'company_info'
  const errors: string[] = []
  const announcements: CompanyAnnouncement[] = []
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  // Extraia o código da ação de interesse
  const codes = [...quotes.keys()].slice(0, 50) // Concentre-se apenas no anterior 50 Apenas，Evite muitos pedidos

  // fonte de dados 1: Fortuna Oriental — anúncio da empresa (lote)
  // API retorno real { data: { list: [...], page_index, page_size, total_hits }, success, error }
  const emAnn = await trySource('Eastmoney-announcements', agentId, async () => {
    const resp = await fetchJson<{
      data?: { list?: Array<{ securityCode?: string; securityName?: string; title?: string; noticeDate?: string; infoCode?: string }> }
    }>(
      'https://np-anotice-stock.eastmoney.com/api/security/ann?cb=&sr=-1&page_size=30&page_index=1&ann_type=A&f_node=0&s_node=0',
    )
    return resp.data?.list ?? []
  })
  if (emAnn && emAnn.length > 0) {
    for (const item of emAnn) {
      const cls = classifyAnnouncementCategory(item.title ?? '')
      announcements.push({
        code: item.securityCode ?? '',
        name: item.securityName ?? '',
        title: item.title ?? '',
        publishedAt: item.noticeDate ?? nowIso(),
        category: cls.category,
        importance: cls.importance,
        rawText: item.title ?? '',
      })
    }
  } else {
    errors.push('Eastmoney-announcements Sem dados')
  }

  // fonte de dados 2: Rede de Informação Juchao — anúncio
  await trySource('CNINFO-announcements', agentId, async () => {
    const resp = await fetchJson<{
      announcements?: Array<{ secCode?: string; secName?: string; announcementTitle?: string; announcementTime?: number; announcementId?: string }>
    }>(
      'http://www.cninfo.com.cn/new/disclosure/stock?column=sse_latest&pageNum=1&pageSize=20',
      { Referer: 'http://www.cninfo.com.cn/' },
    )
    const list = resp.announcements ?? []
    for (const item of list) {
      const cls = classifyAnnouncementCategory(item.announcementTitle ?? '')
      announcements.push({
        code: item.secCode ?? '',
        name: item.secName ?? '',
        title: item.announcementTitle ?? '',
        publishedAt: item.announcementTime ? new Date(item.announcementTime).toISOString() : nowIso(),
        category: cls.category,
        importance: cls.importance,
        rawText: item.announcementTitle ?? '',
      })
    }
    return list.length
  })

  // fonte de dados 3: AKShare — Anúncios de ações individuais
  if (codes.length > 0) {
    const sampleCodes = codes.slice(0, 5) // amostragem 5 individual
    await trySource('AKShare-stock-notices', agentId, async () => {
      const safeCodes = sampleCodes.filter(validateStockCode)
      if (safeCodes.length === 0) return 0
      const codeStr = safeCodes.map((c) => `"${c}"`).join(',')
      const items = await runPythonJson<Array<{ code: string; title: string; date: string }>>(`
import akshare as ak, json
results = []
for code in [${codeStr}]:
    try:
        df = ak.stock_notices_cninfo(symbol=code)
        for _, row in df.head(3).iterrows():
            results.append({"code": code, "title": str(row.get('Título do anúncio','')), "date": str(row.get('Hora do anúncio',''))})
    except Exception as e:
        import sys; print(f"AKShare notices error for {code}: {e}", file=sys.stderr)
print(json.dumps({"success": True, "data": results}, ensure_ascii=False))
`, timeoutMs)
      for (const item of items) {
        const quote = quotes.get(item.code)
        const cls = classifyAnnouncementCategory(item.title)
        announcements.push({
          code: item.code,
          name: quote?.name ?? item.code,
          title: item.title,
          publishedAt: item.date,
          category: cls.category,
          importance: cls.importance,
          rawText: item.title,
        })
      }
      return items.length
    })
  }

  // fonte de dados 4: Sina Finanças — anúncio
  await trySource('Sina-announcements', agentId, async () => {
    const resp = await fetchJson<{ result?: { data?: Array<{ title?: string; ctime?: string; media_name?: string }> } }>(
      'https://feed.mix.sina.com.cn/api/roll/get?pageid=155&lid=2516&k=&num=10&page=1',
    )
    const list = resp.result?.data ?? []
    for (const item of list) {
      const cls = classifyAnnouncementCategory(item.title ?? '')
      announcements.push({
        code: '',
        name: item.media_name ?? '',
        title: item.title ?? '',
        publishedAt: item.ctime ?? nowIso(),
        category: cls.category,
        importance: cls.importance,
        rawText: item.title ?? '',
      })
    }
    return list.length
  })

  // fonte de dados 5: Anúncio de ações discricionárias da Tencent
  await trySource('Tencent-announcements', agentId, async () => {
    const resp = await fetchJson<{
      data?: { article_list?: Array<{ title?: string; pub_time?: string; source_name?: string }> }
    }>(
      'https://r.inews.qq.com/getSimpleNews?ids=stock_gonggao&imei=1&num=10',
    )
    const list = resp.data?.article_list ?? []
    for (const item of list) {
      const cls = classifyAnnouncementCategory(item.title ?? '')
      announcements.push({
        code: '',
        name: item.source_name ?? '',
        title: item.title ?? '',
        publishedAt: item.pub_time ?? nowIso(),
        category: cls.category,
        importance: cls.importance,
        rawText: item.title ?? '',
      })
    }
    return list.length
  })

  // P1-16: Desduplicação entre fontes de dados（Correspondência exata por título）
  const seen = new Set<string>()
  const dedupedAnnouncements = announcements.filter((a) => {
    const key = a.title.trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { data: dedupedAnnouncements, log: createAgentResult(agentId, start, dedupedAnnouncements.length, errors) }
}

// ==================== Agent 4: Monitoramento de volume de preços ====================
// esse Agent Muitos dos dados foram gerados por service.ts em getQuoteData/buildSnapshot pegar，
// Aqui complementamos principalmente a Lista de Dragões e Tigres/bloquear comércio/Dados incrementais, como fluxo de capital。

async function collectPriceVolume(
  quotes: Map<string, StockAnalysisSpotQuote>,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<{ data: PriceVolumeExtras; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'price_volume'
  const errors: string[] = []
  let dataPoints = 0 // Apenas estatísticas Agent Dados reais recentemente coletados
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  // [H5] Os dados coletados são armazenados nessas variáveis
  const moneyFlow: MoneyFlowItem[] = []
  const sectorFlow: SectorFlowItem[] = []
  let dragonTiger: DragonTigerSummary | null = null
  let blockTrade: BlockTradeSummary | null = null
  let marginTrading: MarginTradingSummary | null = null

  // fonte de dados 1: Fortuna Oriental — Fluxo de fundos
  await trySource('Eastmoney-moneyflow', agentId, async () => {
    const resp = await fetchJson<{ data?: { diff?: Array<{ f12?: string; f14?: string; f62?: number; f2?: number; f3?: number }> } }>(
      'https://push2.eastmoney.com/api/qt/clist/get?fid=f62&po=1&pz=10&pn=1&np=1&fltt=2&fs=m:0+t:6+f:!2,m:0+t:13+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:7+f:!2,m:0+t:81+f:!2',
    )
    const items = resp.data?.diff ?? []
    dataPoints += items.length
    // [H5] Mantenha os dados do fluxo de fundos
    for (const item of items.slice(0, 10)) {
      moneyFlow.push({
        code: String(item.f12 ?? ''),
        name: String(item.f14 ?? ''),
        mainNetInflow: (item.f62 ?? 0) / 10000, // Converter para 10.000 yuans
        changePercent: item.f3 ?? 0,
      })
    }
    return true
  })

  // fonte de dados 2: AKShare — Lista de Dragão e Tigre
  await trySource('AKShare-lhb', agentId, async () => {
    const count = await runPythonJson<number>(`
import akshare as ak, json
try:
    df = ak.stock_lhb_detail_daily_sina()
    print(json.dumps({"success": True, "data": len(df) if not df.empty else 0}))
except Exception as e:
    import sys; print(f"AKShare lhb error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_lhb_detail_daily_sina failed: {e}"}))
`, timeoutMs)
    dataPoints += count
    // [H5] Resumo da lista de dragões e tigres retidos
    if (count > 0) {
      dragonTiger = { stockCount: count, tradeDate: new Date().toISOString().slice(0, 10) }
    }
    return count
  })

  // fonte de dados 3: AKShare — bloquear comércio
  await trySource('AKShare-block-trade', agentId, async () => {
    const count = await runPythonJson<number>(`
import akshare as ak, json
try:
    df = ak.stock_dzjy_mrtj()
    print(json.dumps({"success": True, "data": len(df) if not df.empty else 0}))
except Exception as e:
    import sys; print(f"AKShare block-trade error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_dzjy_mrtj failed: {e}"}))
`, timeoutMs)
    dataPoints += count
    // [H5] Mantenha um resumo de grandes transações
    if (count > 0) {
      blockTrade = { tradeCount: count, tradeDate: new Date().toISOString().slice(0, 10) }
    }
    return count
  })

  // fonte de dados 4: Fortuna Oriental — Fluxo de capital do setor
  await trySource('Eastmoney-sector-flow', agentId, async () => {
    const resp = await fetchJson<{ data?: { diff?: Array<{ f14?: string; f62?: number }> } }>(
      'https://push2.eastmoney.com/api/qt/clist/get?fid=f62&po=1&pz=10&pn=1&np=1&fltt=2&fs=m:90+t:2',
    )
    const items = resp.data?.diff ?? []
    dataPoints += items.length
    // [H5] Mantenha os dados do fluxo de capital do setor
    for (const item of items.slice(0, 10)) {
      sectorFlow.push({
        sectorName: String(item.f14 ?? ''),
        netInflow: (item.f62 ?? 0) / 10000, // Converter para 10.000 yuans
      })
    }
    return true
  })

  // fonte de dados 5: AKShare — Negociação de margem de margem
  await trySource('AKShare-margin', agentId, async () => {
    const count = await runPythonJson<number>(`
import akshare as ak, json
try:
    df = ak.stock_margin_sse()
    print(json.dumps({"success": True, "data": len(df) if not df.empty else 0}))
except Exception as e:
    import sys; print(f"AKShare margin error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_margin_sse failed: {e}"}))
`, timeoutMs)
    dataPoints += count
    // [H5] Mantenha o resumo da negociação de margem e empréstimo de títulos
    if (count > 0) {
      marginTrading = { recordCount: count, tradeDate: new Date().toISOString().slice(0, 10) }
    }
    return count
  })

  if (dataPoints === 0) errors.push('Todas as fontes de dados de volume de preços falharam')

  const data: PriceVolumeExtras = { moneyFlow, sectorFlow, dragonTiger, blockTrade, marginTrading }
  return { data, log: createAgentResult(agentId, start, dataPoints, errors) }
}

// ==================== Agent 5: Análise de notícias do setor ====================

async function collectIndustryNews(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<{ data: IndustryNewsItem[]; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'industry_news'
  const errors: string[] = []
  const news: IndustryNewsItem[] = []
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  // fonte de dados 1: Fortuna Oriental — Informações da indústria（kuaixun JSONP interface，substituir expirou getNewsByColumns）
  await trySource('Eastmoney-industry', agentId, async () => {
    const list = await fetchEastmoneyKuaixun(104, 15, timeoutMs)
    for (const item of list) {
      news.push({
        id: `news-em-${news.length}`,
        title: item.title,
        source: 'Indústria Oriental de Riqueza',
        publishedAt: item.showtime || nowIso(),
        sectors: classifyNewsSectors(item.title, item.digest),
        rawSummary: item.digest,
      })
    }
    return list.length
  })

  // fonte de dados 2: Sina Finanças — Notícias da empresa listada
  await trySource('Sina-industry', agentId, async () => {
    const resp = await fetchJson<{ result?: { data?: Array<{ title?: string; ctime?: string; intro?: string }> } }>(
      'https://feed.mix.sina.com.cn/api/roll/get?pageid=155&lid=2686&k=&num=10&page=1',
    )
    const list = resp.result?.data ?? []
    for (const item of list) {
      news.push({
        id: `news-sina-${news.length}`,
        title: item.title ?? '',
        source: 'Sina Finanças',
        publishedAt: item.ctime ?? nowIso(),
        sectors: classifyNewsSectors(item.title ?? '', item.intro ?? ''),
        rawSummary: item.intro ?? '',
      })
    }
    return list.length
  })

  // fonte de dados 3: Tencent Finanças — Notícias da indústria
  await trySource('Tencent-industry', agentId, async () => {
    const resp = await fetchJson<{ data?: { articleList?: Array<{ title?: string; pubtime?: string; abstract?: string }> } }>(
      'https://r.inews.qq.com/getSimpleNews?ids=stock_hangye&imei=1&num=10',
    )
    const list = resp.data?.articleList ?? []
    for (const item of list) {
      news.push({
        id: `news-qq-${news.length}`,
        title: item.title ?? '',
        source: 'Tencent Finanças',
        publishedAt: item.pubtime ?? nowIso(),
        sectors: classifyNewsSectors(item.title ?? '', item.abstract ?? ''),
        rawSummary: item.abstract ?? '',
      })
    }
    return list.length
  })

  // fonte de dados 4: AKShare — Notícias da indústria
  await trySource('AKShare-industry-news', agentId, async () => {
    const items = await runPythonJson<Array<{ title: string; date: string; content: string }>>(`
import akshare as ak, json
try:
    df = ak.stock_info_global_em()
    items = []
    for _, row in df.head(10).iterrows():
        items.append({"title": str(row.get('título','')), "date": str(row.get('tempo','')), "content": str(row.get('contente',''))[:300]})
    print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
except Exception as e:
    import sys; print(f"AKShare industry news error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_news_em failed: {e}"}))
`, timeoutMs)
    for (const item of items) {
      news.push({
        id: `news-ak-${news.length}`,
        title: item.title,
        source: 'AKShare',
        publishedAt: item.date,
        sectors: classifyNewsSectors(item.title, item.content),
        rawSummary: item.content,
      })
    }
    return items.length
  })

  // fonte de dados 5: Fortuna Oriental — Resumo do relatório de pesquisa（Relatório de pesquisa independente API，substituir expirou getNewsByColumns）
  await trySource('Eastmoney-research', agentId, async () => {
    const resp = await fetchJson<{ data?: Array<{ title?: string; publishDate?: string; stockName?: string; industryName?: string }> }>(
      'https://reportapi.eastmoney.com/report/list?industryCode=*&pageSize=10&industry=*&rating=&ratingChange=&beginTime=&endTime=&pageNo=1&fields=&qType=0&orgCode=&rcode=',
    )
    const list = resp.data ?? []
    for (const item of list) {
      news.push({
        id: `news-research-${news.length}`,
        title: item.title ?? '',
        source: 'Relatório de Pesquisa da Fortuna Oriental',
        publishedAt: item.publishDate ?? nowIso(),
        sectors: classifyNewsSectors(item.title ?? '', `${item.stockName ?? ''} ${item.industryName ?? ''}`),
        rawSummary: `${item.stockName ?? ''} ${item.industryName ?? ''}`.trim(),
      })
    }
    return list.length
  })

  if (news.length === 0) errors.push('Não há dados disponíveis para todas as fontes de notícias do setor')

  // P1-16: Desduplicação entre fontes de dados（Correspondência exata por título）
  const seenTitles = new Set<string>()
  const dedupedNews = news.filter((n) => {
    const key = n.title.trim()
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })

  return { data: dedupedNews, log: createAgentResult(agentId, start, dedupedNews.length, errors) }
}

// ==================== Agent 6: sentimento de mídia social ====================

/** Calcule a proporção bull-bear a partir dos dados de aumento e diminuição，Evite codificação rígida */
/**
 * P2-B1: Cálculo de indicadores de sentimento de mercado com base na distribuição de aumentos e diminuições。
 * Perceber：Este é um indicador derivado de preço（em vez do sentimento real da mídia social），Use apenas como proxy de emoção。
 * Idealmente, dados reais de sentimento de mídia social devem ser usados（Como Weibo/Análise de palavras quentes em bola de neve）。
 */
function computeBullBearRatio(changes: number[]): { bull: number; bear: number; neutral: number } {
  if (changes.length === 0) return { bull: 0.33, bear: 0.33, neutral: 0.34 }
  let bull = 0
  let bear = 0
  let neutral = 0
  for (const c of changes) {
    if (c > 0.5) bull++
    else if (c < -0.5) bear++
    else neutral++
  }
  const total = changes.length
  return {
    bull: Math.round((bull / total) * 100) / 100,
    bear: Math.round((bear / total) * 100) / 100,
    neutral: Math.round((neutral / total) * 100) / 100,
  }
}

export function computeBullBearRatioFromSentimentScores(scores: number[]): { bull: number; bear: number; neutral: number } {
  if (scores.length === 0) return { bull: 0.33, bear: 0.33, neutral: 0.34 }
  let bull = 0
  let bear = 0
  let neutral = 0
  for (const score of scores) {
    if (score > 0.2) bull++
    else if (score < -0.2) bear++
    else neutral++
  }
  const total = scores.length
  return {
    bull: Math.round((bull / total) * 100) / 100,
    bear: Math.round((bear / total) * 100) / 100,
    neutral: Math.round((neutral / total) * 100) / 100,
  }
}

function clampSentiment(value: number): number {
  return Math.max(-1, Math.min(1, Math.round(value * 100) / 100))
}

export function normalizeAStockCode(rawCode: string): string {
  return rawCode.replace(/^(SH|SZ|BJ)/i, '').replace(/[^0-9]/g, '').slice(-6)
}

function inferEastmoneySecid(code: string): string | null {
  const normalized = normalizeAStockCode(code)
  if (!normalized) return null
  if (/^(60|68|90)/.test(normalized)) return `1.${normalized}`
  if (/^(00|20|30|15|16|18|12|13)/.test(normalized)) return `0.${normalized}`
  if (/^(4|8)/.test(normalized)) return `0.${normalized}`
  return null
}

async function fetchAStockChangePercents(codes: string[], timeoutMs: number): Promise<Map<string, number>> {
  const uniqueCodes = Array.from(new Set(codes.map(normalizeAStockCode).filter(Boolean))).slice(0, 20)
  const changes = await Promise.all(uniqueCodes.map(async (code) => {
    const secid = inferEastmoneySecid(code)
    if (!secid) return null
    const quote = await fetchEastmoneyQuote(secid, Math.min(timeoutMs, 30_000))
    if (!quote) return null
    return [code, quote.changePercent] as const
  }))
  return new Map(changes.filter((item): item is readonly [string, number] => Boolean(item)))
}

function mergeMentionedStocks(
  items: Array<{ code: string; mentionCount: number; sentiment: number }>,
): Array<{ code: string; mentionCount: number; sentiment: number }> {
  const merged = new Map<string, { mentionCount: number; sentimentSum: number; sentimentCount: number }>()
  for (const item of items) {
    const code = item.code.trim()
    if (!code) continue
    const existing = merged.get(code) ?? { mentionCount: 0, sentimentSum: 0, sentimentCount: 0 }
    existing.mentionCount += Math.max(1, Math.round(item.mentionCount || 0))
    existing.sentimentSum += item.sentiment
    existing.sentimentCount += 1
    merged.set(code, existing)
  }
  return Array.from(merged.entries())
    .map(([code, entry]) => ({
      code,
      mentionCount: entry.mentionCount,
      sentiment: clampSentiment(entry.sentimentCount > 0 ? entry.sentimentSum / entry.sentimentCount : 0),
    }))
    .sort((left, right) => right.mentionCount - left.mentionCount)
}

function buildSentimentSummaryText(
  platformLabel: string,
  ratio: { bull: number; bear: number; neutral: number },
  hotTopics: string[],
): string {
  const stance = ratio.bull > ratio.bear ? 'Demais' : ratio.bull < ratio.bear ? 'Grosseiro' : 'neutro'
  const topicText = hotTopics.filter(Boolean).slice(0, 3).join('、') || 'Nenhum ponto quente óbvio'
  return `${platformLabel}${stance}，muitos${Math.round(ratio.bull * 100)}%/nulo${Math.round(ratio.bear * 100)}%，Ponto de acesso: ${topicText}`
}

function buildNeutralHeatRatio(): { bull: number; bear: number; neutral: number } {
  return { bull: 0, bear: 0, neutral: 1 }
}

export function aggregateSocialSentiment(
  snapshots: SocialSentimentSnapshot[],
): { bull: number; bear: number; neutral: number; score: number; sourceCount: number } {
  const validSnapshots = snapshots.filter((snapshot) => {
    if (snapshot.contributesToMarketSentiment === false) return false
    if (snapshot.sourceKind !== 'primary_sentiment' && snapshot.contributesToMarketSentiment !== true) return false
    const { bull, bear, neutral } = snapshot.overallBullBearRatio
    return [bull, bear, neutral].every((value) => Number.isFinite(value) && value >= 0)
      && bull + bear + neutral > 0
  })

  if (validSnapshots.length === 0) {
    return { bull: 0.33, bear: 0.33, neutral: 0.34, score: 0, sourceCount: 0 }
  }

  let bull = 0
  let bear = 0
  let neutral = 0
  let totalWeight = 0
  for (const snapshot of validSnapshots) {
    const sourceWeight = snapshot.sourceKind === 'primary_sentiment' ? 1 : 0.5
    bull += snapshot.overallBullBearRatio.bull * sourceWeight
    bear += snapshot.overallBullBearRatio.bear * sourceWeight
    neutral += snapshot.overallBullBearRatio.neutral * sourceWeight
    totalWeight += sourceWeight
  }

  return {
    bull: Math.round((bull / totalWeight) * 100) / 100,
    bear: Math.round((bear / totalWeight) * 100) / 100,
    neutral: Math.round((neutral / totalWeight) * 100) / 100,
    score: Math.round(((bull - bear) / totalWeight) * 10000) / 10000,
    sourceCount: validSnapshots.length,
  }
}

/** Inferir a classificação da política com base no título e nas palavras-chave do texto */
function classifyPolicyCategory(title: string, text: string): 'monetary_policy' | 'regulatory' | 'industry' | 'fiscal' | 'other' {
  const combined = `${title} ${text}`.toLowerCase()
  // política monetária
  if (/taxa de juro|cortar taxas de juros|aumento da taxa de juros|Corte RRR|reservas|mlf|slf|repositório reverso|lpr|banco central|política monetária|mercado aberto/.test(combined)) {
    return 'monetary_policy'
  }
  // política regulatória
  if (/Comissão Reguladora de Valores Mobiliários|Comissão Reguladora de Bancos e Seguros da China|intercâmbio|supervisão|punição|Conformidade|antitruste|exclusão|Sistema de registro|ipoAnálise/.test(combined)) {
    return 'regulatory'
  }
  // política fiscal
  if (/financeiro|imposto|redução de impostos|Redução de taxas|dívida nacional|Dívida especial|défice orçamental|transferir pagamento|subvenção/.test(combined)) {
    return 'fiscal'
  }
  // política industrial
  if (/indústria|nova energia|chip|semicondutor|neutro em carbono|pico de carbono|economia digital|IA|Nova infraestrutura|5g|medicamento|Indústria militar/.test(combined)) {
    return 'industry'
  }
  return 'other'
}

/** Inferir a importância e classificação dos anúncios com base nas palavras-chave do título */
function classifyAnnouncementCategory(title: string): { category: 'earnings' | 'insider_trading' | 'equity_change' | 'litigation' | 'other'; importance: 'major' | 'normal' | 'routine' } {
  const t = title.toLowerCase()
  // Anúncio de resultados
  if (/relatório anual|relatório semestral|relatório trimestral|Previsão de desempenho|Relatório de desempenho|lucro|Receita|Resultado líquido|Perda|lucro/.test(t)) {
    return { category: 'earnings', importance: /relatório anual|relatório semestral|Previsão de desempenho/.test(t) ? 'major' : 'normal' }
  }
  // Mudanças no patrimônio
  if (/Sobrepeso|Reduzir participações|recomprar|emissão adicional|Atribuição de ações|Aumento fixo|Transferência de capital|Levante um cartaz|Oferta pública/.test(t)) {
    return { category: 'equity_change', importance: /recomprar|Aumento fixo|Oferta pública|Levante um cartaz/.test(t) ? 'major' : 'normal' }
  }
  // negociação com informações privilegiadas/Mudanças executivas
  if (/Insider|executivo|diretor|supervisor|Renunciar|encontro|Salário/.test(t)) {
    return { category: 'insider_trading', importance: /Renunciar|encontro/.test(t) ? 'normal' : 'routine' }
  }
  // litígio/risco
  if (/litígio|arbitragem|Arquivar um caso|punição|Violação|Aviso de risco|ST|exclusão/.test(t)) {
    return { category: 'litigation', importance: /Arquivar um caso|exclusão|ST/.test(t) ? 'major' : 'normal' }
  }
  return { category: 'other', importance: 'routine' }
}

/** Inferir os setores envolvidos nas notícias do setor com base em títulos e resumos */
function classifyNewsSectors(title: string, summary: string): string[] {
  const combined = `${title} ${summary}`.toLowerCase()
  const sectors: string[] = []
  const sectorKeywords: Record<string, RegExp> = {
    'nova energia': /nova energia|fotovoltaico|energia eólica|armazenamento de energia|Bateria de lítio|Bateria|Pilha de carregamento|Energia de hidrogênio/,
    'semicondutor': /semicondutor|chip|bolacha|beta fechado|icprojeto|Litografia|soc|gpu|cpu/,
    'IA': /IA|ai|modelo grande|aprendizado de máquina|aprendizagem profunda|Poder de computação|Computação inteligente/,
    'Biologia médica': /medicamento|biologia|Medicamentos inovadores|medicamentos genéricos|cxo|vacina|Gene|medicina tradicional chinesa/,
    'Consumo': /Licor|comida|bebidas|varejo|Consumo|Comércio eletrônico|Eletrodomésticos|têxtil/,
    'financiar': /banco|Seguro|títulos|Corretora|fundo|confiar|financiar/,
    'propriedade': /imobiliária|propriedade|Mercado imobiliário|Edifício Baojiao|habitação|Propriedade/,
    'Indústria militar': /Indústria militar|defesa nacional|aeroespacial|aviação|braços|Produtos militares|Beidou/,
    'carro': /carro|carro novo|Condução inteligente|Condução autônoma|Empresas de automóveis|carro elétrico|Veículo completo/,
    'comunicação': /comunicação|5g|6g|fibra óptica|Operador|estação base|satélite/,
  }
  for (const [sector, regex] of Object.entries(sectorKeywords)) {
    if (regex.test(combined)) sectors.push(sector)
  }
  return sectors
}

async function collectSocialSentiment(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<{ data: SocialSentimentSnapshot[]; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'social_sentiment'
  const errors: string[] = []
  const snapshots: SocialSentimentSnapshot[] = []
  const fetchJson = <T>(url: string, headers?: Record<string, string>) => fetchJsonWithTimeout<T>(url, headers, timeoutMs)

  // fonte de dados 1: discussão real de bola de neve/Siga a popularidade（AKShare）
  const [xqTweet, xqFollow] = await Promise.all([
    trySource('AKShare-xueqiu-tweet', agentId, async () => {
      return runPythonJson<Array<{ code: string; name: string; mentionCount: number }>>(`
import akshare as ak, json
try:
    df = ak.stock_hot_tweet_xq()
    items = []
    for _, row in df.head(20).iterrows():
        code = str(row.get('Código de estoque', ''))
        name = str(row.get('abreviatura de estoque', ''))
        mention = row.get('focar em', 0)
        items.append({
            "code": code,
            "name": name,
            "mentionCount": int(float(mention)) if mention is not None and str(mention).strip() else 0,
        })
    print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": f"stock_hot_tweet_xq failed: {e}"}, ensure_ascii=False))
`, timeoutMs)
    }),
    trySource('AKShare-xueqiu-follow', agentId, async () => {
      return runPythonJson<Array<{ code: string; name: string; mentionCount: number }>>(`
import akshare as ak, json
try:
    df = ak.stock_hot_follow_xq()
    items = []
    for _, row in df.head(20).iterrows():
        code = str(row.get('Código de estoque', ''))
        name = str(row.get('abreviatura de estoque', ''))
        mention = row.get('focar em', 0)
        items.append({
            "code": code,
            "name": name,
            "mentionCount": int(float(mention)) if mention is not None and str(mention).strip() else 0,
        })
    print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": f"stock_hot_follow_xq failed: {e}"}, ensure_ascii=False))
`, timeoutMs)
    }),
  ])
  const xueqiuItems = [...(xqTweet ?? []), ...(xqFollow ?? [])]
  if (xueqiuItems.length > 0) {
    const xueqiuChangeMap = await trySource('Eastmoney-xueqiu-quotes', agentId, async () => {
      return fetchAStockChangePercents(xueqiuItems.map((item) => item.code), timeoutMs)
    })
    const xueqiuMentionedStocks = mergeMentionedStocks(xueqiuItems.map((item) => {
      const code = normalizeAStockCode(item.code)
      const changePercent = xueqiuChangeMap?.get(code) ?? 0
      return {
        code,
        mentionCount: item.mentionCount,
        sentiment: clampSentiment(changePercent / 10),
      }
    }))
    const xueqiuScores = xueqiuMentionedStocks.map((item) => item.sentiment)
    const xueqiuRatio = computeBullBearRatioFromSentimentScores(xueqiuScores)
    const xueqiuTopics = xueqiuItems
      .sort((left, right) => right.mentionCount - left.mentionCount)
      .slice(0, 10)
      .map((item) => item.name)
    snapshots.push({
      collectedAt: nowIso(),
      platform: 'xueqiu',
      sourceKind: 'primary_sentiment',
      contributesToMarketSentiment: true,
      summary: buildSentimentSummaryText('opinião pública como uma bola de neve', xueqiuRatio, xueqiuTopics),
      hotTopics: xueqiuTopics,
      overallBullBearRatio: xueqiuRatio,
      topMentionedStocks: xueqiuMentionedStocks.slice(0, 20),
    })
    saLog.info('DataAgents', `opinião pública social-bola de neve: amostra=${xueqiuItems.length} Existe um mercado=${xueqiuMentionedStocks.length}`)
  } else {
    errors.push('discussão de bola de neve/Não há dados para seguir a popularidade')
  }

  // fonte de dados 2: Relatório real de opinião pública do Weibo（AKShare）
  const weiboReport = await trySource('AKShare-weibo-report', agentId, async () => {
    return runPythonJson<Array<{ name: string; rate: number }>>(`
import akshare as ak, json
try:
    df = ak.stock_js_weibo_report(time_period='CNHOUR12')
    items = []
    for _, row in df.head(20).iterrows():
        name = str(row.get('name', ''))
        rate = row.get('rate', 0)
        items.append({
            "name": name,
            "rate": float(rate) if rate is not None and str(rate).strip() else 0.0,
        })
    print(json.dumps({"success": True, "data": items}, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"success": False, "error": f"stock_js_weibo_report failed: {e}"}, ensure_ascii=False))
`, timeoutMs)
  })
  if (weiboReport && weiboReport.length > 0) {
    const weiboScores = weiboReport.map((item) => item.rate)
    const weiboRatio = computeBullBearRatioFromSentimentScores(weiboScores)
    const weiboTopics = weiboReport.slice(0, 10).map((item) => item.name)
    snapshots.push({
      collectedAt: nowIso(),
      platform: 'weibo',
      sourceKind: 'primary_sentiment',
      contributesToMarketSentiment: true,
      summary: buildSentimentSummaryText('Opinião pública do Weibo', weiboRatio, weiboTopics),
      hotTopics: weiboTopics,
      overallBullBearRatio: weiboRatio,
      topMentionedStocks: weiboReport.slice(0, 20).map((item) => ({
        code: item.name,
        mentionCount: Math.max(1, Math.round(Math.abs(item.rate) * 10)),
        sentiment: clampSentiment(item.rate / 5),
      })),
    })
    saLog.info('DataAgents', `opinião pública social-Weibo: amostra=${weiboReport.length}`)
  } else {
    errors.push('Relatório de opinião pública do Weibo não tem dados')
  }

  // fonte de dados 3: Classificação de ações quentes（Suplemento de lista de favoritos real，Usado para complementar tópicos importantes）
  const ths10jqka = await trySource('10jqka-hot', agentId, async () => {
    const resp = await fetchJson<{
      status_code?: number
      data?: { stock_list?: Array<{ code?: string; name?: string; rise_and_fall?: number; order?: number }> }
    }>(
      'https://dq.10jqka.com.cn/fuyao/hot_list_data/out/hot_list/v1/stock?stock_type=a&type=hour&list_type=normal',
    )
    return resp.data?.stock_list ?? []
  })
  if (ths10jqka && ths10jqka.length > 0) {
    const changes = ths10jqka.map((item) => item.rise_and_fall ?? 0)
    const ratio = computeBullBearRatio(changes)
    const hotTopics = ths10jqka.slice(0, 10).map((item) => item.name ?? '')
    snapshots.push({
      collectedAt: nowIso(),
      platform: 'guba',
      sourceKind: 'supplementary_heat',
      contributesToMarketSentiment: true,
      summary: buildSentimentSummaryText('Liberar lista de favoritos', ratio, hotTopics),
      hotTopics,
      overallBullBearRatio: ratio,
      topMentionedStocks: ths10jqka
        .slice(0, 20)
        .map((item) => ({
          code: normalizeAStockCode(item.code ?? ''),
          mentionCount: item.order ?? 1,
          sentiment: (item.rise_and_fall ?? 0) > 0 ? 0.5 : (item.rise_and_fall ?? 0) < 0 ? -0.5 : 0,
        }))
        .filter((item) => item.code),
    })
  }

  // fonte de dados 4: Classificação de popularidade da Fortuna Oriental（Suplemento de lista quente；Fundo garantido quando as fontes da lista de favoritos estão vazias）
  if (!snapshots.some((item) => item.sourceKind === 'supplementary_heat')) {
    const emRank = await trySource('Eastmoney-rank', agentId, async () => {
      const resp = await fetchJson<{
        data?: Array<{ sc?: string; rk?: number }>
      }>(
        'https://emappdata.eastmoney.com/stockrank/getAllCurrentList',
        { 'Content-Type': 'application/json' },
      )
      return resp.data ?? []
    })
    if (emRank && emRank.length > 0) {
      const hotTopics = emRank.slice(0, 10).map((item) => item.sc ?? '')
      const ratio = buildNeutralHeatRatio()
      snapshots.push({
        collectedAt: nowIso(),
        platform: 'guba',
        sourceKind: 'supplementary_heat',
        contributesToMarketSentiment: false,
        summary: buildSentimentSummaryText('Lista de popularidade da Fortuna Oriental', ratio, hotTopics),
        hotTopics,
        overallBullBearRatio: ratio,
        topMentionedStocks: emRank
          .slice(0, 20)
          .map((item) => ({
            code: normalizeAStockCode(item.sc ?? ''),
            mentionCount: item.rk ?? 1,
            sentiment: 0,
          }))
          .filter((item) => item.code),
      })
    } else {
      errors.push('Não há dados nas fontes de dados de classificação de ações importantes.')
    }
  }

  // fonte de dados 6: Fortuna Oriental — Classificações de ações populares（Suplemento de lista quente）
  await trySource('Eastmoney-hot-stocks', agentId, async () => {
    const resp = await fetchJson<{ data?: { diff?: Array<{ f14?: string; f12?: string; f3?: number }> } }>(
      'https://push2.eastmoney.com/api/qt/clist/get?fid=f3&po=1&pz=20&pn=1&np=1&fltt=2&fs=m:0+t:6+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2',
    )
    const list = resp.data?.diff ?? []
    if (list.length > 0) {
      const ratio = buildNeutralHeatRatio()
      const hotTopics = list.slice(0, 10).map((item) => item.f14 ?? '')
      snapshots.push({
        collectedAt: nowIso(),
        platform: 'eastmoney_hot',
        sourceKind: 'supplementary_heat',
        contributesToMarketSentiment: false,
        summary: buildSentimentSummaryText('Ações importantes da riqueza oriental', ratio, hotTopics),
        hotTopics,
        overallBullBearRatio: ratio,
        topMentionedStocks: list.slice(0, 10).map((item) => ({
          code: normalizeAStockCode(item.f12 ?? ''),
          mentionCount: 1,
          sentiment: 0,
        })).filter((item) => item.code),
      })
    }
    return list.length
  })

  // fonte de dados 7: AKShare — Milhares de ações e milhares de comentários（Suplemento completo da seção transversal do sentimento do mercado）
  await trySource('AKShare-qgqp', agentId, async () => {
    const result = await runPythonJson<{ total: number; upCount: number; downCount: number; flatCount: number }>(`
import akshare as ak, json
try:
    df = ak.stock_comment_em()
    if not df.empty:
        changes = df['Aumentar ou diminuir'].dropna().tolist() if 'Aumentar ou diminuir' in df.columns else []
        up = sum(1 for v in changes if float(v) > 0)
        down = sum(1 for v in changes if float(v) < 0)
        flat = len(changes) - up - down
        print(json.dumps({"success": True, "data": {"total": len(df), "upCount": up, "downCount": down, "flatCount": flat}}))
    else:
        print(json.dumps({"success": True, "data": {"total": 0, "upCount": 0, "downCount": 0, "flatCount": 0}}))
except Exception as e:
    import sys; print(f"AKShare qgqp error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_comment_em failed: {e}"}))
`, timeoutMs)
    if (result.total > 0) {
      const total = result.upCount + result.downCount + result.flatCount
      const bullPct = total > 0 ? result.upCount / total : 0.33
      const bearPct = total > 0 ? result.downCount / total : 0.33
      const neutralPct = total > 0 ? result.flatCount / total : 0.34
      const ratio = {
        bull: Math.round(bullPct * 100) / 100,
        bear: Math.round(bearPct * 100) / 100,
        neutral: Math.round(neutralPct * 100) / 100,
      }
      const hotTopics = [`Mercado inteiro: ${result.upCount}ascender/${result.downCount}cair/${result.flatCount}plano`]
      snapshots.push({
        collectedAt: nowIso(),
        platform: 'eastmoney_hot',
        sourceKind: 'supplementary_heat',
        contributesToMarketSentiment: true,
        summary: buildSentimentSummaryText('Milhares de ações e milhares de comentários', ratio, hotTopics),
        hotTopics,
        overallBullBearRatio: ratio,
        topMentionedStocks: [],
      })
    }
    return result.total
  })

  // fonte de dados 8: Pesquisas populares no Weibo (Palavras quentes complementares relacionadas a finanças，Não é mais usado como fonte de valor emocional central)
  await trySource('Weibo-hot', agentId, async () => {
    const resp = await fetchJson<{ data?: { cards?: Array<{ card_group?: Array<{ desc1?: string }> }> } }>(
      'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot',
    )
    const cards = resp.data?.cards ?? []
    const topics: string[] = []
    for (const card of cards) {
      for (const item of card.card_group ?? []) {
        if (item.desc1) topics.push(item.desc1)
      }
    }
    if (topics.length > 0) {
      const ratio = computeBullBearRatio([])
      snapshots.push({
        collectedAt: nowIso(),
        platform: 'weibo',
        sourceKind: 'supplementary_heat',
        contributesToMarketSentiment: false,
        summary: buildSentimentSummaryText('Pesquisas populares no Weibo', ratio, topics),
        hotTopics: topics.slice(0, 10),
        overallBullBearRatio: ratio,
        topMentionedStocks: [],
      })
    }
    return topics.length
  })

  if (snapshots.length === 0) errors.push('Nenhum dado de todas as fontes de dados de mídia social')

  return { data: snapshots, log: createAgentResult(agentId, start, snapshots.length, errors) }
}

// ==================== Agent 7: Ligação ao mercado global ====================

async function collectGlobalMarkets(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<{ data: GlobalMarketSnapshot | null; log: DataAgentResult }> {
  const start = Date.now()
  const agentId: DataAgentId = 'global_markets'
  const errors: string[] = []
  let dataPoints = 0

  const snapshot: GlobalMarketSnapshot = {
    collectedAt: nowIso(),
    sp500Change: null,
    nasdaqChange: null,
    hsiChange: null,
    a50FuturesChange: null,
    usdCnyRate: null,
    crudeOilChange: null,
    goldChange: null,
    us10yYieldChange: null,
  }

  // fonte de dados 1: Fortuna Oriental — índice global（push2his Consulte um por um，substituir expirou clist Interface em massa）
  // secid mapeamento: 100.SPX=S&P500, 100.NDX=Nasdaq, 100.HSI=Índice Hang Seng
  const emGlobalResults = await trySource('Eastmoney-global', agentId, async () => {
    const secids = [
      { secid: '100.SPX', target: 'sp500' as const },
      { secid: '100.NDX', target: 'nasdaq' as const },
      { secid: '100.HSI', target: 'hsi' as const },
    ]
    const results = await Promise.all(
      secids.map((s) => fetchEastmoneyQuote(s.secid, timeoutMs).then((q) => ({ ...s, quote: q }))),
    )
    return results
  })
  if (emGlobalResults) {
    for (const item of emGlobalResults) {
      if (!item.quote) continue
      const change = validateNumericRange(item.quote.changePercent, -20, 20, `índice global${item.quote.code}Aumentar ou diminuir`)
      if (change === null) continue
      if (item.target === 'sp500') { snapshot.sp500Change = change; dataPoints++ }
      else if (item.target === 'nasdaq') { snapshot.nasdaqChange = change; dataPoints++ }
      else if (item.target === 'hsi') { snapshot.hsiChange = change; dataPoints++ }
    }
  }
  const eastmoneyGlobalMissing = snapshot.sp500Change === null && snapshot.nasdaqChange === null && snapshot.hsiChange === null

  // fonte de dados 2: AKShare — índice global（Calcule o aumento ou diminuição percentual，Contém HSI）
  const akGlobal = await trySource('AKShare-global', agentId, async () => {
    return runPythonJson<{ sp500?: number; nasdaq?: number; hsi?: number }>(`
import akshare as ak, json
result = {}
def calc_change_us(symbol):
    df = ak.index_us_stock_sina(symbol=symbol)
    if df is not None and len(df) >= 2:
        close = float(df.iloc[-1].get('close', 0))
        prev = float(df.iloc[-2].get('close', 0))
        if prev > 0:
            return round((close - prev) / prev * 100, 4)
    return None
try:
    v = calc_change_us(".INX")
    if v is not None: result['sp500'] = v
except Exception as e:
    import sys; print(f"AKShare sp500 error: {e}", file=sys.stderr)
try:
    v = calc_change_us(".IXIC")
    if v is not None: result['nasdaq'] = v
except Exception as e:
    import sys; print(f"AKShare nasdaq error: {e}", file=sys.stderr)
try:
    df = ak.stock_hk_index_daily_sina(symbol="HSI")
    if df is not None and len(df) >= 2:
        close = float(df.iloc[-1].get('close', 0))
        prev = float(df.iloc[-2].get('close', 0))
        if prev > 0:
            result['hsi'] = round((close - prev) / prev * 100, 4)
except Exception as e:
    import sys; print(f"AKShare hsi error: {e}", file=sys.stderr)
print(json.dumps({"success": True, "data": result}))
`, timeoutMs)
  })
  if (akGlobal) {
    if (akGlobal.sp500 !== undefined && snapshot.sp500Change === null) {
      const v = validateNumericRange(akGlobal.sp500, -20, 20, 'AKShare-sp500Aumentar ou diminuir')
      if (v !== null) { snapshot.sp500Change = v; dataPoints++ }
    }
    if (akGlobal.nasdaq !== undefined && snapshot.nasdaqChange === null) {
      const v = validateNumericRange(akGlobal.nasdaq, -20, 20, 'AKShare-nasdaqAumentar ou diminuir')
      if (v !== null) { snapshot.nasdaqChange = v; dataPoints++ }
    }
    if (akGlobal.hsi !== undefined && snapshot.hsiChange === null) {
      const v = validateNumericRange(akGlobal.hsi, -20, 20, 'AKShare-hsiAumentar ou diminuir')
      if (v !== null) { snapshot.hsiChange = v; dataPoints++ }
    }
  }

  const yahooGlobal = await trySource('YahooFinance-global', agentId, async () => {
    const [sp500, nasdaq, hsi] = await Promise.all([
      fetchYahooFinanceChangePercent('^GSPC', timeoutMs),
      fetchYahooFinanceChangePercent('^IXIC', timeoutMs),
      fetchYahooFinanceChangePercent('^HSI', timeoutMs),
    ])
    return { sp500, nasdaq, hsi }
  })
  if (yahooGlobal) {
    if (yahooGlobal.sp500 !== null && snapshot.sp500Change === null) {
      const v = validateNumericRange(yahooGlobal.sp500, -20, 20, 'Yahoo-sp500Aumentar ou diminuir')
      if (v !== null) { snapshot.sp500Change = v; dataPoints++ }
    }
    if (yahooGlobal.nasdaq !== null && snapshot.nasdaqChange === null) {
      const v = validateNumericRange(yahooGlobal.nasdaq, -20, 20, 'Yahoo-nasdaqAumentar ou diminuir')
      if (v !== null) { snapshot.nasdaqChange = v; dataPoints++ }
    }
    if (yahooGlobal.hsi !== null && snapshot.hsiChange === null) {
      const v = validateNumericRange(yahooGlobal.hsi, -20, 20, 'Yahoo-hsiAumentar ou diminuir')
      if (v !== null) { snapshot.hsiChange = v; dataPoints++ }
    }
  }

  // fonte de dados 3: Fortuna Oriental — Futuros de commodities（push2his Consulte um por um，substituir expirou clist Interface em massa）
  // secid mapeamento: 101.GC00Y=COMEXouro, 102.CL00Y=NYMEXbruto
  const emCommodityResults = await trySource('Eastmoney-commodity', agentId, async () => {
    const [gold, oil] = await Promise.all([
      fetchEastmoneyQuote('101.GC00Y', timeoutMs),
      fetchEastmoneyQuote('102.CL00Y', timeoutMs),
    ])
    return { gold, oil }
  })
  if (emCommodityResults) {
    if (emCommodityResults.gold) {
      const v = validateNumericRange(emCommodityResults.gold.changePercent, -15, 15, 'COMEXAumento e queda do preço do ouro')
      if (v !== null) { snapshot.goldChange = v; dataPoints++ }
    }
    if (emCommodityResults.oil) {
      const v = validateNumericRange(emCommodityResults.oil.changePercent, -20, 20, 'NYMEXAumento e queda do preço do petróleo bruto')
      if (v !== null) { snapshot.crudeOilChange = v; dataPoints++ }
    }
  }

  const yahooCommodity = await trySource('YahooFinance-commodity', agentId, async () => {
    const [gold, oil] = await Promise.all([
      fetchYahooFinanceChangePercent('GC=F', timeoutMs),
      fetchYahooFinanceChangePercent('CL=F', timeoutMs),
    ])
    return { gold, oil }
  })
  if (yahooCommodity) {
    if (yahooCommodity.gold !== null && snapshot.goldChange === null) {
      const v = validateNumericRange(yahooCommodity.gold, -15, 15, 'Yahoo-Aumento e queda do preço do ouro')
      if (v !== null) { snapshot.goldChange = v; dataPoints++ }
    }
    if (yahooCommodity.oil !== null && snapshot.crudeOilChange === null) {
      const v = validateNumericRange(yahooCommodity.oil, -20, 20, 'Yahoo-Aumento e queda do preço do petróleo bruto')
      if (v !== null) { snapshot.crudeOilChange = v; dataPoints++ }
    }
  }

  // fonte de dados 4: AKShare — A50 futuros
  await trySource('AKShare-a50', agentId, async () => {
    const change = await runPythonJson<number | null>(`
import akshare as ak, json
try:
    df = ak.futures_foreign_hist(symbol="CHA50CFD")
    if not df.empty:
        prev = float(df.iloc[-2]['fechar'])
        curr = float(df.iloc[-1]['fechar'])
        change = round((curr - prev) / prev * 100, 2) if prev > 0 else 0
        print(json.dumps({"success": True, "data": change}))
    else:
        print(json.dumps({"success": True, "data": None}))
except Exception as e:
    import sys; print(f"AKShare a50 futures error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"stock_us_daily failed: {e}"}))
`, timeoutMs)
    if (change !== null) { snapshot.a50FuturesChange = change; dataPoints++ }
    return change
  })

  // fonte de dados 5: AKShare — taxa de câmbio (Reutilizar macro de reposição)
  if (snapshot.usdCnyRate === null) {
    await trySource('AKShare-fx-global', agentId, async () => {
      const rate = await runPythonJson<number | null>(`
import akshare as ak, json
try:
    df = ak.fx_spot_quote()
    row = df[df['par de moedas'].str.contains('USD/CNY')]
    rate = float(row.iloc[0]['preço mais recente']) if not row.empty else None
    print(json.dumps({"success": True, "data": rate}))
except Exception as e:
    import sys; print(f"AKShare-fx-global error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"fx_spot_quote global failed: {e}"}))
`, timeoutMs)
      if (rate !== null) { snapshot.usdCnyRate = rate; dataPoints++ }
      return rate
    })
  }
  if (snapshot.usdCnyRate === null) {
    await trySource('YahooFinance-fx', agentId, async () => {
      const rate = await fetchYahooFinanceLastClose('CNY=X', timeoutMs)
      if (rate !== null) { snapshot.usdCnyRate = rate; dataPoints++ }
      return rate
    })
  }

  // fonte de dados 6: AKShare — EUA 10 Rendimento dos títulos do Tesouro de 1 ano
  if (snapshot.us10yYieldChange === null) {
    await trySource('AKShare-us10y', agentId, async () => {
      const change = await runPythonJson<number | null>(`
import akshare as ak, json
try:
    df = ak.bond_zh_us_rate(start_date="20200101")
    if not df.empty and len(df) >= 2:
        col = 'Rendimentos do Tesouro dos EUA10Ano' if 'Rendimentos do Tesouro dos EUA10Ano' in df.columns else None
        if col is None:
            for c in df.columns:
                if '10' in str(c) and ('Ano' in str(c) or 'year' in str(c).lower()):
                    col = c
                    break
        if col:
            prev = float(df[col].dropna().iloc[-2])
            curr = float(df[col].dropna().iloc[-1])
            chg = round(curr - prev, 4) if prev > 0 else None
            print(json.dumps({"success": True, "data": chg}))
        else:
            print(json.dumps({"success": True, "data": None}))
    else:
        print(json.dumps({"success": True, "data": None}))
except Exception as e:
    import sys; print(f"AKShare-us10y error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": f"bond_us_yield failed: {e}"}))
`, timeoutMs)
      if (change !== null) { snapshot.us10yYieldChange = change; dataPoints++ }
      return change
    })
  }
  if (snapshot.us10yYieldChange === null) {
    await trySource('YahooFinance-us10y', agentId, async () => {
      const change = await fetchYahooFinanceChangePercent('^TNX', timeoutMs)
      if (change !== null) { snapshot.us10yYieldChange = change; dataPoints++ }
      return change
    })
  }

  if (dataPoints === 0) errors.push('Todas as fontes de dados do mercado global falham')
  else if (shouldReportGlobalIndexError(snapshot, eastmoneyGlobalMissing)) {
    errors.push('Faltam dados do índice principal global')
  } else if (eastmoneyGlobalMissing) {
    logger.info('[data-agents][global_markets] Eastmoney-global Sem dados，O índice principal foi concluído a partir de uma fonte de backup')
  }

  return { data: dataPoints > 0 ? snapshot : null, log: createAgentResult(agentId, start, dataPoints, errors) }
}

// ==================== Agent 8: Verificação da qualidade dos dados ====================

function buildDataQualityReport(agentLogs: DataAgentResult[]): { data: DataQualityReport; log: DataAgentResult } {
  const start = Date.now()
  const agentId: DataAgentId = 'data_quality'

  const agentResults = agentLogs.map((log) => {
    const missingFields: string[] = []
    const anomalies: string[] = []

    if (log.dataPointCount === 0) missingFields.push('Sem dados')
    if (log.successRate < 0.5) anomalies.push(`baixa taxa de sucesso: ${(log.successRate * 100).toFixed(0)}%`)
    if (log.elapsedMs > 30000) anomalies.push(`Demorando muito: ${(log.elapsedMs / 1000).toFixed(1)}s`)
    if (log.errors.length > 0) anomalies.push(...log.errors)

    return {
      agentId: log.agentId,
      isComplete: log.dataPointCount > 0 && log.successRate >= 0.5,
      missingFields,
      anomalies,
      reliabilityScore: Math.round(log.successRate * 100),
    }
  })

  const overallScore = agentResults.length > 0
    ? Math.round(agentResults.reduce((sum, r) => sum + r.reliabilityScore, 0) / agentResults.length)
    : 0

  const report: DataQualityReport = {
    checkedAt: nowIso(),
    agentResults,
    overallScore,
  }

  return {
    data: report,
    log: createAgentResult(agentId, start, agentResults.length, overallScore < 30 ? ['Má qualidade geral dos dados'] : []),
  }
}

// ==================== Função de entrada ====================

/**
 * execute tudo 8 coleta de dados Agent，Retorna o conjunto de fatos agregado。
 * Agent independentes um do outro，Pode funcionar em paralelo。
 * suporte através config controle único Agent Ativação/Desativar e expirar。
 */
export async function collectAllAgents(
  stockAnalysisDir: string,
  tradeDate: string,
  quotes: Map<string, StockAnalysisSpotQuote>,
  _marketState: StockAnalysisMarketState,
  config?: DataAgentConfigStore,
): Promise<FactPool> {
  // [P2-5] Verifique na primeira execução AKShare Versão
  void checkAkShareVersion()

  // construir agent Habilitar mapeamento de status e tempo limite
  const agentConfigMap = new Map<DataAgentId, { enabled: boolean; timeoutMs: number }>()
  if (config) {
    for (const item of config.agents) {
      agentConfigMap.set(item.agentId, { enabled: item.enabled, timeoutMs: item.timeoutMs })
    }
  }

  const isEnabled = (id: DataAgentId): boolean => agentConfigMap.get(id)?.enabled ?? true
  const getTimeout = (id: DataAgentId): number => agentConfigMap.get(id)?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS

  const enabledCount = config
    ? config.agents.filter((a) => a.enabled && a.agentId !== 'data_quality').length
    : 7
  logger.info(`[data-agents] Comece a correr ${enabledCount} coleta de dados Agent (comum 7 configurável)`, { module: 'StockAnalysis' })
  const collectStart = Date.now()
  saLog.info('DataAgents', `A coleta de dados começa: tradeDate=${tradeDate} habilitarAgent=${enabledCount}/7 Participações acionárias=${quotes.size}`)
  const backupFactPool = await getRecentFactPoolBackup(stockAnalysisDir, tradeDate)

  // definir cada Agent função de execução e ID（O tempo limite é passado como parâmetro，Evite condições de corrida de estado mutável compartilhadas）
  type AgentEntry = { id: DataAgentId; fn: () => Promise<{ data?: any; log: DataAgentResult }> }
  const agentDefs: AgentEntry[] = [
    { id: 'macro_economy', fn: () => collectMacroEconomy(getTimeout('macro_economy')) },
    { id: 'policy_regulation', fn: () => collectPolicyRegulation(getTimeout('policy_regulation')) },
    { id: 'company_info', fn: () => collectCompanyInfo(quotes, getTimeout('company_info')) },
    { id: 'price_volume', fn: () => collectPriceVolume(quotes, getTimeout('price_volume')) },
    { id: 'industry_news', fn: () => collectIndustryNews(getTimeout('industry_news')) },
    { id: 'social_sentiment', fn: () => collectSocialSentiment(getTimeout('social_sentiment')) },
    { id: 'global_markets', fn: () => collectGlobalMarkets(getTimeout('global_markets')) },
  ]

  // Resultado de shell vazio（para deficientes Agent）
  const emptyResult = (id: DataAgentId) => ({
    data: null as any,
    log: {
      agentId: id,
      collectedAt: nowIso(),
      dataPointCount: 0,
      successRate: 0,
      elapsedMs: 0,
      errors: ['Desabilitado'],
    } satisfies DataAgentResult,
  })

  // Agent 1-7 Correr em paralelo（Pular desativado）
  const results = await Promise.all(
    agentDefs.map((agent) => isEnabled(agent.id) ? agent.fn() : Promise.resolve(emptyResult(agent.id))),
  )

  const [
    macroResult,
    policyResult,
    companyResult,
    priceVolumeResult,
    industryResult,
    sentimentResult,
    globalResult,
  ] = results

  const typedMacroResult = macroResult as { data: MacroEconomicData | null; log: DataAgentResult }
  const typedSentimentResult = sentimentResult as { data: SocialSentimentSnapshot[]; log: DataAgentResult }
  const typedGlobalResult = globalResult as { data: GlobalMarketSnapshot | null; log: DataAgentResult }

  applyFactPoolBackups(tradeDate, backupFactPool, {
    macroResult: typedMacroResult,
    sentimentResult: typedSentimentResult,
    globalResult: typedGlobalResult,
  })

  // Antes da coleta 7 individual Agent registro
  const agentLogs: DataAgentResult[] = results.map((r) => r.log)

  // perseguir Agent Mantenha registros detalhados
  for (const log of agentLogs) {
    const level = log.errors.length > 0 && log.successRate < 0.5 ? 'warn' as const : 'info' as const
    saLog[level]('DataAgents', `Agent ${log.agentId}: pontos de dados=${log.dataPointCount} taxa de sucesso=${(log.successRate * 100).toFixed(0)}% demorado=${log.elapsedMs}ms${log.errors.length > 0 ? ` erro=[${log.errors.join('; ')}]` : ''}`)
  }

  // Agent 8: Verificação da qualidade dos dados（Antes da dependência 7 individual Agent registro）
  const qualityResult = buildDataQualityReport(agentLogs)
  agentLogs.push(qualityResult.log)

  const factPool: FactPool = {
    updatedAt: nowIso(),
    tradeDate,
    macroData: typedMacroResult.data ?? null,
    policyEvents: policyResult.data ?? [],
    companyAnnouncements: companyResult.data ?? [],
    industryNews: industryResult.data ?? [],
    socialSentiment: typedSentimentResult.data ?? [],
    globalMarkets: typedGlobalResult.data ?? null,
    // [H5] Agent4 fluxo de fundos/Lista de Dragão e Tigre/Dados incrementais, como grandes transações
    priceVolumeExtras: priceVolumeResult.data ?? null,
    dataQuality: qualityResult.data,
    agentLogs,
  }

  const totalPoints = agentLogs.reduce((sum, log) => sum + log.dataPointCount, 0)
  const totalErrors = agentLogs.reduce((sum, log) => sum + log.errors.length, 0)
  const collectElapsed = Date.now() - collectStart
  logger.info(`[data-agents] 8 Agent Terminar: pontos de dados ${totalPoints}, erro ${totalErrors}, pontos de qualidade ${qualityResult.data.overallScore}`)
  saLog.info('DataAgents', `Coleta de dados concluída: Tempo total gasto=${collectElapsed}ms pontos de dados=${totalPoints} erro=${totalErrors} pontos de qualidade=${qualityResult.data.overallScore} macro=${factPool.macroData ? 'ter' : 'nenhum'} política=${factPool.policyEvents.length} anúncio=${factPool.companyAnnouncements.length} indústria=${factPool.industryNews.length} opinião pública=${factPool.socialSentiment.length} mundialmente=${factPool.globalMarkets ? 'ter' : 'nenhum'}`)

  return factPool
}

export const _testing = {
  createAgentResult,
  computeChangePercentFromSeries,
  countNonNullValues,
  computeSuccessRate,
  getRecentFactPoolBackup,
  applyFactPoolBackups,
  shouldReportGlobalIndexError,
  aggregateSocialSentiment,
}
