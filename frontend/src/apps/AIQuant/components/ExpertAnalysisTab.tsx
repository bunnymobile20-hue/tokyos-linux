import { useEffect, useState } from 'react'

import { fetchAvailableDates, fetchExpertAnalysis } from '../api'
import type {
  ExpertAnalysisResponse,
  ExpertDailyMemoryEntry,
  ExpertMemory,
  StockAnalysisExpertLayer,
  StockAnalysisExpertVote,
} from '../types'
import { signalBadge, signalLabel } from '../utils'

/** Tradução de nome de camada */
function layerLabel(layer: StockAnalysisExpertLayer): string {
  const map: Record<StockAnalysisExpertLayer, string> = {
    rule_functions: 'Função de regra',
    industry_chain: 'Cadeia industrial',
    company_fundamentals: 'fundamentos da empresa',
    sell_side_research: 'Pesquisa do lado do vendedor',
    world_power: 'grande jogo de poder',
    global_macro: 'macro global',
    risk_governance: 'Controle de risco e governança',
    sentiment: 'lado emocional',
    market_trading: 'transação de mercado',
    buy_side: 'Perspectiva do comprador',
  }
  return map[layer] ?? layer
}

/** tradução de postura */
function verdictLabel(verdict: 'bullish' | 'bearish' | 'neutral'): string {
  switch (verdict) {
    case 'bullish': return 'longo'
    case 'bearish': return 'grosseiro'
    case 'neutral': return 'neutro'
  }
}

function verdictBadge(verdict: 'bullish' | 'bearish' | 'neutral'): string {
  switch (verdict) {
    case 'bullish': return 'bg-red-100 text-red-700'
    case 'bearish': return 'bg-green-100 text-green-700'
    case 'neutral': return 'bg-slate-100 text-slate-600'
  }
}

/** Votação por camada */
function groupVotesByLayer(votes: StockAnalysisExpertVote[]): Record<string, StockAnalysisExpertVote[]> {
  const groups: Record<string, StockAnalysisExpertVote[]> = {}
  for (const vote of votes) {
    const key = vote.layer
    if (!groups[key]) groups[key] = []
    groups[key].push(vote)
  }
  return groups
}

export function ExpertAnalysisTab() {
  const [dates, setDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [data, setData] = useState<ExpertAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null)
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)

  // inicialização：Carregar datas disponíveis
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const availableDates = await fetchAvailableDates()
        if (cancelled) return
        setDates(availableDates)
        if (availableDates.length > 0) {
          setSelectedDate(availableDates[0])
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => { cancelled = true }
  }, [])

  // Carregar dados analíticos ao mudar de data
  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchExpertAnalysis(selectedDate)
        if (cancelled) return
        setData(result)
        setExpandedSignal(null)
        setExpandedMemory(null)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [selectedDate])

  if (loading && !data) {
    return <div className="h-full flex items-center justify-center text-slate-500">Carregando dados de análise especializada...</div>
  }

  return (
    <div className="space-y-3 pb-20">
      {/* título + selecionador de data */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">AI Análise especializada</h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-slate-400 animate-pulse">carregando...</span>}
          {data?.analyzedAt && (
            <span className="text-xs text-slate-400">
              atualizado em {new Date(data.analyzedAt).toLocaleString('zh-CN')}
            </span>
          )}
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {dates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Visão geral das estatísticas */}
          <div className="grid grid-cols-4 gap-3">
            <SummaryCard label="Data de análise" value={data.tradeDate} />
            <SummaryCard label="número de sinais" value={String(data.signalCount)} />
            <SummaryCard label="Número de memória especialista" value={String(Object.keys(data.expertMemories).length)} />
            <SummaryCard label="Entrada de memória para o dia" value={String(data.dailyMemories.length)} />
          </div>

          {/* Lista de sinais */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">Detalhes do sinal（{data.signalCount} individual）</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.signals.map((signal) => {
                const isExpanded = expandedSignal === signal.id
                const votes = signal.expert.votes ?? []
                const grouped = groupVotesByLayer(votes)
                return (
                  <div key={signal.id}>
                    {/* Cabeçalho de sinal */}
                    <button
                      onClick={() => setExpandedSignal(isExpanded ? null : signal.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 text-sm">{signal.name}</span>
                          <span className="text-xs text-slate-500">({signal.code})</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${signalBadge(signal.action)}`}>
                            {signalLabel(signal.action)}
                          </span>
                          {signal.expert.isSimulated && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">regra</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>Pontuação abrangente {signal.compositeScore}</span>
                          <span>confiança {Math.round(signal.confidence * 100)}%</span>
                          <span>consenso {Math.round(signal.expert.consensus * 100)}%</span>
                          <span className="text-red-600">muitos{signal.expert.bullishCount}</span>
                          <span className="text-green-600">nulo{signal.expert.bearishCount}</span>
                          <span className="text-slate-400">meio{signal.expert.neutralCount}</span>
                          {typeof signal.expert.llmSuccessCount === 'number' && (
                            <span>
                              LLM {signal.expert.llmSuccessCount}/{(signal.expert.llmSuccessCount ?? 0) + (signal.expert.ruleFallbackCount ?? 0)}
                              {(signal.expert.ruleFallbackCount ?? 0) > 0 && (
                                <span className="text-amber-600 ml-1">({signal.expert.ruleFallbackCount}Downgrade de regra)</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-slate-400 text-sm">{isExpanded ? 'fechar ▲' : 'Expandir ▼'}</span>
                    </button>

                    {/* Detalhes de votação expandidos */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* informações de decisão */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">tomando uma decisão: {signal.decisionSource}</span>
                          {signal.vetoReasons.length > 0 && (
                            <span className="px-2 py-1 rounded bg-red-100 text-red-700">veto: {signal.vetoReasons.join(', ')}</span>
                          )}
                          {signal.watchReasons.length > 0 && (
                            <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">espere e veja: {signal.watchReasons.join(', ')}</span>
                          )}
                        </div>

                        {/* Destaques/risco */}
                        {(signal.expert.highlights.length > 0 || signal.expert.risks.length > 0) && (
                          <div className="grid grid-cols-2 gap-3">
                            {signal.expert.highlights.length > 0 && (
                              <div className="rounded-xl border border-green-100 bg-green-50/60 p-3">
                                <div className="text-xs font-bold text-green-700 mb-1.5">Destaques</div>
                                {signal.expert.highlights.map((h) => (
                                  <p key={h} className="text-xs text-green-800 leading-relaxed">- {h}</p>
                                ))}
                              </div>
                            )}
                            {signal.expert.risks.length > 0 && (
                              <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                                <div className="text-xs font-bold text-red-700 mb-1.5">risco</div>
                                {signal.expert.risks.map((r) => (
                                  <p key={r} className="text-xs text-red-800 leading-relaxed">- {r}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Divisão de votação por nível */}
                        {votes.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-600">
                              Detalhes da votação de especialistas（{votes.length} bilhete）
                            </div>
                            {Object.entries(grouped).map(([layer, layerVotes]) => (
                              <div key={layer} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                <div className="text-xs font-bold text-slate-700 mb-2">
                                  {layerLabel(layer as StockAnalysisExpertLayer)}（{layerVotes.length} bilhete）
                                </div>
                                <div className="space-y-1.5">
                                  {layerVotes.map((vote) => (
                                    <VoteRow key={vote.expertId} vote={vote} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">Sem detalhes de votação</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {data.signals.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Não há dados de sinal para o dia</div>
              )}
            </div>
          </div>

          {/* memória especializada */}
          <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 text-sm">
                Banco de memória especializado（{Object.keys(data.expertMemories).length} especialista）
                {data.expertMemoriesUpdatedAt && (
                  <span className="ml-2 text-xs text-slate-400 font-normal">
                    atualizado em {new Date(data.expertMemoriesUpdatedAt).toLocaleString('zh-CN')}
                  </span>
                )}
              </h3>
            </div>
            {Object.keys(data.expertMemories).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {Object.entries(data.expertMemories).map(([expertId, memory]) => (
                  <ExpertMemoryRow
                    key={expertId}
                    expertId={expertId}
                    memory={memory}
                    isExpanded={expandedMemory === expertId}
                    onToggle={() => setExpandedMemory(expandedMemory === expertId ? null : expertId)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                O sistema de memória especialista ainda não está em execução，Ele será gerado automaticamente após a execução da análise pós-comercialização.
              </div>
            )}
          </div>

          {/* Entrada de memória especializada do dia */}
          {data.dailyMemories.length > 0 && (
            <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">Memória especializada do dia（{data.dailyMemories.length} tira）</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                    <tr>
                      <th className="px-3 py-2">especialistaID</th>
                      <th className="px-3 py-2">estoque</th>
                      <th className="px-3 py-2">juiz</th>
                      <th className="px-3 py-2">confiança</th>
                      <th className="px-3 py-2">razão</th>
                      <th className="px-3 py-2">Liquidação no mesmo dia</th>
                      <th className="px-3 py-2">correto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.dailyMemories.map((entry, index) => (
                      <DailyMemoryRow key={`${entry.expertId}-${entry.code}-${index}`} entry={entry} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="text-center text-sm text-slate-400 py-12">Ainda não há dados de análise disponíveis</div>
      )}
    </div>
  )
}

// ── subcomponente ──────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-xl p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
    </div>
  )
}

function VoteRow({ vote }: { vote: StockAnalysisExpertVote }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <div className="flex-shrink-0 w-36 truncate font-medium text-slate-700" title={vote.expertName}>
        {vote.expertName}
      </div>
      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded ${verdictBadge(vote.verdict)}`}>
        {verdictLabel(vote.verdict)}
      </span>
      <span className="flex-shrink-0 text-slate-500">{Math.round(vote.confidence * 100)}%</span>
      <span className="flex-1 text-slate-600 truncate" title={vote.reason}>{vote.reason}</span>
      <span className="flex-shrink-0 text-slate-400" title={vote.modelId}>
        {vote.usedFallback ? 'regra' : vote.modelId.split('/').pop()}
      </span>
      <span className="flex-shrink-0 text-slate-400">{vote.latencyMs}ms</span>
    </div>
  )
}

function ExpertMemoryRow({ expertId, memory, isExpanded, onToggle }: {
  expertId: string
  memory: ExpertMemory
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-4 py-2.5 text-left hover:bg-slate-50/60 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-800">{expertId}</span>
            {memory.midTerm && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${verdictBadge(memory.midTerm.dominantVerdict)}`}>
                {verdictLabel(memory.midTerm.dominantVerdict)}
              </span>
            )}
            {memory.midTerm && (
              <span className="text-xs text-slate-500">taxa de vitórias {Math.round(memory.midTerm.winRate * 100)}%</span>
            )}
            <span className="text-xs text-slate-400">curto prazo {memory.shortTerm.entries.length} tira</span>
          </div>
        </div>
        <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* memória de médio prazo */}
          {memory.midTerm && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
              <div className="font-bold text-indigo-700 mb-1">memória de médio prazo</div>
              <p className="text-indigo-800 leading-relaxed">{memory.midTerm.summary}</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-indigo-600">
                <span>ciclo: {memory.midTerm.period.from} ~ {memory.midTerm.period.to}</span>
                <span>taxa de vitórias {Math.round(memory.midTerm.winRate * 100)}%</span>
                <span>confiança média {Math.round(memory.midTerm.avgConfidence * 100)}%</span>
              </div>
              {memory.midTerm.keyPatterns.length > 0 && (
                <div className="mt-1.5 text-indigo-600">
                  padrão crítico: {memory.midTerm.keyPatterns.join('、')}
                </div>
              )}
            </div>
          )}
          {/* memória de longo prazo */}
          {memory.longTerm && (
            <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs">
              <div className="font-bold text-purple-700 mb-1">memória de longo prazo</div>
              {memory.longTerm.lessons.length > 0 && (
                <div className="text-purple-800">
                  <span className="font-medium">lição:</span> {memory.longTerm.lessons.join('；')}
                </div>
              )}
              {memory.longTerm.strengths.length > 0 && (
                <div className="text-purple-800 mt-1">
                  <span className="font-medium">Vantagens:</span> {memory.longTerm.strengths.join('；')}
                </div>
              )}
              {memory.longTerm.weaknesses.length > 0 && (
                <div className="text-purple-800 mt-1">
                  <span className="font-medium">fraqueza:</span> {memory.longTerm.weaknesses.join('；')}
                </div>
              )}
            </div>
          )}
          {/* itens de memória de curto prazo */}
          {memory.shortTerm.entries.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
              <div className="font-bold text-slate-700 mb-1.5">memória de curto prazo（recente {memory.shortTerm.entries.length} tira）</div>
              <div className="space-y-1">
                {memory.shortTerm.entries.slice(0, 10).map((entry, index) => (
                  <div key={`${entry.code}-${index}`} className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">{entry.tradeDate}</span>
                    <span className="font-medium">{entry.name}({entry.code})</span>
                    <span className={`px-1 py-0.5 rounded ${verdictBadge(entry.verdict)}`}>
                      {verdictLabel(entry.verdict)}
                    </span>
                    <span>{Math.round(entry.confidence * 100)}%</span>
                    {entry.wasCorrect !== null && (
                      <span className={entry.wasCorrect ? 'text-green-600' : 'text-red-600'}>
                        {entry.wasCorrect ? '✓' : '✗'}
                      </span>
                    )}
                    <span className="text-slate-400 truncate flex-1">{entry.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!memory.midTerm && !memory.longTerm && memory.shortTerm.entries.length === 0 && (
            <div className="text-xs text-slate-400 py-2">Este especialista ainda não possui dados de memória</div>
          )}
        </div>
      )}
    </div>
  )
}

function DailyMemoryRow({ entry }: { entry: ExpertDailyMemoryEntry }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]" title={entry.expertId}>
        {entry.expertId}
      </td>
      <td className="px-3 py-2 text-slate-800 font-medium">{entry.name}({entry.code})</td>
      <td className="px-3 py-2">
        <span className={`px-1.5 py-0.5 rounded ${verdictBadge(entry.verdict)}`}>
          {verdictLabel(entry.verdict)}
        </span>
      </td>
      <td className="px-3 py-2 text-slate-600">{Math.round(entry.confidence * 100)}%</td>
      <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]" title={entry.reason}>
        {entry.reason}
      </td>
      <td className="px-3 py-2 text-slate-600">
        {entry.actualReturnNextDay !== null ? `${entry.actualReturnNextDay > 0 ? '+' : ''}${entry.actualReturnNextDay.toFixed(2)}%` : 'Para ser avaliado'}
      </td>
      <td className="px-3 py-2">
        {entry.wasCorrect === null ? (
          <span className="text-slate-400">-</span>
        ) : entry.wasCorrect ? (
          <span className="text-green-600 font-bold">✓</span>
        ) : (
          <span className="text-red-600 font-bold">✗</span>
        )}
      </td>
    </tr>
  )
}
