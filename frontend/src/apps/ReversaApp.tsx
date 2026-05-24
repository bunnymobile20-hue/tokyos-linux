import React, { useState, useEffect } from 'react';
import { RefreshCw, BookOpen } from 'lucide-react';

export default function ReversaApp() {
  const [iframeKey, setIframeKey] = useState(0);
  const [error, setError] = useState(false);

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    setError(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 relative">
      <div className="flex-none h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-slate-700">Reversa Documentation</span>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
          title="Recarregar documentação"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 relative bg-white">
        {!error && (
          <iframe
            key={iframeKey}
            src="/reversa-docs/index.html"
            className="w-full h-full border-none"
            onError={() => setError(true)}
            title="Reversa Docs"
          />
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <BookOpen className="w-16 h-16 text-slate-300" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-700">Documentação não encontrada</h3>
              <p className="text-sm mt-1">A documentação do Reversa ainda não foi gerada para este projeto.</p>
              <p className="text-sm mt-1">Execute <code>/reversa-docs</code> no chat do OpenCode para gerá-la.</p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
