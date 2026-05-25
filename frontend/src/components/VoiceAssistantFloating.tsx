import { useState, useEffect, useRef } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const LIVEKIT_URL = 'wss://banildo-ia-n72j0tgr.livekit.cloud';

export default function VoiceAssistantFloating() {
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchToken = async () => {
    try {
      const res = await fetch('/api/system/livekit/token');
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setConnecting(true);
      }
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleToggle = () => {
    if (connected) {
      setShowPanel(!showPanel);
      return;
    }
    if (!token && !connecting) {
      fetchToken();
    }
    setShowPanel(true);
  };

  const handleDisconnect = () => {
    setToken(null);
    setConnected(false);
    setConnecting(false);
    setShowPanel(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          connected
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse shadow-purple-500/50'
            : 'bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30'
        }`}
        title={connected ? 'Assistente ativo' : 'Ativar assistente de voz'}
      >
        {connecting && !connected ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Mic className={`w-6 h-6 ${connected ? 'text-white' : 'text-slate-300'}`} />
        )}
      </button>

      {showPanel && (
        <div className="fixed bottom-24 right-6 z-[9999] w-80 h-48 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
          {!token ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
              <MicOff className="w-8 h-8 mb-2 text-slate-500" />
              <p>Clique no microfone para conectar</p>
            </div>
          ) : (
            <>
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-md border-b border-white/10">
                <span className="text-xs text-white font-medium flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                  {connected ? 'Conectado' : 'Conectando...'}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Desconectar
                </button>
              </div>
              <div className="h-full pt-10">
                <LiveKitRoom
                  token={token}
                  serverUrl={LIVEKIT_URL}
                  connect={true}
                  audio={true}
                  video={false}
                  onConnected={() => { setConnected(true); setConnecting(false); }}
                  onDisconnected={() => { setConnected(false); }}
                  className="h-full w-full"
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
