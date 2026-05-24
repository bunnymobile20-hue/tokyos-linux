import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { withBasePath } from '../lib/basePath';

export default function DidaLogin() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const checkStatus = async () => {
    try {
      const res = await fetch(withBasePath('/api/system/dida/status'));
      const data = await res.json();
      if (data.success && data.connected) {
        setStatus('success');
        setMessage('Conectado à plataforma aberta da lista de ticks');
      } else {
        setStatus('idle');
        setMessage('Não autorizado');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Falha ao obter status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Listen for auth success message from popup window
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'dida-auth-success' || event.data?.type === 'dida-auth-success') {
        checkStatus();
        return;
      }

      if (event.data?.type === 'dida-auth-error') {
        setStatus('error');
        setMessage(event.data.error || 'Falha na autorização，Verifique o endereço de retorno de chamada e a configuração do aplicativo');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath('/api/system/dida/auth/url'));
      const data = await res.json();
      if (data.success && data.url) {
        // Open OAuth window
        window.open(data.url, 'dida-auth', 'width=600,height=700');
        setMessage(`Preencha a autorização em uma nova janela。Se relatado redirect_uri erro，Por favor, vá para a Dida Developer Platform para configurar o endereço de retorno de chamada como：${data.redirectUri}`);
      } else {
        setStatus('error');
        setMessage('Falha ao obter link de autorização');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'erro de rede');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch(withBasePath('/api/system/dida/logout'), { method: 'POST' });
      setStatus('idle');
      setMessage('Desconectado');
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 16l4 4 8-8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-800">lista de seleção (OpenAPI)</h5>
            <div className="flex items-center space-x-1 mt-0.5">
              {loading ? (
                <span className="text-[10px] text-slate-500">Verificando o status...</span>
              ) : status === 'success' ? (
                <><CheckCircle className="w-3 h-3 text-green-500" /><span className="text-[10px] text-green-600 font-medium">Autorizado</span></>
              ) : status === 'error' ? (
                <><AlertCircle className="w-3 h-3 text-red-500" /><span className="text-[10px] text-red-600 font-medium">Estado anormal</span></>
              ) : (
                <span className="text-[10px] text-slate-500">Não autorizado</span>
              )}
            </div>
          </div>
        </div>

        <div>
          {status === 'success' ? (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-1.5 bg-white border border-red-200 text-red-600 rounded text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors flex items-center disabled:opacity-50"
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Vá para Autorização
            </button>
          )}
        </div>
      </div>
      
      {message && <div className="mt-3 text-xs text-slate-500">{message}</div>}
    </div>
  );
}
