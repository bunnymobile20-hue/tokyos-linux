import { useState, useEffect, useMemo } from 'react';
import { LiveKitRoom, useSession } from '@livekit/components-react';
import { TokenSource } from 'livekit-client';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { SessionView } from '@/components/app/session-view';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { Toaster, toast } from 'sonner';
import { WarningIcon } from '@phosphor-icons/react';


export default function JarvisVoiceApp() {
  const [token, setToken] = useState<string>('');
  const [hybridMode, setHybridMode] = useState('gemini'); // gemini | local | openai
  const [agentStatus, setAgentStatus] = useState<'offline' | 'starting' | 'online' | 'stopping'>('offline');
  const [isConnected, setIsConnected] = useState(false);

  // Poll agent status from backend
  useEffect(() => {
    const checkStatus = () => {
      fetch('/api/system/livekit/agent/status')
        .then(res => res.json())
        .then(data => {
          if (data.running && agentStatus !== 'online' && agentStatus !== 'starting') setAgentStatus('online');
          if (!data.running && agentStatus !== 'offline' && agentStatus !== 'stopping') setAgentStatus('offline');
        })
        .catch(() => {});
    };
    checkStatus();
    const intv = setInterval(checkStatus, 3000);
    return () => clearInterval(intv);
  }, [agentStatus]);

  // Fetch token from backend
  useEffect(() => {
    fetch('/api/system/livekit/token?room=tokio_ia_room&user=Admin')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(err => console.error("Falha ao buscar token LiveKit:", err));
  }, []);

  const toggleAgentProcess = async () => {
    if (agentStatus === 'online') {
      setAgentStatus('stopping');
      try {
        await fetch('/api/system/livekit/agent/stop', { method: 'POST' });
        setAgentStatus('offline');
      } catch (e) {
        setAgentStatus('online');
      }
    } else if (agentStatus === 'offline') {
      setAgentStatus('starting');
      try {
        let finalEngine = hybridMode;
        
        // Fallback premium logic
        if (hybridMode === 'local') {
          const res = await fetch('/api/system/ai/status');
          const data = await res.json();
          if (!data.success || !data.isOnline) {
            toast.warning('Ollama indisponível. Acionando fallback premium para Gemini API.');
            finalEngine = 'gemini';
            setHybridMode('gemini');
          }
        }

        await fetch('/api/system/livekit/agent/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine: finalEngine })
        });
        setAgentStatus('online');
      } catch (e) {
        setAgentStatus('offline');
        toast.error('Erro ao conectar com o servidor do agente.');
      }
    }
  };

  const liveKitUrl = (import.meta as any).env?.VITE_LIVEKIT_URL || 'wss://banildo-ia-n72j0tgr.livekit.cloud';

  // LiveKit Session context needed by components
  const tokenSource = useMemo(() => TokenSource.endpoint('/api/system/livekit/token?room=tokio_ia_room&user=Admin'), []);
  const session = useSession(tokenSource, { agentName: 'Tokyo IA' });

  const renderContent = () => {
    if (!token) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="animate-pulse">Conectando aos servidores LiveKit... (Aguardando Token)</div>
        </div>
      );
    }
    return (
      <LiveKitRoom
        token={token}
        serverUrl={liveKitUrl}
        connect={true}
        audio={true}
        video={false}
        className="h-full w-full"
      >
        <AgentSessionProvider session={session}>
          <SessionView 
            appConfig={{ ...APP_CONFIG_DEFAULTS, companyName: 'Tokyo IA' }} 
          />
          
          <Toaster
            icons={{ warning: <WarningIcon weight="bold" /> }}
            position="top-center"
            className="toaster group"
          />
        </AgentSessionProvider>
      </LiveKitRoom>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      
      {/* Header Híbrido TokyOS Control */}
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Tokyo IA <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30">AGENT</span>
          </h1>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            Status do Agente: 
            <span className={`inline-block w-2 h-2 rounded-full ${agentStatus === 'online' ? 'bg-green-500' : agentStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></span>
            {agentStatus.toUpperCase()}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Seletor Híbrido */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine:</span>
            <select 
              value={hybridMode}
              onChange={(e) => setHybridMode(e.target.value)}
              disabled={agentStatus === 'online' || agentStatus === 'starting'}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1 outline-none focus:border-purple-500 disabled:opacity-50"
            >
              <option value="gemini">Google Gemini Realtime</option>
              <option value="local">Local Hermes Llama 3</option>
              <option value="openai">OpenAI GPT-4o Realtime</option>
            </select>
          </div>

          <button 
            onClick={toggleAgentProcess}
            className={`text-xs px-4 py-1.5 rounded-md border transition-all font-bold ${agentStatus === 'online' ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'}`}
          >
            {agentStatus === 'online' ? 'DESLIGAR AGENTE' : agentStatus === 'starting' ? 'INICIANDO...' : agentStatus === 'stopping' ? 'PARANDO...' : 'LIGAR AGENTE'}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full pt-16">
        {renderContent()}
      </div>
    </div>
  );
}
