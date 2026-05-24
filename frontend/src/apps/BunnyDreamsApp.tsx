import { useState, useEffect } from 'react'

interface KpiCard {
  label: string
  value: string
  change: string
  positive: boolean
}

interface TabelaItem {
  label: string
  valor: string
  status: string
}

const MOCK_DATA: Record<string, { kpis: KpiCard[]; tabela: TabelaItem[] }> = {
  vendas: {
    kpis: [
      { label: 'Faturamento Hoje', value: 'R$ 12.450,00', change: '+18%', positive: true },
      { label: 'Faturamento Mês', value: 'R$ 145.200,00', change: '+12%', positive: true },
      { label: 'Ticket Médio', value: 'R$ 89,50', change: '+5%', positive: true },
      { label: 'Meta Atingida', value: '78%', change: '+8%', positive: true },
    ],
    tabela: [
      { label: 'Loja Centro', valor: 'R$ 42.300,00', status: 'Meta 85%' },
      { label: 'Loja Shopping', valor: 'R$ 38.900,00', status: 'Meta 78%' },
      { label: 'Loja Online', valor: 'R$ 64.000,00', status: 'Meta 92%' },
    ]
  },
  financeiro: {
    kpis: [
      { label: 'Receita Líquida', value: 'R$ 89.400,00', change: '+5%', positive: true },
      { label: 'Despesas', value: 'R$ 42.100,00', change: '-3%', positive: true },
      { label: 'Margem Líquida', value: '35%', change: '+2%', positive: true },
      { label: 'Contas a Pagar', value: 'R$ 12.300,00', change: '-8%', positive: true },
    ],
    tabela: [
      { label: 'Fornecedores', valor: 'R$ 8.200,00', status: 'Em dia' },
      { label: 'Folha Pagamento', valor: 'R$ 18.500,00', status: 'Agendado' },
      { label: 'Impostos', valor: 'R$ 15.400,00', status: 'Recolhido' },
    ]
  },
  estoque: {
    kpis: [
      { label: 'Total SKUs', value: '1.240 un.', change: '-2%', positive: false },
      { label: 'Giro Estoque', value: '4.5x', change: '+0.3x', positive: true },
      { label: 'Quebra Técnica', value: '1.2%', change: '-0.3%', positive: true },
      { label: 'Alerta Reposição', value: '23 itens', change: '+5', positive: false },
    ],
    tabela: [
      { label: 'Camisetas', valor: '320 un.', status: 'OK' },
      { label: 'Calças', valor: '180 un.', status: 'Repor' },
      { label: 'Acessórios', valor: '540 un.', status: 'OK' },
    ]
  },
  vm: {
    kpis: [
      { label: 'Taxa Conversão', value: '98%', change: '+1%', positive: true },
      { label: 'Exposição Ideal', value: '92%', change: '+3%', positive: true },
      { label: 'Planogramas', value: '45 ativos', change: '+2', positive: true },
      { label: 'Conformidade', value: '87%', change: '+5%', positive: true },
    ],
    tabela: [
      { label: 'Vitrine Principal', valor: 'Atualizada', status: 'Conforme' },
      { label: 'Manequins', valor: '4 coleções', status: 'OK' },
      { label: 'Sinalização', valor: 'Digital', status: 'Atualizar' },
    ]
  },
  marketing: {
    kpis: [
      { label: 'Leads Gerados', value: '45.000', change: '+22%', positive: true },
      { label: 'Taxa Conversão', value: '3.2%', change: '+0.5%', positive: true },
      { label: 'Seguidores', value: '128K', change: '+12%', positive: true },
      { label: 'ROI Mídia', value: '4.8x', change: '+0.6x', positive: true },
    ],
    tabela: [
      { label: 'Instagram', valor: '85K seg.', status: 'Crescendo' },
      { label: 'Facebook', valor: '32K seg.', status: 'Estável' },
      { label: 'TikTok', valor: '11K seg.', status: 'Lançar' },
    ]
  },
  rh: {
    kpis: [
      { label: 'Funcionários Ativos', value: '42', change: '0%', positive: true },
      { label: 'Horas Extras Mês', value: '120h', change: '-15%', positive: true },
      { label: 'Turnover', value: '2.1%', change: '-0.5%', positive: true },
      { label: 'Treinamentos', value: '8 turmas', change: '+2', positive: true },
    ],
    tabela: [
      { label: 'Vendas', valor: '18 colaboradores', status: 'Completo' },
      { label: 'Administrativo', valor: '12 colaboradores', status: 'Completo' },
      { label: 'Estoque', valor: '8 colaboradores', status: 'Treinamento' },
    ]
  },
  judicial: {
    kpis: [
      { label: 'Processos Ativos', value: '0', change: '0%', positive: true },
      { label: 'Contratos Revisados', value: '12', change: '+3', positive: true },
      { label: 'LGPD Conformidade', value: '100%', change: 'OK', positive: true },
      { label: 'Riscos', value: 'Baixo', change: '--', positive: true },
    ],
    tabela: [
      { label: 'Trabalhista', valor: '0 processos', status: 'OK' },
      { label: 'Cível', valor: '0 processos', status: 'OK' },
      { label: 'Fiscal', valor: '0 processos', status: 'OK' },
    ]
  },
  projetos: {
    kpis: [
      { label: 'Em Andamento', value: '5', change: '+1', positive: true },
      { label: 'Concluídos Mês', value: '3', change: '+2', positive: true },
      { label: 'Atrasados', value: '1', change: '-1', positive: true },
      { label: 'Entregas Previstas', value: '15 dias', change: '--', positive: true },
    ],
    tabela: [
      { label: 'Reforma Loja 2', valor: '70%', status: 'No prazo' },
      { label: 'Migração ERP', valor: '45%', status: 'Atrasado' },
      { label: 'Campanha Sazonal', valor: '90%', status: 'Finalizando' },
    ]
  }
}

const TAB_ICONS: Record<string, string> = {
  vendas: '📊',
  financeiro: '💰',
  estoque: '📦',
  vm: '👗',
  marketing: '📱',
  rh: '👥',
  judicial: '⚖️',
  projetos: '🚀',
}

export default function BunnyDreamsApp() {
  const [activeTab, setActiveTab] = useState('vendas')
  const [data, setData] = useState(MOCK_DATA.vendas)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      setData(MOCK_DATA[activeTab] || MOCK_DATA.vendas)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [activeTab])

  const TABS = [
    { id: 'vendas', label: 'Vendas' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'vm', label: 'Visual Merch.' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'rh', label: 'RH' },
    { id: 'judicial', label: 'Judicial' },
    { id: 'projetos', label: 'Projetos' },
  ]

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <div className="w-56 bg-slate-900 text-white flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-wider flex items-center gap-2">
            <span className="text-pink-500">🐰</span> Bunny Dreams
          </h1>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">ERP Central Hub</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{TAB_ICONS[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold shadow-lg">AI</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">Assistente {TABS.find(t=>t.id===activeTab)?.label}</div>
                <div className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Paperclip Online
                </div>
              </div>
            </div>
            <button className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg text-[11px] font-bold transition-all shadow-lg">
              Falar com Agente
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {TAB_ICONS[activeTab]} {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeTab === 'vendas' && 'Acompanhe o desempenho de vendas por loja e canal'}
              {activeTab === 'financeiro' && 'Gestão financeira e fluxo de caixa'}
              {activeTab === 'estoque' && 'Controle de inventário e reposição'}
              {activeTab === 'vm' && 'Visual Merchandising e exposição de produtos'}
              {activeTab === 'marketing' && 'Campanhas e presença digital'}
              {activeTab === 'rh' && 'Gestão de pessoas e treinamentos'}
              {activeTab === 'judicial' && 'Conformidade legal e contratos'}
              {activeTab === 'projetos' && 'Acompanhamento de projetos em andamento'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Período:</span>
            <select className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700">
              <option>Este mês</option>
              <option>Mês anterior</option>
              <option>Últimos 3 meses</option>
              <option>Este ano</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Carregando...</span>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {data.kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{kpi.label}</div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className={`text-xs font-medium mt-1 ${kpi.positive ? 'text-green-600' : 'text-red-500'}`}>
                    {kpi.change} vs mês anterior
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela + Mini Grafico */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tabela */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Detalhamento</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2 text-slate-500 font-medium text-xs uppercase">Item</th>
                      <th className="text-right py-2 text-slate-500 font-medium text-xs uppercase">Valor</th>
                      <th className="text-right py-2 text-slate-500 font-medium text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tabela.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 text-slate-700">{item.label}</td>
                        <td className="py-3 text-right font-medium text-slate-800">{item.valor}</td>
                        <td className="py-3 text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.status.includes('OK') || item.status.includes('Conforme') || item.status.includes('Em dia') || item.status.includes('Completo') || item.status.includes('No prazo')
                              ? 'bg-green-100 text-green-700'
                              : item.status.includes('Atrasado') || item.status.includes('Repor') || item.status.includes('Alerta')
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mini Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumo Rápido</h3>
                <div className="space-y-3">
                  {data.kpis.slice(0, 2).map((kpi, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">{kpi.label}</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">{kpi.value}</div>
                      <div className={`text-xs font-medium ${kpi.positive ? 'text-green-600' : 'text-red-500'}`}>
                        {kpi.change}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Meta do período</span>
                      <span className="font-medium text-slate-700">78%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
