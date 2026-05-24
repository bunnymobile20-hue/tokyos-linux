import React, { useEffect, useState } from 'react';

export default function SystemStatusApp() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = () => {
        setLoading(true);
        fetch('/api/system/deep-status')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus(data.data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStatus();
        const intv = setInterval(fetchStatus, 30000);
        return () => clearInterval(intv);
    }, []);

    const toggleKiosk = () => {
        alert("Para alterar o modo Kiosk, edite o arquivo /home/tokio/TokiOS/config/startup.yaml e altere kiosk_mode para true ou false.");
    };

    const restartTokyoOS = () => {
        if(window.confirm("Isso irá desligar todos os serviços do TokyOS. O systemd ou autostart deverá reiniciá-lo. Deseja continuar?")) {
            fetch('/api/system/hardware').then(() => alert("Processo iniciado no backend (Mock). Use os comandos bash no terminal."));
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-900 text-white font-sans">
            <h1 className="text-3xl font-bold mb-6 text-blue-400 border-b border-gray-700 pb-2">Status do Sistema - Tokyo OS</h1>
            
            {loading && !status && <p className="text-gray-400 animate-pulse">Carregando métricas profundas do Linux Mint...</p>}
            
            {status && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recursos de Hardware */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 text-gray-200">Recursos da Máquina</h2>
                        <ul className="space-y-3">
                            <li className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">RAM:</span>
                                <span className="font-mono text-green-400">{status.ram}</span>
                            </li>
                            <li className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Disco Root (/):</span>
                                <span className="font-mono text-green-400">{status.disk}</span>
                            </li>
                            <li className="flex justify-between border-b border-gray-700 pb-2">
                                <span className="text-gray-400">Versão:</span>
                                <span className="font-mono text-purple-400">{status.tokyos_version}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Controles de Interface */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 text-gray-200">Ações do Sistema</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={fetchStatus} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors">
                                Atualizar Métricas
                            </button>
                            <button onClick={toggleKiosk} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors">
                                Alternar Modo Kiosk / Janela
                            </button>
                            <button onClick={restartTokyoOS} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition-colors">
                                Desligar / Reiniciar Tokyo OS
                            </button>
                        </div>
                    </div>

                    {/* Logs de Erro */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 md:col-span-2">
                        <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center">
                            <span className="text-red-400 mr-2">⚠️</span> 
                            Últimos Erros (startup_errors.log)
                        </h2>
                        <pre className="bg-black p-4 rounded text-xs text-red-300 overflow-x-auto whitespace-pre-wrap border border-gray-700">
                            {status.lastErrors || "Nenhum erro registrado no boot."}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};
