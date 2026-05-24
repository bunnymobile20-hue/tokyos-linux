import { useEffect, useState } from 'react';

export default function HermesAgentApp() {
  const [status, setStatus] = useState<{status: string, message: string} | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillInstructions, setNewSkillInstructions] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchSkills();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = () => {
    fetch('/api/system/hermes/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStatus(data.data);
      }).catch(() => setStatus(null));
  };

  const fetchSkills = () => {
    fetch('/api/system/hermes/skills')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSkills(data.data);
      });
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleLearn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName || !newSkillInstructions) return;
    
    addLog(`Ensinando nova rotina: ${newSkillName}...`);
    try {
      const res = await fetch('/api/system/hermes/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSkillName, instructions: newSkillInstructions })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Hermes aprendeu: ${newSkillName} e sincronizou com Mem0.`);
        setNewSkillName('');
        setNewSkillInstructions('');
        fetchSkills();
      } else {
        addLog(`Erro ao aprender: ${data.error}`);
      }
    } catch (err) {
      addLog(`Erro de rede ao aprender.`);
    }
  };

  const handleExecute = async (skillId: string, skillName: string) => {
    addLog(`Iniciando execução da rotina: ${skillName}... (Qwen3 14B + DeepSeek R1)`);
    try {
      const res = await fetch('/api/system/hermes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`Sucesso: ${data.message}`);
      } else {
        addLog(`Erro: ${data.error}`);
      }
    } catch (err) {
      addLog(`Erro de rede ao executar.`);
    }
  };

  const isOnline = status?.status === 'online';

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Sidebar - Skill Library */}
      <div className="w-1/3 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800 bg-slate-900 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            Biblioteca de Skills
          </h2>
          <p className="text-xs text-slate-500 mt-1">Procedimentos automáticos aprendidos</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {skills.map(skill => (
            <div key={skill.id} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-xl transition-colors group">
              <h3 className="font-bold text-slate-200">{skill.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{skill.description}</p>
              <button 
                onClick={() => handleExecute(skill.id, skill.name)}
                className="mt-3 w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold py-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                Executar Skill
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Memory & Learning */}
      <div className="flex-1 flex flex-col">
        {/* Header Status */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h1 className="text-2xl font-bold text-white">Hermes Agent</h1>
            <p className="text-slate-400 text-sm">Memória viva, aprendizado e orquestração de RPA.</p>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${isOnline ? 'bg-teal-900/20 border-teal-500/30' : 'bg-red-900/20 border-red-500/30'} flex items-center gap-3`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-semibold ${isOnline ? 'text-teal-400' : 'text-red-400'}`}>
              {isOnline ? 'Mem0 + Backend Online' : 'Serviço Offline'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-8 flex flex-col lg:flex-row gap-8 overflow-y-auto">
          
          {/* Learning Console */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Ensinar Nova Rotina
            </h3>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1">
              <form onSubmit={handleLearn} className="flex flex-col h-full gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">NOME DA SKILL</label>
                  <input 
                    type="text" 
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: extracao_nfe_bunny"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs font-bold text-slate-400 mb-1">INSTRUÇÕES DO PROCESSO</label>
                  <textarea 
                    value={newSkillInstructions}
                    onChange={(e) => setNewSkillInstructions(e.target.value)}
                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Descreva passo a passo como o Hermes deve realizar esta tarefa. Esta informação será vetorizada e salva na memória do Mem0."
                  ></textarea>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  Salvar na Memória Neural
                </button>
              </form>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="flex-1 flex flex-col gap-4 max-w-md">
            <h3 className="text-lg font-bold text-teal-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Activity Stream
            </h3>
            <div className="bg-black/50 border border-slate-800/80 rounded-2xl p-4 flex-1 overflow-y-auto font-mono text-xs shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-600 h-full flex items-center justify-center">Nenhuma atividade recente.</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="text-slate-300 border-l-2 border-indigo-500/30 pl-3 py-1">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
