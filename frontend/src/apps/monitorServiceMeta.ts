export interface MonitorServiceHealth {
  level: 'ok' | 'warning' | 'down' | 'unknown'
  summary: string
  detail?: string
}

export interface MonitorServiceWatchdogStatus {
  timestamp: string
  result: string
  message: string
}

export interface MonitorServiceItem {
  id: string
  name: string
  status: string
  isRunning: boolean
  description: string
  kind: 'core' | 'watchdog'
  health?: MonitorServiceHealth | null
  watchdogStatus?: MonitorServiceWatchdogStatus | null
}

export interface MonitorSummary {
  total: number
  highRisk: number
  warning: number
  healthy: number
}

export function getHealthLabel(health?: MonitorServiceHealth | null) {
  if (!health) {
    return { text: 'Não detectado', className: 'text-slate-500 bg-slate-100' }
  }

  switch (health.level) {
    case 'ok':
      return { text: 'Disponível', className: 'text-emerald-700 bg-emerald-50' }
    case 'warning':
      return { text: 'anormal', className: 'text-amber-700 bg-amber-50' }
    case 'down':
      return { text: 'Não disponível', className: 'text-red-700 bg-red-50' }
    default:
      return { text: 'desconhecido', className: 'text-slate-600 bg-slate-100' }
  }
}

export function getServiceRiskLabel(service: MonitorServiceItem) {
  if (service.kind === 'watchdog') {
    if (service.watchdogStatus?.result === 'failed') {
      return { text: 'alto risco', className: 'text-red-700 bg-red-50' }
    }

    if (service.watchdogStatus?.result === 'repairing' || service.watchdogStatus?.result === 'retrying') {
      return { text: 'Processamento', className: 'text-amber-700 bg-amber-50' }
    }

    return { text: 'baixo risco', className: 'text-slate-600 bg-slate-100' }
  }

  if (!service.isRunning || service.health?.level === 'down') {
    return { text: 'alto risco', className: 'text-red-700 bg-red-50' }
  }

  if (service.health?.level === 'warning') {
    return { text: 'risco médio', className: 'text-amber-700 bg-amber-50' }
  }

  return { text: 'baixo risco', className: 'text-slate-600 bg-slate-100' }
}

export function formatRelativeAge(timestamp?: string) {
  if (!timestamp) {
    return 'Ainda não há registro'
  }

  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) {
    return 'Hora desconhecida'
  }

  const diffMs = Date.now() - time
  if (diffMs < 60_000) {
    return 'apenas'
  }

  const diffMinutes = Math.floor(diffMs / 60_000)
  if (diffMinutes < 60) {
    return `${diffMinutes} minutos atrás`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} horas atrás`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} dias atrás`
}

export function isServiceAbnormal(service: MonitorServiceItem) {
  return getServiceSeverity(service) < 3
}

export function getServiceActionSuggestion(service: MonitorServiceItem) {
  if (service.kind === 'watchdog') {
    if (service.watchdogStatus?.result === 'failed') {
      return 'Recomenda-se verificar primeiro o registro de inspeção mais recente.，Confirme por que o reparo automático falhou。'
    }

    if (service.watchdogStatus?.result === 'repairing' || service.watchdogStatus?.result === 'retrying') {
      return 'O sistema está processando automaticamente，Se não se recuperar por muito tempo，Em seguida, verifique manualmente o serviço correspondente。'
    }

    return 'Atualmente não há risco significativo，Apenas continue observando。'
  }

  switch (service.id) {
    case 'clawos':
      return 'Recomenda-se confirmar primeiro ClawOS A interface da interface principal está acessível?，Reinicie se necessário clawos Servir。'
    case 'openclaw':
      return 'Recomenda-se verificar primeiro OpenClaw O gateway pode ser aberto?，Decida se deseja reiniciar AI Serviço de gateway。'
    case 'filebrowser':
      return 'Recomenda-se verificar se a página de gerenciamento de arquivos pode ser aberta primeiro，Pode ser reiniciado em caso de anormalidade FileBrowser Servir。'
    case 'aria2':
      return 'Recomenda-se verificar primeiro o mecanismo de download RPC se deve responder，Dê prioridade à reinicialização quando ocorrer anormalidade aria2 Baixar serviço。'
    case 'alist':
      return 'Recomenda-se verificar primeiro AList A interface de back-end está acessível?，Confirme o status de montagem do disco de rede novamente。'
    case 'display-inhibit':
      return 'Recomenda-se primeiro confirmar se a sessão remota atual está sujeita a tela preta ou tela de bloqueio.，O processo keep-alive pode ser reiniciado em caso de exceção。'
    default:
      if (!service.isRunning || service.health?.level === 'down') {
        return 'O serviço está indisponível no momento，Recomenda-se tentar reiniciar o serviço primeiro。'
      }

      if (service.health?.level === 'warning') {
        return 'O processo ainda está lá，Mas a detecção da função é anormal，Recomenda-se verificar primeiro a interface e os logs。'
      }

      return 'Atualmente não há risco significativo，Apenas continue observando。'
  }
}

export function buildMonitorSummary(services: MonitorServiceItem[]): MonitorSummary {
  return services.reduce<MonitorSummary>((summary, service) => {
    const severity = getServiceSeverity(service)
    summary.total += 1

    if (severity === 0) {
      summary.highRisk += 1
      return summary
    }

    if (severity === 1 || severity === 2) {
      summary.warning += 1
      return summary
    }

    summary.healthy += 1
    return summary
  }, {
    total: 0,
    highRisk: 0,
    warning: 0,
    healthy: 0
  })
}

function getServiceSeverity(service: MonitorServiceItem) {
  if (service.kind === 'watchdog') {
    switch (service.watchdogStatus?.result) {
      case 'failed':
        return 0
      case 'repairing':
      case 'retrying':
        return 1
      default:
        return 3
    }
  }

  if (!service.isRunning || service.health?.level === 'down') {
    return 0
  }

  if (service.health?.level === 'warning') {
    return 1
  }

  if (service.health?.level === 'unknown') {
    return 2
  }

  return 3
}

export function sortServicesBySeverity(services: MonitorServiceItem[]) {
  return [...services].sort((left, right) => {
    const severityDiff = getServiceSeverity(left) - getServiceSeverity(right)
    if (severityDiff !== 0) {
      return severityDiff
    }

    return left.name.localeCompare(right.name)
  })
}
