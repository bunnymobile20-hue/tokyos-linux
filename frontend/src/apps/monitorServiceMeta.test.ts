import test from 'node:test'
import assert from 'node:assert/strict'

import { buildMonitorSummary, formatRelativeAge, getHealthLabel, getServiceActionSuggestion, getServiceRiskLabel, isServiceAbnormal, sortServicesBySeverity, type MonitorServiceItem } from './monitorServiceMeta'

test('getHealthLabel maps warning health to user-facing copy', () => {
  assert.deepEqual(getHealthLabel({ level: 'warning', summary: 'Exceção de interface' }), {
    text: 'anormal',
    className: 'text-amber-700 bg-amber-50'
  })
})

test('getServiceRiskLabel marks stopped core service as high risk', () => {
  const service: MonitorServiceItem = {
    id: 'clawos',
    name: 'clawos.service',
    status: 'stopped',
    isRunning: false,
    description: 'Interface principal',
    kind: 'core',
    health: { level: 'down', summary: 'Não disponível' }
  }

  assert.deepEqual(getServiceRiskLabel(service), {
    text: 'alto risco',
    className: 'text-red-700 bg-red-50'
  })
})

test('sortServicesBySeverity brings unhealthy services to the top', () => {
  const services: MonitorServiceItem[] = [
    {
      id: 'ok',
      name: 'ok.service',
      status: 'running',
      isRunning: true,
      description: 'ok',
      kind: 'core',
      health: { level: 'ok', summary: 'normal' }
    },
    {
      id: 'warn',
      name: 'warn.service',
      status: 'running',
      isRunning: true,
      description: 'warn',
      kind: 'core',
      health: { level: 'warning', summary: 'anormal' }
    },
    {
      id: 'down',
      name: 'down.service',
      status: 'stopped',
      isRunning: false,
      description: 'down',
      kind: 'core',
      health: { level: 'down', summary: 'Não disponível' }
    }
  ]

  assert.deepEqual(sortServicesBySeverity(services).map((service) => service.id), ['down', 'warn', 'ok'])
})

test('formatRelativeAge returns friendly recent text', () => {
  const timestamp = new Date(Date.now() - 5 * 60_000).toISOString()
  assert.equal(formatRelativeAge(timestamp), '5 minutos atrás')
})

test('isServiceAbnormal detects warning service', () => {
  const service: MonitorServiceItem = {
    id: 'aria2',
    name: 'aria2',
    status: 'running',
    isRunning: true,
    description: 'mecanismo de download',
    kind: 'core',
    health: { level: 'warning', summary: 'anormal' }
  }

  assert.equal(isServiceAbnormal(service), true)
})

test('getServiceActionSuggestion returns service-specific guidance', () => {
  const service: MonitorServiceItem = {
    id: 'alist',
    name: 'alist',
    status: 'running',
    isRunning: true,
    description: 'Plano de fundo do netdisco',
    kind: 'core',
    health: { level: 'warning', summary: 'anormal' }
  }

  assert.match(getServiceActionSuggestion(service), /AList/)
})

test('buildMonitorSummary counts high-risk and warning services', () => {
  const services: MonitorServiceItem[] = [
    {
      id: 'down',
      name: 'down',
      status: 'stopped',
      isRunning: false,
      description: 'down',
      kind: 'core',
      health: { level: 'down', summary: 'Não disponível' }
    },
    {
      id: 'warn',
      name: 'warn',
      status: 'running',
      isRunning: true,
      description: 'warn',
      kind: 'core',
      health: { level: 'warning', summary: 'anormal' }
    },
    {
      id: 'ok',
      name: 'ok',
      status: 'running',
      isRunning: true,
      description: 'ok',
      kind: 'core',
      health: { level: 'ok', summary: 'normal' }
    }
  ]

  assert.deepEqual(buildMonitorSummary(services), {
    total: 3,
    highRisk: 1,
    warning: 1,
    healthy: 1
  })
})
