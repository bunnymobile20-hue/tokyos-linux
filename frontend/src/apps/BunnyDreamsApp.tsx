import { useState, useEffect } from 'react'

export default function BunnyDreamsApp() {
  const [activeTab, setActiveTab] = useState('vendas')
  const [metrics, setMetrics] = useState({ kpi: 'Carregando...', growth: '--%', status: 'Aguardando Wingestor' })

  useEffect(() => {
    // Simulação de chamada para API do Wingestor
    setMetrics({ kpi: 'Carregando...', growth: '--%', status: 'Buscando...' })
    const timer = setTimeout(() => {
      const mockData: Record<string, any> = {
        vendas: { kpi: 'R$ 145.200,00', growth: '+12%', status: 'Sincronizado' },
        financeiro: { kpi: 'R$ 89.400,00', growth: '+5%', status: 'Sincronizado' },
        estoque: { kpi: '1.240 un.', growth: '-2%', status: 'Alerta VM' },
        vm: { kpi: '98% Conf.', growth: '+1%', status: 'Sincronizado' },
        marketing: { kpi: '45.000 leads', growth: '+22%', status: 'Sincronizado' },
        rh: { kpi: '42 Ativos', growth: '0%', status: 'Sincronizado' },
        judicial: { kpi: '0 Processos', growth: '0%', status: 'Sincronizado' },
        projetos: { kpi: '5 em Andamento', growth: '+1', status: 'Sincronizado' }
      }
      setMetrics(mockData[activeTab] || mockData.vendas)
    }, 800)
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
      {/* Sidebar ERP */}
      <div className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider uppercase flex items-center gap-2">
            <span className="text-pink-500">🐰</span> Bunny Dreams
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">ERP Central Hub</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-pink-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        
        {/* Agente Integrado (Paperclip) */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">AI</div>
              <div>
                <div className="text-xs font-bold">Assistente {TABS.find(t=>t.id===activeTab)?.label}</div>
                <div className="text-[10px] text-green-400">Online • Paperclip</div>
              </div>
            </div>
            <button className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold transition-colors">
              Falar com Agente
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-100 flex flex-col h-full relative">
        <iframe 
          src={`http://${window.location.hostname}:8501`}
          className="w-full h-full border-none absolute inset-0"
          title="Streamlit Dashboard"
          style={{ height: '100vh' }}
        />
      </div>
    </div>
  )
}
