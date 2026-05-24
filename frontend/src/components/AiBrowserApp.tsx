import React, { useState, useEffect, useRef } from 'react';
import { Send, Globe, Loader2, Database, TrendingUp, DollarSign, Archive, CheckCircle } from 'lucide-react';
import './AiBrowserApp.css';

export const AiBrowserApp: React.FC = () => {
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState<string>('Aguardando instruções...');
  const [history, setHistory] = useState<{type: 'user' | 'agent' | 'error', text: string}[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connectWs = () => {
      const ws = new WebSocket('ws://127.0.0.1:8765');
      
      ws.onopen = () => {
        setIsConnected(true);
        setStatus('Conectado ao Motor IA (Qwen 3 / Gemini Fallback)');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status') {
            setStatus(data.status);
            setHistory(prev => [...prev, { type: 'agent', text: `[Status] ${data.status}` }]);
          } else if (data.type === 'result') {
            setStatus('Tarefa concluída.');
            setHistory(prev => [...prev, { type: 'agent', text: `[Resultado] ${data.data}` }]);
          } else if (data.type === 'error') {
            setStatus('Erro na execução.');
            setHistory(prev => [...prev, { type: 'error', text: `[Erro] ${data.error}` }]);
          }
        } catch (err) {
          console.error("Falha ao processar mensagem do ws:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus('Desconectado. Tentando reconectar...');
        setTimeout(connectWs, 3000);
      };
      
      wsRef.current = ws;
    };

    connectWs();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const sendInstruction = (msg: string) => {
    if (!isConnected || !wsRef.current) return;
    setHistory(prev => [...prev, { type: 'user', text: msg }]);
    wsRef.current.send(JSON.stringify({ type: 'browser_task', instruction: msg }));
    setStatus('Iniciando Chromium visível...');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    sendInstruction(instruction.trim());
    setInstruction('');
  };

  const quickActions = [
    { label: 'Relatório de Vendas', icon: TrendingUp, msg: 'Acesse a área de relatórios de vendas, filtre pelas vendas de hoje e me traga o valor total.' },
    { label: 'Relatório de Lucros', icon: DollarSign, msg: 'Extraia o relatório de lucros desta semana e calcule a margem de lucro aproximada.' },
    { label: 'Estoque de Produtos', icon: Archive, msg: 'Verifique quais produtos estão com estoque abaixo do mínimo e liste-os.' },
    { label: 'Contas a Pagar', icon: Database, msg: 'Liste as contas a pagar que vencem nos próximos 7 dias.' }
  ];

  return (
    <div className="ai-browser-app">
      <div className="browser-header">
        <div className="header-icon">
          <Globe className="text-emerald-500" />
        </div>
        <div className="flex-1">
          <h2 className="header-title">WinGestor RPA (Browser Use)</h2>
          <div className="header-subtitle flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {status}
          </div>
        </div>
      </div>

      <div className="flex gap-4 p-4 border-b border-white/10 bg-black/20">
        {quickActions.map((action, idx) => (
          <button 
            key={idx}
            disabled={!isConnected}
            onClick={() => sendInstruction(action.msg)}
            className="flex flex-col items-center justify-center p-3 flex-1 bg-slate-800/50 hover:bg-emerald-600/20 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all disabled:opacity-50 group"
          >
            <action.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 mb-2" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300 group-hover:text-white text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="browser-history custom-scrollbar">
        {history.length === 0 ? (
          <div className="empty-state">
            Dê uma instrução ou use os botões rápidos. O agente abrirá o navegador, fará o login no WinGestor e navegará pelo sistema autonomamente extraindo relatórios.
          </div>
        ) : (
          history.map((msg, idx) => (
            <div key={idx} className={`history-item ${msg.type}`}>
              {msg.type === 'user' ? 'Você: ' : msg.type === 'error' ? 'Falha: ' : 'Agente: '}
              <span className="msg-text">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={endOfHistoryRef} />
      </div>

      <form className="browser-input-area" onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="Ex: Entre no WinGestor, vá até relatórios de vendas e exporte os dados do mês atual..."
          disabled={!isConnected}
          className="instruction-input focus:border-emerald-500"
        />
        <button type="submit" disabled={!isConnected || !instruction.trim()} className="send-btn bg-emerald-600 hover:bg-emerald-500 text-white">
          {status.includes('Iniciando') ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Send />
          )}
        </button>
      </form>
    </div>
  );
};
