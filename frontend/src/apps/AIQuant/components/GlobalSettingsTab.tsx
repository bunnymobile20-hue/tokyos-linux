import { useEffect, useState } from 'react'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'

import { saveStockAnalysisConfig } from '../api'
import type { StockAnalysisStrategyConfig } from '../types'

export function GlobalSettingsTab({
  config,
  actionLoading,
  onConfigSaved,
  onToast,
}: {
  config: StockAnalysisStrategyConfig | null
  actionLoading: boolean
  onConfigSaved: (config: StockAnalysisStrategyConfig) => void
  onToast: (tone: 'success' | 'error', message: string) => void
}) {
  const [intradayAutoCloseLossPercent, setIntradayAutoCloseLossPercent] = useState('5')
  const [intradayAutoCloseProfitPercent, setIntradayAutoCloseProfitPercent] = useState('10')
  const [maxDailyLossPercent, setMaxDailyLossPercent] = useState('10')
  const [maxWeeklyLossPercent, setMaxWeeklyLossPercent] = useState('20')
  const [maxMonthlyLossPercent, setMaxMonthlyLossPercent] = useState('30')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    setIntradayAutoCloseLossPercent(String(config.intradayAutoCloseLossPercent))
    setIntradayAutoCloseProfitPercent(String(config.intradayAutoCloseProfitPercent ?? 10))
    setMaxDailyLossPercent(String(config.portfolioRiskLimits?.maxDailyLossPercent ?? 10))
    setMaxWeeklyLossPercent(String(config.portfolioRiskLimits?.maxWeeklyLossPercent ?? 20))
    setMaxMonthlyLossPercent(String(config.portfolioRiskLimits?.maxMonthlyLossPercent ?? 30))
  }, [config])

  async function handleSave() {
    const parsedIntraday = Number(intradayAutoCloseLossPercent)
    const parsedIntradayProfit = Number(intradayAutoCloseProfitPercent)
    const parsedDaily = Number(maxDailyLossPercent)
    const parsedWeekly = Number(maxWeeklyLossPercent)
    const parsedMonthly = Number(maxMonthlyLossPercent)
    if (!Number.isFinite(parsedIntraday) || parsedIntraday <= 0 || parsedIntraday > 100) {
      onToast('error', 'O limite de perda de liquidação automática intradiária deve estar dentro 0 chegar 100 entre')
      return
    }
    if (!Number.isFinite(parsedIntradayProfit) || parsedIntradayProfit <= 0 || parsedIntradayProfit > 100) {
      onToast('error', 'O limite de lucro automático intradiário deve estar dentro 0 chegar 100 entre')
      return
    }
    if (!Number.isFinite(parsedDaily) || parsedDaily <= 0 || parsedDaily > 100) {
      onToast('error', 'O limite diário de suspensão de perdas deve estar dentro 0 chegar 100 entre')
      return
    }
    if (!Number.isFinite(parsedWeekly) || parsedWeekly <= 0 || parsedWeekly > 100) {
      onToast('error', 'O limite semanal de suspensão de perdas deve estar dentro 0 chegar 100 entre')
      return
    }
    if (!Number.isFinite(parsedMonthly) || parsedMonthly <= 0 || parsedMonthly > 100) {
      onToast('error', 'O limite mensal de suspensão de perdas deve estar dentro 0 chegar 100 entre')
      return
    }
    setSaving(true)
    try {
      const nextConfig = await saveStockAnalysisConfig({
        intradayAutoCloseLossPercent: parsedIntraday,
        intradayAutoCloseProfitPercent: parsedIntradayProfit,
        portfolioRiskLimits: {
          maxDailyLossPercent: parsedDaily,
          maxWeeklyLossPercent: parsedWeekly,
          maxMonthlyLossPercent: parsedMonthly,
        },
      })
      onConfigSaved(nextConfig)
      onToast('success', 'Configurações globais salvas')
    } catch (error) {
      onToast('error', `Falha ao salvar as configurações globais: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Configurações globais</h2>
          <p className="mt-1 text-sm text-slate-500">Configuração AI Comportamento geral da negociação de ações。Esta página é usada para colocar parâmetros em nível de sistema que não pertencem a um único sinal ou modelo.。</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700">
          Configuração de back-end efetiva atual
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-900 p-2 text-white">
            <Cog6ToothIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Fechamento intradiário automático</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Efetivo apenas durante o período de lances contínuos no dia de negociação。Quando a perda ou lucro em tempo real de uma posição atinge o limite，O sistema fechará automaticamente a posição e venderá durante a pesquisa de rastreamento.。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-500">Limite de stop loss automático (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={intradayAutoCloseLossPercent}
                onChange={(event) => setIntradayAutoCloseLossPercent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-500">Limite de lucro automático (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={intradayAutoCloseProfitPercent}
                onChange={(event) => setIntradayAutoCloseProfitPercent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 md:col-span-2">
            <div className="font-semibold text-slate-800">Descrição atual</div>
            <div className="mt-2 leading-6">
              Quando a perda intradiária de uma posição for menor ou igual a <span className="font-bold text-red-600">-{intradayAutoCloseLossPercent || '0'}%</span>，ou lucro maior ou igual a <span className="font-bold text-emerald-600">+{intradayAutoCloseProfitPercent || '0'}%</span> hora，O sistema fechará automaticamente todas as posições。
              pausa para almoço、depois de fechar、A venda automática não será acionada nos finais de semana e feriados oficiais.。
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400">Ambos os limites pertencem a“Forçar saída automaticamente durante o período de rastreamento”regra，e exibir Stop Loss na página de sinal/Os preços de lucro são diferentes。</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-600 p-2 text-white">
            <Cog6ToothIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">Limite de suspensão de perda de portfólio</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Esses limites controlam os limites para novas aberturas no nível do portfólio。Depois de atingir o limite，O sistema suspenderá a adição de novos riscos，Mas você ainda pode fechar ou reduzir o risco de sair de uma posição。Os valores padrão são dia e dia respectivamente 10%、Semanalmente 20%、mensal 30%。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-500">Limite diário de suspensão de perdas (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={maxDailyLossPercent}
                onChange={(event) => setMaxDailyLossPercent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-500">Limite semanal de suspensão de perdas (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={maxWeeklyLossPercent}
                onChange={(event) => setMaxWeeklyLossPercent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-500">Limite mensal de suspensão de perdas (%)</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={maxMonthlyLossPercent}
                onChange={(event) => setMaxMonthlyLossPercent(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="text-sm font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">Descrição atual</div>
            <div className="mt-2 leading-6">
              quando perto 22 A perda acumulada realizada em dias de negociação é menor ou igual a <span className="font-bold text-rose-600">-{maxMonthlyLossPercent || '0'}%</span> hora，O sistema suspende novos cargos。
              As posições existentes ainda permitem fechar manualmente a posição ou reduzir o risco de sair da posição；O status de pausa atual será recalculado imediatamente após salvar.。
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 md:col-span-3">
            <div className="font-semibold text-slate-800">Descrição atual</div>
            <div className="mt-2 leading-6">
              Alcance diário <span className="font-bold text-rose-600">-{maxDailyLossPercent || '0'}%</span>、alcançado semanalmente <span className="font-bold text-rose-600">-{maxWeeklyLossPercent || '0'}%</span>、Alcançado mensalmente <span className="font-bold text-rose-600">-{maxMonthlyLossPercent || '0'}%</span> hora，Novos cargos serão suspensos。
              O status atual do controle de risco será recalculado imediatamente após salvar.；As posições existentes ainda podem ser fechadas ou reduzidas manualmente.。
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400">“Fechamento intradiário automático”Stop loss rápido para gerenciamento de ticket único；“dia/semana/Perdas mensais suspensas”Portão de abertura de nível de combinação de tubo。Os dois têm responsabilidades diferentes，Não misture。</p>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || actionLoading || !config}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </section>
    </div>
  )
}
