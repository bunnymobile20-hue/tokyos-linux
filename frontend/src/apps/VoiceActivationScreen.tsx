import { useState, useCallback } from 'react';
import { Mic, MicOff, Camera, CameraOff, Monitor, PhoneOff, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { LiveKitRoom } from '@livekit/components-react';

const LIVEKIT_URL = 'wss://banildo-ia-n72j0tgr.livekit.cloud';

export default function VoiceActivationScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      const res = await fetch('/api/system/livekit/token');
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        setError('Falha ao obter token do servidor');
        setConnecting(false);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
      setConnecting(false);
    }
  }, []);

  const endCall = useCallback(() => {
    setToken(null);
    setConnected(false);
    setConnecting(false);
  }, []);

  if (!token && !connecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse">
            <Sparkles className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-white tracking-tight">
            Assistente de Voz
          </h1>
          <p className="text-slate-400 text-lg">TokyOS</p>

          <button
            onClick={startCall}
            className="group relative px-10 py-4 mt-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg shadow-2xl hover:shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-3">
              <Mic className="w-5 h-5" />
              Iniciar Chamada
            </span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
          </button>

          <div className="flex items-center gap-6 mt-4 text-slate-500 text-sm">
            <div className="flex items-center gap-2"><MicOff className="w-4 h-4" />Microfone</div>
            <div className="flex items-center gap-2"><CameraOff className="w-4 h-4" />Câmera</div>
            <div className="flex items-center gap-2"><Monitor className="w-4 h-4" />Tela</div>
          </div>

          {error && (
            <div className="px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-900" />
        {connected && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl animate-pulse" />
        )}
      </div>

      <div className="absolute inset-0 z-10">
        {token && (
          <LiveKitRoom
            token={token}
            serverUrl={LIVEKIT_URL}
            connect={true}
            audio={micOn}
            video={cameraOn}
            onConnected={() => {
              setConnected(true);
              setConnecting(false);
            }}
            onDisconnected={() => {
              setConnected(false);
            }}
            onError={(err: any) => {
              setError(typeof err === 'string' ? err : err?.message || 'Erro de conexão');
              setConnecting(false);
            }}
            className="h-full w-full"
          />
        )}

        {connecting && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <p className="text-white/60 text-lg">Conectando ao servidor...</p>
          </div>
        )}

        {!connecting && !connected && !error && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
            <p className="text-slate-400">Aguardando agente de voz...</p>
          </div>
        )}

        {connected && (
          <div className="flex flex-col items-center justify-center h-full pointer-events-none">
            <div className="relative w-40 h-40 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 opacity-30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl">
                <Mic className="w-16 h-16 text-white" />
              </div>
            </div>
            <p className="text-white/80 text-xl font-light">Ouvindo...</p>
            <p className="text-slate-500 text-sm mt-2">Fale com o assistente</p>
          </div>
        )}

        {error && !connecting && (
          <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={startCall}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="max-w-md mx-auto">
          {!connected && !error && (
            <div className="flex justify-center">
              <button
                onClick={startCall}
                disabled={connecting}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                {connecting ? 'Conectando...' : 'Iniciar Chamada'}
              </button>
            </div>
          )}

          {connected && (
            <div className="flex items-center justify-center gap-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 py-4">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`p-4 rounded-xl transition-all ${micOn ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}
                title="Microfone"
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setCameraOn(!cameraOn)}
                className={`p-4 rounded-xl transition-all ${cameraOn ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}
                title="Câmera"
              >
                {cameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>

              <button
                onClick={endCall}
                className="p-4 rounded-xl bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-500 transition-all"
                title="Encerrar"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
