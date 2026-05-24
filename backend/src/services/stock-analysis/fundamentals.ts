/**
 * [v1.33.0 estágio E] Coleção de fundamentos de ações + cache local
 *
 * Responsabilidades：
 *  - de Tencent qt Captura em lote de interface PE / PB / Capitalização total de mercado / ROE
 *  - cache localmente para {stockAnalysisDir}/cache/fundamentals/{code}.json
 *  - por fetchedDate Determine a falha durante a noite（Diferente de rastrear novamente no mesmo dia）
 *  - LLM prompt Imprensa média"fundamentos da empresa"injeção de camada
 *
 * Estabilidade da fonte de dados：Tencent qt (https://qt.gtimg.cn/q=sh600519,sz000001,...) Projeto verificado
 */

import fs from 'fs/promises'
import path from 'path'

import { logger } from '../../utils/logger'
import { formatDateStr } from './trading-calendar'
import type { StockFundamentals } from './types'

const MODULE = 'Fundamentals'
const CACHE_DIRNAME = 'cache/fundamentals'
const FETCH_TIMEOUT_MS = 8000
const BATCH_SIZE = 30 // Tencent qt Verificável único 30-50 Apenas
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** Converter símbolo de ações universal em Tencent qt formulário de parâmetro（sh600519 / sz000001 / bj430139） */
function toTencentSymbol(code: string): string | null {
  const raw = code.trim().toLowerCase()
  if (/^(sh|sz|bj)\d{6}$/.test(raw)) return raw
  if (!/^\d{6}$/.test(raw)) return null
  // 6 dígitos：Inferir pela primeira posição
  const first = raw[0]
  if (first === '6') return `sh${raw}`
  if (first === '4' || first === '8') return `bj${raw}`
  return `sz${raw}`
}

/** descascar sh/sz/bj prefixo，Retornar puro 6 código de bits */
function normalizeCode(code: string): string {
  const raw = code.trim().toLowerCase()
  if (/^(sh|sz|bj)\d{6}$/.test(raw)) return raw.slice(2)
  return raw
}

function cacheFilePath(stockAnalysisDir: string, code: string): string {
  return path.join(stockAnalysisDir, CACHE_DIRNAME, `${normalizeCode(code)}.json`)
}

/** Ler cache de estoque único；Se a data do cache != today então retorne null（Inválido durante a noite） */
export async function readFundamentalsCache(
  stockAnalysisDir: string,
  code: string,
): Promise<StockFundamentals | null> {
  try {
    const content = await fs.readFile(cacheFilePath(stockAnalysisDir, code), 'utf-8')
    const data = JSON.parse(content) as StockFundamentals
    if (data.fetchedDate !== formatDateStr(new Date())) return null // Inválido durante a noite
    return data
  } catch {
    return null
  }
}

/** escrever cache */
async function writeFundamentalsCache(
  stockAnalysisDir: string,
  data: StockFundamentals,
): Promise<void> {
  const dir = path.join(stockAnalysisDir, CACHE_DIRNAME)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(cacheFilePath(stockAnalysisDir, data.code), JSON.stringify(data, null, 2), 'utf-8')
}

/** Converter uma string numérica em number，Retorno em caso de falha null */
function parseNum(s: string | undefined): number | null {
  if (!s || s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * analisar Tencent qt registro único（de acordo com ~ segmentação）
 *
 * Referência de índice de campo（Verificação da comunidade + Medição real do projeto）：
 *   0: v_{symbol}="1 (prefixo，pular sobre)
 *   1: Nome da ação（chinês，Deve conter CJK personagem，servir como sentinela）
 *   2: código
 *   3: preço mais recente（valor numérico，sentinela）
 *   39: Relação preço/lucro TTM
 *   44: Capitalização total de mercado（bilhão）
 *   46: relação preço/livro
 *   74: ROE(%)
 *
 * v1.35.0 [A1-P0-1/2] Adicionar verificação sentinela：
 *   - parts[1] Deve conter caracteres chineses（Evite que os campos fiquem desalinhados e coloque o código/números como nomes）
 *   - parts[3] Deve ser um número positivo（Evite o desalinhamento e confunda o nome com o preço）
 *   - parts[39]（PE）Faixa razoável -200 ~ 2000（As ações deficitárias podem ser negativas PE，Mas valores extremos são considerados desalinhamentos）
 *   - parts[46]（PB）Faixa razoável 0 ~ 100
 *   - Qualquer sentinela falha e retorna null e imprimir warn，deixe a camada externa ir fallback fonte
 */
const CJK_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff]/

export function parseTencentQtFundamentals(rawLine: string): StockFundamentals | null {
  const parts = rawLine.split('~')
  if (parts.length < 50) return null
  const code = parts[2]
  if (!/^\d{6}$/.test(code)) return null

  // v1.35.0 [A1-P0-1/2] sentinela 1：Os nomes das ações devem conter caracteres chineses（evitar GBK Erro de decodificação causa desalinhamento de campo）
  const name = parts[1] ?? ''
  if (!CJK_REGEX.test(name)) {
    logger.warn(`[fundamentals] parseTencentQt Sentinela falhou code=${code}: Não há caracteres chineses no campo do nome（Suspeita de desalinhamento de campo ou dano de codificação）`, { module: MODULE })
    return null
  }

  // v1.35.0 [A1-P0-1/2] sentinela 2：O preço mais recente deve ser um número positivo
  const latestPrice = parseNum(parts[3])
  if (latestPrice === null || latestPrice <= 0) {
    logger.warn(`[fundamentals] parseTencentQt Sentinela falhou code=${code}: O campo de preço mais recente é ilegal (${parts[3]})`, { module: MODULE })
    return null
  }

  // v1.35.0 [A1-P0-1/2] sentinela 3：PE/PB Verificação de plausibilidade（Detecção de desvio de campo）
  const rawPe = parseNum(parts[39])
  const rawPb = parseNum(parts[46])
  if (rawPe !== null && (rawPe < -200 || rawPe > 2000)) {
    logger.warn(`[fundamentals] parseTencentQt Sentinela falhou code=${code}: PE além do intervalo razoável (${rawPe})，Suspeita de desvio de campo`, { module: MODULE })
    return null
  }
  if (rawPb !== null && (rawPb < 0 || rawPb > 100)) {
    logger.warn(`[fundamentals] parseTencentQt Sentinela falhou code=${code}: PB além do intervalo razoável (${rawPb})，Suspeita de desvio de campo`, { module: MODULE })
    return null
  }

  return {
    code,
    // v1.35.0 [A1-P1-4] PE=0 considerado não aplicável（ações de perda），mudar null evitar LLM interpretado mal
    peRatio: rawPe !== null && rawPe > 0 ? rawPe : null,
    totalMarketCapYi: parseNum(parts[44]),
    pbRatio: rawPb !== null && rawPb > 0 ? rawPb : null,
    roePercent: parts.length > 74 ? parseNum(parts[74]) : null,
    fetchedDate: formatDateStr(new Date()),
    fetchedAt: new Date().toISOString(),
    source: 'tencent',
  }
}

/** Lote de Tencent qt Entender */
async function fetchBatchFromTencent(codes: string[]): Promise<Map<string, StockFundamentals>> {
  const result = new Map<string, StockFundamentals>()
  const symbols = codes.map(toTencentSymbol).filter((s): s is string => s !== null)
  if (symbols.length === 0) return result

  const url = `https://qt.gtimg.cn/q=${symbols.join(',')}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Referer: 'https://stockapp.finance.qq.com/' },
      signal: controller.signal,
    })
    if (!resp.ok) {
      logger.warn(`[fundamentals] Tencent qt HTTP ${resp.status}`, { module: MODULE })
      return result
    }
    // v1.35.0 [A1-P0-1] Tencent qt retornar GBK codificação，Deve usar TextDecoder('gbk') Decodifique corretamente。
    // Para versões mais antigas 'binary' (latin1) A decodificação resulta em chinês contendo bytes especiais e ~ conflito，Ocorre desalinhamento de campo。
    const buffer = await resp.arrayBuffer()
    const text = new TextDecoder('gbk').decode(buffer)
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    for (const line of lines) {
      const parsed = parseTencentQtFundamentals(line)
      if (parsed) result.set(parsed.code, parsed)
    }
  } catch (error) {
    logger.warn(`[fundamentals] Tencent qt Falha na busca: ${(error as Error).message}`, { module: MODULE })
  } finally {
    clearTimeout(timer)
  }
  return result
}

/**
 * Obtenha fundamentos em lotes（Com cache）：
 *   1. Verifique o cache um por um，Os hits são armazenados em cache
 *   2. Botão perdido BATCH_SIZE em lotes de Tencent Entender
 *   3. Cache de gravação recém-capturado
 *   4. eventualmente retornar code → fundamentals（Aqueles que não foram pegos não estão lá. Map meio）
 */
export async function fetchFundamentalsForCodes(
  stockAnalysisDir: string,
  codes: string[],
): Promise<Map<string, StockFundamentals>> {
  const result = new Map<string, StockFundamentals>()
  const toFetch: string[] = []

  for (const code of codes) {
    const normalized = normalizeCode(code)
    const cached = await readFundamentalsCache(stockAnalysisDir, normalized)
    if (cached) {
      result.set(normalized, cached)
    } else {
      toFetch.push(normalized)
    }
  }

  if (toFetch.length === 0) return result

  // Buscar em lotes
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE)
    const fetched = await fetchBatchFromTencent(batch)
    for (const [code, data] of fetched) {
      result.set(code, data)
      try {
        await writeFundamentalsCache(stockAnalysisDir, data)
      } catch (error) {
        logger.warn(`[fundamentals] Falha na gravação do cache ${code}: ${(error as Error).message}`, { module: MODULE })
      }
    }
  }

  logger.info(
    `[fundamentals] Aquisição em lote concluída: perguntar=${codes.length} acerto no cache=${codes.length - toFetch.length} Recém-capturado=${toFetch.length - (toFetch.length - (result.size - (codes.length - toFetch.length)))}`,
    { module: MODULE },
  )
  return result
}

export const _testing = {
  toTencentSymbol,
  normalizeCode,
  parseTencentQtFundamentals,
  fetchBatchFromTencent,
  writeFundamentalsCache,
}
