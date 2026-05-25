import React, { useState, useEffect, useCallback } from 'react'
import { useDashboardAPI } from './useDashboardAPI'
import type { GeralData, LojaResumo, LojaDetail } from './useDashboardAPI'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Target, Calendar, Users, FileText, BarChart3, Wallet, Store, PenSquare } from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function formatMoney(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNum(v: number) {
  return v.toLocaleString('pt-BR')
}

function round(v: number, decimals: number) {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'up') return <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full border border-green-700"><TrendingUp className="w-3 h-3" />Alta</span>
  if (trend === 'down') return <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-900/40 px-2 py-0.5 rounded-full border border-red-700"><TrendingDown className="w-3 h-3" />Queda</span>
  return <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-900/40 px-2 py-0.5 rounded-full border border-yellow-700"><Minus className="w-3 h-3" />Estável</span>
}

type Tab = 'geral' | 'loja' | 'dre' | 'fluxo'

export default function DashboardPage() {
  const api = useDashboardAPI()
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<Tab>('geral')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [storeId, setStoreId] = useState<string>('todas')

  const [geral, setGeral] = useState<GeralData | null>(null)
  const [lojas, setLojas] = useState<LojaResumo[]>([])
  const [detail, setDetail] = useState<LojaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.login('tokio-dashboard-mvp-2026').then(() => {
      setAuthed(true)
    }).catch(() => setAuthed(false))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [g, l] = await Promise.all([
        api.fetchGeral(year, month),
        api.fetchLojas(year, month),
      ])
      setGeral(g)
      setLojas(l)
      if (storeId !== 'todas') {
        const d = await api.fetchLojaDetail(storeId, year, month)
        setDetail(d)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [year, month, storeId])

  useEffect(() => {
    if (authed) loadData()
  }, [authed, loadData])

  const prevMonth = () => {
    let m = month - 1, y = year
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }
  const nextMonth = () => {
    let m = month + 1, y = year
    if (m > 12) { m = 1; y++ }
    setMonth(m); setYear(y)
  }

  if (!authed) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-lg">Autenticando...</div>
      </div>
    )
  }

  if (loading && !geral) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-gray-800 rounded-xl p-6 space-y-3"><div className="h-5 w-32 bg-gray-700 rounded animate-pulse" /><div className="h-8 w-40 bg-gray-700 rounded animate-pulse" /></div>)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">Tentar novamente</button>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'geral', label: 'Visão Geral', icon: BarChart3 },
    { id: 'loja', label: 'Por Loja', icon: Store },
    { id: 'dre', label: 'DRE', icon: FileText },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: Wallet },
  ]

  const KPICard = ({ label, value, sub, color = 'text-white', icon: Icon }: { label: string; value: string; sub?: string; color?: string; icon: React.ElementType }) => (
    <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color.replace('text-', 'text-').replace('white', 'gray-400')}`} />
      </div>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Dashboard Executivo</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-700 rounded-l-lg transition-colors"><ChevronLeft className="w-4 h-4 text-gray-300" /></button>
            <span className="px-4 py-2 text-sm font-medium text-white min-w-[140px] text-center">{MESES[month-1]} {year}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-700 rounded-r-lg transition-colors"><ChevronRight className="w-4 h-4 text-gray-300" /></button>
          </div>
          {tab === 'loja' && (
            <select
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="bg-gray-800 text-white text-sm border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="todas">Todas as lojas</option>
              {lojas.map(l => <option key={l.store_id} value={l.store_id}>{l.store_name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50 w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setStoreId('todas') }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      {!loading && tab === 'geral' && geral && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Faturamento do Mês" value={formatMoney(geral.summary.monthly_revenue)} sub={`Meta: ${formatMoney(geral.summary.monthly_goal)}`} color="text-green-400" icon={DollarSign} />
            <KPICard label="Gap Mensal" value={formatMoney(geral.summary.monthly_gap)} sub={geral.summary.monthly_goal > 0 ? `${((geral.summary.monthly_gap / geral.summary.monthly_goal) * 100).toFixed(1)}% abaixo da meta` : ''} color="text-red-400" icon={Target} />
            <KPICard label="Faturamento do Dia" value={formatMoney(geral.summary.daily_revenue)} sub={`Meta diária: ${formatMoney(geral.summary.daily_goal)}`} color="text-blue-400" icon={TrendingUp} />
            <KPICard label="Vendas do Dia Anterior" value={formatMoney(geral.summary.previous_day_revenue)} sub={`${geral.summary.sales_count} vendas`} color="text-purple-400" icon={ShoppingCart} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Ticket Médio (R$)" value={formatMoney(geral.summary.ticket_avg_revenue)} sub="Por venda" color="text-yellow-400" icon={DollarSign} />
            <KPICard label="Ticket Médio (Produtos)" value={formatNum(geral.summary.ticket_avg_products)} sub="Itens por venda" color="text-orange-400" icon={ShoppingCart} />
            <KPICard label="Produtos Vendidos" value={formatNum(geral.summary.products_sold_count)} sub={`${geral.summary.sales_count} vendas`} color="text-cyan-400" icon={BarChart3} />
            <KPICard label="Dias Trabalhados" value={formatNum(geral.summary.working_days)} sub={`${MESES[month-1]} ${year}`} color="text-gray-300" icon={Calendar} />
          </div>
          <div className="flex items-center gap-3 bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
            <span className="text-sm text-gray-400">Tendência de faturamento:</span>
            <TrendBadge trend={geral.summary.revenue_trend} />
            <span className="text-xs text-gray-500 ml-auto">{geral.total_stores} lojas</span>
          </div>

          {geral.dre && Object.keys(geral.dre).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> DRE Consolidado</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(geral.dre).map(([k, v]) => (
                  <div key={k} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400 uppercase mb-1">{k.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-semibold text-white">{formatMoney(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {geral.cash_flow && Object.keys(geral.cash_flow).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Fluxo de Caixa Consolidado</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(geral.cash_flow).map(([k, v]) => (
                  <div key={k} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400 uppercase mb-1">{k.replace(/_/g, ' ')}</div>
                    <div className="text-sm font-semibold text-white">{formatMoney(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'loja' && (
        <div className="space-y-4">
          {(storeId === 'todas' ? lojas : lojas.filter(l => l.store_id === storeId)).map(loja => (
            <StoreCard key={loja.store_id} loja={loja} year={year} month={month} api={api} onUpdate={loadData} />
          ))}
        </div>
      )}

      {!loading && tab === 'dre' && (
        <div className="space-y-4">
          {(storeId === 'todas' ? lojas : lojas.filter(l => l.store_id === storeId)).map(loja => (
            <DreTable key={loja.store_id} storeId={loja.store_id} storeName={loja.store_name} year={year} month={month} api={api} />
          ))}
        </div>
      )}

      {!loading && tab === 'fluxo' && (
        <div className="space-y-4">
          {(storeId === 'todas' ? lojas : lojas.filter(l => l.store_id === storeId)).map(loja => (
            <CashFlowTable key={loja.store_id} storeId={loja.store_id} storeName={loja.store_name} year={year} month={month} api={api} />
          ))}
        </div>
      )}
    </div>
  )
}

function StoreCard({ loja, year, month, api, onUpdate }: { loja: LojaResumo; year: number; month: number; api: ReturnType<typeof useDashboardAPI>; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [goal, setGoal] = useState(loja.monthly_goal)
  const [saving, setSaving] = useState(false)

  const handleSaveGoal = async () => {
    setSaving(true)
    try {
      const daysInMonth = new Date(year, month, 0).getDate()
      const dailyGoal = round(goal / daysInMonth, 2)
      await api.registrarMensal({
        store_id: loja.store_id,
        year,
        month,
        monthly_goal: goal,
        daily_goal: dailyGoal,
        monthly_revenue: loja.monthly_revenue,
        daily_revenue: loja.daily_revenue,
        monthly_gap: goal - loja.monthly_revenue,
        daily_gap: dailyGoal - loja.daily_revenue,
        ticket_avg_revenue: loja.ticket_avg_revenue,
        ticket_avg_products: loja.ticket_avg_products,
        previous_day_revenue: loja.previous_day_revenue,
        revenue_trend: loja.revenue_trend,
        working_days: loja.working_days,
        sales_count: loja.sales_count,
        products_sold_count: loja.products_sold_count,
      })
      setEditing(false)
      onUpdate()
    } catch (e) {
      alert('Erro ao salvar meta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{loja.store_name}</h3>
        <div className="flex items-center gap-2">
          <TrendBadge trend={loja.revenue_trend} />
          {!editing ? (
            <button onClick={() => { setGoal(loja.monthly_goal); setEditing(true) }} className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400">
              <PenSquare className="w-3 h-3" /> Meta
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number" step="1000"
                value={goal}
                onChange={e => setGoal(parseFloat(e.target.value) || 0)}
                className="w-32 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm text-right"
              />
              <button onClick={handleSaveGoal} disabled={saving} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50">
                {saving ? '...' : 'OK'}
              </button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-400">X</button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div>
          <div className="text-xs text-gray-400 uppercase">Faturamento Mês</div>
          <div className="text-lg font-bold text-green-400">{formatMoney(loja.monthly_revenue)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Meta Mensal</div>
          <div className="text-lg font-bold text-white">{formatMoney(loja.monthly_goal)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Gap Mensal</div>
          <div className={`text-lg font-bold ${loja.monthly_gap > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(loja.monthly_gap)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Meta Dia</div>
          <div className="text-lg font-bold text-white">{formatMoney(loja.daily_goal)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Faturamento Dia</div>
          <div className="text-lg font-bold text-blue-400">{formatMoney(loja.daily_revenue)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Gap Dia</div>
          <div className={`text-lg font-bold ${loja.daily_gap > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(loja.daily_gap)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">TM R$</div>
          <div className="text-lg font-bold text-yellow-400">{formatMoney(loja.ticket_avg_revenue)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">TM Produtos</div>
          <div className="text-lg font-bold text-orange-400">{formatNum(loja.ticket_avg_products)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Venda Dia Anterior</div>
          <div className="text-lg font-bold text-purple-400">{formatMoney(loja.previous_day_revenue)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase">Dias Trabalhados</div>
          <div className="text-lg font-bold text-gray-300">{loja.working_days}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-700/50 text-xs text-gray-500">
        <span>{formatNum(loja.sales_count)} vendas</span>
        <span>{formatNum(loja.products_sold_count)} produtos</span>
        {loja.monthly_goal > 0 && (
          <span className="text-green-400/70">{((loja.monthly_revenue / loja.monthly_goal) * 100).toFixed(0)}% da meta atingido</span>
        )}
      </div>
    </div>
  )
}

function DreTable({ storeId, storeName, year, month, api }: { storeId: string; storeName: string; year: number; month: number; api: ReturnType<typeof useDashboardAPI> }) {
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.fetchLojaDetail(storeId, year, month).then(d => {
      const dre = d.dre?.[0] || {}
      setData(dre)
      setForm({ ...dre, store_id: storeId, year, month })
    }).catch(() => { setData({}); setForm({ store_id: storeId, year, month }) })
  }, [storeId, year, month])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.registrarDre(form)
      setData({ ...form })
      setEditing(false)
    } catch (e) {
      alert('Erro ao salvar DRE')
    } finally {
      setSaving(false)
    }
  }

  const DRE_FIELDS = [
    { label: 'Receita Bruta', key: 'gross_revenue' },
    { label: 'Deduções', key: 'deductions' },
    { label: 'Receita Líquida', key: 'net_revenue' },
    { label: 'Custos (COGS)', key: 'cogs' },
    { label: 'Lucro Bruto', key: 'gross_profit' },
    { label: 'Despesas Operacionais', key: 'operating_expenses' },
    { label: 'Folha de Pagamento', key: 'payroll' },
    { label: 'Aluguel', key: 'rent' },
    { label: 'Utilidades', key: 'utilities' },
    { label: 'Marketing', key: 'marketing' },
    { label: 'Outras Despesas', key: 'other_expenses' },
    { label: 'EBITDA', key: 'ebitda' },
    { label: 'Despesas Financeiras', key: 'financial_expenses' },
    { label: 'Impostos', key: 'taxes' },
    { label: 'Lucro Líquido', key: 'net_profit' },
  ]

  if (!data) return <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 animate-pulse h-32" />

  if (editing) {
    return (
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{storeName} — DRE {month}/{year}</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DRE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 uppercase block mb-1">{f.label}</label>
              <input
                type="number" step="0.01"
                value={form[f.key] ?? 0}
                onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rows = [
    { label: 'Receita Bruta', key: 'gross_revenue', color: 'text-green-400' },
    { label: 'Deduções', key: 'deductions', color: 'text-red-400' },
    { label: 'Receita Líquida', key: 'net_revenue', color: 'text-blue-400', bold: true },
    { label: 'Custos (COGS)', key: 'cogs', color: 'text-red-400' },
    { label: 'Lucro Bruto', key: 'gross_profit', color: 'text-green-400', bold: true },
    { label: 'Despesas Operacionais', key: 'operating_expenses', color: 'text-red-400' },
    { label: '  Folha de Pagamento', key: 'payroll', color: 'text-red-300' },
    { label: '  Aluguel', key: 'rent', color: 'text-red-300' },
    { label: '  Utilidades', key: 'utilities', color: 'text-red-300' },
    { label: '  Marketing', key: 'marketing', color: 'text-red-300' },
    { label: '  Outras Despesas', key: 'other_expenses', color: 'text-red-300' },
    { label: 'EBITDA', key: 'ebitda', color: 'text-green-400', bold: true },
    { label: 'Despesas Financeiras', key: 'financial_expenses', color: 'text-red-400' },
    { label: 'Impostos', key: 'taxes', color: 'text-red-400' },
    { label: 'Lucro Líquido', key: 'net_profit', color: (data.net_profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400', bold: true },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{storeName} — DRE</h3>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">
          <PenSquare className="w-3.5 h-3.5" /> Editar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 uppercase text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-4">Conta</th>
              <th className="text-right py-2">Valor</th>
              <th className="text-right py-2 pl-4">% Receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const val = data[r.key] || 0
              const pct = data.gross_revenue ? (val / data.gross_revenue) * 100 : 0
              return (
                <tr key={r.key} className={`border-b border-gray-700/30 ${r.bold ? 'font-semibold' : ''}`}>
                  <td className={`py-2 pr-4 ${r.color}`}>{r.label}</td>
                  <td className={`text-right py-2 ${r.color}`}>{formatMoney(val)}</td>
                  <td className={`text-right py-2 pl-4 text-gray-500`}>{pct.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CashFlowTable({ storeId, storeName, year, month, api }: { storeId: string; storeName: string; year: number; month: number; api: ReturnType<typeof useDashboardAPI> }) {
  const [data, setData] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.fetchLojaDetail(storeId, year, month).then(d => {
      const cf = d.cash_flow?.[0] || {}
      setData(cf)
      setForm({ ...cf, store_id: storeId, year, month })
    }).catch(() => { setData({}); setForm({ store_id: storeId, year, month }) })
  }, [storeId, year, month])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.registrarFluxoCaixa(form)
      setData({ ...form })
      setEditing(false)
    } catch (e) {
      alert('Erro ao salvar Fluxo de Caixa')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 animate-pulse h-20" />

  if (editing) {
    return (
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{storeName} — Fluxo de Caixa {month}/{year}</h3>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Saldo Inicial', key: 'opening_balance' },
            { label: 'Entradas', key: 'inflows' },
            { label: 'Saídas', key: 'outflows' },
            { label: 'Saldo Final', key: 'closing_balance' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 uppercase block mb-1">{f.label}</label>
              <input
                type="number" step="0.01"
                value={form[f.key] ?? 0}
                onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rows = [
    { label: 'Saldo Inicial', key: 'opening_balance', color: 'text-blue-400' },
    { label: 'Entradas', key: 'inflows', color: 'text-green-400' },
    { label: 'Saídas', key: 'outflows', color: 'text-red-400' },
    { label: 'Saldo Final', key: 'closing_balance', color: (data.closing_balance ?? 0) >= 0 ? 'text-green-400' : 'text-red-400', bold: true },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{storeName} — Fluxo de Caixa</h3>
        <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300">
          <PenSquare className="w-3.5 h-3.5" /> Editar
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {rows.map(r => {
          const val = data[r.key] || 0
          return (
            <div key={r.key} className="bg-gray-700/40 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase mb-1">{r.label}</div>
              <div className={`text-lg font-bold ${r.color} ${r.bold ? 'text-xl' : ''}`}>{formatMoney(val)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
