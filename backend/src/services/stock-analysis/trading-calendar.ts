/**
 * China A Calendário de negociação de ações & ferramenta de tempo de negociação
 *
 * Fornecer julgamento no dia de negociação、Julgamento do período de negociação e outras funções da ferramenta，para service.ts / memory.ts Aguardando compartilhamento。
 *
 * As fontes de dados são divididas em duas camadas：
 * 1. dados estáticos（CHINA_MARKET_HOLIDAYS / CHINA_MARKET_EXTRA_TRADING_DAYS）— Capa codificada
 * 2. dados on-line（AKShare tool_trade_date_hist_sina）— Armazenar em cache localmente JSON，Sincronize regularmente
 *
 * isTradingDay Priorize o cache online，Downgrade para dados estáticos quando o cache online não estiver disponível。
 */

import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

import { logger } from '../../utils/logger'

const execFileAsync = promisify(execFile)

const MODULE = 'TradingCalendar'

/** Faixa anual coberta pelos dados de feriados（Incluindo ambas as extremidades） */
const HOLIDAY_DATA_MIN_YEAR = 2025
const HOLIDAY_DATA_MAX_YEAR = 2027

/**
 * China A Dias de fechamento legal do mercado de ações（2025-2027）。
 * Incluindo o dia de ano novo、Festival da Primavera、Qingming、Socorro、Festival do Barco-Dragão、Festival do Meio Outono、Dia Nacional e outros feriados legais。
 * Ao final de cada ano, os dados do ano seguinte precisam ser atualizados de acordo com o calendário de feriados anunciado pelo Conselho de Estado.。
 */
export const CHINA_MARKET_HOLIDAYS: ReadonlySet<string> = new Set([
  // 2025 Ano
  '2025-01-01',                                     // Ano Novo
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', // Festival da Primavera
  '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
  '2025-04-04', '2025-04-05', '2025-04-06',         // Qingming
  '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // Socorro
  '2025-05-31', '2025-06-01', '2025-06-02',         // Festival do Barco-Dragão
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', // Dia Nacional+Festival do Meio Outono
  '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
  // 2026 Ano（De acordo com a Secretaria Geral do Conselho de Estado O Conselho de Estado inventou a eletricidade〔2025〕7Número Notificação formal）
  '2026-01-01', '2026-01-02', '2026-01-03',         // Ano Novo 1/1(Quatro)-1/3(seis)
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', // Festival da Primavera 2/15(dia)-2/23(um)
  '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',         // Qingming 4/4(seis)-4/6(um)
  '2026-05-01', '2026-05-02', '2026-05-03',         // Socorro 5/1(cinco)-5/5(dois)
  '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',         // Festival do Barco-Dragão 6/19(cinco)-6/21(dia)
  '2026-09-25', '2026-09-26', '2026-09-27',         // Festival do Meio Outono 9/25(cinco)-9/27(dia)
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', // Dia Nacional 10/1(Quatro)-10/7(três)
  '2026-10-05', '2026-10-06', '2026-10-07',
  // 2027 Ano（Estimativa）
  '2027-01-01', '2027-01-02', '2027-01-03',         // Ano Novo
  '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', // Festival da Primavera
  '2027-02-09', '2027-02-10', '2027-02-11',
  '2027-04-05', '2027-04-06', '2027-04-07',         // Qingming
  '2027-05-01', '2027-05-02', '2027-05-03',         // Socorro
  '2027-06-09', '2027-06-10', '2027-06-11',         // Festival do Barco-Dragão
  '2027-09-15', '2027-09-16', '2027-09-17',         // Festival do Meio Outono
  '2027-10-01', '2027-10-02', '2027-10-03', '2027-10-04', // Dia Nacional
  '2027-10-05', '2027-10-06', '2027-10-07',
])

/**
 * [H3] China A Feriado do mercado de ações e dias de maquiagem（Nos finais de semana, a bolsa funciona normalmente）。
 * Dias de maquiagem após o feriado do Conselho de Estado，A exchange abrirá normalmente。
 * No final de cada ano, precisa ser atualizado de acordo com as férias anunciadas pelo Conselho de Estado.。
 */
export const CHINA_MARKET_EXTRA_TRADING_DAYS: ReadonlySet<string> = new Set([
  // 2025 Dias anuais de descanso e reposição
  '2025-01-26',   // Aulas de adaptação e maquiagem para feriados do Festival da Primavera（Domingo）
  '2025-02-08',   // Aulas de adaptação e maquiagem para feriados do Festival da Primavera（Sábado）
  '2025-04-27',   // Feriado do primeiro de maio e turno de maquiagem（Domingo）
  '2025-09-28',   // Feriado do Dia Nacional e aulas de maquiagem（Domingo）
  '2025-10-11',   // Feriado do Dia Nacional e aulas de maquiagem（Sábado）
  // 2026 Dias anuais de descanso e reposição（De acordo com a Secretaria Geral do Conselho de Estado O Conselho de Estado inventou a eletricidade〔2025〕7Número Notificação formal）
  '2026-01-04',   // Fim de ano livre e aulas de maquiagem（Domingo）
  '2026-02-14',   // Aulas de adaptação e maquiagem para feriados do Festival da Primavera（Sábado）
  '2026-02-28',   // Aulas de adaptação e maquiagem para feriados do Festival da Primavera（Sábado）
  '2026-05-09',   // Feriado do primeiro de maio e turno de maquiagem（Sábado）
  '2026-09-20',   // Feriado do Dia Nacional e aulas de maquiagem（Domingo）
  '2026-10-10',   // Feriado do Dia Nacional e aulas de maquiagem（Sábado）
  // 2027 Dias anuais de descanso e reposição（Estimativa）
  '2027-02-20',   // Aulas de adaptação e maquiagem para feriados do Festival da Primavera（Sábado）
  '2027-10-09',   // Feriado do Dia Nacional e aulas de maquiagem（Sábado）
])

// ─── Cache de calendário online ───────────────────────────────────────────────────────

/** Coleta de dias de negociação em cache on-line（Armazenar por ano）。key = anos, value = Set<YYYY-MM-DD> */
const onlineTradeDatesCache: Map<number, Set<string>> = new Map()

/** Carimbo de data e hora de carregamento do cache online，Usado para determinar se expirou */
let onlineCacheLoadedAt = 0

/** Período de validade do cache online：24 Hora */
const ONLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Diretório de armazenamento de arquivos em cache（Depender de initCalendarCacheDir configurar） */
let calendarCacheDir: string | null = null

/** Python usuário site-packages caminho（Cache para evitar consultas duplicadas） */
let pythonUserSitePromise: Promise<string | null> | null = null

/**
 * Estrutura do arquivo de cache do calendário online。
 * um para cada ano JSON documento，Registre todos os dias de negociação do ano。
 */
interface OnlineCalendarCache {
  year: number
  fetchedAt: string
  source: string
  tradeDates: string[]
}

// ─── auxiliar interno ────────────────────────────────────────────────────────

/** Foi emitido um aviso durante anos fora do alcance?（Evite a limpeza repetida de logs） */
let yearOutOfRangeWarned = false

/** Vai Date formatado como YYYY-MM-DD（Forçar fuso horário da China Asia/Shanghai） */
export function formatDateStr(date: Date): string {
  const str = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
  return str // en-CA Acontece que o formato é YYYY-MM-DD
}

async function getPythonUserSitePackages(): Promise<string | null> {
  if (!pythonUserSitePromise) {
    pythonUserSitePromise = execFileAsync('python3', ['-c', 'import site; print(site.getusersitepackages())'], {
      maxBuffer: 1024 * 256,
      env: process.env,
    })
      .then(({ stdout }) => stdout.trim() || null)
      .catch(() => null)
  }
  return pythonUserSitePromise
}

// ─── Sincronização de calendário on-line ────────────────────────────────────────────────────

/**
 * Inicializar diretório de cache do calendário。
 * deveria estar em bootstrapStockAnalysis Chamado uma vez，entrada stockAnalysisDir。
 */
export function initCalendarCacheDir(stockAnalysisDir: string): void {
  calendarCacheDir = path.join(stockAnalysisDir, 'cache')
}

function getCacheFilePath(year: number): string | null {
  if (!calendarCacheDir) return null
  return path.join(calendarCacheDir, `trading-calendar-${year}.json`)
}

/**
 * Leia os dados do calendário online do arquivo de cache local。
 * Chamado na inicialização，Carregar cache de disco na memória。
 */
async function loadOnlineCacheFromDisk(year: number): Promise<boolean> {
  const filePath = getCacheFilePath(year)
  if (!filePath) return false
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const cache = JSON.parse(content) as OnlineCalendarCache
    if (!cache.tradeDates || !Array.isArray(cache.tradeDates) || cache.year !== year) {
      return false
    }
    onlineTradeDatesCache.set(year, new Set(cache.tradeDates))
    onlineCacheLoadedAt = Date.now()
    logger.info(
      `Carregado do disco ${year} Cache Anual do Calendário de Negociação Online（${cache.tradeDates.length} dias de negociação，fonte: ${cache.source}，Ganhe tempo: ${cache.fetchedAt}）`,
      { module: MODULE },
    )
    return true
  } catch {
    return false
  }
}

/**
 * passar AKShare (tool_trade_date_hist_sina) Extraia o calendário de negociação on-line。
 * Retorna uma lista de dias de negociação em um ano específico，Retorno em caso de falha null。
 */
async function fetchOnlineTradeDates(year: number): Promise<string[] | null> {
  const script = `
import json, sys
try:
    import akshare as ak
    df = ak.tool_trade_date_hist_sina()
    dates = [str(d) for d in df['trade_date'] if str(d).startswith('${year}-')]
    print(json.dumps({"success": True, "data": dates}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
    sys.exit(1)
`
  try {
    const pythonUserSite = await getPythonUserSitePackages()
    const env = { ...process.env }
    if (pythonUserSite) {
      env.PYTHONPATH = env.PYTHONPATH ? `${pythonUserSite}:${env.PYTHONPATH}` : pythonUserSite
    }

    const { stdout } = await execFileAsync('python3', ['-c', script], {
      maxBuffer: 1024 * 1024 * 4,
      env,
      timeout: 30_000,
    })
    const result = JSON.parse(stdout.trim()) as { success: boolean; data?: string[]; error?: string }
    if (!result.success || !result.data) {
      logger.warn(`AKShare Falha ao extrair o calendário on-line: ${result.error || 'dados vazios'}`, { module: MODULE })
      return null
    }
    if (result.data.length < 200) {
      logger.warn(`AKShare retornar ${year} O número de dias de negociação anuais é excepcionalmente baixo（${result.data.length}），A fonte de dados pode estar incompleta`, { module: MODULE })
    }
    return result.data
  } catch (err) {
    logger.warn(`Exceção de pull do calendário de negociação on-line: ${(err as Error).message}`, { module: MODULE })
    return null
  }
}

/**
 * Salve dados online no cache do disco。
 */
async function saveOnlineCacheToDisk(year: number, tradeDates: string[], source: string): Promise<void> {
  const filePath = getCacheFilePath(year)
  if (!filePath) return
  const cache: OnlineCalendarCache = {
    year,
    fetchedAt: new Date().toISOString(),
    source,
    tradeDates,
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const tmpPath = `${filePath}.${Date.now()}.tmp`
    await fs.writeFile(tmpPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    logger.warn(`Falha na gravação do disco do cache do calendário online: ${(err as Error).message}`, { module: MODULE })
  }
}

/**
 * Compare dados online com dados estáticos，Relatório de diferença de saída。
 * Retorna o número de diferenças encontradas。
 */
function diffOnlineVsStatic(year: number, onlineDates: Set<string>): number {
  let diffCount = 0

  // Percorra todas as datas do ano atual（1/1 ~ 12/31），Encontre inconsistências entre dados estáticos e online
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateStr(d)
    const dayOfWeek = d.getDay()
    const isWknd = dayOfWeek === 0 || dayOfWeek === 6

    const onlineSaysTrading = onlineDates.has(dateStr)

    // julgamento estático
    const inExtraDays = CHINA_MARKET_EXTRA_TRADING_DAYS.has(dateStr)
    const inHolidays = CHINA_MARKET_HOLIDAYS.has(dateStr)
    let staticSaysTrading: boolean
    if (inExtraDays) {
      staticSaysTrading = true
    } else if (isWknd) {
      staticSaysTrading = false
    } else {
      staticSaysTrading = !inHolidays
    }

    // Os dados online não incluem dias de reposição de fim de semana，Então, comparamos apenas dias úteis（Segunda a sexta）
    if (isWknd) continue

    if (onlineSaysTrading !== staticSaysTrading) {
      diffCount++
      if (onlineSaysTrading && !staticSaysTrading) {
        logger.error(
          `[Diferenças no calendário de negociação] ${dateStr} Dados online são dias de negociação，Mas os dados estáticos estão marcados como feriado！Isso pode resultar no bloqueio incorreto de transações！`,
          { module: MODULE },
        )
      } else {
        logger.warn(
          `[Diferenças no calendário de negociação] ${dateStr} Os dados online são para dias sem negociação，Mas os dados estáticos são marcados como dia da transação（Pode levar a corridas vazias durante feriados）`,
          { module: MODULE },
        )
      }
    }
  }

  return diffCount
}

/**
 * Sincronize o calendário de negociação online。
 * Extraia dados on-line → Salvar no cache do disco → carregar na memória → Verificação cruzada com dados estáticos。
 *
 * @param year - Ano para sincronizar，Ano atual padrão
 * @returns Se a sincronização foi bem-sucedida
 */
export async function syncOnlineTradingCalendar(year?: number): Promise<boolean> {
  const targetYear = year ?? new Date().getFullYear()
  logger.info(`Comece a sincronizar ${targetYear} Calendário Anual de Negociação Online...`, { module: MODULE })

  const tradeDates = await fetchOnlineTradeDates(targetYear)
  if (!tradeDates || tradeDates.length === 0) {
    logger.warn(`${targetYear} Falha na sincronização anual do calendário de negociação on-line，Dados estáticos continuarão a ser usados`, { module: MODULE })
    return false
  }

  // Salvar na memória
  const dateSet = new Set(tradeDates)
  onlineTradeDatesCache.set(targetYear, dateSet)
  onlineCacheLoadedAt = Date.now()

  // salvar no disco
  await saveOnlineCacheToDisk(targetYear, tradeDates, 'akshare:tool_trade_date_hist_sina')

  // verificação cruzada
  const diffCount = diffOnlineVsStatic(targetYear, dateSet)
  if (diffCount > 0) {
    logger.error(
      `[sério] ${targetYear} O calendário anual de negociação online existe com dados estáticos ${diffCount} Diferenças em todos os lugares！Os dados estáticos podem estar desatualizados ou incorretos，Por favor verifique o mais rápido possível trading-calendar.ts`,
      { module: MODULE },
    )
  } else {
    logger.info(`${targetYear} Calendário anual de negociação online consistente com dados estáticos（${tradeDates.length} dias de negociação）`, { module: MODULE })
  }

  return true
}

// ─── Iniciar autoteste ────────────────────────────────────────────────────────

/**
 * Autoteste do calendário de transações realizado quando o serviço é iniciado。
 * 1. Verifique se existem dados estáticos para o ano atual
 * 2. Tente carregar o cache online no disco
 * 3. Se o cache não existir ou expirar，Acionar sincronização on-line
 * 4. Verificação de consistência lógica para a data de hoje
 *
 * Esta função não lançará uma exceção（Todo o tratamento de downgrade de erros），Certifique-se de que isso não afeta a inicialização do serviço。
 */
export async function validateAndSyncCalendarOnStartup(): Promise<void> {
  const now = new Date()
  const year = now.getFullYear()
  const todayStr = formatDateStr(now)
  const dayOfWeek = now.getDay()

  logger.info(`Calendário de negociação inicia autoteste: data atual ${todayStr}（Semana${['dia', 'um', 'dois', 'três', 'Quatro', 'cinco', 'seis'][dayOfWeek]}）`, { module: MODULE })

  // examinar 1: Se o ano atual está dentro do intervalo de dados estáticos
  if (year < HOLIDAY_DATA_MIN_YEAR || year > HOLIDAY_DATA_MAX_YEAR) {
    logger.error(
      `[sério] ano atual ${year} Fora do intervalo de dados estáticos de feriados ${HOLIDAY_DATA_MIN_YEAR}-${HOLIDAY_DATA_MAX_YEAR} Dentro！O julgamento do dia de negociação pode ser completamente impreciso！`,
      { module: MODULE },
    )
  }

  // examinar 2: Se os dados estáticos de feriados do ano atual estão vazios
  const yearPrefix = `${year}-`
  const staticHolidaysThisYear = [...CHINA_MARKET_HOLIDAYS].filter((d) => d.startsWith(yearPrefix))
  if (staticHolidaysThisYear.length === 0) {
    logger.error(
      `[sério] ${year} Os dados estáticos de feriados do ano estão vazios！Todos os dias úteis são considerados dias de negociação，Os feriados não são reconhecidos corretamente！`,
      { module: MODULE },
    )
  } else {
    logger.info(`${year} Dados anuais estáticos de feriados: ${staticHolidaysThisYear.length} céu`, { module: MODULE })
  }

  // examinar 3: Tente carregar o cache do disco
  const diskLoaded = await loadOnlineCacheFromDisk(year)

  // examinar 4: Se o cache de disco não existir ou for antigo，Acionar sincronização on-line
  if (!diskLoaded) {
    logger.info(`${year} Anos sem cache de disco do calendário online，Acionar sincronização on-line...`, { module: MODULE })
    await syncOnlineTradingCalendar(year)
  } else {
    // Verifique os arquivos em cache fetchedAt Quer exceda 7 céu
    const cachePath = getCacheFilePath(year)
    if (cachePath) {
      try {
        const content = await fs.readFile(cachePath, 'utf8')
        const cache = JSON.parse(content) as OnlineCalendarCache
        const fetchedAt = new Date(cache.fetchedAt).getTime()
        const ageDays = (Date.now() - fetchedAt) / (24 * 60 * 60 * 1000)
        if (ageDays > 7) {
          logger.info(`O cache do calendário online expirou（${Math.floor(ageDays)} Obtido dias atrás），atualização de gatilho...`, { module: MODULE })
          await syncOnlineTradingCalendar(year)
        }
      } catch {
        // Sem bloqueio em caso de falha de leitura
      }
    }
  }

  // examinar 5: Faça uma verificação de consistência lógica no dia
  const todayIsTrading = isTradingDay(now)
  const isWknd = dayOfWeek === 0 || dayOfWeek === 6

  if (!isWknd && !todayIsTrading && !CHINA_MARKET_HOLIDAYS.has(todayStr)) {
    // dia útil + Não é um dia de negociação + Não está na lista estática de feriados → Pode haver um problema
    logger.error(
      `[Anormalidade de autoverificação] hoje ${todayStr} É um dia útil，Não está na lista estática de feriados，mas isTradingDay retornar false！Por favor, verifique os dados do calendário de negociação！`,
      { module: MODULE },
    )
  }

  // Use o cache online para uma verificação mais precisa
  const onlineCache = onlineTradeDatesCache.get(year)
  if (onlineCache && !isWknd) {
    const onlineSaysTrading = onlineCache.has(todayStr)
    if (onlineSaysTrading !== todayIsTrading) {
      logger.error(
        `[Diferenças de autoteste] hoje ${todayStr}: dados on-line=${onlineSaysTrading ? 'dia de negociação' : 'dias sem negociação'}, julgamento local=${todayIsTrading ? 'dia de negociação' : 'dias sem negociação'}！Com base em dados on-line, deve ser ${onlineSaysTrading ? 'dia de negociação' : 'dias sem negociação'}`,
        { module: MODULE },
      )
    }
  }

  // [P2-3] Pré-sincronização de Ano Novo：12Mês sincroniza automaticamente o calendário do próximo ano，Evite não ter dados online depois da véspera de Ano Novo
  const month = now.getMonth() // 0-indexed, 11=December
  if (month === 11) {
    const nextYear = year + 1
    const hasNextYear = onlineTradeDatesCache.has(nextYear) && onlineTradeDatesCache.get(nextYear)!.size > 0
    if (!hasNextYear) {
      logger.info(`Atualmente12lua，pré-sincronização ${nextYear} Calendário Anual de Negociação...`, { module: MODULE })
      try {
        await syncOnlineTradingCalendar(nextYear)
      } catch (err) {
        logger.warn(`${nextYear} Falha na pré-sincronização do calendário anual（Não afeta a operação atual）: ${(err as Error).message}`, { module: MODULE })
      }
    }
  }

  // v1.35.0 [A1-P0-3] Pré-carregamento do lookback da véspera de Ano Novo：1-3 O mês precisa que os dados do ano anterior estejam mais próximos N dia K rastreamento de linha
  // Ao iniciar, se a corrente 1-3 lua，Sincronização ativa / Carregar cache do ano anterior，evitar getRecentTradeDates Downgrade para dados estáticos potencialmente obsoletos
  if (month <= 2) { // 0=Jan, 1=Feb, 2=Mar
    const prevYear = year - 1
    const hasPrevYear = onlineTradeDatesCache.has(prevYear) && onlineTradeDatesCache.get(prevYear)!.size > 0
    if (!hasPrevYear) {
      logger.info(`Atualmente 1-3 lua，pré-carregamento ${prevYear} Calendário anual de negociação para a véspera de Ano Novo K rastreamento de linha...`, { module: MODULE })
      const diskLoadedPrev = await loadOnlineCacheFromDisk(prevYear)
      if (!diskLoadedPrev) {
        try {
          await syncOnlineTradingCalendar(prevYear)
        } catch (err) {
          logger.warn(`${prevYear} Falha no pré-carregamento do calendário anual（Fará downgrade para usar dados estáticos）: ${(err as Error).message}`, { module: MODULE })
        }
      }
    }
  }

  logger.info(`Autoteste do calendário de negociação concluído: hoje ${todayStr} ${todayIsTrading ? 'sim' : 'não'}dia de negociação`, { module: MODULE })
}

// ─── isTradingDay（função de julgamento central）────────────────────────────────────

/**
 * Determine se a data fornecida é A dia de negociação de ações。
 * Determinar prioridade：
 * 1. Dia de folga e trabalho de maquiagem（EXTRA_TRADING_DAYS）→ true
 * 2. Cache online atingido e é um dia útil → Sujeito a dados on-line
 * 3. Downgrade para dados estáticos（HOLIDAYS + julgamento de fim de semana）
 *
 * [H3] A prioridade dos dias de maquiagem é maior que a dos finais de semana：Se a data estiver em EXTRA_TRADING_DAYS Retorne se true。
 * [M9] Aviso de registro quando a data do ano excede a cobertura de dados de feriados。
 */
export function isTradingDay(date?: Date): boolean {
  const target = date ?? new Date()
  const dateStr = formatDateStr(target)
  const year = target.getFullYear()

  // [H3] Será dada prioridade aos dias de descanso e recuperação：mesmo nos finais de semana，Desde que seja recolhido no dia da reposição, também será considerado dia de negociação.
  if (CHINA_MARKET_EXTRA_TRADING_DAYS.has(dateStr)) {
    return true
  }

  const day = target.getDay()
  if (day === 0 || day === 6) return false

  // prioridade查existirArame缓存（Válido apenas em dias úteis，Os dados online não incluem dias de reposição de fim de semana）
  const onlineCache = onlineTradeDatesCache.get(year)
  if (onlineCache && onlineCache.size > 0) {
    return onlineCache.has(dateStr)
  }

  // [M9] Verifique a cobertura ao fazer downgrade para dados estáticos
  if ((year < HOLIDAY_DATA_MIN_YEAR || year > HOLIDAY_DATA_MAX_YEAR) && !yearOutOfRangeWarned) {
    yearOutOfRangeWarned = true
    logger.warn(
      `Os dados de feriados do calendário comercial cobrem apenas ${HOLIDAY_DATA_MIN_YEAR}-${HOLIDAY_DATA_MAX_YEAR} Ano，ano atual ${year} Fora do alcance e sem cache online。por favor atualize trading-calendar.ts Ou certifique-se de que a sincronização online esteja normal`,
      { module: MODULE },
    )
  }

  return !CHINA_MARKET_HOLIDAYS.has(dateStr)
}

/** O cache online expirou?（usado para scheduler Determinar se a atualização é necessária） */
export function isOnlineCacheExpired(): boolean {
  return Date.now() - onlineCacheLoadedAt > ONLINE_CACHE_TTL_MS
}

/** Obtenha informações de status do cache on-line（para diagnóstico/API usar） */
export function getCalendarSyncStatus(): {
  hasOnlineCache: boolean
  onlineCacheYears: number[]
  cacheLoadedAt: string | null
  cacheExpired: boolean
} {
  return {
    hasOnlineCache: onlineTradeDatesCache.size > 0,
    onlineCacheYears: [...onlineTradeDatesCache.keys()],
    cacheLoadedAt: onlineCacheLoadedAt > 0 ? new Date(onlineCacheLoadedAt).toISOString() : null,
    cacheExpired: isOnlineCacheExpired(),
  }
}

/**
 * Determine se a hora atual é A Durante o período de negociação de licitação contínua de ações。
 * manhã 09:30 - 11:30，tarde 13:00 - 14:59（15:00 O horário de término do leilão de encerramento）。
 * [L11] 15:00 A hora não é mais contada como sessão de negociação（Fechado）。
 */
export function isWithinTradingHours(date?: Date): boolean {
  const now = date ?? new Date()
  // Forçar o uso do fuso horário da China para obter hora e minutos
  const parts = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Shanghai', hour12: false }).split(':')
  const hhmm = Number(parts[0]) * 100 + Number(parts[1])
  return (hhmm >= 930 && hhmm <= 1130) || (hhmm >= 1300 && hhmm < 1500)
}

/**
 * [L12] Determine se o horário atual está dentro do período do leilão de chamadas。
 * Leilão de abertura：09:15 - 09:25
 * leilão de encerramento：14:57 - 15:00
 */
export function isWithinAuctionHours(date?: Date): boolean {
  const now = date ?? new Date()
  const parts = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Shanghai', hour12: false }).split(':')
  const hhmm = Number(parts[0]) * 100 + Number(parts[1])
  return (hhmm >= 915 && hhmm < 925) || (hhmm >= 1457 && hhmm <= 1500)
}

/**
 * Julgamento abrangente：Se as operações de negociação podem ser realizadas atualmente（dia de negociação + sessão de negociação）。
 * Retornar resultados estruturados，Contém razões para não ser negociável，Para exibição frontal。
 */
export function checkTradingAvailability(date?: Date): { canTrade: boolean; reason: string | null } {
  const now = date ?? new Date()
  if (!isTradingDay(now)) {
    const day = now.getDay()
    if (day === 0 || day === 6) {
      return { canTrade: false, reason: 'É o fim de semana，A ações fechadas' }
    }
    return { canTrade: false, reason: 'Atualmente é feriado legal，A ações fechadas' }
  }
  // Você também precisa verificar o horário de negociação nos dias de reposição（isTradingDay O dia de compensação processado é o dia da transação）
  if (!isWithinTradingHours(now)) {
    const hhmm = now.getHours() * 100 + now.getMinutes()
    if (hhmm < 930) {
      return { canTrade: false, reason: 'Ainda não aberto（09:30 abertura）' }
    }
    if (hhmm > 1130 && hhmm < 1300) {
      return { canTrade: false, reason: 'Mercado fechado ao meio-dia（13:00 Retomar transação）' }
    }
    return { canTrade: false, reason: 'Fechado（15:00 fechar）' }
  }
  return { canTrade: true, reason: null }
}

/**
 * chegar perto N sequência de data da transação（pular fim de semana + Feriados legais chineses，Apoiar dias de folga e compensar dias de trabalho）。
 * de tradeDate Comece a olhar para trás a partir do dia atual。
 * [L10] usar while Tampa fixa de substituição de loop，Garantir que os feriados prolongados possam ser rastreados corretamente。
 *
 * v1.35.0 [A1-P0-3] Carregamento lento da véspera de Ano Novo：Se você encontrar um ano que não está carregado no cache online ao retroceder,，Acionar o carregamento do cache de disco
 * （Não bloqueando：Se o carregamento falhar, ainda será feito o downgrade para dados estáticos）。
 */
export function getRecentTradeDates(tradeDate: string, count: number): string[] {
  const dates: string[] = []
  const current = new Date(tradeDate)
  const MAX_ITERATIONS = Math.max(count * 5, 30) // limite superior de segurança，Pelo menos 30 Segunda categoria（Cobrindo o Dia Nacional e outros feriados prolongados）
  const triedLoadYears = new Set<number>() // Evite tentativas repetidas de carregar o mesmo ano

  let iterations = 0
  while (dates.length < count && iterations < MAX_ITERATIONS) {
    iterations++
    const year = current.getFullYear()
    // v1.35.0 [A1-P0-3] Carregamento lento：Quando o ano não está no cache online，Acionar carregamento de disco（fire-and-forget，Não bloqueia o loop principal）
    if (!onlineTradeDatesCache.has(year) && !triedLoadYears.has(year)) {
      triedLoadYears.add(year)
      // Carregar cache de disco de forma assíncrona，Esta chamada ainda usa dados estáticos，Mas vai acontecer na próxima vez que você ligar
      loadOnlineCacheFromDisk(year).catch(() => { /* Falha silenciosamente */ })
    }
    const dateStr = formatDateStr(current)
    if (isTradingDay(current)) {
      dates.push(dateStr)
    }
    current.setDate(current.getDate() - 1)
  }

  return dates
}
