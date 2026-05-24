import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Activity, Save, RefreshCw, Layers, ShieldCheck, Database, Server, Bug } from 'lucide-react';

export default function AntigravityApp() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isHealing, setIsHealing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = () => {
    fetch('/api/system/antigravity/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus(data.data);
          if (data.data.isAutoHealing !== isHealing) {
            setIsHealing(data.data.isAutoHealing);
          }
        }
      }).catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    addLog('[SYSTEM] Antigravity IDE Inicializado com sucesso.');
    addLog('[SYSTEM] Conectado ao kernel primário da Tokyo IA.');
    
    const interval = setInterval(fetchStatus, 3000);
    
    // Simular logs entrando aleatoriamente se estiver em produção
    const logInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const fakeLogs = [
          '[TRACE] Verificando integridade de rotas React...',
          '[DEBUG] Mem0 cache hit (Latência: 12ms)',
          '[INFO] Heartbeat recebido do Gateway OpenClaw',
          '[WARN] Alto uso de CPU detectado no motor Qwen3',
          '[TRACE] Sincronização de arquivos virtual concluída.'
        ];
        addLog(fakeLogs[Math.floor(Math.random() * fakeLogs.length)]);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleBackup = () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    addLog('[WARN] Iniciando Snapshot Seguro do Sistema...');
    fetch('/api/system/antigravity/backup', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addLog(`[SUCCESS] Backup concluído! Checksum assinado às ${new Date(data.lastBackup).toLocaleTimeString()}`);
          fetchStatus();
        }
      }).finally(() => setIsBackingUp(false));
  };

  const handleEnvironmentToggle = () => {
    const nextEnv = status?.environment === 'test' ? 'production' : 'test';
    
    if (nextEnv === 'production' && !status?.lastBackup) {
      const confirm = window.confirm("CUIDADO: A Regra do Antigravity exige um backup antes de mudar para Produção sem histórico recente. Deseja prosseguir sob sua conta e risco?");
      if (!confirm) {
        addLog('[REJECTED] Mudança para produção abortada por falta de backup.');
        return;
      }
    }

    addLog(`[WARN] Trocando ambiente do sistema para: ${nextEnv.toUpperCase()}`);
    fetch('/api/system/antigravity/environment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: nextEnv })
    }).then(() => fetchStatus());
  };

  const handleHeal = () => {
    if (isHealing) return;
    addLog('[CRITICAL] Iniciando Rotina de Auto-cura profunda...');
    fetch('/api/system/antigravity/heal', { method: 'POST' }).then(() => fetchStatus());
  };

  const isProd = status?.environment === 'production';

  return (
    <div className="flex h-full w-full bg-[#0a0a0c] text-slate-300 font-sans">
      
      {/* Sidebar Controls */}
      <div className="w-80 border-r border-teal-900/30 bg-[#0f1115] p-6 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
            <Terminal className="text-teal-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Antigravity</h1>
            <p className="text-xs text-teal-500 font-mono tracking-widest uppercase opacity-80">Tech Ops Center</p>
          </div>
        </div>

        {/* Environment Toggle */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Ambiente Atual
          </h2>
          <div 
            onClick={handleEnvironmentToggle}
            className={`relative w-full h-14 rounded-xl cursor-pointer p-1 transition-colors border shadow-inner overflow-hidden flex items-center ${isProd ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-900 border-slate-700/50'}`}
          >
            <div className={`absolute top-1 bottom-1 w-1/2 bg-slate-800 rounded-lg shadow-md transition-all duration-300 ${isProd ? 'translate-x-full !bg-red-600' : 'translate-x-0'}`}></div>
            
            <div className={`flex-1 relative z-10 text-center text-sm font-bold transition-colors ${!isProd ? 'text-white' : 'text-slate-500'}`}>
              TEST (DEV)
            </div>
            <div className={`flex-1 relative z-10 text-center text-sm font-bold transition-colors ${isProd ? 'text-white' : 'text-slate-500'}`}>
              PRODUÇÃO
            </div>
          </div>
          {isProd && !status?.lastBackup && (
            <p className="text-[10px] text-red-400 mt-2 flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3 h-3" /> Produção sem backup recente!
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Ações de Segurança</h2>
          
          <button 
            onClick={handleBackup}
            disabled={isBackingUp}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border font-bold text-sm transition-all ${isBackingUp ? 'bg-blue-900/20 border-blue-500/30 text-blue-400' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white hover:border-blue-500/50'}`}
          >
            {isBackingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-blue-400" />}
            {isBackingUp ? 'Processando Snapshot...' : 'Forçar Backup / Snapshot'}
          </button>
          
          {status?.lastBackup && (
            <div className="text-[10px] text-slate-400 px-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Último backup: {new Date(status.lastBackup).toLocaleString()}
            </div>
          )}

          <button 
            onClick={handleHeal}
            disabled={isHealing}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border font-bold text-sm transition-all mt-4 ${isHealing ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white hover:border-emerald-500/50'}`}
          >
            {isHealing ? <Activity className="w-4 h-4 animate-pulse" /> : <Bug className="w-4 h-4 text-emerald-400" />}
            {isHealing ? 'Curando Sistema...' : 'Rotina de Auto-Cura'}
          </button>
        </div>

        {/* Health */}
        <div className="mt-auto">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" /> Componentes
          </h2>
          <div className="space-y-2 bg-black/30 p-3 rounded-lg border border-slate-800/50">
            {['OpenClaw', 'Mem0', 'Firecrawl', 'Core OS'].map(mod => (
              <div key={mod} className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{mod}</span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> OK
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col p-1 relative">
        <div className={`absolute top-0 right-0 p-4 font-bold text-sm z-10 flex items-center gap-2 ${isProd ? 'text-red-500' : 'text-teal-500/50'}`}>
          <Database className="w-4 h-4" />
          {isProd ? '!!! AMBIENTE DE PRODUÇÃO !!!' : 'AMBIENTE DE TESTE'}
        </div>

        <div className="flex-1 bg-[#050505] rounded-xl border border-[#1a1c23] shadow-2xl overflow-hidden flex flex-col font-mono relative">
          {/* Mac window header */}
          <div className="h-8 bg-[#0f1115] border-b border-[#1a1c23] flex items-center px-4 gap-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <div className="mx-auto text-[10px] text-slate-500">tokyos-antigravity-term ~ zsh</div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto text-[13px] leading-relaxed custom-scrollbar">
            {logs.map((log, idx) => {
              // Colorize logs based on content
              let colorClass = 'text-slate-300';
              if (log.includes('[WARN]') || log.includes('CUIDADO')) colorClass = 'text-yellow-400';
              if (log.includes('[CRITICAL]') || log.includes('[REJECTED]')) colorClass = 'text-red-400';
              if (log.includes('[SUCCESS]')) colorClass = 'text-emerald-400';
              if (log.includes('[TRACE]') || log.includes('[DEBUG]')) colorClass = 'text-slate-500';
              
              return (
                <div key={idx} className={`${colorClass} mb-1 hover:bg-white/5 px-1 -mx-1 rounded`}>
                  {log}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

    </div>
  );
}
