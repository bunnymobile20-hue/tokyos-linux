import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Clock, AlertTriangle, FileText, Bot, Box, Cpu, Shield, Loader2, GitMerge } from 'lucide-react';

export default function ExecutionFlowApp() {
  const [currentFlow, setCurrentFlow] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlow = async () => {
    try {
      const res = await fetch('/api/system/execution/current');
      const data = await res.json();
      if (data.success && data.data?.flow) {
        setCurrentFlow(data.data.flow);
        setSteps(data.data.steps || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMock = async () => {
    setLoading(true);
    await fetch('/api/system/execution/mock', { method: 'POST' });
    await fetchFlow();
  };

  const handleClear = async () => {
    setLoading(true);
    await fetch('/api/system/execution/clear', { method: 'POST' });
    setCurrentFlow(null);
    setSteps([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFlow();
    const interval = setInterval(fetchFlow, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'concluído': return 'text-green-500 bg-green-50 border-green-200';
      case 'em execução': return 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse';
      case 'erro': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'concluído': return <CheckCircle2 className="w-4 h-4" />;
      case 'em execução': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'erro': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading && !currentFlow) {
    return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <GitMerge className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Fluxo de Execução da Tokyo IA</h1>
            <p className="text-sm text-slate-500">Acompanhe em tempo real como a Tokyo IA está executando cada comando.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleMock} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition flex items-center">
            <Play className="w-4 h-4 mr-2" /> Simular Teste
          </button>
          <button onClick={handleClear} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-medium transition">
            Limpar
          </button>
        </div>
      </div>

      {!currentFlow ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <GitMerge className="w-16 h-16 mb-4 text-slate-300" />
          <p>Nenhum fluxo em execução no momento.</p>
          <p className="text-sm">Envie um comando ou simule um teste.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Main Info Cards */}
          <div className="flex-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Comando Atual</h2>
              <p className="text-xl font-medium text-slate-800">"{currentFlow.command_text}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center space-x-2 mb-2 text-slate-500"><Bot className="w-4 h-4"/> <span className="text-sm font-semibold">Status Geral</span></div>
                <div className={`inline-flex items-center space-x-2 w-max px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(currentFlow.status)}`}>
                  {getStatusIcon(currentFlow.status)}
                  <span>{currentFlow.status}</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center space-x-2 mb-2 text-slate-500"><Box className="w-4 h-4"/> <span className="text-sm font-semibold">Agente Ativo</span></div>
                <p className="text-lg font-medium text-slate-800">{steps.find(s => s.status === 'em execução')?.agent_name || currentFlow.main_agent || 'Sistema'}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center space-x-2 mb-2 text-slate-500"><Cpu className="w-4 h-4"/> <span className="text-sm font-semibold">Modelo IA</span></div>
                <p className="text-lg font-medium text-slate-800">{steps.find(s => s.status === 'em execução')?.model_name || 'N/A'}</p>
                {steps.find(s => s.status === 'em execução')?.model_type === 'local' && <span className="text-xs text-green-600 font-medium mt-1">✓ Execução Local</span>}
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center space-x-2 mb-2 text-slate-500"><Shield className="w-4 h-4"/> <span className="text-sm font-semibold">Ferramenta</span></div>
                <p className="text-lg font-medium text-slate-800">{steps.find(s => s.status === 'em execução')?.tool_name || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Log Técnico Simplificado</h2>
               <div className="space-y-3 font-mono text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                 {steps.map((step, idx) => (
                   <div key={step.id} className="flex">
                     <span className="text-slate-400 w-24">[{new Date(step.started_at).toLocaleTimeString()}]</span>
                     <span className={step.status === 'erro' ? 'text-red-500' : 'text-slate-700'}>{step.step_name}: {step.input_summary}</span>
                   </div>
                 ))}
                 {currentFlow.status === 'concluído' && <div className="text-green-600 font-bold mt-2">✨ Tarefa concluída.</div>}
               </div>
            </div>
          </div>

          {/* Timeline Sidebar */}
          <div className="w-full lg:w-1/3 bg-white border border-slate-200 shadow-sm rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Linha do Tempo</h2>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {steps.map((step, index) => (
                <div key={step.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2
                    ${step.status === 'concluído' ? 'bg-green-500 text-white' : 
                      step.status === 'em execução' ? 'bg-blue-500 text-white animate-pulse' : 
                      step.status === 'erro' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {getStatusIcon(step.status)}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-800 text-sm">Etapa {step.step_order}: {step.step_name}</div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p><strong>Agente:</strong> {step.agent_name}</p>
                      <p><strong>Ferramenta:</strong> {step.tool_name}</p>
                      <p><strong>Status:</strong> <span className={getStatusColor(step.status).split(' ')[0]}>{step.status}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
