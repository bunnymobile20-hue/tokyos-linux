import React, { useEffect, useState } from 'react';
import { Cpu, Server, Activity, HardDrive, AlertTriangle, Cloud, DollarSign, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OllamaModelDetails {
  parent_model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

interface OllamaLoadedModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
  expires_at: string;
  size_vram: number;
}

interface GeminiUsage {
  total_sessions: number;
  total_seconds: number;
  estimated_cost_usd: number;
}

const TokyoAIModelsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');

  const [models, setModels] = useState<OllamaModel[]>([]);
  const [running, setRunning] = useState<OllamaLoadedModel[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [geminiUsage, setGeminiUsage] = useState<GeminiUsage | null>(null);

  const fetchModels = async () => {
    try {
      const modelsRes = await fetch('/api/system/ai/models');
      const modelsData = await modelsRes.json();
      
      if (!modelsData.success) {
        throw new Error(modelsData.error || 'Erro ao carregar modelos');
      }

      setIsOnline(modelsData.isOnline);
      setModels(modelsData.models || []);
      setError(null);

      if (modelsData.isOnline) {
        const psRes = await fetch('/api/system/ai/status');
        const psData = await psRes.json();
        if (psData.success) {
          setRunning(psData.loadedModels || []);
        }
      } else {
        setRunning([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o motor Ollama');
    } finally {
      setLoading(false);
    }
  };

  const fetchGeminiUsage = async () => {
    try {
      const res = await fetch('/api/system/ai/gemini/usage');
      const data = await res.json();
      if (data.success) {
        setGeminiUsage(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar uso do gemini', err);
    }
  };

  useEffect(() => {
    fetchModels();
    fetchGeminiUsage();
    const interval = setInterval(() => {
      fetchModels();
      fetchGeminiUsage();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const isRunning = (modelName: string) => {
    return running.some(r => r.name === modelName);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/80 backdrop-blur-2xl text-slate-100 overflow-hidden font-sans relative">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 z-10 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Model Center (Tokyo IA)</h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              Gerenciamento de Modelos Locais e na Nuvem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <button
            onClick={() => setActiveTab('local')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'local' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'}`}
          >
            <Server className="w-4 h-4" /> Local (Ollama)
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'cloud' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'}`}
          >
            <Cloud className="w-4 h-4" /> Cloud (Gemini)
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 z-10 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'local' ? (
            <motion.div
              key="local"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {loading && models.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : !isOnline || error ? (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto pt-20">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-lg font-medium text-slate-200 mb-2">Motor Local Desconectado</h2>
                  <p className="text-sm text-slate-400 mb-6">Verifique se o Ollama está rodando e configurado corretamente no host.</p>
                  {error && (
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 w-full font-mono text-left break-words">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {models.map((model) => {
                      const active = isRunning(model.name);
                      const rModel = active ? running.find(r => r.name === model.name) : null;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={model.name} 
                          className={`relative p-5 rounded-2xl border transition-all ${active ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'}`}
                        >
                          {active && (
                            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">Na VRAM</span>
                            </div>
                          )}
                          
                          <div className="mb-5">
                            <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
                              {model.name.split(':')[0]}
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-normal">
                                {model.name.split(':')[1] || 'latest'}
                              </span>
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 capitalize">{model.details.family} • {model.details.parameter_size}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-2">
                            <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Tamanho</span>
                              <span className="text-sm font-medium text-slate-300">{formatSize(model.size)}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Quant</span>
                              <span className="text-sm font-medium text-slate-300">{model.details.quantization_level}</span>
                            </div>
                          </div>
                          
                          {active && rModel && (
                            <div className="mt-4 pt-4 border-t border-blue-500/20">
                              <div className="flex justify-between items-end">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-blue-400/70 uppercase tracking-wider font-semibold">Uso de Memória</span>
                                  <span className="text-sm font-mono text-blue-300">{formatSize(rModel.size_vram)} VRAM</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  {models.length === 0 && !loading && (
                    <div className="text-center py-20">
                      <p className="text-slate-400">Nenhum modelo baixado no Ollama.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="cloud"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-purple-900/20 border border-purple-500/30">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Google Gemini Realtime</h2>
                    <p className="text-sm text-slate-400 mt-1">Motor multimodal premium usado como fallback para visão avançada e conversas de voz profundas.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col gap-2">
                    <span className="text-sm text-slate-400 flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-400" /> Tempo de Uso</span>
                    <span className="text-2xl font-bold text-slate-100 font-mono">
                      {Math.floor((geminiUsage?.total_seconds || 0) / 60)} min
                    </span>
                    <span className="text-xs text-slate-500">{geminiUsage?.total_seconds || 0} segundos totais</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col gap-2">
                    <span className="text-sm text-slate-400 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Sessões Realtime</span>
                    <span className="text-2xl font-bold text-slate-100 font-mono">
                      {geminiUsage?.total_sessions || 0}
                    </span>
                    <span className="text-xs text-slate-500">conexões iniciadas</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 flex flex-col gap-2">
                    <span className="text-sm text-slate-400 flex items-center gap-2"><DollarSign className="w-4 h-4 text-yellow-400" /> Custo Estimado</span>
                    <span className="text-2xl font-bold text-yellow-400 font-mono">
                      ${(geminiUsage?.estimated_cost_usd || 0).toFixed(4)}
                    </span>
                    <span className="text-xs text-slate-500">Estimativa baseada em uso de áudio</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TokyoAIModelsApp;
