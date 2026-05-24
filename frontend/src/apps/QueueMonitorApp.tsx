import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

export default function QueueMonitorApp() {
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative">
      <div className="flex-none h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-green-500" />
          <span className="font-semibold text-slate-700">Monitor de Tarefas (Bull-Board)</span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
          title="Recarregar Monitor"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 relative bg-white">
        <iframe
          key={iframeKey}
          src="/admin/queues"
          className="w-full h-full border-none"
          title="Queue Monitor"
        />
      </div>
    </div>
  );
}
