import { useState, useEffect, useMemo } from 'react';
import { LiveKitRoom } from '@livekit/components-react';

const LIVEKIT_URL = 'wss://banildo-ia-n72j0tgr.livekit.cloud';

export default function JarvisVoiceApp() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/system/livekit/token')
      .then(res => res.json())
      .then(data => {
        if (data.token) setToken(data.token);
        else setError('Falha ao obter token');
      })
      .catch(err => setError('Erro de conexão: ' + err.message));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-slate-400">
        <div className="animate-pulse">Conectando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Tokyo IA <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30">AGENT</span></h1>
      </div>
      <div className="flex-1 pt-16">
        <LiveKitRoom
          token={token}
          serverUrl={LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
