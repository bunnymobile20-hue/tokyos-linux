import { type ReactNode, useEffect, useState } from 'react'

import { fetchAvailableDates, fetchDataCollection } from '../api'
import type {
  DataCollectionResponse,
  FactPool,
  LLMExtractionResult,
} from '../types'

/** Agent ID traduzir */
function agentLabel(agentId: string): string {
  const map: Record<string, string> = {
    macro_economy: 'Macroeconomia',
    policy_regulation: 'Políticas e regulamentos',
    company_info: 'empresa listada',
    price_volume: 'Dados de volume e preço',
    industry_news: 'Notícias da indústria',
    social_sentiment: 'emoções sociais',
    global_markets: 'mercado global',
    data_quality: 'Qualidade dos dados',
  }
  return map[agentId] ?? agentId
}

function getAgentMessageStyle(log: { agentId: string; successRate: number; dataPointCount: number; errors: string[] }) {
  if (log.errors.length === 0) {
    return null
  }

  const firstError = log.errors[0] ?? ''
  const isPartialAvailabilityNotice = log.dataPointCount > 0 && log.successRate >= 0.5
  const isGlobalFallbackNotice = log.agentId === 'global_markets'
    && log.successRate >= 0.5
    && (firstError.includes('Sem dados') || firstError.includes('Ausente'))

  if (isGlobalFallbackNotice || isPartialAvailabilityNotice) {
    return { prefix: 'dica', toneClass: 'text-slate-500' }
  }

  return { prefix: 'erro', toneClass: 'text-red-600' }
}

/** Tradução da classificação do anúncio */
function announcementCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    earnings: 'relatório financeiro',
    insider_trading: 'negociação com informações privilegiadas',
    equity_change: 'Mudanças no patrimônio',
    litigation: 'litígio',
    other: 'outro',
  }
  return map[category] ?? category
}

/** Tradução de classificação de políticas */
function policyCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    monetary_policy: 'política monetária',
    regulatory: 'supervisão',
    industry: 'política industrial',
    fiscal: 'política fiscal',
    other: 'outro',
  }
  return map[category] ?? category
}

export function DataCollectionTab() {
  const [dates, setDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [data, setData] = useState<DataCollectionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  // inicialização：Datas disponíveis para as quais os registros de coleta de dados são carregados
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const availableDates = await fetchAvailableDates('data-collection')
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

  // Carregar dados ao mudar de data
  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchDataCollection(selectedDate)
        if (cancelled) return
        setData(result)
        setExpandedSection(null)
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
    return <div className="h-full flex items-center justify-center text-slate-500">Carregando resultados da coleta de dados...</div>
  }

  const factPool = data?.factPool ?? null
  const llmExtraction = data?.llmExtraction ?? null

  return (
    <div className="space-y-3 pb-20">
      {/* título + selecionador de data */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">AI coleta de dados</h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-slate-400 animate-pulse">carregando...</span>}
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
          {/* FactPool Visão geral */}
          {factPool ? (
            <FactPoolPanel factPool={factPool} expandedSection={expandedSection} onToggle={setExpandedSection} />
          ) : (
            <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-sm text-slate-400">mesmo dia FactPool está vazio — A análise fora do horário comercial ainda não foi executada</div>
              <div className="text-xs text-slate-400 mt-1">correr"Análise após o expediente"será coletado automaticamente mais tarde 8 individual Agent dados</div>
            </div>
          )}

          {/* LLM Extrair resultados */}
          {llmExtraction ? (
            <LLMExtractionPanel extraction={llmExtraction} />
          ) : (
            <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-sm text-slate-400">mesmo dia LLM O resultado da extração está vazio</div>
              <div className="text-xs text-slate-400 mt-1">A análise fora do horário comercial será chamada automaticamente após a execução LLM Faça um anúncio/notícias/extração de emoção</div>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <div className="text-center text-sm text-slate-400 py-12">Ainda não há registros de coleta de dados disponíveis</div>
      )}
    </div>
  )
}

// ── FactPool painel ──────────────────────────────────────────

function FactPoolPanel({ factPool, expandedSection, onToggle }: {
  factPool: FactPool
  expandedSection: string | null
  onToggle: (section: string | null) => void
}) {
  const primarySocialSentiment = factPool.socialSentiment.filter((snapshot) => snapshot.sourceKind === 'primary_sentiment')
  const supplementarySocialSentiment = factPool.socialSentiment.filter((snapshot) => snapshot.sourceKind === 'supplementary_heat')
  const platformLabelMap: Record<string, string> = {
    xueqiu: 'bola de neve',
    weibo: 'Weibo',
    guba: 'Barra de estoque/Lista quente',
    eastmoney_hot: 'Lista quente de riqueza oriental',
  }

  return (
    <div className="space-y-3">
      {/* FactPool Cartão de visão geral */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard label="Data dos dados" value={factPool.tradeDate} />
        <SummaryCard label="Hora de atualização" value={new Date(factPool.updatedAt).toLocaleString('zh-CN')} />
        <SummaryCard label="Agent quantidade" value={String(factPool.agentLogs.length)} />
        <SummaryCard
          label="Qualidade dos dados"
          value={factPool.dataQuality ? `${Math.round(factPool.dataQuality.overallScore)}apontar` : 'Não avaliado'}
        />
      </div>

      {/* Agent sumário executivo */}
      {factPool.agentLogs.length > 0 && (
        <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">Agent sumário executivo</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 p-4">
            {factPool.agentLogs.map((log) => (
              <div key={log.agentId} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">{agentLabel(log.agentId)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${log.successRate >= 0.8 ? 'bg-green-100 text-green-700' : log.successRate >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {Math.round(log.successRate * 100)}%
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>pontos de dados: {log.dataPointCount}</div>
                  <div>demorado: {log.elapsedMs}ms</div>
                  {(() => {
                    const messageStyle = getAgentMessageStyle(log)
                    if (!messageStyle) return null
                    return (
                      <div className={`${messageStyle.toneClass} truncate`} title={log.errors.join('; ')}>
                        {messageStyle.prefix}: {log.errors[0]}
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macroeconomia */}
      {factPool.macroData && (
        <CollapsibleSection
          title="dados macroeconômicos"
          expanded={expandedSection === 'macro'}
          onToggle={() => onToggle(expandedSection === 'macro' ? null : 'macro')}
        >
          <div className="grid grid-cols-3 gap-3 text-xs">
            <DataItem label="GDP Taxa de crescimento" value={factPool.macroData.gdpGrowth !== null ? `${factPool.macroData.gdpGrowth.toFixed(1)}%` : 'Sem dados'} />
            <DataItem label="CPI" value={factPool.macroData.cpi !== null ? `${factPool.macroData.cpi.toFixed(1)}%` : 'Sem dados'} />
            <DataItem label="PMI" value={factPool.macroData.pmi !== null ? `${factPool.macroData.pmi.toFixed(1)}` : 'Sem dados'} />
            <DataItem label="taxa de juro" value={factPool.macroData.interestRate !== null ? `${factPool.macroData.interestRate.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="Dólar/RMB" value={factPool.macroData.exchangeRateUsdCny !== null ? factPool.macroData.exchangeRateUsdCny.toFixed(4) : 'Sem dados'} />
            <DataItem label="10YRendimento do Tesouro" value={factPool.macroData.treasuryYield10y !== null ? `${factPool.macroData.treasuryYield10y.toFixed(2)}%` : 'Sem dados'} />
          </div>
        </CollapsibleSection>
      )}

      {/* eventos políticos */}
      {factPool.policyEvents.length > 0 && (
        <CollapsibleSection
          title={`eventos políticos（${factPool.policyEvents.length} tira）`}
          expanded={expandedSection === 'policy'}
          onToggle={() => onToggle(expandedSection === 'policy' ? null : 'policy')}
        >
          <div className="space-y-2">
            {factPool.policyEvents.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">{event.title}</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]">
                    {policyCategoryLabel(event.category)}
                  </span>
                </div>
                <div className="text-slate-500">fonte: {event.source} | liberar: {event.publishedAt}</div>
                {event.affectedSectors.length > 0 && (
                  <div className="text-slate-500 mt-0.5">Setor de influência: {event.affectedSectors.join('、')}</div>
                )}
                {event.rawText && (
                  <div className="text-slate-600 mt-1 leading-relaxed line-clamp-2">{event.rawText}</div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* anúncio da empresa */}
      {factPool.companyAnnouncements.length > 0 && (
        <CollapsibleSection
          title={`anúncio da empresa（${factPool.companyAnnouncements.length} tira）`}
          expanded={expandedSection === 'announcements'}
          onToggle={() => onToggle(expandedSection === 'announcements' ? null : 'announcements')}
        >
          <div className="space-y-2">
            {factPool.companyAnnouncements.map((ann, index) => (
              <div key={`${ann.code}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">{ann.name}({ann.code})</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px]">
                    {announcementCategoryLabel(ann.category)}
                  </span>
                  {ann.importance === 'major' && (
                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">principal</span>
                  )}
                </div>
                <div className="text-slate-700">{ann.title}</div>
                {ann.rawText && (
                  <div className="text-slate-600 mt-1 leading-relaxed line-clamp-2">{ann.rawText}</div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Notícias da indústria */}
      {factPool.industryNews.length > 0 && (
        <CollapsibleSection
          title={`Notícias da indústria（${factPool.industryNews.length} tira）`}
          expanded={expandedSection === 'news'}
          onToggle={() => onToggle(expandedSection === 'news' ? null : 'news')}
        >
          <div className="space-y-2">
            {factPool.industryNews.map((news) => (
              <div key={news.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-800">{news.title}</span>
                </div>
                <div className="text-slate-500">fonte: {news.source} | liberar: {news.publishedAt}</div>
                {news.sectors.length > 0 && (
                  <div className="text-slate-500 mt-0.5">Envolvendo setores: {news.sectors.join('、')}</div>
                )}
                {news.rawSummary && (
                  <div className="text-slate-600 mt-1 leading-relaxed line-clamp-2">{news.rawSummary}</div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* emoções sociais */}
      {factPool.socialSentiment.length > 0 && (
        <CollapsibleSection
          title={`emoções sociais（${factPool.socialSentiment.length} instantâneos）`}
          expanded={expandedSection === 'sentiment'}
          onToggle={() => onToggle(expandedSection === 'sentiment' ? null : 'sentiment')}
        >
          <div className="space-y-2">
            {primarySocialSentiment.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">principal fonte de opinião pública</div>
                {primarySocialSentiment.map((snap, index) => (
                  <div key={`${snap.platform}-${index}`} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{platformLabelMap[snap.platform] ?? snap.platform}</span>
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700">verdadeira opinião pública</span>
                      <span className="text-slate-400">{snap.collectedAt}</span>
                    </div>
                    <div className="text-slate-600">{snap.summary}</div>
                    <div className="flex gap-3 text-slate-600 mt-1">
                      <span className="text-red-600">muitos {Math.round(snap.overallBullBearRatio.bull * 100)}%</span>
                      <span className="text-green-600">nulo {Math.round(snap.overallBullBearRatio.bear * 100)}%</span>
                      <span>meio {Math.round(snap.overallBullBearRatio.neutral * 100)}%</span>
                    </div>
                    {snap.hotTopics.length > 0 && (
                      <div className="text-slate-500 mt-1">calorosamente discutido: {snap.hotTopics.slice(0, 5).join('、')}</div>
                    )}
                    {snap.topMentionedStocks.length > 0 && (
                      <div className="text-slate-500 mt-0.5">
                        Ações quentes: {snap.topMentionedStocks.slice(0, 5).map((s) => `${s.code}(${s.mentionCount})`).join('、')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {supplementarySocialSentiment.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suplemento de lista quente</div>
                {supplementarySocialSentiment.map((snap, index) => (
                  <div key={`${snap.platform}-supplementary-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{platformLabelMap[snap.platform] ?? snap.platform}</span>
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">Suplemento de ponto de acesso</span>
                      <span className="text-slate-400">{snap.collectedAt}</span>
                    </div>
                    <div className="text-slate-600">{snap.summary}</div>
                    <div className="flex gap-3 text-slate-600 mt-1">
                      <span className="text-red-600">muitos {Math.round(snap.overallBullBearRatio.bull * 100)}%</span>
                      <span className="text-green-600">nulo {Math.round(snap.overallBullBearRatio.bear * 100)}%</span>
                      <span>meio {Math.round(snap.overallBullBearRatio.neutral * 100)}%</span>
                    </div>
                    {snap.hotTopics.length > 0 && (
                      <div className="text-slate-500 mt-1">calorosamente discutido: {snap.hotTopics.slice(0, 5).join('、')}</div>
                    )}
                    {snap.topMentionedStocks.length > 0 && (
                      <div className="text-slate-500 mt-0.5">
                        Ações quentes: {snap.topMentionedStocks.slice(0, 5).map((s) => `${s.code}(${s.mentionCount})`).join('、')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* mercado global */}
      {factPool.globalMarkets && (
        <CollapsibleSection
          title="Instantâneo do mercado global"
          expanded={expandedSection === 'global'}
          onToggle={() => onToggle(expandedSection === 'global' ? null : 'global')}
        >
          <div className="grid grid-cols-4 gap-3 text-xs">
            <DataItem label="S&P500" value={factPool.globalMarkets.sp500Change !== null ? `${factPool.globalMarkets.sp500Change > 0 ? '+' : ''}${factPool.globalMarkets.sp500Change.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="Nasdaq" value={factPool.globalMarkets.nasdaqChange !== null ? `${factPool.globalMarkets.nasdaqChange > 0 ? '+' : ''}${factPool.globalMarkets.nasdaqChange.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="Índice Hang Seng" value={factPool.globalMarkets.hsiChange !== null ? `${factPool.globalMarkets.hsiChange > 0 ? '+' : ''}${factPool.globalMarkets.hsiChange.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="A50 futuros" value={factPool.globalMarkets.a50FuturesChange !== null ? `${factPool.globalMarkets.a50FuturesChange > 0 ? '+' : ''}${factPool.globalMarkets.a50FuturesChange.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="Dólar/RMB" value={factPool.globalMarkets.usdCnyRate !== null ? factPool.globalMarkets.usdCnyRate.toFixed(4) : 'Sem dados'} />
            <DataItem label="bruto" value={factPool.globalMarkets.crudeOilChange !== null ? `${factPool.globalMarkets.crudeOilChange > 0 ? '+' : ''}${factPool.globalMarkets.crudeOilChange.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="ouro" value={factPool.globalMarkets.goldChange !== null ? `${factPool.globalMarkets.goldChange > 0 ? '+' : ''}${factPool.globalMarkets.goldChange.toFixed(2)}%` : 'Sem dados'} />
            <DataItem label="lindo10Ydívida nacional" value={factPool.globalMarkets.us10yYieldChange !== null ? `${factPool.globalMarkets.us10yYieldChange > 0 ? '+' : ''}${factPool.globalMarkets.us10yYieldChange.toFixed(3)}%` : 'Sem dados'} />
          </div>
        </CollapsibleSection>
      )}

      {/* Relatório de qualidade de dados */}
      {factPool.dataQuality && (
        <CollapsibleSection
          title={`Relatório de qualidade de dados（pontuação total ${Math.round(factPool.dataQuality.overallScore * 100)}）`}
          expanded={expandedSection === 'quality'}
          onToggle={() => onToggle(expandedSection === 'quality' ? null : 'quality')}
        >
          <div className="space-y-2">
            {factPool.dataQuality.agentResults.map((result) => (
              <div key={result.agentId} className="flex items-center gap-3 text-xs rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                <span className="font-medium text-slate-700 w-24">{agentLabel(result.agentId)}</span>
                <span className={`px-1.5 py-0.5 rounded ${result.isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {result.isComplete ? 'todo' : 'incompleto'}
                </span>
                <span className="text-slate-500">Confiabilidade {Math.round(result.reliabilityScore * 100)}%</span>
                {result.missingFields.length > 0 && (
                  <span className="text-amber-600 truncate" title={result.missingFields.join(', ')}>
                    Ausente: {result.missingFields.join(', ')}
                  </span>
                )}
                {result.anomalies.length > 0 && (
                  <span className="text-red-600 truncate" title={result.anomalies.join(', ')}>
                    anormal: {result.anomalies[0]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// ── LLM Extrair painel de resultados ──────────────────────────────────────

function LLMExtractionPanel({ extraction }: { extraction: LLMExtractionResult }) {
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700 text-sm">
          LLM Extrair resultados
          <span className="ml-2 text-xs text-slate-400 font-normal">
            {new Date(extraction.extractedAt).toLocaleString('zh-CN')}
          </span>
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* LLM registro de chamadas */}
        {extraction.llmCalls.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">LLM registro de chamadas</div>
            <div className="grid grid-cols-3 gap-2">
              {extraction.llmCalls.map((call, index) => (
                <div key={`${call.agent}-${index}`} className={`rounded-lg border p-2.5 text-xs ${call.success ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700">{call.agent}</span>
                    <span className={call.success ? 'text-green-600' : 'text-red-600'}>
                      {call.success ? 'sucesso' : 'falhar'}
                    </span>
                  </div>
                  <div className="text-slate-500">Modelo: {call.model} | demorado: {call.latencyMs}ms</div>
                  {call.error && <div className="text-red-600 mt-0.5 truncate" title={call.error}>{call.error}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evento de anúncio */}
        {extraction.announcements.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">Evento de anúncio（{extraction.announcements.length} tira）</div>
            <div className="space-y-1.5">
              {extraction.announcements.map((ann, index) => (
                <div key={`ann-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{ann.company}</span>
                    <span className="text-slate-500">{ann.eventType}</span>
                    <span className={`px-1 py-0.5 rounded ${ann.sentiment > 0 ? 'bg-red-100 text-red-700' : ann.sentiment < 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      humor {ann.sentiment > 0 ? '+' : ''}{ann.sentiment.toFixed(1)}
                    </span>
                    <span className="text-slate-500">confiança {Math.round(ann.confidence * 100)}%</span>
                  </div>
                  {ann.riskFlags.length > 0 && (
                    <div className="text-red-600 mt-1">marca de risco: {ann.riskFlags.join('、')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* impacto das notícias */}
        {extraction.newsImpacts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">impacto das notícias（{extraction.newsImpacts.length} tira）</div>
            <div className="space-y-1.5">
              {extraction.newsImpacts.map((news, index) => (
                <div key={`news-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{news.topic}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${news.impactDirection === 'bom' ? 'bg-red-100 text-red-700' : news.impactDirection === 'Ruim' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {news.impactDirection}
                    </span>
                    <span className="text-slate-500">{news.impactLevel}</span>
                  </div>
                  {news.affectedSectors.length > 0 && (
                    <div className="text-slate-500 mt-1">Setor de influência: {news.affectedSectors.join('、')}</div>
                  )}
                  {news.affectedStocks.length > 0 && (
                    <div className="text-slate-500 mt-0.5">Afetar ações individuais: {news.affectedStocks.join('、')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* índice de sentimento */}
        {extraction.sentimentIndex && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">índice de sentimento</div>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <DataItem label="Emoções abrangentes" value={extraction.sentimentIndex.overallSentiment.toFixed(2)} />
              <DataItem label="proporção longa" value={`${Math.round(extraction.sentimentIndex.bullRatio * 100)}%`} />
              <DataItem label="proporção curta" value={`${Math.round(extraction.sentimentIndex.bearRatio * 100)}%`} />
              <DataItem label="24h mudar" value={`${extraction.sentimentIndex.sentimentChange24h > 0 ? '+' : ''}${extraction.sentimentIndex.sentimentChange24h.toFixed(2)}`} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Pastoreio: {extraction.sentimentIndex.herdingSignal === 'none' ? 'nenhum' : extraction.sentimentIndex.herdingSignal === 'moderate' ? 'médio' : 'extremo'}</span>
              {extraction.sentimentIndex.hotTopics.length > 0 && (
                <span>| calorosamente discutido: {extraction.sentimentIndex.hotTopics.slice(0, 5).join('、')}</span>
              )}
            </div>
          </div>
        )}

        {/* Todos os prompts vazios */}
        {extraction.announcements.length === 0 && extraction.newsImpacts.length === 0 && !extraction.sentimentIndex && (
          <div className="text-center text-xs text-slate-400 py-4">LLM O resultado da extração está vazio</div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponente comum ──────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-xl p-3 shadow-sm">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
    </div>
  )
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 border border-slate-100 p-2.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function CollapsibleSection({ title, expanded, onToggle, children }: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
