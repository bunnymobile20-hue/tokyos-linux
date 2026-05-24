import { useEffect, useState, useRef } from 'react'
import { Lock, Play, Power, RefreshCw, RotateCcw, Send, AlertTriangle, CheckCircle, Code2, ShieldAlert } from 'lucide-react'
import IframeApp from './IframeApp'
import { withBasePath } from '../lib/basePath'
import { OpenCodeIcon } from '../components/Icons'

interface OpenCodeStatus {
  unit: string
  status: string
  isRunning: boolean
  health: 'ok' | 'starting' | 'down'
  healthDetail: string
}

export default function OpenCodeApp() {
  const [unlocked, setUnlocked] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<OpenCodeStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [serviceBusy, setServiceBusy] = useState(false)
  
  // AI Chat States
  const [aiMessage, setAiMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai' | 'system', text: string}[]>([])
  const [pendingPatch, setPendingPatch] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const refreshStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch(withBasePath('/api/system/opencode/status'))
      const payload = await response.json()
      if (payload.success) {
        setStatus(payload.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!unlocked) return
    void refreshStatus()
    const timer = window.setInterval(() => void refreshStatus(), 5000)
    
    // Initial AI greeting
    setChatHistory([
      { role: 'system', text: '[MODO: Programador Interno Tokyo IA]' },
      { role: 'system', text: 'Motores: Qwen3 Coder (Principal) / DeepSeek R1 (Raciocínio)' },
      { role: 'ai', text: 'Olá. Sou o agente OpenCode. Como posso ajudar com a base de código hoje? Posso criar scripts, revisar módulos ou sugerir patches de autocura.' }
    ])

    return () => window.clearInterval(timer)
  }, [unlocked])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const unlock = async () => {
    setError('')
    const response = await fetch(withBasePath('/api/system/opencode/unlock'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setError(payload?.error || 'OpenCode Falha na verificação do bloqueio de aplicativos')
      return
    }

    setUnlocked(true)
    setPassword('')
  }

  const controlService = async (action: 'start' | 'stop' | 'restart') => {
    setServiceBusy(true)
    try {
      const response = await fetch(withBasePath(`/api/system/opencode/service/${action}`), { method: 'POST' })
      const payload = await response.json()
      if (payload.success) {
        setStatus(payload.data)
      } else {
        setError(payload.error || 'OpenCode Falha na operação do serviço')
      }
    } finally {
      setServiceBusy(false)
      window.setTimeout(() => void refreshStatus(), 1200)
    }
  }

  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiMessage.trim()) return
    
    setChatHistory(prev => [...prev, { role: 'user', text: aiMessage }])
    
    // Mock AI Response
    setTimeout(() => {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Analisando sua requisição usando Qwen3 Coder e preparando o patch no ambiente de código...' }])
      setTimeout(() => {
        setPendingPatch(true)
        setChatHistory(prev => [...prev, { role: 'system', text: 'MUDANÇA CRÍTICA PENDENTE: A IA gerou um patch de código que afeta arquivos do sistema.' }])
      }, 1500)
    }, 1000)
    
    setAiMessage('')
  }

  const approvePatch = () => {
    setPendingPatch(false)
    setChatHistory(prev => [...prev, { role: 'user', text: '[PATCH APROVADO PELO HUMANO]' }])
    setTimeout(() => {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Mudança aplicada com sucesso ao sistema. Você pode visualizar o arquivo atualizado no painel lateral do VS Code.' }])
    }, 800)
  }

  // Tela de bloqueio removida a pedido do usuário


  // Se o serviço estiver rodando, exibe a interface Split Screen
  if (status?.isRunning && status.health === 'ok') {
    return (
      <div className="flex h-full w-full bg-slate-950">
        {/* Left Sidebar - AI Coder Console */}
        <div className="w-[380px] shrink-0 border-r border-teal-900/40 bg-[#0b0f19] flex flex-col z-10 shadow-2xl">
          
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
              <Code2 className="text-teal-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-wide">Tokyo AI Coder</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                <span className="text-[10px] text-teal-400 font-mono">Qwen3 / DeepSeek R1</span>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-sm">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'system' ? (
                  <div className="text-[10px] font-mono text-slate-500 my-1 self-center uppercase tracking-widest text-center">
                    {msg.text}
                  </div>
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-teal-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}

            {/* Critical Patch Approval Card */}
            {pendingPatch && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  Autorização Requerida
                </div>
                <p className="text-xs text-slate-300 mb-4">
                  O agente solicitou permissão para escrever alterações no sistema de arquivos. 
                  A regra "Não aplicar mudanças críticas sem aprovação" está ativa.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={approvePatch}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <CheckCircle className="w-4 h-4" /> Aprovar Mudança
                  </button>
                  <button 
                    onClick={() => setPendingPatch(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg transition"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-slate-900/80 border-t border-white/5">
            <form onSubmit={handleSendAiMessage} className="relative">
              <input 
                type="text" 
                value={aiMessage}
                onChange={e => setAiMessage(e.target.value)}
                placeholder="Ex: Crie um script python em /tmp..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                disabled={pendingPatch}
              />
              <button 
                type="submit" 
                disabled={!aiMessage.trim() || pendingPatch}
                className="absolute right-2 top-2 bottom-2 aspect-square rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 flex items-center justify-center text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Content - VS Code Iframe */}
        <div className="flex-1 relative">
          <IframeApp url={withBasePath('/proxy/opencode/')} title="OpenCode IDE" />
        </div>
      </div>
    )
  }

  // Dashboard de inicialização do serviço Code-server
  return (
    <div className="flex h-full items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
        <div className="flex items-center gap-4">
          <OpenCodeIcon className="h-14 w-14" />
          <div>
            <div className="text-2xl font-bold">OpenCode Web Service</div>
            <div className="mt-1 text-sm text-slate-400">{status?.healthDetail || 'Lendo o status do serviço local...'}</div>
          </div>
        </div>
        
        <div className="mt-4 bg-teal-900/20 border border-teal-500/20 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="text-teal-500 shrink-0 w-5 h-5" />
          <p className="text-xs text-teal-200">
            O ambiente de desenvolvimento integrado (code-server) está offline. Inicie o serviço para acessar a interface Split-Screen do Programador Interno.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-300">
          <div>systemd: <span className="font-mono text-slate-100">{status?.unit || 'opencode-web.service'}</span></div>
          <div className="mt-2">estado: <span className="font-mono text-slate-100">{loading ? 'checking' : status?.status || 'unknown'}</span></div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={serviceBusy} onClick={() => void controlService('start')} className="flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">
            <Play className="h-4 w-4" /> Iniciar
          </button>
          <button type="button" disabled={serviceBusy} onClick={() => void controlService('restart')} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60">
            <RotateCcw className="h-4 w-4" /> Reiniciar
          </button>
          <button type="button" disabled={serviceBusy} onClick={() => void controlService('stop')} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60">
            <Power className="h-4 w-4" /> Parar
          </button>
          <button type="button" disabled={loading} onClick={() => void refreshStatus()} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
        {error && <div className="mt-4 text-sm text-rose-300">{error}</div>}
      </div>
    </div>
  )
}
