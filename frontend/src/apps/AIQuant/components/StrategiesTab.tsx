import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

import type { StockAnalysisOverview, StockAnalysisPosition, StockAnalysisSignal } from '../types'
import { buildConvictionStats, buildDailyAdviceSummary } from '../dashboardMeta'
import {
  decisionSourceLabel,
  formatPercent,
  formatPrice,
  isTPlusOneBlocked,
  marketRegimeLabel,
  percentTone,
  signalBadge,
  signalLabel,
} from '../utils'
import {
  InfoPanel,
  ScoreRow,
} from './shared'

type ActionMode = 'confirm' | 'reject' | 'ignore' | 'acknowledge' | 'override_buy' | null

export interface StrategiesTabProps {
  overview: StockAnalysisOverview
  topSignal: StockAnalysisSignal | null
  actionMode: ActionMode
  setActionMode: (mode: ActionMode) => void
  note: string
  setNote: (value: string) => void
  quantity: number
  setQuantity: (value: number) => void
  targetWeight: number
  setTargetWeight: (value: number) => void
  onSubmit: () => void
  actionLoading: boolean
  onSelectSignal: (signal: StockAnalysisSignal) => void
  onClosePosition: (position: StockAnalysisPosition) => void
  onReducePosition: (position: StockAnalysisPosition, weightDelta: number) => void
  onDismissAction: (position: StockAnalysisPosition) => void
  tradingStatus: { canTrade: boolean; reason: string | null }
  onAutoExecute: () => void
}

export function StrategiesTab(props: StrategiesTabProps) {
  const { overview, topSignal, actionMode, setActionMode, note, setNote, quantity, setQuantity, targetWeight, setTargetWeight, onSubmit, actionLoading, onSelectSignal, onClosePosition, onReducePosition, onDismissAction, tradingStatus, onAutoExecute } = props
  const conviction = buildConvictionStats(overview.topSignals, overview.marketState)
  const isBuySignal = topSignal ? (topSignal.action === 'strong_buy' || topSignal.action === 'buy') : false
  const isAlreadyOperated = topSignal ? topSignal.decisionSource !== 'system' : false
  const operatedInfo = topSignal ? decisionSourceLabel(topSignal.decisionSource, topSignal.action) : null
  const currentTotalPosition = overview.positions.reduce((sum, position) => sum + position.weight, 0)
  const maxTotalPosition = overview.marketLevelRisk?.effectiveMaxPositionRatio ?? 1.0
  const remainingPositionPercent = Math.max(0, Math.round((maxTotalPosition - currentTotalPosition) * 100))

  /** Determine se a operação requer tempo de negociação */
  function needsTradingTime(mode: ActionMode): boolean {
    return mode === 'confirm' || mode === 'override_buy'
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra de prompt de status da transação */}
      {!tradingStatus.canTrade ? (
        <div className="flex-shrink-0 mb-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-700 text-xs flex items-center gap-2">
          <LockClosedIcon className="w-4 h-4 flex-shrink-0" />
          <span>{tradingStatus.reason} — Operações comerciais（comprar/vender/Reduzir posições/Fechar posição）Desabilitado，Somente sinais podem ser visualizados e marcados。</span>
        </div>
      ) : null}

      {/* Barra de estatísticas */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">estratégia diária</h2>
            <button
              onClick={onAutoExecute}
              disabled={actionLoading}
              title="por hoje「Forte Compra」Sinais abrem posições automaticamente na ordem recomendada (cada 30%, posição total 100% limite superior), e vai「Comprar」「Espere e veja」Os sinais são automaticamente marcados como ignorados"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Execução automática com um clique
            </button>
          </div>
          {overview.marketRegime && overview.fusionWeights ? (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-medium text-indigo-600">{marketRegimeLabel(overview.marketRegime)}</span>
              <span>especialista {(overview.fusionWeights.expert * 100).toFixed(0)}% / tecnologia {(overview.fusionWeights.technical * 100).toFixed(0)}% / Quantificar {(overview.fusionWeights.quant * 100).toFixed(0)}%</span>
            </div>
          ) : null}
        </div>
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl px-4 py-2 shadow-sm">
          <div className="flex items-center gap-5 text-sm">
            <span className="text-slate-500">Compra Forte <span className="font-bold text-red-600">{conviction.strongBuyCount}</span></span>
            <span className="text-slate-500">comprar <span className="font-bold text-red-600">{conviction.buyCount}</span></span>
            <span className="text-slate-500">espere e veja <span className="font-bold text-slate-800">{conviction.watchCount}</span></span>
            <span className="text-slate-500">pontuação geral média <span className="font-bold text-slate-800">{conviction.avgScore.toFixed(1)}</span></span>
          </div>
        </div>
      </div>

      {/* ======== Layout principal esquerdo e direito ======== */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* -- lado esquerdo 70%：Selecione detalhes do estoque -- */}
        <div className="w-[70%] flex-shrink-0 overflow-y-auto">
          {/* Área de venda pendente */}
          {(() => {
            const advice = buildDailyAdviceSummary(overview)
            if (advice.sells.length === 0) return null
            return (
              <div className="mb-3 space-y-2">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  venda pendente（{advice.sells.length}）
                </h3>
                {advice.sells.map((sell) => {
                  const position = overview.positions.find((p) => p.code === sell.code)
                  if (!position) return null
                  const tPlusOneBlocked = isTPlusOneBlocked(position.openedAt)
                  return (
                    <div key={sell.code} className="flex items-center justify-between gap-3 p-2.5 border border-red-200 bg-red-50/60 rounded-xl">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-800">{sell.title}</span>
                          <span className="text-xs text-slate-500">{sell.code}</span>
                        </div>
                        <div className="text-xs text-red-600 mt-0.5">{sell.summary}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          renda <span className={position.returnPercent >= 0 ? 'text-red-600' : 'text-green-600'}>{position.returnPercent.toFixed(2)}%</span>
                          {' · '}posição {(position.weight * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {tradingStatus.canTrade && !tPlusOneBlocked ? (
                          <>
                            <button
                              onClick={() => {
                                const weightDelta = position.weight / 2
                                if (weightDelta > 0) onReducePosition(position, weightDelta)
                              }}
                              disabled={actionLoading || position.weight < 0.02}
                              className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50"
                            >
                              dividido pela metade
                            </button>
                            <button
                              onClick={() => onClosePosition(position)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
                            >
                              Fechar posição
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">{tPlusOneBlocked ? 'T+1 Restrito' : 'horário sem negociação'}</span>
                        )}
                        <button
                          onClick={() => onDismissAction(position)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg disabled:opacity-50"
                          title="Ignorar este lembrete，Reavalie a próxima vez que o mercado for atualizado"
                        >
                          negligência
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {topSignal ? (
            <div className="bg-white/70 border border-indigo-100 rounded-2xl p-3 shadow-sm shadow-indigo-50 relative overflow-hidden min-h-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              {/* cabeça：Informações básicas do sinal + Pontuação abrangente */}
              <div className="flex justify-between items-start gap-6 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${signalBadge(topSignal.action)}`}>{signalLabel(topSignal.action)}</span>
                    <span className="text-lg font-bold text-slate-800">{topSignal.name} ({topSignal.code})</span>
                    <span className="text-xs text-slate-500">{topSignal.tradeDate}</span>
                    {/* Etiqueta de status operado */}
                    {isAlreadyOperated && operatedInfo ? (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${operatedInfo.badge}`}>{operatedInfo.label}</span>
                    ) : null}
                  </div>
                  <div className={`grid ${isBuySignal ? 'grid-cols-4' : 'grid-cols-1'} gap-3 mt-2 text-sm`}>
                    {(() => {
                      // v1.30.2: realtime prioridade，Retorno para snapshot（Processamento antes do mercado/Cena não atualizada）
                      const rt = topSignal.realtime
                      const displayPrice = rt?.latestPrice ?? topSignal.latestPrice
                      const displayChange = rt?.changePercent ?? topSignal.snapshot.changePercent
                      const fetchedLabel = rt?.fetchedAt
                        ? new Date(rt.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })
                        : null
                      return (
                        <div>Preço atual: <span className="font-semibold">{displayPrice.toFixed(2)}</span> <span className={`font-bold text-xs ${displayChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>{displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%</span>
                          {fetchedLabel ? <span className="ml-1 text-[10px] text-slate-400">· {fetchedLabel}renovar</span> : <span className="ml-1 text-[10px] text-amber-500">· preço de referência pré-mercado</span>}
                        </div>
                      )
                    })()}
                    {isBuySignal ? (
                      <>
                        <div>posição: <span className="font-semibold">{Math.round(topSignal.suggestedPosition * 100)}%</span></div>
                        <div className="text-red-600">Obtenha lucro: <span className="font-semibold">{topSignal.takeProfitPrice1.toFixed(2)} / {topSignal.takeProfitPrice2.toFixed(2)}</span></div>
                        <div className="text-green-600">parar a perda: <span className="font-semibold">{topSignal.stopLossPrice.toFixed(2)}</span></div>
                      </>
                    ) : null}
                  </div>
                  {/* mesmo dia OHLC Citações（realtime prioridade，reversão snapshot） */}
                  <div className="grid grid-cols-4 gap-3 mt-1.5 text-xs text-slate-500">
                    <div>abertura <span className="font-semibold text-slate-700">{formatPrice(topSignal.realtime?.open ?? topSignal.snapshot.open)}</span></div>
                    <div>Mais alto <span className="font-semibold text-red-600">{formatPrice(topSignal.realtime?.high ?? topSignal.snapshot.high)}</span></div>
                    <div>mais baixo <span className="font-semibold text-green-600">{formatPrice(topSignal.realtime?.low ?? topSignal.snapshot.low)}</span></div>
                    <div>Coletado ontem <span className="font-semibold text-slate-700">{formatPrice(topSignal.realtime?.previousClose ?? topSignal.snapshot.previousClose)}</span></div>
                  </div>
                  {topSignal.supportResistance ? (
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-slate-400">apoiar/nível de pressão</span>
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                        S1 {topSignal.supportResistance.support1.toFixed(2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                        S2 {topSignal.supportResistance.support2.toFixed(2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                        R1 {topSignal.supportResistance.resistance1.toFixed(2)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                        R2 {topSignal.supportResistance.resistance2.toFixed(2)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="text-right min-w-[160px]">
                  <div className="text-xs text-slate-500 mb-1">Pontuação abrangente</div>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${topSignal.finalScore}%` }} />
                    </div>
                    <span className="font-bold text-indigo-600">{topSignal.finalScore}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Confiança {Math.round(topSignal.confidence * 100)}%</div>
                </div>
              </div>

              {/* Classificação de terceira categoria + justificativa central */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Classificação de terceira categoria</h4>
                  {topSignal.expert.isSimulated ? (
                    <div className="mb-2 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-700 leading-relaxed">
                      atual"Consenso de especialistas"Simulado por fórmula de regra，irreal LLM Saída do cluster。
                    </div>
                  ) : topSignal.expert.llmSuccessCount != null && topSignal.expert.llmSuccessCount > 0 ? (
                    <div className="mb-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5 text-[11px] text-emerald-700 leading-relaxed">
                      LLM Especialistas acessaram — sucesso {topSignal.expert.llmSuccessCount} bilhete
                      {(topSignal.expert.ruleFallbackCount ?? 0) > 0
                        ? `，Downgrade de regra ${topSignal.expert.ruleFallbackCount} bilhete`
                        : null}
                    </div>
                  ) : null}
                  <div className="space-y-1.5 text-sm">
                    <ScoreRow label="Consenso de especialistas" value={`${Math.round(topSignal.expert.consensus * 100)}% / ${topSignal.expert.score}`} />
                    <ScoreRow label="Pontos técnicos" value={`${topSignal.technical.total}`} />
                    <ScoreRow label="Pontuação quantitativa" value={`${topSignal.quant.total}`} />
                    <ScoreRow label="20Renda diária" value={formatPercent(topSignal.snapshot.return20d)} valueClassName={percentTone(topSignal.snapshot.return20d)} />
                    <ScoreRow label="Avanço de quantidade" value={`${topSignal.snapshot.volumeBreakout.toFixed(2)}x`} />
                    <ScoreRow label="limite básico" value={`Abrangente ${topSignal.thresholds.minCompositeScore} / Especialize-se ${topSignal.thresholds.minExpertConsensus} / tecnologia ${topSignal.thresholds.minTechnicalScore} / quantidade ${topSignal.thresholds.minQuantScore}`} />
                    {topSignal.fusionWeights ? (
                      <ScoreRow label="Peso de fusão" value={`especialista ${(topSignal.fusionWeights.expert * 100).toFixed(0)}% / tecnologia ${(topSignal.fusionWeights.technical * 100).toFixed(0)}% / Quantificar ${(topSignal.fusionWeights.quant * 100).toFixed(0)}%`} />
                    ) : null}
                    {topSignal.marketRegime ? (
                      <ScoreRow label="sistema de mercado" value={marketRegimeLabel(topSignal.marketRegime)} />
                    ) : null}
                  </div>
                </div>
                <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">justificativa central</h4>
                  <div className="space-y-1.5 text-sm text-slate-700 leading-relaxed">
                    {topSignal.reasoning.map((reason) => <p key={reason}>- {reason}</p>)}
                  </div>
                </div>
              </div>

              {/* passar/espere e veja/veto */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                <InfoPanel title="condições de aprovação" items={topSignal.passingChecks} emptyText="Ainda não há condições de aprovação" tone="green" />
                <InfoPanel title="Razões para esperar e ver" items={topSignal.watchReasons} emptyText="Não há razão para esperar e ver no momento" tone="amber" />
                <InfoPanel title="Motivo da rejeição" items={topSignal.vetoReasons} emptyText="Atualmente não há condições de veto" tone="red" />
              </div>

              {/* área operacional — Já operado vs Para ser operado */}
              {isAlreadyOperated && operatedInfo ? (
                /* Já operado：Mostrar status + Observações do usuário，Nunca mais mostre botões de ação */
                <div className="pt-3 border-t border-slate-100">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${operatedInfo.badge}`}>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">Já operado hoje：{operatedInfo.label}</span>
                    {topSignal.userDecisionNote ? (
                      <span className="text-xs opacity-75 ml-2">— {topSignal.userDecisionNote}</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                /* Para ser operado：Mostrar botões de ação */
                <>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    {(topSignal.action === 'strong_buy' || topSignal.action === 'buy') ? (
                      <>
                        <button
                          onClick={() => setActionMode('confirm')}
                          disabled={!tradingStatus.canTrade}
                          title={!tradingStatus.canTrade ? tradingStatus.reason ?? 'horário sem negociação' : ''}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Confirmar compra
                        </button>
                        <button onClick={() => setActionMode('reject')} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors">
                          <ExclamationTriangleIcon className="w-4 h-4" /> Desista de comprar
                        </button>
                        <button onClick={() => setActionMode('ignore')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
                          <XCircleIcon className="w-4 h-4" /> negligência
                        </button>
                      </>
                    ) : topSignal.action === 'watch' ? (
                      <>
                        <button onClick={() => setActionMode('acknowledge')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors">
                          <CheckCircleIcon className="w-4 h-4" /> Confirme espere e veja
                        </button>
                        <button
                          onClick={() => setActionMode('override_buy')}
                          disabled={!tradingStatus.canTrade}
                          title={!tradingStatus.canTrade ? tradingStatus.reason ?? 'horário sem negociação' : ''}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" /> eu quero comprar
                        </button>
                        <button onClick={() => setActionMode('ignore')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
                          <XCircleIcon className="w-4 h-4" /> negligência
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setActionMode('acknowledge')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition-colors">
                          <CheckCircleIcon className="w-4 h-4" /> Ler
                        </button>
                        <button
                          onClick={() => setActionMode('override_buy')}
                          disabled={!tradingStatus.canTrade}
                          title={!tradingStatus.canTrade ? tradingStatus.reason ?? 'horário sem negociação' : ''}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ExclamationTriangleIcon className="w-4 h-4" /> eu quero comprar
                        </button>
                      </>
                    )}
                  </div>

                  {actionMode ? (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-2 space-y-3">
                      {/* confirm e override_buy Exibir quantidade/lista de preços */}
                      {(actionMode === 'confirm' || actionMode === 'override_buy') ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Quantidade do pedido</label>
                              <input type="number" value={quantity} min={100} step={100} onChange={(event) => setQuantity(Number(event.target.value))} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Faixa de preço sugerida</label>
                              <div className="h-[38px] px-3 rounded-lg border border-slate-200 bg-white flex items-center text-sm text-slate-700">{topSignal.suggestedPriceRange.min.toFixed(2)} - {topSignal.suggestedPriceRange.max.toFixed(2)}</div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">posição alvo(%)</label>
                              <input
                                type="number"
                                value={targetWeight}
                                min={1}
                                max={100}
                                step={1}
                                onChange={(event) => setTargetWeight(Number(event.target.value))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="range"
                              min={1}
                              max={100}
                              step={1}
                              value={targetWeight}
                              onChange={(event) => setTargetWeight(Number(event.target.value))}
                              className="w-full accent-indigo-600"
                            />
                          </div>
                          <div className="text-xs text-slate-500 -mt-1">
                            AI Posições recomendadas {Math.round(topSignal.suggestedPosition * 100)}%，Pode ser ajustado manualmente；O back-end ainda verificará as posições dos tickets únicos、Limite superior de posição total e controle de risco de mercado。
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                            Posição total usada atual {Math.round(currentTotalPosition * 100)}%，O atual limite total de armazém efetivo do mercado {Math.round(maxTotalPosition * 100)}%，Restante teórico disponível {remainingPositionPercent}% 。
                          </div>
                        </>
                      ) : null}

                      {/* acknowledge Não é necessário formulário，Mostrar prompt de confirmação */}
                      {actionMode === 'acknowledge' ? (
                        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          {topSignal.action === 'watch'
                            ? 'Confirme espere e veja：O sistema continuará rastreando esse alvo，Você será lembrado novamente quando as condições forem atendidas.。'
                            : 'Marcar como lido：Este sinal será marcado como manipulado。'}
                        </div>
                      ) : null}

                      {/* reject e ignore Observações obrigatórias */}
                      {(actionMode === 'reject' || actionMode === 'ignore') ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Observação</label>
                          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="w-full h-20 p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white" placeholder="O motivo deve ser registrado，Para revisão e aprendizado do sistema" />
                        </div>
                      ) : null}

                      {/* confirm / override_buy A observação é opcional */}
                      {(actionMode === 'confirm' || actionMode === 'override_buy') ? (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Observação（Opcional）</label>
                          <textarea value={note} onChange={(event) => setNote(event.target.value)} className="w-full h-16 p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white" placeholder={actionMode === 'override_buy' ? 'Derrubar o motivo' : 'Instruções de execução'} />
                        </div>
                      ) : null}

                      {/* Lembrete de horário de negociação（Se você selecionar uma operação que requer horário de negociação, mas o mercado está fechado） */}
                      {needsTradingTime(actionMode) && !tradingStatus.canTrade ? (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          {tradingStatus.reason} — O back-end rejeitará esta operação após o envio。
                        </div>
                      ) : null}

                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setActionMode(null); setNote('') }} className="px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancelar</button>
                        <button
                          onClick={onSubmit}
                          disabled={actionLoading || ((actionMode === 'reject' || actionMode === 'ignore') && !note.trim()) || ((actionMode === 'confirm' || actionMode === 'override_buy') && quantity <= 0)}
                          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50"
                        >
                          enviar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-500">Atualmente não há resultados de estratégia para exibir。</div>
          )}
        </div>

        {/* -- lado direito 30%：Lista de estratégias candidatas（Rolagem de altura fixa） -- */}
        <div className="w-[30%] flex-shrink-0 flex flex-col min-h-0">
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex-shrink-0">Lista de estratégias candidatas <span className="text-xs font-normal text-slate-400">({overview.topSignals.length})</span></h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-10">
            {overview.topSignals.map((signal) => {
              const signalOperated = signal.decisionSource !== 'system'
              const signalInfo = decisionSourceLabel(signal.decisionSource, signal.action)
              return (
                <button key={signal.id} onClick={() => onSelectSignal(signal)} className={`w-full text-left rounded-2xl border p-2.5 bg-white/70 shadow-sm hover:border-indigo-200 transition-colors ${signal.id === topSignal?.id ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200/60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{signal.name} ({signal.code})</div>
                      <div className="text-xs text-slate-500 mt-0.5">{signal.sector} | Pontuação abrangente {signal.finalScore}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${signalBadge(signal.action)}`}>{signalLabel(signal.action)}</span>
                      {signalOperated ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${signalInfo.badge}`}>{signalInfo.label}</span>
                      ) : null}
                    </div>
                  </div>
                  {/* cotações de preços（v1.30.2: realtime prioridade，reversão snapshot） */}
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="font-semibold text-slate-800">{(signal.realtime?.latestPrice ?? signal.latestPrice).toFixed(2)}</span>
                    {(() => {
                      const chg = signal.realtime?.changePercent ?? signal.snapshot.changePercent
                      return (
                        <span className={`font-bold ${chg >= 0 ? 'text-red-600' : 'text-green-600'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</span>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1 text-[10px] text-slate-400">
                    <div>abrir <span className="text-slate-600">{formatPrice(signal.realtime?.open ?? signal.snapshot.open)}</span></div>
                    <div>agora <span className="text-slate-600">{(signal.realtime?.latestPrice ?? signal.latestPrice).toFixed(2)}</span></div>
                    <div>alto <span className="text-red-500">{formatPrice(signal.realtime?.high ?? signal.snapshot.high)}</span></div>
                    <div>Baixo <span className="text-green-600">{formatPrice(signal.realtime?.low ?? signal.snapshot.low)}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-xs text-slate-500">
                    <div>especialista {Math.round(signal.expert.consensus * 100)}%</div>
                    <div>tecnologia {signal.technical.total}</div>
                    <div>Quantificar {signal.quant.total}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
