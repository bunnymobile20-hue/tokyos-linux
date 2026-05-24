/**
 * Módulo de registro de front-end — buffer + Relatórios em lote para o back-end
 *
 * Responsabilidades：
 * 1. fornecer frontendLog.debug/info/warn/error método
 * 2. entradas de log de buffer，Informar automaticamente quando o limite for atingido ou programado.
 * 3. Relatório POST /api/system/stock-analysis/client-log
 * 4. Relatar falha e downgrade silencioso（Não afeta as operações do usuário）
 * 5. Capture o panorama geral unhandledrejection / error evento
 */

import { withBasePath } from './basePath'

// ==================== definição de tipo ====================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface FrontendLogEntry {
  timestamp: string
  component: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  userAgent?: string
}

// ==================== estado interno ====================

let buffer: FrontendLogEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let isFlushing = false

const BUFFER_SIZE = 20
const FLUSH_INTERVAL_MS = 10_000
const MAX_MESSAGE_LENGTH = 2000

// ==================== método principal ====================

function pushEntry(level: LogLevel, component: string, message: string, data?: Record<string, unknown>): void {
  const entry: FrontendLogEntry = {
    timestamp: new Date().toISOString(),
    component,
    level,
    message: message.slice(0, MAX_MESSAGE_LENGTH),
    data,
    userAgent: navigator.userAgent,
  }

  buffer.push(entry)

  // Informar imediatamente quando o limite for atingido
  if (buffer.length >= BUFFER_SIZE) {
    flush()
  }
}

async function flush(): Promise<void> {
  if (isFlushing || buffer.length === 0) return

  const entries = buffer
  buffer = []
  isFlushing = true

  try {
    const response = await fetch(withBasePath('/api/system/stock-analysis/client-log'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    })
    if (!response.ok) {
      // Downgrade silencioso：Relatar falha sem lançar exceção
      console.warn(`[frontendLog] Falha no relatório de registro: HTTP ${response.status}`)
    }
  } catch {
    // Downgrade silencioso de erro de rede
    console.warn('[frontendLog] Registrar erros de rede de relatórios')
  } finally {
    isFlushing = false
  }
}

function ensureFlushTimer(): void {
  if (flushTimer !== null) return
  flushTimer = setInterval(() => {
    flush()
  }, FLUSH_INTERVAL_MS)
}

// ==================== público API ====================

export const frontendLog = {
  debug(component: string, message: string, data?: Record<string, unknown>): void {
    pushEntry('debug', component, message, data)
  },

  info(component: string, message: string, data?: Record<string, unknown>): void {
    pushEntry('info', component, message, data)
  },

  warn(component: string, message: string, data?: Record<string, unknown>): void {
    pushEntry('warn', component, message, data)
  },

  error(component: string, message: string, data?: Record<string, unknown>): void {
    pushEntry('error', component, message, data)
  },

  /** Acionar relatórios manualmente（Como ligar antes do descarregamento da página） */
  flush,
}

// ==================== captura de erro global ====================

/** Inicialize o monitoramento de erros globais，Deve ser chamado uma vez na entrada do aplicativo */
export function initFrontendLogger(): void {
  ensureFlushTimer()

  // Captura não processada Promise rejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message = reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : String(reason)
    frontendLog.error('global', `Unhandled rejection: ${message}`, {
      stack: reason instanceof Error ? reason.stack : undefined,
    })
  })

  // Capture o panorama geral JS erro
  window.addEventListener('error', (event) => {
    // Ignorar erros de carregamento de recursos（img/script/css），capturar apenas JS erro de tempo de execução
    if (event.target && event.target !== window) return
    frontendLog.error('global', `Uncaught error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    })
  })

  // Tente enviar os logs restantes antes do descarregamento da página
  window.addEventListener('beforeunload', () => {
    if (buffer.length === 0) return
    // usar sendBeacon Garanta que os logs possam ser enviados mesmo quando a página estiver fechada
    try {
      navigator.sendBeacon(
        withBasePath('/api/system/stock-analysis/client-log'),
        JSON.stringify(buffer),
      )
      buffer = []
    } catch {
      // Downgrade silencioso
    }
  })

  frontendLog.info('global', 'Frontend logger initialized')
}
