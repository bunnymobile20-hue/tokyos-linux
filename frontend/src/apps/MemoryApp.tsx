import { useEffect, useState, useRef, useMemo } from 'react'
import { commandCenterApi } from '../lib/openclawApi'
import ForceGraph2D from 'react-force-graph-2d'

const TIERS = [
  { name: 'Pinned', tier: 'Tier 1', count: 42, unit: 'lines', desc: 'Hand-curated facts and identity your agents always see.', color: 'var(--success)', pct: 80 },
  { name: 'Workflow', tier: 'Tier 2', count: 186, unit: 'lines', desc: 'Rolling working memory for the active session and jobs in flight.', color: 'var(--blue)', pct: 55 },
  { name: 'Vector (ChromaDB)', tier: 'Tier 3', count: 1847, unit: 'entries', desc: 'Semantic embeddings for recall by meaning, not keywords.', color: 'var(--violet)', pct: 70 },
  { name: 'Keyword (FTS5)', tier: 'Tier 4', count: 3421, unit: 'entries', desc: 'SQLite full-text index for fast literal lookups and filters.', color: 'var(--accent)', pct: 45 },
]


const STATIC_ENTRIES = [
  { kind: 'pinned', src: 'user', ts: '08:14', content: 'I prefer early morning briefings at 7am, not 8am.' },
  { kind: 'workflow', src: 'morning-briefing', ts: '08:09', content: "Today's briefing: 3 repos active, 2 calendar blocks, 14 GB disk cleanup pending." },
  { kind: 'vector', src: 'pdf-ingest', ts: '07:58', content: 'ReAct paper: synergizes reasoning + acting in LLMs. Key finding: interleaving trace and action improves task grounding by 34%.' },
  { kind: 'fts', src: 'kizuna-auto', ts: '07:42', content: 'Coltrane → modal jazz → Giant Steps changes → tritone substitution → Debussy whole-tone influence.' },
  { kind: 'pinned', src: 'user', ts: 'yesterday', content: 'My default repo is ~/code/clawos. Model preference: qwen2.5:7b.' },
  { kind: 'workflow', src: 'disk-report', ts: 'yesterday', content: '82% disk used. ~/downloads/old contains 14 GB of files not accessed in 38+ days.' },
]

const KIND_COLORS: Record<string, string> = {
  pinned: '#10b981', workflow: '#3b82f6', vector: '#8b5cf6', fts: '#f59e0b',
}

export default function MemoryApp() {
  const [ws, setWs] = useState('default')
  const [tiers, setTiers] = useState(TIERS)
  const [entries, setEntries] = useState(STATIC_ENTRIES)
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<{status: string, message: string} | null>(null);

  useEffect(() => {
    const handleStatus = (e: CustomEvent) => {
      if (e.detail && e.detail['memory']) {
        setStatus(e.detail['memory']);
      }
    };
    window.addEventListener('tokios-app-status', handleStatus as EventListener);
    fetch('/api/system/apps/status').then(res => res.json()).then(data => {
      if (data.success && data.data['memory']) setStatus(data.data['memory']);
    }).catch(() => {});
    return () => window.removeEventListener('tokios-app-status', handleStatus as EventListener);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: 250
      })
    }
  }, [])

  const graphData = useMemo(() => {
    const nodes = []
    const links = []
    // Central Node
    nodes.push({ id: 'core', name: 'Memória Central', val: 10, color: '#f87171' })
    
    // Generate some fake nodes for the Obsidian effect
    for (let i = 0; i < 40; i++) {
      const type = Object.keys(KIND_COLORS)[i % 4]
      const color = KIND_COLORS[type]
      nodes.push({ id: `n${i}`, name: `Dado ${i}`, val: 1 + Math.random() * 3, color })
      
      // Link to core or random other node
      if (Math.random() > 0.5) {
        links.push({ source: `n${i}`, target: 'core' })
      } else if (i > 0) {
        links.push({ source: `n${i}`, target: `n${Math.floor(Math.random() * i)}` })
      }
    }
    return { nodes, links }
  }, [])

  useEffect(() => {
    commandCenterApi.getMemorySummary(ws)
      .then((data: any) => {
        if (!data) return
        const updated = TIERS.map((t) => {
          if (t.tier === 'Tier 1' && data.pinned_lines != null) return { ...t, count: data.pinned_lines }
          if (t.tier === 'Tier 2' && data.workflow_lines != null) return { ...t, count: data.workflow_lines }
          if (t.tier === 'Tier 3' && data.chroma_count != null) return { ...t, count: data.chroma_count }
          if (t.tier === 'Tier 4' && data.fts_count != null) return { ...t, count: data.fts_count }
          return t
        })
        setTiers(updated)
        if (Array.isArray(data.entries) && data.entries.length > 0)
          setEntries(data.entries.map((e: { kind?: string; source?: string; ts?: string; content?: string }) => ({ kind: e.kind ?? '', src: e.source ?? '', ts: e.ts ?? '', content: e.content ?? '' })))
      })
      .catch(() => {})
  }, [ws])

  const total = tiers.reduce((s, t) => s + t.count, 0)
  const isOnline = status?.status === 'online'

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-slate-900 z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Memória Neural 
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isOnline ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {isOnline ? 'API CONECTADA' : 'OFFLINE'}
            </span>
          </h1>
          <div className="text-xs text-slate-400 mt-1">{status?.message || '14-layer persistent memory — Para a IA lembrar de tudo'}</div>
        </div>
        <div className="text-right text-xs text-slate-400 font-mono">
          <div>{total.toLocaleString()} entries</div>
          <div>4 tiers · 6 backends</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 40 }}>
        
        {/* Grafo Obsidian-Style */}
        <div className="relative w-full border-b border-white/10 bg-slate-950" ref={containerRef}>
          <div className="absolute top-2 left-4 text-xs font-bold text-slate-500 tracking-widest z-10 uppercase">Topologia (Obsidian View)</div>
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={n => n.color}
            linkColor={() => 'rgba(255,255,255,0.1)'}
            backgroundColor="#020617"
            nodeRelSize={4}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Workspace selector */}
          <div className="flex gap-2 mb-4">
            {['default', 'tokios-dev', 'bunny-dreams'].map((w) => (
              <button 
                key={w} 
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${ws === w ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`} 
                onClick={() => setWs(w)}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Core tiers */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="text-teal-400">▦</span> Core memory tiers</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {tiers.map((t) => (
                <div key={t.name} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col">
                  <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-widest">{t.tier}</div>
                  <div className="text-sm font-bold text-slate-200">{t.name}</div>
                  <div className="text-2xl font-mono text-white mt-2 mb-1">{t.count.toLocaleString()}<span className="text-xs text-slate-500 ml-1">{t.unit}</span></div>
                  <div className="text-xs text-slate-400 leading-relaxed flex-1">{t.desc}</div>
                  <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                    <div className="h-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent entries */}
          <div>
            <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="text-purple-400">⟳</span> Registros Recentes</h3>
            <div className="space-y-2">
              {entries.map((e, i) => {
                const color = KIND_COLORS[e.kind] || '#94a3b8'
                return (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2 py-0.5 rounded font-mono uppercase tracking-widest text-[9px]" style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>{e.kind}</span>
                      <span className="text-slate-400 font-medium">{e.src}</span>
                      <span className="text-slate-500 ml-auto">{e.ts}</span>
                    </div>
                    <div className="text-sm text-slate-300 pl-1">{e.content}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
