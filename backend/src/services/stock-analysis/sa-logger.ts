/**
 * Stock Analysis — Módulo de log local unificado
 *
 * Responsabilidades：
 * 1. Divida os registros de negócios por dia（stock-analysis-YYYY-MM-DD.log）
 * 2. LLM Registro completo da chamada（llm-calls-YYYY-MM-DD.jsonl）
 * 3. Log de relatório de front-end（frontend-YYYY-MM-DD.log）
 * 4. Registro de auditoria（Principais eventos em operações comerciais，Compatível com antigo appendStockAnalysisLog）
 * 5. Todas as falhas de gravação de log não afetam os negócios
 * 6. Limpeza automática 30 Registros de dias atrás
 *
 * Diretório de registros：$stockAnalysisDir/logs/
 */

import fs from 'fs/promises'
import path from 'path'

import { logger } from '../../utils/logger'

// ==================== definição de tipo ====================

export type SALogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LLMCallLogEntry {
  /** ISO Carimbo de data e hora */
  timestamp: string
  /** módulo de origem: inference | extraction | memory */
  module: string
  /** identificação do modelo */
  model: string
  /** fornecedor ID */
  providerId: string
  /** Nome do especialista/Agent nome */
  agentName: string
  /** todo prompt（system + user） */
  prompt: { system: string; user: string }
  /** original response contente */
  response: string | null
  /** reasoning_content（se houver） */
  reasoningContent?: string | null
  /** atraso de chamada（milissegundo） */
  latencyMs: number
  /** token Dosagem */
  tokens?: { prompt?: number; completion?: number; total?: number }
  /** Foi bem-sucedido? */
  success: boolean
  /** Razão do fracasso */
  error?: string
  /** tags extras */
  tags?: Record<string, unknown>
}

export interface FrontendLogEntry {
  /** ISO Carimbo de data e hora（Hora local do front-end） */
  timestamp: string
  /** componente de origem */
  component: string
  /** Nível de registro */
  level: SALogLevel
  /** Informação */
  message: string
  /** dados extras */
  data?: Record<string, unknown>
  /** usuário Agent */
  userAgent?: string
}

// ==================== estado interno ====================

let logsDir = ''
const LOG_RETENTION_DAYS = 30
const LOG_TOTAL_SIZE_LIMIT_BYTES = 128 * 1024 * 1024
const MODULE_TAG = 'SALogger'
let lastCleanupStartedAt = 0

// ==================== Função utilitária ====================

function shanghaiDate(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Shanghai' })
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatLine(level: SALogLevel, module: string, message: string): string {
  return `[${nowIso()}] [${module}] [${level.toUpperCase()}] ${message}\n`
}

function triggerCleanupIfNeeded(): void {
  const now = Date.now()
  if (!logsDir || now - lastCleanupStartedAt < 60 * 60 * 1000) {
    return
  }
  lastCleanupStartedAt = now
  cleanupOldLogs().catch((err) => {
    logger.warn(`Falha na limpeza do log em segundo plano: ${(err as Error).message}`, { module: MODULE_TAG })
  })
}

/** Escrita segura de anexos，As falhas são registradas apenas para Winston Não lance exceção */
async function safeAppend(filePath: string, content: string): Promise<void> {
  try {
    await fs.appendFile(filePath, content, 'utf8')
  } catch (err) {
    logger.error(`Falha na gravação do registro: ${filePath} — ${(err as Error).message}`, { module: MODULE_TAG })
  }
}

/** A segurança garante que o diretório exista */
async function ensureLogsDir(): Promise<void> {
  if (!logsDir) return
  try {
    await fs.mkdir(logsDir, { recursive: true })
  } catch {
    // negligência — Seguir appendFile Relatará o erro novamente
  }
}

// ==================== Caminho do arquivo de log ====================

function businessLogPath(date: string): string {
  return path.join(logsDir, `stock-analysis-${date}.log`)
}

function llmCallLogPath(date: string): string {
  return path.join(logsDir, `llm-calls-${date}.jsonl`)
}

function frontendLogPath(date: string): string {
  return path.join(logsDir, `frontend-${date}.log`)
}

// ==================== inicialização ====================

/**
 * Inicializar diretório de log。Deve ser chamado uma vez quando o serviço for iniciado。
 * @param stockAnalysisDir como /home/user/documento/AIAnálise de negociação de ações
 */
export async function initSALogger(stockAnalysisDir: string): Promise<void> {
  logsDir = path.join(stockAnalysisDir, 'logs')
  await ensureLogsDir()
  logger.info(`SA O módulo de log foi inicializado: ${logsDir}`, { module: MODULE_TAG })

  // Limpar logs antigos de forma assíncrona，Comece sem bloquear
  cleanupOldLogs().catch((err) => {
    logger.warn(`Falha ao limpar registros antigos: ${(err as Error).message}`, { module: MODULE_TAG })
  })
}

// ==================== Métodos principais de registro ====================

/**
 * Escreva o registro comercial（Dividir por dia）
 * Escreva simultaneamente Winston（manter o comportamento antigo）e arquivos locais
 */
function writeBusinessLog(level: SALogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  if (!logsDir) {
    // Quando não inicializado，Apenas espelho error/warn chegar Winston，Evite a gravação dupla de logs de negócios para backend-out.log
    mirrorToWinston(level, module, message, data)
    return
  }

  const date = shanghaiDate()
  const line = data
    ? formatLine(level, module, `${message} | ${JSON.stringify(data)}`)
    : formatLine(level, module, message)

  triggerCleanupIfNeeded()

  // Gravar de forma assíncrona no arquivo local（Não bloqueia o chamador）
  safeAppend(businessLogPath(date), line)

  // apenas warn/error espelho para Winston，Evite escrever o mesmo registro comercial novamente backend-out.log
  mirrorToWinston(level, module, message, data)
}

function mirrorToWinston(level: SALogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  if (level !== 'warn' && level !== 'error') {
    return
  }
  const winstonLevel = level
  const payload = data ? `${message} | ${JSON.stringify(data)}` : message
  logger.log(winstonLevel, payload, { module })
}

// ==================== público API ====================

export const saLog = {
  debug(module: string, message: string, data?: Record<string, unknown>): void {
    writeBusinessLog('debug', module, message, data)
  },

  info(module: string, message: string, data?: Record<string, unknown>): void {
    writeBusinessLog('info', module, message, data)
  },

  warn(module: string, message: string, data?: Record<string, unknown>): void {
    writeBusinessLog('warn', module, message, data)
  },

  error(module: string, message: string, data?: Record<string, unknown>): void {
    writeBusinessLog('error', module, message, data)
  },

  /**
   * Registro de auditoria — Principais eventos em operações comerciais（Compatível com antigo appendStockAnalysisLog）
   * Escreva simultaneamente logs de negócios e Winston
   */
  audit(module: string, message: string): void {
    writeBusinessLog('info', module, `[AUDIT] ${message}`)
  },

  /**
   * LLM Registro completo da chamada — escrever JSONL documento
   * um por linha JSON，Conveniente para acompanhamento grep/jq analisar
   */
  async llmCall(entry: LLMCallLogEntry): Promise<void> {
    if (!logsDir) return
    const date = shanghaiDate()
    const line = JSON.stringify(entry) + '\n'
    triggerCleanupIfNeeded()
    await safeAppend(llmCallLogPath(date), line)
  },

  /**
   * Log de relatório de front-end
   */
  async frontendLog(entries: FrontendLogEntry[]): Promise<void> {
    if (!logsDir || entries.length === 0) return
    const date = shanghaiDate()
    const lines = entries.map((e) =>
      `[${e.timestamp}] [${e.component}] [${e.level.toUpperCase()}] ${e.message}${e.data ? ' | ' + JSON.stringify(e.data) : ''}\n`
    ).join('')
    triggerCleanupIfNeeded()
    await safeAppend(frontendLogPath(date), lines)
  },
}

// ==================== Limpeza de registros ====================

/**
 * Limpe mais do que LOG_RETENTION_DAYS arquivos de registro diário
 */
async function cleanupOldLogs(): Promise<void> {
  if (!logsDir) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS)

  let entries: string[]
  try {
    entries = await fs.readdir(logsDir)
  } catch {
    return
  }

  const datePattern = /(\d{4}-\d{2}-\d{2})/
  let cleaned = 0
  const retainedFiles: Array<{ filePath: string; name: string; size: number; mtimeMs: number }> = []

  for (const entry of entries) {
    const filePath = path.join(logsDir, entry)
    let stat
    try {
      stat = await fs.stat(filePath)
    } catch {
      continue
    }
    if (!stat.isFile()) {
      continue
    }

    if (entry === 'stock-analysis-debug.log') {
      try {
        await fs.unlink(filePath)
        cleaned++
      } catch {
        // Ignorar falha na exclusão de arquivo único
      }
      continue
    }

    const match = entry.match(datePattern)
    const fileDate = match ? new Date(match[1]) : new Date(stat.mtimeMs)
    if (!isNaN(fileDate.getTime()) && fileDate < cutoff) {
      try {
        await fs.unlink(filePath)
        cleaned++
      } catch {
        // Ignorar falha na exclusão de arquivo único
      }
      continue
    }

    retainedFiles.push({ filePath, name: entry, size: stat.size, mtimeMs: stat.mtimeMs })
  }

  let totalSize = retainedFiles.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > LOG_TOTAL_SIZE_LIMIT_BYTES) {
    const byOldestFirst = [...retainedFiles].sort((left, right) => left.mtimeMs - right.mtimeMs)
    for (const file of byOldestFirst) {
      if (totalSize <= LOG_TOTAL_SIZE_LIMIT_BYTES) {
        break
      }
      try {
        await fs.unlink(file.filePath)
        totalSize -= file.size
        cleaned++
      } catch {
        // Ignorar falha na exclusão de arquivo único
      }
    }
  }

  if (cleaned > 0) {
    logger.info(
      `Limpo ${cleaned} arquivos de registro（reserva ${LOG_RETENTION_DAYS} céu，Limite total ${Math.round(LOG_TOTAL_SIZE_LIMIT_BYTES / 1024 / 1024)}MB）`,
      { module: MODULE_TAG },
    )
  }
}

export const _testing = {
  cleanupOldLogs,
  triggerCleanupIfNeeded,
  businessLogPath,
  llmCallLogPath,
  frontendLogPath,
  LOG_RETENTION_DAYS,
  LOG_TOTAL_SIZE_LIMIT_BYTES,
}

// ==================== velho API compatível ====================

/**
 * Compatível com mais antigos appendStockAnalysisLog chamar
 * @deprecated Por favor use saLog.audit() substituir
 */
export async function appendStockAnalysisLog(stockAnalysisDir: string, message: string): Promise<void> {
  // Verificação de inicialização
  if (!logsDir) {
    logsDir = path.join(stockAnalysisDir, 'logs')
    await ensureLogsDir()
  }
  saLog.audit('Service', message)
}
