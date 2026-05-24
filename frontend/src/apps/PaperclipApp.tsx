import React, { useEffect, useState } from 'react';
import { Users, Briefcase, DollarSign, Activity, Target, CheckCircle, Clock, Plus, Bot, Shield, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface VirtualEmployee {
  id: string;
  name: string;
  role: string;
  permissions: string;
  goals: string;
  engine: string;
  budget_limit: number;
  budget_used: number;
}

export interface PaperclipTask {
  id: string;
  agent_id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  delivery_log: string;
  created_at: number;
}

const PaperclipApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'budget'>('team');
  const [agents, setAgents] = useState<VirtualEmployee[]>([]);
  const [tasks, setTasks] = useState<PaperclipTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAgent, setNewTaskAgent] = useState('');

  const fetchData = async () => {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch('/api/system/paperclip/agents'),
        fetch('/api/system/paperclip/tasks')
      ]);
      const agentsData = await agentsRes.json();
      const tasksData = await tasksRes.json();
      
      if (agentsData.success) setAgents(agentsData.data);
      if (tasksData.success) setTasks(tasksData.data);
    } catch (err) {
      console.error('Failed to load paperclip data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intv = setInterval(fetchData, 10000);
    return () => clearInterval(intv);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc || !newTaskAgent) return;
    
    try {
      await fetch('/api/system/paperclip/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: newTaskAgent, description: newTaskDesc })
      });
      setNewTaskDesc('');
      fetchData();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/system/paperclip/tasks/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const getEngineColor = (engine: string) => {
    if (engine.toLowerCase().includes('qwen')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (engine.toLowerCase().includes('deepseek')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (engine.toLowerCase().includes('gemini')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-3xl text-slate-100 overflow-hidden font-sans relative">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 z-10 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Paperclip 
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium uppercase tracking-wider border border-indigo-500/30">
                Bunny Dreams
              </span>
            </h1>
            <p className="text-sm text-slate-400">Gestão de Funcionários Virtuais e Agentes IA</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'team' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent'}`}
          >
            <Users className="w-4 h-4" /> Organograma
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'tasks' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent'}`}
          >
            <CheckCircle className="w-4 h-4" /> Tarefas
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'budget' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm border border-indigo-500/30' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent'}`}
          >
            <DollarSign className="w-4 h-4" /> Budget & Modelos
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 z-10 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {agents.map(agent => (
                    <div key={agent.id} className="p-6 rounded-3xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition-colors group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center border border-white/10">
                            <Bot className="w-6 h-6 text-slate-300" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-100">{agent.name}</h3>
                            <p className="text-xs font-medium text-indigo-400">{agent.role}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900/50 border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Target className="w-3 h-3" /> Metas
                          </span>
                          <span className="text-sm text-slate-300">{agent.goals}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900/50 border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Shield className="w-3 h-3" /> Permissão
                            </span>
                            <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded-md w-fit">
                              {agent.permissions}
                            </span>
                          </div>

                          <div className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-900/50 border border-white/5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Activity className="w-3 h-3" /> Motor LLM
                            </span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-md w-fit border ${getEngineColor(agent.engine)}`}>
                              {agent.engine}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto flex flex-col h-full gap-8"
              >
                {/* Criar Tarefa */}
                <div className="p-6 rounded-3xl bg-indigo-900/10 border border-indigo-500/20 flex flex-col gap-4">
                  <h3 className="font-semibold text-indigo-300 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Direcionar Nova Tarefa
                  </h3>
                  <form onSubmit={handleCreateTask} className="flex gap-4">
                    <select 
                      required
                      value={newTaskAgent}
                      onChange={(e) => setNewTaskAgent(e.target.value)}
                      className="w-64 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="">Selecione o Agente...</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input 
                      required
                      type="text"
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      placeholder="Descreva a missão ou prompt inicial..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors">
                      Despachar
                    </button>
                  </form>
                </div>

                {/* Kanban */}
                <div className="grid grid-cols-3 gap-6 flex-1">
                  {/* TODO */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4" /> Na Fila</h4>
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status === 'todo').length}</span>
                    </div>
                    <div className="space-y-3">
                      {tasks.filter(t => t.status === 'todo').map(task => {
                        const agent = agents.find(a => a.id === task.agent_id);
                        return (
                          <div key={task.id} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">{agent?.name}</span>
                            </div>
                            <p className="text-sm text-slate-200">{task.description}</p>
                            <div className="mt-4 flex justify-end">
                              <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                Iniciar <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* DOING */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-amber-400 flex items-center gap-2"><Activity className="w-4 h-4" /> Em Andamento</h4>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status === 'in_progress').length}</span>
                    </div>
                    <div className="space-y-3">
                      {tasks.filter(t => t.status === 'in_progress').map(task => {
                        const agent = agents.find(a => a.id === task.agent_id);
                        return (
                          <div key={task.id} className="p-4 rounded-2xl bg-amber-900/10 border border-amber-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md">{agent?.name}</span>
                            </div>
                            <p className="text-sm text-slate-200">{task.description}</p>
                            <div className="mt-4 flex justify-end">
                              <button onClick={() => updateTaskStatus(task.id, 'done')} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                                Concluir <CheckCircle className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* DONE */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-emerald-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Entregas</h4>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{tasks.filter(t => t.status === 'done').length}</span>
                    </div>
                    <div className="space-y-3">
                      {tasks.filter(t => t.status === 'done').map(task => {
                        const agent = agents.find(a => a.id === task.agent_id);
                        return (
                          <div key={task.id} className="p-4 rounded-2xl bg-emerald-900/10 border border-emerald-500/20 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">{agent?.name}</span>
                            </div>
                            <p className="text-sm text-slate-300 line-through decoration-slate-600">{task.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'budget' && (
              <motion.div
                key="budget"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                <div className="bg-slate-800/40 border border-white/5 rounded-3xl p-8">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-400" /> Cota de Modelos (Estimativa Visual)
                  </h2>
                  <div className="space-y-4">
                    {agents.map(agent => {
                      const percentage = Math.min((agent.budget_used / agent.budget_limit) * 100, 100);
                      const isDanger = percentage > 85;
                      const isWarning = percentage > 60 && !isDanger;
                      
                      return (
                        <div key={agent.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-900/50">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-200">{agent.name}</span>
                            <span className="text-sm font-mono text-slate-400">
                              <span className={isDanger ? 'text-red-400 font-bold' : isWarning ? 'text-amber-400' : 'text-emerald-400'}>
                                ${agent.budget_used.toFixed(2)}
                              </span> / ${agent.budget_limit.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-300">
                      ℹ️ <b>Nota de Billing:</b> Este painel rastreia os custos de agentes que utilizam Fallback Premium (Ex: Gemini ou GPT). Agentes locais (Qwen/DeepSeek) possuem custo operacional zerado ($0.00).
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default PaperclipApp;
