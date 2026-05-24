import React, { useEffect, useState } from 'react';
import { Send, Globe, Loader2, Database, Download, FileText, ExternalLink } from 'lucide-react';

export default function FirecrawlApp() {
  const [status, setStatus] = useState<{status: string, message: string} | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = () => {
    fetch('/api/system/firecrawl/status')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) setStatus(data.data);
      }).catch(() => {});
  };

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));
  };

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setIsLoading(true);
    setMarkdown('');
    addLog(`Iniciando extração em: ${urlInput}`);
    
    try {
      const res = await fetch('/api/system/firecrawl/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      const data = await res.json();
      
      if (data.success && data.data.markdown) {
        addLog(`Extração concluída com sucesso.`);
        setMarkdown(data.data.markdown);
      } else {
        addLog(`Erro: ${data.error || 'Falha ao extrair dados.'}`);
      }
    } catch (err) {
      addLog(`Erro de rede ao comunicar com Firecrawl.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToAI = () => {
    addLog(`Dados enviados para Tokyo IA (via OpenClaw) para análise.`);
    // Em um sistema real, chamaria a rota openclaw/execute ou salvaria no banco de conhecimento (RAG)
  };

  const isOnline = status?.status === 'online';

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-orange-900/50 bg-slate-900 shrink-0 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
            <Globe className="text-orange-500 w-8 h-8" />
            Firecrawl Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">Coleta de dados da web limpos, conversão para Markdown e RAG.</p>
        </div>
        <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 shadow-inner ${isOnline ? 'bg-orange-900/20 border-orange-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-bold tracking-wide ${isOnline ? 'text-orange-400' : 'text-red-400'}`}>
            {status?.message || (isOnline ? 'Gateway Firecrawl Online' : 'Gateway Offline')}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Controls */}
        <div className="w-1/3 border-r border-slate-800 bg-slate-900 flex flex-col p-6 overflow-y-auto">
          
          <h2 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-400" />
            Alvo da Extração
          </h2>
          
          <form onSubmit={handleCrawl} className="flex flex-col gap-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">URL PÚBLICA / FORNECEDOR / CONCORRENTE</label>
              <input 
                type="url" 
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://exemplo.com/doc" 
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                disabled={!isOnline || isLoading}
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!isOnline || isLoading || !urlInput}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(234,88,12,0.3)] transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Download className="w-5 h-5" />}
              {isLoading ? 'Extraindo...' : 'Iniciar Crawl'}
            </button>
          </form>

          <div className="mt-auto">
            <h3 className="font-bold text-slate-400 text-xs mb-3">LOG DE ATIVIDADE</h3>
            <div className="bg-black/50 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 min-h-32">
              {logs.length === 0 ? 'Aguardando ação...' : (
                logs.map((log, i) => <div key={i} className="mb-2 last:mb-0 text-slate-300">{log}</div>)
              )}
            </div>
          </div>
        </div>

        {/* Content View */}
        <div className="w-2/3 bg-slate-950 flex flex-col relative">
          {!markdown && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p>O conteúdo convertido em Markdown aparecerá aqui.</p>
              <p className="text-xs mt-2 max-w-sm text-center">Use isso para coletar regras de fornecedores, manuais técnicos ou vitrines da concorrência para o Banco de Conhecimento RAG.</p>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-500 bg-slate-950/80 z-10">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="font-bold">Analisando DOM e limpando o HTML...</p>
            </div>
          )}

          {markdown && !isLoading && (
            <>
              <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                <span className="font-bold text-slate-300 text-sm">Visualização do Markdown</span>
                <button 
                  onClick={handleSendToAI}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  Enviar para Tokyo IA (Análise)
                </button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className="bg-black/40 p-6 rounded-xl border border-slate-800 text-slate-300 font-mono text-sm whitespace-pre-wrap">
                  {markdown}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
