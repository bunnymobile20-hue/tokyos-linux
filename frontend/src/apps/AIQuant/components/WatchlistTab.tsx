/**
 * ações auto-selecionadas Tab — componentes autogerenciados，Ter fetch dados。
 * layout：lista de observação esquerda（procurar+formulário de estoque） | Detalhes à direita（OHLC Informação + K gráfico de velas de linha）
 * Exibição de uma tela，K Os diagramas de linha representam uma grande proporção。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import {
  addWatchlistStock,
  fetchWatchlist,
  removeWatchlistStock,
  searchStocks,
  updateWatchlistStockNote,
} from '../api'
import { getAutoRefreshIntervalMs, getMsUntilNextMarketBoundary } from '../autoRefresh'
import type {
  KlinePoint,
  StockSearchResult,
  UserWatchlistItem,
  WatchlistQuoteSnapshot,
  WatchlistResponse,
} from '../types'
import { formatPercent, formatPrice, percentTone } from '../utils'

/* ─── registro ───────────────────────────────────────────────────── */

const LOG_PREFIX = '[WatchlistTab]'

function logDebug(msg: string, ...args: unknown[]) {
  console.debug(`${LOG_PREFIX} ${msg}`, ...args)
}

function logError(msg: string, ...args: unknown[]) {
  console.error(`${LOG_PREFIX} ${msg}`, ...args)
}

/* ─── Função utilitária ─────────────────────────────────────────────── */

function formatVolume(vol: number): string {
  if (vol >= 1e8) return `${(vol / 1e8).toFixed(2)}100 milhões`
  if (vol >= 1e4) return `${(vol / 1e4).toFixed(0)}Dez mil`
  return `${vol}`
}

function formatMarketCap(cap: number): string {
  if (cap >= 1e8) return `${(cap / 1e8).toFixed(1)}100 milhões`
  if (cap >= 1e4) return `${(cap / 1e4).toFixed(0)}Dez mil`
  return `${cap}`
}

/* ─── K gráfico de velas de linha SVG ────────────────────────────────────────── */

const KLINE_PADDING = { top: 16, right: 12, bottom: 32, left: 56 }
const VOLUME_HEIGHT_RATIO = 0.2 // A área de volume de negociação é responsável pela altura total 20%

interface CandlestickChartProps {
  data: KlinePoint[]
  width?: number
  height?: number
}

function CandlestickChart({ data, width = 720, height = 420 }: CandlestickChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400 h-full">
        K Dados de linha insuficientes
      </div>
    )
  }

  const chartWidth = width - KLINE_PADDING.left - KLINE_PADDING.right
  const totalChartHeight = height - KLINE_PADDING.top - KLINE_PADDING.bottom
  const priceHeight = totalChartHeight * (1 - VOLUME_HEIGHT_RATIO) - 8 // 8px gap
  const volumeTop = KLINE_PADDING.top + priceHeight + 8
  const volumeHeight = totalChartHeight * VOLUME_HEIGHT_RATIO

  // faixa de preço
  const allHighs = data.map((d) => d.high)
  const allLows = data.map((d) => d.low)
  let priceMin = Math.min(...allLows)
  let priceMax = Math.max(...allHighs)
  if (priceMax === priceMin) { priceMin -= 1; priceMax += 1 }
  const priceRange = priceMax - priceMin
  priceMin -= priceRange * 0.05
  priceMax += priceRange * 0.05

  // Faixa de volume
  const volumes = data.map((d) => d.volume)
  const maxVolume = Math.max(...volumes, 1)

  // função de escala
  const candleWidth = Math.max(3, chartWidth / data.length * 0.7)
  const gap = chartWidth / data.length
  const xCenter = (i: number) => i * gap + gap / 2
  const yPrice = (v: number) => priceHeight - ((v - priceMin) / (priceMax - priceMin)) * priceHeight

  // linhas de grade de preços
  const priceGridCount = 4
  const priceStep = (priceMax - priceMin) / (priceGridCount + 1)
  const priceGridLines: number[] = []
  for (let i = 1; i <= priceGridCount; i++) {
    priceGridLines.push(priceMin + priceStep * i)
  }

  // X rótulos de eixo（Uniforme 5-6 individual）
  const maxLabels = Math.min(6, data.length)
  const labelIndices: number[] = []
  for (let i = 0; i < maxLabels; i++) {
    labelIndices.push(Math.round((i / (maxLabels - 1)) * (data.length - 1)))
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
      {/* área de preço */}
      <g transform={`translate(${KLINE_PADDING.left}, ${KLINE_PADDING.top})`}>
        {/* linhas de grade */}
        {priceGridLines.map((val) => (
          <g key={`pg-${val}`}>
            <line x1={0} y1={yPrice(val)} x2={chartWidth} y2={yPrice(val)} stroke="#e2e8f0" strokeDasharray="3,3" />
            <text x={-8} y={yPrice(val)} textAnchor="end" dominantBaseline="middle" className="text-[10px]" fill="#94a3b8">
              {val.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Vela */}
        {data.map((d, i) => {
          const cx = xCenter(i)
          const isUp = d.close >= d.open
          const color = isUp ? '#dc2626' : '#16a34a' // O vermelho sobe e o verde cai
          const bodyTop = yPrice(Math.max(d.open, d.close))
          const bodyBottom = yPrice(Math.min(d.open, d.close))
          const bodyH = Math.max(1, bodyBottom - bodyTop)

          return (
            <g key={`candle-${i}`}>
              {/* chocar */}
              <line x1={cx} y1={yPrice(d.high)} x2={cx} y2={yPrice(d.low)} stroke={color} strokeWidth={1} />
              {/* entidade */}
              <rect
                x={cx - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyH}
                fill={isUp ? '#fff' : color}
                stroke={color}
                strokeWidth={isUp ? 1.5 : 0.5}
              />
              <title>{`${d.date}\nabrir:${d.open.toFixed(2)} alto:${d.high.toFixed(2)}\nBaixo:${d.low.toFixed(2)} receber:${d.close.toFixed(2)}\naltos e baixos:${formatPercent(d.changePercent)}\nVolume:${formatVolume(d.volume)}`}</title>
            </g>
          )
        })}
      </g>

      {/* área de volume */}
      <g transform={`translate(${KLINE_PADDING.left}, ${volumeTop})`}>
        <line x1={0} y1={0} x2={chartWidth} y2={0} stroke="#e2e8f0" strokeDasharray="3,3" />
        {data.map((d, i) => {
          const cx = xCenter(i)
          const isUp = d.close >= d.open
          const color = isUp ? '#dc2626' : '#16a34a'
          const barH = Math.max(1, (d.volume / maxVolume) * volumeHeight)
          return (
            <rect
              key={`vol-${i}`}
              x={cx - candleWidth / 2}
              y={volumeHeight - barH}
              width={candleWidth}
              height={barH}
              fill={color}
              opacity={0.35}
            />
          )
        })}
        {/* Anotação de volume */}
        <text x={-8} y={4} textAnchor="end" dominantBaseline="middle" className="text-[9px]" fill="#94a3b8">
          {formatVolume(maxVolume)}
        </text>
        <text x={-8} y={volumeHeight} textAnchor="end" dominantBaseline="middle" className="text-[9px]" fill="#94a3b8">
          0
        </text>
      </g>

      {/* X rótulos de data do eixo */}
      <g transform={`translate(${KLINE_PADDING.left}, ${height - 4})`}>
        {labelIndices.map((i) => (
          <text key={`xl-${i}`} x={xCenter(i)} y={0} textAnchor="middle" className="text-[9px]" fill="#94a3b8">
            {data[i].date.slice(5)}
          </text>
        ))}
      </g>
    </svg>
  )
}

/* ─── Menu suspenso de pesquisa ──────────────────────────────────────────────── */

function SearchBar({ onAdd }: { onAdd: (stock: StockSearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await searchStocks(q)
      setResults(res)
      setOpen(res.length > 0)
    } catch (err) {
      logError('Falha na pesquisa', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void doSearch(value.trim()), 300)
  }

  const handleSelect = (stock: StockSearchResult) => {
    onAdd(stock)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  // Clique fora para fechar o menu suspenso
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 px-3 py-2">
        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Pesquise um símbolo ou nome de ação..."
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {loading && <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />}
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((stock) => (
            <button
              key={stock.code}
              onClick={() => handleSelect(stock)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{stock.code}</span>
                <span className="font-medium text-slate-700">{stock.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {stock.industryName && <span className="text-xs text-slate-400">{stock.industryName}</span>}
                <PlusIcon className="w-4 h-4 text-indigo-500" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Painel de detalhes ──────────────────────────────────────────────── */

interface DetailPanelProps {
  item: UserWatchlistItem
  quote: WatchlistQuoteSnapshot | null
  note: string
  onNoteChange: (note: string) => void
}

function DetailPanel({ item, quote, note, onNoteChange }: DetailPanelProps) {
  const [editingNote, setEditingNote] = useState(false)
  const [localNote, setLocalNote] = useState(note)

  useEffect(() => { setLocalNote(note); setEditingNote(false) }, [note])

  const saveNote = () => {
    onNoteChange(localNote)
    setEditingNote(false)
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-400">
        Os dados de mercado estão carregando...
      </div>
    )
  }

  const changeAmount = quote.latestPrice - quote.previousClose
  const tone = percentTone(quote.changePercent)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* linha de título de ações */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-slate-800">{quote.name}</h3>
            <span className="text-xs font-mono text-slate-500">{item.code}</span>
          </div>
          {item.industryName && <span className="text-xs text-slate-400">{item.industryName}</span>}
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${tone}`}>{formatPrice(quote.latestPrice)}</div>
          <div className={`text-sm ${tone}`}>
            {changeAmount >= 0 ? '+' : ''}{changeAmount.toFixed(2)} ({formatPercent(quote.changePercent)})
          </div>
        </div>
      </div>

      {/* OHLC grade de indicadores */}
      <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
        <MiniMetric label="abertura" value={formatPrice(quote.open)} tone={percentTone(quote.open - quote.previousClose)} />
        <MiniMetric label="Mais alto" value={formatPrice(quote.high)} tone="text-red-600" />
        <MiniMetric label="mais baixo" value={formatPrice(quote.low)} tone="text-green-600" />
        <MiniMetric label="Coletado ontem" value={formatPrice(quote.previousClose)} />
        <MiniMetric label="Volume" value={formatVolume(quote.volume)} />
        <MiniMetric label="taxa de rotatividade" value={`${quote.turnoverRate.toFixed(2)}%`} />
        <MiniMetric label="Capitalização total de mercado" value={formatMarketCap(quote.totalMarketCap)} />
        <MiniMetric label="Valor de mercado de circulação" value={formatMarketCap(quote.circulatingMarketCap)} />
      </div>

      {/* Observação */}
      <div className="mb-3 shrink-0">
        {editingNote ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-300"
              placeholder="Adicionar notas..."
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setEditingNote(false) }}
            />
            <button onClick={saveNote} className="text-xs text-indigo-600 font-medium hover:underline">salvar</button>
            <button onClick={() => setEditingNote(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setEditingNote(true)} className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
            {note ? `Observação: ${note}` : '+ Adicionar notas'}
          </button>
        )}
      </div>

      {/* K gráfico de linha（ocupar o espaço restante） */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex flex-col">
        <h4 className="font-semibold text-slate-700 text-sm mb-1 shrink-0">dia K Arame</h4>
        <div className="flex-1 min-h-0">
          <CandlestickChart data={quote.klineHistory} />
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-white/60 border border-slate-100 px-2 py-1.5">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className={`text-xs font-semibold ${tone || 'text-slate-700'}`}>{value}</div>
    </div>
  )
}

/* ─── componente principal ────────────────────────────────────────────────── */

export function WatchlistTab() {
  const [items, setItems] = useState<UserWatchlistItem[]>([])
  const [quotes, setQuotes] = useState<Record<string, WatchlistQuoteSnapshot>>({})
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Carregar dados */
  const loadData = useCallback(async () => {
    try {
      logDebug('Carregar lista de observação...')
      const resp: WatchlistResponse = await fetchWatchlist()
      setItems(resp.items)
      setQuotes(resp.quotes)
      setError(null)
      // Se o estoque atualmente selecionado não estiver mais na lista，Redefinir selecionado
      if (resp.items.length > 0) {
        setSelectedCode((prev) => {
          if (prev && resp.items.some((it) => it.code === prev)) return prev
          return resp.items[0].code
        })
      } else {
        setSelectedCode(null)
      }
      logDebug(`Carregamento concluído, ${resp.items.length} Apenas auto-selecionado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha no carregamento'
      logError('Falha ao carregar a seleção personalizada', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Atualização automática */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    // Julgamento do tempo de negociação：Fácil de usar autoRefresh intervalo（intradiário 30s，dia de folga 60s）
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const isTradingTime =
      (hour === 9 && minute >= 30) ||
      (hour === 10) ||
      (hour === 11 && minute < 30) ||
      (hour === 13) ||
      (hour === 14) ||
      (hour === 15 && minute === 0)
    const interval = getAutoRefreshIntervalMs(isTradingTime)
    const boundary = getMsUntilNextMarketBoundary(now)
    const delay = Math.min(interval, boundary)

    refreshTimerRef.current = setTimeout(() => {
      void loadData().then(() => scheduleRefresh())
    }, delay)
  }, [loadData])

  useEffect(() => {
    void loadData().then(() => scheduleRefresh())
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [loadData, scheduleRefresh])

  /* Adicione o seu próprio */
  const handleAdd = useCallback(async (stock: StockSearchResult) => {
    try {
      logDebug('Adicione o seu próprio:', stock.code, stock.name)
      const updated = await addWatchlistStock(stock)
      setItems(updated)
      setSelectedCode(stock.code)
      // Recarregar dados completos（Cotações contendo novas ações）
      void loadData()
    } catch (err) {
      logError('Falha ao adicionar opção', err)
    }
  }, [loadData])

  /* Remover personalizado */
  const handleRemove = useCallback(async (code: string) => {
    try {
      logDebug('Remover personalizado:', code)
      const updated = await removeWatchlistStock(code)
      setItems(updated)
      if (selectedCode === code) {
        setSelectedCode(updated.length > 0 ? updated[0].code : null)
      }
    } catch (err) {
      logError('Falha na remoção', err)
    }
  }, [selectedCode])

  /* Atualizar notas */
  const handleNoteChange = useCallback(async (code: string, note: string) => {
    try {
      logDebug('Atualizar notas:', code, note)
      const updated = await updateWatchlistStockNote(code, note)
      setItems(updated)
    } catch (err) {
      logError('Falha ao atualizar notas', err)
    }
  }, [])

  const selectedItem = items.find((it) => it.code === selectedCode) ?? null
  const selectedQuote = selectedCode ? (quotes[selectedCode] ?? null) : null

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        Carregando lista de observação...
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm max-w-md">
          <div className="text-red-600 font-bold mb-2">Falha ao carregar a seleção personalizada</div>
          <p className="text-sm text-slate-600">{error}</p>
          <button onClick={() => { setLoading(true); void loadData() }} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Tente novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">ações auto-selecionadas</h2>
        <span className="text-xs text-slate-400">{items.length}/50</span>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* coluna da esquerda：procurar + lista de ações */}
        <div className="w-[380px] shrink-0 flex flex-col min-h-0">
          <div className="mb-3 shrink-0">
            <SearchBar onAdd={(stock) => void handleAdd(stock)} />
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <StarIcon className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-sm">Atualmente não há ações autosselecionadas</p>
              <p className="text-xs mt-1">Use a caixa de pesquisa acima para adicionar</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200/60 bg-white/70">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm">
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="text-left px-3 py-2 font-medium">nome</th>
                    <th className="text-right px-2 py-2 font-medium">Preço atual</th>
                    <th className="text-right px-2 py-2 font-medium">Aumentar ou diminuir</th>
                    <th className="text-right px-2 py-2 font-medium">Volume</th>
                    <th className="text-center px-2 py-2 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const q = quotes[item.code]
                    const isSelected = selectedCode === item.code
                    return (
                      <tr
                        key={item.code}
                        onClick={() => setSelectedCode(item.code)}
                        className={`cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-700">{item.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{item.code}</div>
                        </td>
                        <td className={`text-right px-2 py-2 font-mono font-semibold ${q ? percentTone(q.changePercent) : 'text-slate-700'}`}>
                          {q ? formatPrice(q.latestPrice) : '--'}
                        </td>
                        <td className={`text-right px-2 py-2 font-mono font-semibold ${q ? percentTone(q.changePercent) : 'text-slate-700'}`}>
                          {q ? formatPercent(q.changePercent) : '--'}
                        </td>
                        <td className="text-right px-2 py-2 text-slate-500">
                          {q ? formatVolume(q.volume) : '--'}
                        </td>
                        <td className="text-center px-2 py-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); void handleRemove(item.code) }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            title="Remover personalizado"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* coluna da direita：Detalhes + K gráfico de linha */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 shadow-sm p-5">
          {selectedItem ? (
            <DetailPanel
              item={selectedItem}
              quote={selectedQuote}
              note={selectedItem.note}
              onNoteChange={(newNote) => void handleNoteChange(selectedItem.code, newNote)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              {items.length > 0 ? 'Selecione o estoque à esquerda para ver detalhes' : 'Adicione suas próprias ações para começar'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
