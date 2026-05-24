import type { StockAnalysisOverview, StockAnalysisStrategyConfig } from '../types'
import {
  buildCumulativeReturnChartData,
  buildDrawdownChartData,
  buildWeeklyDashboardSummary,
  buildWeeklyReturnChartData,
  buildWinRateChartData,
  formatModelGroupLabel,
  watchOutcomeLabel,
} from '../dashboardMeta'
import { formatPercent, getHoldingDaysFromOpenedAt, percentTone } from '../utils'
import { MiniBarChart, MiniLineChart } from './MiniChart'

/* ── Cartão indicador compacto ── */
function KPICell({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="px-3 py-2 min-w-0">
      <div className="text-[11px] text-slate-400 leading-tight truncate">{label}</div>
      <div className={`text-sm font-bold leading-snug mt-0.5 ${valueClass ?? 'text-slate-800'}`}>{value}</div>
      {sub ? <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{sub}</div> : null}
    </div>
  )
}

/* ── linha compacta ── */
function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium ${valueClass ?? 'text-slate-700'}`}>{value}</span>
    </div>
  )
}

export function MemoryTab({ overview, config }: { overview: StockAnalysisOverview; config: StockAnalysisStrategyConfig | null }) {
  const wd = buildWeeklyDashboardSummary(overview, config)
  const monthlySummary = Array.isArray((overview as unknown as { monthlySummary?: unknown }).monthlySummary)
    ? (overview as unknown as { monthlySummary: typeof overview.monthlySummary }).monthlySummary
    : []

  const cumulativeReturnData = buildCumulativeReturnChartData(overview)
  const drawdownData = buildDrawdownChartData(overview)
  const winRateData = buildWinRateChartData(overview)
  const weeklyReturnData = buildWeeklyReturnChartData(overview)
  const hasChartData = cumulativeReturnData.length >= 2

  function tradeTimeSummary(trade: typeof overview.recentTrades[number]) {
    if (trade.action === 'buy') {
      const buyAt = trade.buyDate ?? trade.tradeDate
      return `${new Date(buyAt).toLocaleDateString('zh-CN')}`
    }
    const buyAt = trade.buyDate ? new Date(trade.buyDate).toLocaleDateString('zh-CN') : '?'
    const sellAt = trade.sellDate ?? trade.tradeDate
    return `${buyAt} → ${new Date(sellAt).toLocaleDateString('zh-CN')}`
  }

  function tradeHoldingDays(trade: typeof overview.recentTrades[number]) {
    const buyAt = trade.buyDate ?? trade.tradeDate
    const endAt = trade.sellDate ?? trade.tradeDate
    return getHoldingDaysFromOpenedAt(buyAt, new Date(endAt))
  }

  const latestWeek = overview.weeklySummary[0]

  return (
    <div className="space-y-2 pb-16">
      {/* ── título + KPI tira ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Memória e revisão</h2>
        {latestWeek ? <span className="text-xs text-slate-400">último relatório semanal: {latestWeek.weekLabel}</span> : null}
      </div>

      <div className="bg-white/70 border border-slate-200/60 rounded-xl shadow-sm flex divide-x divide-slate-100">
        <KPICell label="Renda acumulada" value={formatPercent(wd.cumulativeReturn)} valueClass={percentTone(wd.cumulativeReturn)} />
        <KPICell label="taxa de vitórias" value={`${Math.round(wd.winRate * 100)}%`} />
        <KPICell label="relação lucro-perda" value={wd.profitLossRatio > 0 ? `${wd.profitLossRatio.toFixed(2)}:1` : '—'} />
        <KPICell label="alternativa afiada" value={wd.sharpeLike.toFixed(2)} />
        <KPICell label="rebaixamento máximo" value={formatPercent(wd.maxDrawdown)} valueClass={percentTone(wd.maxDrawdown)} />
        <KPICell label="Espere e veja a precisão" value={`${Math.round(wd.watchAccuracy * 100)}%`} />
        {wd.overrideCount > 0 ? (
          <KPICell
            label="julgamento subjetivo"
            value={`${wd.overrideCount}Caneta`}
            sub={wd.overrideWinRate !== null ? `${Math.round(wd.overrideWinRate * 100)}%taxa de vitórias` : undefined}
          />
        ) : null}
      </div>

      {/* ── corpo principal：Esquerda 3/5 + certo 2/5 ── */}
      <div className="grid grid-cols-5 gap-2">
        {/* ─── coluna da esquerda ─── */}
        <div className="col-span-3 space-y-2">
          {/* Desempenho semanal + Sugestões de alerta precoce */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm">
              <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Desempenho semanal</h4>
              <Row label="Negociações da semana" value={`${wd.tradeCount} Caneta`} />
              <Row label="Espere e veja esta semana" value={`${wd.watchDays} céu`} />
              <Row label="renda semanal" value={formatPercent(wd.weeklyReturn)} valueClass={percentTone(wd.weeklyReturn)} />
              <Row label="Renda acumulada" value={formatPercent(wd.cumulativeReturn)} valueClass={percentTone(wd.cumulativeReturn)} />
              <Row label="rebaixamento máximo" value={formatPercent(wd.maxDrawdown)} valueClass={percentTone(wd.maxDrawdown)} />
              <Row label="melhor grupo de modelos" value={wd.bestGroup ?? '—'} />
              <Row label="grupo de modelo mais fraco" value={wd.worstGroup ?? '—'} />
              {wd.overrideCount > 0 ? (
                <Row label="Equalização subjetiva" value={wd.overrideAvgReturn !== null ? formatPercent(wd.overrideAvgReturn) : '—'} valueClass={wd.overrideAvgReturn !== null ? percentTone(wd.overrideAvgReturn) : undefined} />
              ) : null}
            </div>

            <div className="bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm flex flex-col gap-2">
              <div>
                <h4 className="text-xs font-semibold text-amber-600 mb-1">aviso prévio</h4>
                <div className="text-xs text-slate-600 space-y-0.5">
                  {wd.alerts.length > 0 ? wd.alerts.map((a) => <p key={a} className="leading-snug">· {a}</p>) : <p className="text-slate-400">Sem aviso</p>}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-indigo-600 mb-1">Ajuste de parâmetro recomendado</h4>
                <div className="text-xs text-slate-600 space-y-0.5">
                  {wd.tuningSuggestions.length > 0 ? wd.tuningSuggestions.map((s) => <p key={s} className="leading-snug">· {s}</p>) : <p className="text-slate-400">Não há necessidade de ajustar parâmetros</p>}
                </div>
              </div>
            </div>
          </div>

          {/* gráfico de desempenho 2x2 */}
          {hasChartData ? (
            <div className="grid grid-cols-2 gap-2">
              <MiniLineChart data={cumulativeReturnData} title="Renda acumulada" strokeColor="#4f46e5" fillColor="rgba(79,70,229,0.08)" showZeroLine />
              <MiniLineChart data={drawdownData} title="rebaixamento máximo" strokeColor="#ef4444" fillColor="rgba(239,68,68,0.08)" showZeroLine />
              <MiniLineChart data={winRateData} title="Tendência da taxa de vitórias" strokeColor="#10b981" fillColor="rgba(16,185,129,0.08)" formatValue={(v) => `${v.toFixed(0)}%`} />
              <MiniBarChart data={weeklyReturnData} title="Ganhos semanais" positiveColor="#ef4444" negativeColor="#22c55e" />
            </div>
          ) : null}
        </div>

        {/* ─── coluna da direita ─── */}
        <div className="col-span-2 space-y-2">
          {/* Cartão semanal mais recente */}
          {latestWeek ? (
            <div className="bg-indigo-600 text-white rounded-xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold opacity-80">último relatório semanal</h4>
                <span className="text-sm font-bold">{latestWeek.weekLabel}</span>
              </div>
              <div className="flex gap-4 text-xs opacity-80">
                <span>renda <strong className="text-white">{formatPercent(latestWeek.weeklyReturn)}</strong></span>
                <span>taxa de vitórias <strong className="text-white">{Math.round(latestWeek.winRate * 100)}%</strong></span>
                <span>troca <strong className="text-white">{latestWeek.tradeCount}Caneta</strong></span>
              </div>
            </div>
          ) : null}

          {/* resumo mensal */}
          <div className="bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-600 mb-1.5">resumo mensal</h4>
            {monthlySummary.length > 0 ? (
              <div className="space-y-1">
                {monthlySummary.slice(0, 4).map((m) => (
                  <div key={m.monthLabel} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0">
                    <div>
                      <span className="text-xs font-medium text-slate-700">{m.monthLabel}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{m.tradeCount}Caneta · espere e veja{m.watchDays}céu</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${percentTone(m.monthlyReturn)}`}>{formatPercent(m.monthlyReturn)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">cansado{formatPercent(m.cumulativeReturn)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Ainda não há dados mensais</p>}
          </div>

          {/* transações recentes */}
          <div className="bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm">
            <h4 className="text-xs font-semibold text-slate-600 mb-1.5">transações recentes</h4>
            {overview.recentTrades.length > 0 ? (
              <div className="space-y-1 max-h-[260px] overflow-y-auto">
                {overview.recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${trade.action === 'buy' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {trade.action === 'buy' ? 'comprar' : 'Vender'}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">{trade.name}</span>
                        <span className="text-[10px] text-slate-400">{trade.code}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {tradeTimeSummary(trade)} · {Math.round((trade.weight ?? 0) * 100)}%armazém · {tradeHoldingDays(trade)}céu
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-slate-700">{trade.price.toFixed(2)}</div>
                      {typeof trade.pnlPercent === 'number' ? (
                        <div className={`text-[10px] font-bold ${percentTone(trade.pnlPercent)}`}>{formatPercent(trade.pnlPercent)}</div>
                      ) : (
                        <div className="text-[10px] text-slate-400">{Math.round(trade.weight * 100)}%armazém</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Nenhuma transação ainda</p>}
          </div>
        </div>
      </div>

      {/* ── fundo：grupo de modelos + Espere e veja o registro lado a lado ── */}
      <div className="grid grid-cols-5 gap-2">
        {/* Desempenho do grupo modelo */}
        <div className="col-span-3 bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm">
          <h4 className="text-xs font-semibold text-slate-600 mb-1.5">
            Desempenho do grupo modelo
            {overview.modelGroupPerformance.every((g) => g.isSimulated) ? (
              <span className="text-[10px] text-amber-500 font-normal ml-1.5">（Estatísticas do mecanismo de regras）</span>
            ) : null}
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase">
                <th className="text-left py-1 font-medium">grupo de modelos</th>
                <th className="text-right py-1 font-medium">prever</th>
                <th className="text-right py-1 font-medium">taxa de vitórias</th>
                <th className="text-right py-1 font-medium">calibração</th>
                <th className="text-right py-1 font-medium">peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {overview.modelGroupPerformance.map((g) => (
                <tr key={g.group}>
                  <td className="py-1 text-slate-700 font-medium">{formatModelGroupLabel(g.group, g.displayName)}</td>
                  <td className="py-1 text-right text-slate-500">{g.predictionCount}</td>
                  <td className="py-1 text-right font-bold text-red-600">{Math.round(g.winRate * 100)}%</td>
                  <td className="py-1 text-right text-slate-500">{g.calibration.toFixed(2)}</td>
                  <td className="py-1 text-right text-slate-500">
                    {g.weight.toFixed(2)}
                    {g.isSimulated ? <span className="text-[9px] text-amber-500 ml-0.5">regulamento</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Espere e veja o registro */}
        <div className="col-span-2 bg-white/70 border border-slate-200/60 rounded-xl p-2.5 shadow-sm">
          <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Espere e veja o registro</h4>
          {overview.watchLogs.length > 0 ? (
            <div className="space-y-1.5">
              {overview.watchLogs.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-slate-50 last:border-b-0 pb-1.5 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{item.tradeDate}</span>
                    <span className="text-[10px] text-slate-400">Mais alto {item.highestSignalScore}apontar</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{item.reason}</p>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span>T+1: {typeof item.tPlus1Return === 'number' ? formatPercent(item.tPlus1Return) : '—'}</span>
                    <span>T+5: {typeof item.tPlus5Return === 'number' ? formatPercent(item.tPlus5Return) : '—'}</span>
                    <span className="font-medium">{watchOutcomeLabel(item.outcome)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-400">Ainda não há registro de exibição</p>}
        </div>
      </div>
    </div>
  )
}
