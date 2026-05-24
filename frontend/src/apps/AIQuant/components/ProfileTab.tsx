import {
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import type { StockAnalysisOverview, StockAnalysisLearnedWeights, StockAnalysisThresholdAdjustment } from '../types'
import { buildBehaviorProfileSummary } from '../dashboardMeta'
import { formatPercent, percentTone, sentimentLabel } from '../utils'
import {
  AdviceCard,
  MetricCard,
  ProgressRow,
  Tag,
} from './shared'

function LearnedWeightsPanel({ weights }: { weights: StockAnalysisLearnedWeights }) {
  const acc = weights.dimensionAccuracy
  const adj = weights.adjustmentFactors
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm">
      <h3 className="font-semibold text-slate-700 mb-2">Aprendendo o ajuste de peso (Phase 4.1)</h3>
      <p className="text-xs text-slate-500 mb-2">baseado em {weights.sampleCount} Precisão dimensional dos registros de revisão，Ajustar automaticamente os pesos de fusão</p>
      <div className="grid grid-cols-3 gap-3 text-sm mb-2">
        <MetricCard label="Precisão especializada" value={`${(acc.expert * 100).toFixed(1)}%`} />
        <MetricCard label="precisão técnica" value={`${(acc.technical * 100).toFixed(1)}%`} />
        <MetricCard label="Precisão quantitativa" value={`${(acc.quant * 100).toFixed(1)}%`} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <MetricCard label="compensação especializada" value={adj.expert > 0 ? `+${(adj.expert * 100).toFixed(1)}%` : `${(adj.expert * 100).toFixed(1)}%`} valueClassName={adj.expert > 0 ? 'text-emerald-600' : adj.expert < 0 ? 'text-red-500' : ''} />
        <MetricCard label="mudança tecnológica" value={adj.technical > 0 ? `+${(adj.technical * 100).toFixed(1)}%` : `${(adj.technical * 100).toFixed(1)}%`} valueClassName={adj.technical > 0 ? 'text-emerald-600' : adj.technical < 0 ? 'text-red-500' : ''} />
        <MetricCard label="Deslocamento de quantização" value={adj.quant > 0 ? `+${(adj.quant * 100).toFixed(1)}%` : `${(adj.quant * 100).toFixed(1)}%`} valueClassName={adj.quant > 0 ? 'text-emerald-600' : adj.quant < 0 ? 'text-red-500' : ''} />
      </div>
      <p className="text-xs text-slate-400 mt-2">atualizado em {new Date(weights.updatedAt).toLocaleDateString('zh-CN')}</p>
    </div>
  )
}

function ThresholdHistoryPanel({ adjustments }: { adjustments: StockAnalysisThresholdAdjustment[] }) {
  if (adjustments.length === 0) return null
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm">
      <h3 className="font-semibold text-slate-700 mb-2">Conviction Limite adaptativo (Phase 4.2)</h3>
      <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
        {adjustments.slice(0, 10).map((entry, index) => (
          <div key={index} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">{new Date(entry.timestamp).toLocaleDateString('zh-CN')}</span>
              <Tag text={entry.regime} tone={entry.adjustment < 0 ? 'green' : 'amber'} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600">taxa de vitórias {(entry.recentWinRate * 100).toFixed(0)}%</span>
              <span className={entry.adjustment < 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                {entry.previousMinCompositeScore} → {entry.newMinCompositeScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileTab({ overview }: { overview: StockAnalysisOverview }) {
  const behavior = buildBehaviorProfileSummary(overview)
  const caution = overview.stats.winRate < 0.5 || overview.stats.maxDrawdown < -8
  return (
    <div className="space-y-3 relative h-full pb-20">
      {caution ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <h2 className="text-base font-bold">Lembrete do sistema：A estratégia atual atravessa um período cauteloso</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">A taxa de vitória atual ou os indicadores de retração não são ideais，Recomenda-se reduzir acréscimos subjetivos de posição，Priorize a conformidade com as disciplinas de stop loss e esperar para ver。</p>
        </div>
      ) : null}

      <h2 className="text-xl font-bold text-slate-800">Perfil comportamental e diagnóstico</h2>

      <div className="grid grid-cols-3 gap-3">
        {/* coluna da esquerda：Retrato de execução + humor de risco */}
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Retrato de execução de estratégia</h3>
            <div className="space-y-2.5">
              <ProgressRow label="Taxa de vitórias do sistema" value={Math.round(overview.stats.winRate * 100)} colorClass="bg-red-500" />
              <ProgressRow label="Taxa de execução" value={Math.round(behavior.executionRate * 100)} colorClass="bg-indigo-500" />
              <ProgressRow label="Ignorar taxa" value={Math.round(behavior.ignoreRate * 100)} colorClass="bg-amber-500" />
              <ProgressRow label="taxa de reviravolta" value={Math.round(behavior.rejectRate * 100)} colorClass="bg-slate-500" />
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-2">Humor de risco atual</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <MetricCard label="pressão de retração" value={formatPercent(overview.stats.maxDrawdown)} valueClassName={percentTone(overview.stats.maxDrawdown)} />
              <MetricCard label="sentimento do mercado" value={sentimentLabel(overview.marketState.sentiment)} />
              <MetricCard label="Espere e veja a proporção" value={`${Math.round(behavior.watchRate * 100)}%`} />
              <MetricCard label="Pontos de disciplina" value={`${behavior.disciplineScore}/100`} />
            </div>
          </div>
        </div>

        {/* linha do meio：Recomendações do sistema */}
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-2">Recomendações do sistema</h3>
          <div className="space-y-2 text-sm">
            <AdviceCard tone="red" title="Disciplina de stop loss" content="Qualquer ação cai abaixo -3% Parada difícil，Priorize a execução em vez de cobrir posições。" />
            <AdviceCard tone="amber" title="Posições concentradas" content="apenas mantenha 1-3 Apenas os alvos mais fortes，Evite ser diluído por sinais de nível médio。" />
            <AdviceCard tone="green" title="Esperar e observar não é fracasso" content="Quando a pontuação mais alta não ultrapassa a linha，Esperar e observar faz parte da estratégia。" />
            <AdviceCard tone="amber" title="Realizar revisão de desvio" content={behavior.rejectRate > 0.3 || behavior.ignoreRate > 0.3 ? 'Recentemente derrubado/Ignore a alta proporção，Recomenda-se revisar desvios de execução humana。' : 'O desvio recente de execução do usuário é baixo，Pode continuar a manter a disciplina。'} />
          </div>
        </div>

        {/* coluna da direita：estágio do sistema */}
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-2">estágio do sistema</h3>
          <div className="flex flex-wrap gap-2">
            <Tag text="CSI500pool de ações reais" tone="green" />
            <Tag text="Integração de terceira categoria" tone="green" />
            <Tag text="Conviction Filter" tone="green" />
            <Tag text="Acompanhamento semanal de desempenho" tone="green" />
            <Tag text="Write-back de decisão do usuário" tone="amber" />
            <Tag text="Pesos de aprendizagem 4.1" tone={overview.learnedWeights ? 'green' : 'amber'} />
            <Tag text="Limite adaptativo 4.2" tone={overview.thresholdHistory && overview.thresholdHistory.length > 0 ? 'green' : 'amber'} />
            <Tag text="Revisão quadridimensional 4.3" tone="green" />
          </div>
        </div>
      </div>

      {/* painel inferior：Pesos de aprendizagem + Limite adaptativo lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        {overview.learnedWeights ? <LearnedWeightsPanel weights={overview.learnedWeights} /> : null}
        {overview.thresholdHistory && overview.thresholdHistory.length > 0 ? <ThresholdHistoryPanel adjustments={overview.thresholdHistory} /> : null}
      </div>
    </div>
  )
}
