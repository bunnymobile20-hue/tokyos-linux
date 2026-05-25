import { useState, useEffect } from 'react'
import { Mic, Brain, Wrench, History, Activity, Cpu, HardDrive, Globe, Play, CheckCircle, Clipboard, List, Monitor, MousePointer, Keyboard, Camera, Layout } from 'lucide-react'

const API = 'http://127.0.0.1:7070'

interface Tool {
  id: string
  name: string
  status: string
  role: string
  risk_level: string
}

interface Command {
  id: string
  raw_text: string
  intent: string
  selected_tool: string
  status: string
  created_at: string
  result_summary: string
}

interface Memory {
  id: number
  content: string
  context: string
  created_at: string
}

export default function TokyoIAApp() {
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null)
  const [orchestratorOnline, setOrchestratorOnline] = useState(false)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState('comando')
  const [desktopStatus, setDesktopStatus] = useState<any>(null)
  const [desktopWindows, setDesktopWindows] = useState<any[]>([])
  const [desktopActiveWindow, setDesktopActiveWindow] = useState<any>(null)
  const [screenshotResult, setScreenshotResult] = useState<any>(null)
  const [desktopLoading, setDesktopLoading] = useState(false)

  useEffect(() => {
    fetchTools()
    fetchCommands()
    fetchMemories()
    fetchWorkflows()
    checkOrchestrator()
    const interval = setInterval(() => {
      fetchCommands()
      fetchMemories()
      checkOrchestrator()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  async function checkOrchestrator() {
    try {
      const res = await fetch(`${API}/tokyo/orchestrator/health`)
      setOrchestratorOnline(res.ok)
    } catch {
      setOrchestratorOnline(false)
    }
  }

  async function fetchTools() {
    try {
      const res = await fetch(`${API}/tokyo/tools`)
      const data = await res.json()
      setTools(data.tools || [])
    } catch {}
  }

  async function fetchCommands() {
    try {
      const res = await fetch(`${API}/tokyo/commands/recent`)
      const data = await res.json()
      setCommands(data.commands || [])
    } catch {}
  }

  async function fetchMemories() {
    try {
      const res = await fetch(`${API}/tokyo/memory/recent`)
      const data = await res.json()
      setMemories(data.memories || [])
    } catch {}
  }

  async function fetchWorkflows() {
    try {
      const res = await fetch(`${API}/tokyo/workflows`)
      const data = await res.json()
      setWorkflows(data.workflows || [])
    } catch {}
  }

  async function fetchDesktopStatus() {
    try {
      const res = await fetch(`${API}/tokyo/desktop/status`)
      const data = await res.json()
      setDesktopStatus(data)
    } catch {}
  }

  async function fetchDesktopWindows() {
    try {
      const res = await fetch(`${API}/tokyo/desktop/windows`)
      const data = await res.json()
      setDesktopWindows(data.windows || [])
    } catch {}
  }

  async function fetchDesktopActiveWindow() {
    try {
      const res = await fetch(`${API}/tokyo/desktop/active-window`)
      const data = await res.json()
      setDesktopActiveWindow(data)
    } catch {}
  }

  async function takeDesktopScreenshot() {
    setDesktopLoading(true)
    setScreenshotResult(null)
    try {
      const res = await fetch(`${API}/tokyo/desktop/screenshot`, { method: 'POST' })
      const data = await res.json()
      setScreenshotResult(data)
    } catch {
      setScreenshotResult({ status: 'error', message: 'Erro de conexão' })
    }
    setDesktopLoading(false)
  }

  async function desktopOpenUrl(url: string) {
    setDesktopLoading(true)
    try {
      await fetch(`${API}/tokyo/desktop/open-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    } catch {}
    setDesktopLoading(false)
  }

  async function desktopOpenApp(appName: string) {
    setDesktopLoading(true)
    try {
      await fetch(`${API}/tokyo/desktop/open-app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_name: appName }),
      })
    } catch {}
    setDesktopLoading(false)
  }

  async function runWorkflowAction(wfId: string) {
    setRunningWorkflow(wfId)
    setWorkflowResult(null)
    let raw_text = ''
    if (wfId === 'bunny_daily_check') raw_text = 'faça a checagem diária da Bunny Dreams'
    else if (wfId === 'bunny_accounts_today') raw_text = 'Tokyo, veja as contas de hoje'
    else raw_text = `faça a checagem diária da TokyOS`
    try {
      const res = await fetch(`${API}/tokyo/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text, source: 'portal', user: 'tokyos' }),
      })
      const data = await res.json()
      setWorkflowResult(data)
      await fetchCommands()
      await fetchMemories()
    } catch {
      setWorkflowResult({ status: 'error', message: 'Erro de conexão' })
    }
    setRunningWorkflow(null)
  }

  async function sendCommand() {
    if (!command.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${API}/tokyo/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: command, source: 'portal', user: 'tokyos' }),
      })
      const data = await res.json()
      setResponse(data)
      setCommand('')
      await fetchCommands()
    } catch (e) {
      setResponse({ status: 'error', message: 'Erro de conexão' })
    }
    setSending(false)
  }

  const onlineTools = tools.filter(t => t.status === 'active')
  const totalTools = tools.length

  return (
    <div className="h-full w-full bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Tokyo IA</h1>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${orchestratorOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-slate-400">{orchestratorOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{onlineTools}/{totalTools} ferramentas</span>
          <span>{commands.length} comandos</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-6">
        {[
          { id: 'comando', label: 'Comando', icon: Mic },
          { id: 'workflows', label: 'Workflows', icon: Play },
          { id: 'ferramentas', label: 'Ferramentas', icon: Wrench },
          { id: 'historico', label: 'Histórico', icon: History },
          { id: 'memoria', label: 'Memória', icon: Brain },
          { id: 'sistema', label: 'Sistema', icon: Activity },
          { id: 'desktop', label: 'Desktop', icon: Monitor },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'comando' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Input */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <label className="text-sm font-medium text-slate-400 mb-3 block">
                Digite um comando para a Tokyo IA
              </label>
              <div className="flex gap-2">
                <input
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendCommand()}
                  placeholder='Ex: "abre o WinGestor", "verifique o sistema", "salva na memória..."'
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={sendCommand}
                  disabled={sending || !command.trim()}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  Enviar
                </button>
              </div>
            </div>

            {/* Response */}
            {response && (
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Resultado</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-slate-500">Intenção</span>
                    <div className="font-medium text-indigo-400 mt-0.5">{response.intent || '—'}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-slate-500">Ferramenta</span>
                    <div className="font-medium text-purple-400 mt-0.5">{response.selected_tool || '—'}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-slate-500">Status</span>
                    <div className={`font-medium mt-0.5 ${response.status === 'ok' ? 'text-green-400' : response.status === 'blocked' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {response.status}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-slate-500">Requer Aprovação</span>
                    <div className={`font-medium mt-0.5 ${response.requires_approval ? 'text-red-400' : 'text-green-400'}`}>
                      {response.requires_approval ? 'Sim' : 'Não'}
                    </div>
                  </div>
                </div>
                {response.raw_result && (
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Detalhes</span>
                    <pre className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">
                      {JSON.stringify(response.raw_result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Quick commands */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Comandos Rápidos</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { text: 'abre o WinGestor', icon: Globe },
                  { text: 'verifique o sistema', icon: Activity },
                  { text: 'salva na memória que preciso comprar papel', icon: Brain },
                  { text: 'pesquise sobre vitrine de loja', icon: Globe },
                ].map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCommand(cmd.text)
                    }}
                    className="flex items-center gap-2 bg-slate-900/50 hover:bg-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-slate-300 transition-colors text-left"
                  >
                    <cmd.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{cmd.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workflows Rápidos */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Workflows Rápidos</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setCommand('Tokyo, faça a checagem diária da Bunny Dreams')
                  }}
                  className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 hover:from-emerald-800/60 hover:to-emerald-700/30 rounded-xl border border-emerald-700/30 p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clipboard className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">Checagem Diária</span>
                  </div>
                  <p className="text-xs text-slate-400">Bunny Dreams — verifica sistema, serviços, tarefas e cria checklist</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-500">ativo</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCommand('faça a checagem do sistema TokyOS')
                  }}
                  className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 hover:from-blue-800/60 hover:to-blue-700/30 rounded-xl border border-blue-700/30 p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">Sistema TokyOS</span>
                  </div>
                  <p className="text-xs text-slate-400">Verifica saúde do sistema e serviços da Tokyo IA</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-[10px] text-yellow-500">planejado</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setCommand('Tokyo, veja as contas de hoje')
                  }}
                  className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 hover:from-amber-800/60 hover:to-amber-700/30 rounded-xl border border-amber-700/30 p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <List className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">Contas do Dia</span>
                  </div>
                  <p className="text-xs text-slate-400">Lista contas a pagar e vencimentos de hoje</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-500">ativo</span>
                  </div>
                </button>

                <button
                  disabled
                  className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-4 text-left opacity-50 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-500">Relatório de Vendas</span>
                  </div>
                  <p className="text-xs text-slate-600">Extrai relatório de vendas do dia</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span className="text-[10px] text-slate-600">dry-run</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'workflows' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Workflow cards */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => runWorkflowAction('bunny_daily_check')}
                disabled={runningWorkflow !== null}
                className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 hover:from-emerald-800/60 hover:to-emerald-700/30 rounded-2xl border border-emerald-700/30 p-6 text-left transition-all disabled:opacity-60"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-300">Checagem Diária</div>
                    <div className="text-xs text-slate-500">Bunny Dreams</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">Verifica sistema, serviços, tarefas e cria checklist operacional</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">ativo</span>
                  <span className="text-xs text-slate-500">6 steps</span>
                </div>
              </button>

                <button
                onClick={() => runWorkflowAction('bunny_accounts_today')}
                disabled={runningWorkflow !== null}
                className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 hover:from-amber-800/60 hover:to-amber-700/30 rounded-2xl border border-amber-700/30 p-6 text-left transition-all disabled:opacity-60"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
                    <List className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-300">Contas do Dia</div>
                    <div className="text-xs text-slate-500">Bunny Dreams</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">Lista contas a pagar, vencimentos e atrasos de hoje</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-400">ativo</span>
                  <span className="text-xs text-slate-500">5 steps</span>
                </div>
              </button>

              <button
                disabled
                className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl border border-blue-700/30 p-6 text-left opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-300">Sistema TokyOS</div>
                    <div className="text-xs text-slate-500">Manutenção</div>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-4">Verifica saúde do sistema e serviços</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">planejado</span>
                  <span className="text-xs text-slate-500">-</span>
                </div>
              </button>
            </div>

            {/* Workflow result */}
            {runningWorkflow && (
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-slate-400">Executando workflow...</span>
                </div>
              </div>
            )}

            {workflowResult && !runningWorkflow && (
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Resultado do Workflow</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Workflow</span>
                    <div className="font-medium text-emerald-400 mt-0.5">{workflowResult.workflow_name || workflowResult.workflow_id}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Steps</span>
                    <div className="font-medium text-blue-400 mt-0.5">{workflowResult.steps_executed || 0} executados</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Status</span>
                    <div className={`font-medium mt-0.5 ${workflowResult.status?.includes('completed') ? 'text-green-400' : 'text-yellow-400'}`}>
                      {workflowResult.status}
                    </div>
                  </div>
                </div>
                {workflowResult.summary && (
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Resumo</span>
                    <pre className="text-xs text-slate-300 mt-1 whitespace-pre-wrap font-sans">
                      {workflowResult.summary}
                    </pre>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Memória: {workflowResult.memory_saved ? '✅' : '❌'}</span>
                  <span>Logs: {workflowResult.logs_saved ? '✅' : '❌'}</span>
                </div>
              </div>
            )}

            {/* Workflow history */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Workflows Recentes</h3>
              {workflows.filter(w => w.status === 'active').map((wf, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                  <div>
                    <div className="text-sm text-slate-300">{wf.name}</div>
                    <div className="text-xs text-slate-500">{wf.description}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    wf.status === 'active' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-400'
                  }`}>{wf.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'ferramentas' && (
          <div className="max-w-3xl mx-auto">
            <div className="grid gap-3">
              {tools.map(tool => (
                <div key={tool.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      tool.status === 'active' ? 'bg-green-400' :
                      tool.status === 'inactive' ? 'bg-yellow-400' :
                      tool.status === 'planned' ? 'bg-blue-400' :
                      'bg-red-400'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{tool.name}</div>
                      <div className="text-xs text-slate-500">{tool.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tool.risk_level === 'low' ? 'bg-green-900/50 text-green-400' :
                      tool.risk_level === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {tool.risk_level}
                    </span>
                    <span className="text-xs text-slate-500">{tool.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="max-w-3xl mx-auto">
            {commands.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum comando ainda. Envie seu primeiro comando!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commands.map(cmd => (
                  <div key={cmd.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-sm text-slate-200">{cmd.raw_text}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        cmd.status === 'ok' ? 'bg-green-900/50 text-green-400' :
                        cmd.status === 'blocked' ? 'bg-red-900/50 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>{cmd.status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Intenção: <span className="text-indigo-400">{cmd.intent}</span></span>
                      <span>Ferramenta: <span className="text-purple-400">{cmd.selected_tool}</span></span>
                      <span>{cmd.created_at ? new Date(cmd.created_at).toLocaleString('pt-BR') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'memoria' && (
          <div className="max-w-3xl mx-auto">
            {memories.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma memória ainda. Peça para a Tokyo IA lembrar de algo!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map(m => (
                  <div key={m.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <div className="text-sm text-slate-200">{m.content}</div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="bg-slate-700 px-2 py-0.5 rounded-full">{m.context}</span>
                      <span>{m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'desktop' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Status */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Desktop Automation</h3>
                </div>
                <button
                  onClick={() => {
                    fetchDesktopStatus()
                    fetchDesktopWindows()
                    fetchDesktopActiveWindow()
                  }}
                  className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Atualizar
                </button>
              </div>

              {desktopStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Sessão</span>
                    <div className="font-medium text-indigo-400 mt-0.5">{desktopStatus.session?.session || '—'}</div>
                    <div className="text-[10px] text-slate-600">{desktopStatus.session?.display || ''}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">xdotool</span>
                    <div className={`font-medium mt-0.5 ${desktopStatus.capabilities?.xdotool ? 'text-green-400' : 'text-red-400'}`}>
                      {desktopStatus.capabilities?.xdotool ? 'Disponível' : 'Não'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">wmctrl</span>
                    <div className={`font-medium mt-0.5 ${desktopStatus.capabilities?.wmctrl ? 'text-green-400' : 'text-red-400'}`}>
                      {desktopStatus.capabilities?.wmctrl ? 'Disponível' : 'Não'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Screenshot</span>
                    <div className={`font-medium mt-0.5 ${desktopStatus.capabilities?.scrot || desktopStatus.capabilities?.gnome_screenshot ? 'text-green-400' : 'text-red-400'}`}>
                      {desktopStatus.capabilities?.gnome_screenshot ? 'gnome-screenshot' :
                       desktopStatus.capabilities?.scrot ? 'scrot' : 'Não'}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Screenshots salvos</span>
                    <div className="font-medium text-purple-400 mt-0.5">{desktopStatus.screenshots_count || 0}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-3">
                    <span className="text-xs text-slate-500">Apps disponíveis</span>
                    <div className="font-medium text-emerald-400 mt-0.5">
                      {Object.entries(desktopStatus.apps_available || {}).filter(([_, v]) => v).length}/{Object.keys(desktopStatus.apps_available || {}).length}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={fetchDesktopStatus}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Carregar status do desktop
                </button>
              )}
            </div>

            {/* Screenshot */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Screenshot</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={takeDesktopScreenshot}
                  disabled={desktopLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  {desktopLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Tirar Screenshot
                </button>
              </div>
              {screenshotResult && (
                <div className="mt-3 bg-slate-900/50 rounded-xl p-3 text-sm">
                  <div className={`font-medium ${screenshotResult.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                    Status: {screenshotResult.status}
                  </div>
                  {screenshotResult.file && (
                    <div className="text-xs text-slate-400 mt-1">Arquivo: {screenshotResult.file}</div>
                  )}
                  {screenshotResult.size_kb && (
                    <div className="text-xs text-slate-400">Tamanho: {screenshotResult.size_kb} KB</div>
                  )}
                  {screenshotResult.reason && (
                    <div className="text-xs text-yellow-400 mt-1">{screenshotResult.reason}</div>
                  )}
                </div>
              )}
            </div>

            {/* Janelas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layout className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Janelas</h3>
                  </div>
                  <button
                    onClick={fetchDesktopWindows}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Listar
                  </button>
                </div>
                {desktopWindows.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {desktopWindows.slice(0, 10).map((w, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2 truncate">
                        {w.title || '(sem título)'}
                      </div>
                    ))}
                    {desktopWindows.length > 10 && (
                      <div className="text-xs text-slate-500 text-center pt-1">+{desktopWindows.length - 10} mais</div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Clique em "Listar" para ver as janelas abertas</p>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Janela Ativa</h3>
                  </div>
                  <button
                    onClick={fetchDesktopActiveWindow}
                    className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                </div>
                {desktopActiveWindow ? (
                  <div className="space-y-2 text-sm">
                    <div className="bg-slate-900/50 rounded-xl p-3">
                      <span className="text-xs text-slate-500">Título</span>
                      <div className="font-medium text-slate-200 mt-0.5">{desktopActiveWindow.title || '—'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900/50 rounded-xl p-3">
                        <span className="text-xs text-slate-500">PID</span>
                        <div className="font-medium text-slate-300 mt-0.5">{desktopActiveWindow.pid || '—'}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-xl p-3">
                        <span className="text-xs text-slate-500">Window ID</span>
                        <div className="font-medium text-slate-300 mt-0.5 text-[10px]">{desktopActiveWindow.window_id || '—'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Clique em "Ver" para consultar a janela ativa</p>
                )}
              </div>
            </div>

            {/* URLs e Apps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Abrir URL</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'TokyOS', url: 'http://localhost:7070' },
                    { label: 'WinGestor', url: 'https://app.wingestor.com.br' },
                    { label: 'Bunny Dreams', url: 'https://www.bunnydreams.com.br' },
                    { label: 'ChatGPT', url: 'https://chat.openai.com' },
                    { label: 'Gemini', url: 'https://gemini.google.com' },
                    { label: 'Claude', url: 'https://claude.ai' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => desktopOpenUrl(item.url)}
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Abrir App</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Firefox', app: 'firefox' },
                    { label: 'Chromium', app: 'chromium' },
                    { label: 'Terminal', app: 'gnome-terminal' },
                    { label: 'Arquivos', app: 'nemo' },
                    { label: 'Editor', app: 'xed' },
                    { label: 'Config', app: 'cinnamon-settings' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => desktopOpenApp(item.app)}
                      disabled={desktopLoading}
                      className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 rounded-lg text-xs text-slate-300 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clique e Digitação Reais */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/30 p-6">
              <div className="flex items-center gap-2 mb-3">
                <MousePointer className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Clique e Digitação</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <button onClick={async () => {
                  const res = await fetch(`${API}/tokyo/desktop/click`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({x: 500, y: 400})
                  });
                  const data = await res.json();
                  setDesktopWindows(prev => [...prev, data]);
                }} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 text-left hover:border-emerald-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointer className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Clique (500, 400)</span>
                  </div>
                  <p className="text-xs text-slate-500">Executa clique real via xdotool</p>
                </button>
                <button onClick={async () => {
                  const res = await fetch(`${API}/tokyo/desktop/type`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({text: "Tokyo IA ativo"})
                  });
                  const data = await res.json();
                  setDesktopWindows(prev => [...prev, data]);
                }} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 text-left hover:border-emerald-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Keyboard className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium text-emerald-400">Digitar Texto</span>
                  </div>
                  <p className="text-xs text-slate-500">Digita "Tokyo IA ativo" via xdotool</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'sistema' && (
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Activity className="w-4 h-4" />
                  <span className="font-bold">Orquestrador</span>
                </div>
                <div className={`text-lg font-bold ${orchestratorOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {orchestratorOnline ? 'Online' : 'Offline'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {orchestratorOnline ? 'API respondendo na porta 8080' : 'API não disponível'}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Wrench className="w-4 h-4" />
                  <span className="font-bold">Ferramentas</span>
                </div>
                <div className="text-lg font-bold text-indigo-400">{onlineTools}/{totalTools}</div>
                <div className="text-xs text-slate-500 mt-1">{totalTools - onlineTools} inativas</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <History className="w-4 h-4" />
                  <span className="font-bold">Comandos</span>
                </div>
                <div className="text-lg font-bold text-purple-400">{commands.length}</div>
                <div className="text-xs text-slate-500 mt-1">total registrados</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Play className="w-4 h-4" />
                  <span className="font-bold">Workflows</span>
                </div>
                <div className="text-lg font-bold text-emerald-400">{workflows.filter(w => w.status === 'active').length}/{workflows.length}</div>
                <div className="text-xs text-slate-500 mt-1">workflows ativos</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                  <Brain className="w-4 h-4" />
                  <span className="font-bold">Memórias</span>
                </div>
                <div className="text-lg font-bold text-pink-400">{memories.length}</div>
                <div className="text-xs text-slate-500 mt-1">registros salvos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
