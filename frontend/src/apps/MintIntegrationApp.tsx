import React, { useState } from 'react';
import { 
    Wrench, 
    FolderOpen, 
    TerminalWindow, 
    DownloadSimple, 
    Cpu, 
    Storefront 
} from '@phosphor-icons/react';

interface AppCardProps {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const apps: AppCardProps[] = [
    {
        id: 'cinnamon-settings',
        title: 'Configurações do Mint',
        description: 'Painel de controle, Wi-Fi, Monitores, e personalização do sistema.',
        icon: <Wrench size={40} weight="duotone" />,
        color: 'from-blue-600 to-indigo-700'
    },
    {
        id: 'nemo',
        title: 'Gerenciador de Arquivos',
        description: 'Explorador nativo para acessar seus arquivos, pendrives e downloads.',
        icon: <FolderOpen size={40} weight="duotone" />,
        color: 'from-amber-500 to-orange-600'
    },
    {
        id: 'gnome-terminal',
        title: 'Terminal Nativo',
        description: 'Console bash direto do Linux Mint para manutenção avançada.',
        icon: <TerminalWindow size={40} weight="duotone" />,
        color: 'from-gray-700 to-black'
    },
    {
        id: 'mintupdate',
        title: 'Atualizações',
        description: 'Mantenha os pacotes do Linux e a segurança em dia.',
        icon: <DownloadSimple size={40} weight="duotone" />,
        color: 'from-emerald-500 to-teal-700'
    },
    {
        id: 'driver-manager',
        title: 'Drivers e Hardware',
        description: 'Instale drivers proprietários de GPU e redes no Mint.',
        icon: <Cpu size={40} weight="duotone" />,
        color: 'from-purple-500 to-violet-700'
    },
    {
        id: 'mintinstall',
        title: 'Loja de Softwares',
        description: 'Instale novos programas nativos e Flatpaks na máquina.',
        icon: <Storefront size={40} weight="duotone" />,
        color: 'from-pink-500 to-rose-700'
    }
];

export default function MintIntegrationApp() {
    const [loadingApp, setLoadingApp] = useState<string | null>(null);

    const launchApp = async (programId: string) => {
        setLoadingApp(programId);
        try {
            const res = await fetch('/api/system/mint/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ program: programId })
            });
            const data = await res.json();
            if (!data.success) {
                console.error("Erro ao iniciar aplicativo nativo:", data.error);
                alert("Erro ao iniciar aplicativo nativo: " + data.error);
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão ao tentar lançar o app.");
        } finally {
            // Remove o loading após 1 segundo para feedback visual
            setTimeout(() => setLoadingApp(null), 1000);
        }
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-900 text-white font-sans">
            <div className="mb-8 border-b border-gray-700 pb-4">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
                    Linux Mint Core
                </h1>
                <p className="text-gray-400 text-sm">
                    Acesso direto às configurações e programas fundamentais do sistema operacional. As janelas abrirão sobre o Tokyo OS.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map(app => (
                    <div 
                        key={app.id}
                        onClick={() => launchApp(app.id)}
                        className={`relative overflow-hidden bg-gradient-to-br ${app.color} rounded-xl shadow-xl border border-gray-800 p-6 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:brightness-110 flex flex-col items-center text-center group`}
                    >
                        {/* Overlay Glassmorphism */}
                        <div className="absolute inset-0 bg-black opacity-40 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"></div>
                        
                        {/* Icon */}
                        <div className={`relative z-10 p-4 bg-white/10 rounded-full mb-4 backdrop-blur-sm shadow-inner transition-transform duration-300 ${loadingApp === app.id ? 'animate-pulse scale-90' : 'group-hover:scale-110'}`}>
                            {app.icon}
                        </div>
                        
                        {/* Content */}
                        <div className="relative z-10 w-full">
                            <h2 className="text-xl font-bold text-white mb-2 shadow-sm drop-shadow-md">
                                {app.title}
                            </h2>
                            <p className="text-gray-100 text-sm opacity-90 font-medium">
                                {app.description}
                            </p>
                        </div>
                        
                        {/* Loading State Overlay */}
                        {loadingApp === app.id && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
