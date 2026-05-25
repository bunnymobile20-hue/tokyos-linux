import { useState, useEffect } from 'react'
import { Minus, Square, X, Settings, Grid, Lock, Mic, Store } from 'lucide-react'
import { DashboardIcon, MonitorIcon, FilesIcon, DownloadsIcon, NotesIcon } from './components/Icons'
import LoginScreen from './components/LoginScreen'
import ToastProvider from './components/ToastProvider'
import NotificationCenter from './components/NotificationCenter'

import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './apps/Dashboard'
import ServiceMonitor from './apps/Monitor'
import IframeApp from './apps/IframeApp'
import DownloadApp from './apps/DownloadApp'
import NotesApp from './apps/NotesApp'
import DashboardExecutivo from './apps/DashboardExecutivo'
import { withBasePath } from './lib/basePath'
import DesktopWidgets from './components/DesktopWidgets'
import { fetchServerUiConfig, saveServerUiConfig } from './lib/serverUiConfig'
import { useNotificationStore } from './store/useNotificationStore'
import VoiceAssistantFloating from './components/VoiceAssistantFloating'
import VoiceActivationScreen from './apps/VoiceActivationScreen'

type AppId = 'dashboard' | 'monitor' | 'files' | 'downloads' | 'notes' | 'voice' | 'dashboardexecutivo'

type AppCategory = 'system'

interface AppDef {
  id: AppId
  name: string
  icon: React.ElementType
  color: string
  category: AppCategory
}

const DESKTOP_APPS: AppDef[] = [
  { id: 'voice', name: 'Assistente de Voz', icon: Mic, color: 'text-purple-400', category: 'system' },
  { id: 'dashboardexecutivo', name: 'Dashboard Executivo', icon: Store, color: 'text-pink-400', category: 'system' },
  { id: 'dashboard', name: 'Status do Sistema', icon: DashboardIcon, color: 'text-blue-400', category: 'system' },
  { id: 'monitor', name: 'Monitoramento', icon: MonitorIcon, color: 'text-green-400', category: 'system' },
  { id: 'files', name: 'Arquivos', icon: FilesIcon, color: 'text-amber-400', category: 'system' },
  { id: 'downloads', name: 'Downloads', icon: DownloadsIcon, color: 'text-purple-400', category: 'system' },
  { id: 'notes', name: 'Notas', icon: NotesIcon, color: 'text-rose-400', category: 'system' },
]

const UTILITY_APPS: AppDef[] = DESKTOP_APPS

const APPS: AppDef[] = DESKTOP_APPS

const WALLPAPERS = [
  withBasePath('/wallpaper.svg'),
  withBasePath('/wallpapers/clean-1.jpg'),
  withBasePath('/wallpapers/clean-6.jpg')
]

function App() {
  const stored = localStorage.getItem('tokios-auth')
  const initialSession = stored ? JSON.parse(stored) : null
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialSession)
  const [password, setPassword] = useState<string | null>(initialSession?.password || null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [authFetchReady, setAuthFetchReady] = useState(false)

  useEffect(() => {
    document.title = 'TokyOS'
    const splash = document.getElementById('tokio-splash')
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 500)
      }, 300)
    }
  }, [])

  const [activeApp, setActiveApp] = useState<AppId | null>(null)
  const [lastActiveApp, setLastActiveApp] = useState<AppId | null>(null)
  const [openedApps, setOpenedApps] = useState<Set<AppId>>(new Set())
  const [maximizedApps, setMaximizedApps] = useState<Set<AppId>>(new Set())
  const [time, setTime] = useState(new Date())
  const [showSettings, setShowSettings] = useState(false)
  const [showAppLauncher, setShowAppLauncher] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !password) {
      setAuthFetchReady(false)
      return
    }
    const originalFetch = window.fetch
    const authHeader = 'Basic ' + btoa('clawos:' + password)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const newInit = init || {}
      const headers = new Headers(newInit.headers || {})
      const url = typeof input === 'string' ? input : input.toString()
      if (url.startsWith('/') || url.startsWith(window.location.origin) || url.startsWith('http') === false) {
        headers.set('Authorization', authHeader)
      }
      newInit.headers = headers
      return originalFetch(input, newInit)
    }
    setAuthFetchReady(true)
    return () => {
      window.fetch = originalFetch
      setAuthFetchReady(false)
    }
  }, [isAuthenticated, password])

  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/system/apps/pending-launch')
        const json = await res.json()
        if (json.success && json.data?.app_id) {
          setActiveApp(json.data.app_id)
        }
      } catch {}
    }, 2000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const [settingsTab, setSettingsTab] = useState<'personal'|'download'|'env'|'about'>('personal')
  const [dockSize, setDockSize] = useState(48)
  const [autoHideDock, setAutoHideDock] = useState(false)
  const [defaultFullscreen, setDefaultFullscreen] = useState(false)
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0])
  const [showWidgets, setShowWidgets] = useState(true)
  const [showMiniDock, setShowMiniDock] = useState(true)
  const [dockHideDelay, setDockHideDelay] = useState(2)
  const [stickyNotifications, setStickyNotifications] = useState(false)
  const [uiConfigReady, setUiConfigReady] = useState(false)
  const setNotificationBehavior = useNotificationStore((state) => state.setBehavior)
  
  const [isDockVisible, setIsDockVisible] = useState(true)
  const [isHoveringDock, setIsHoveringDock] = useState(false)
  const [windowPadX, setWindowPadX] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 16 : 48)
  const [downloadDir, setDownloadDir] = useState('')
  const [appStatuses, setAppStatuses] = useState<Record<string, {status: string, message: string}>>({})
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [envLoading, setEnvLoading] = useState(false)
  const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = () => {
      fetch('/api/system/apps/status')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAppStatuses(data.data)
            window.dispatchEvent(new CustomEvent('tokios-app-status', { detail: data.data }))
          }
        })
        .catch(err => console.error('Failed to fetch app status', err));
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchEnv = () => {
      fetch('/api/system/config/env')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setEnvVars(data.data)
          }
        })
        .catch(console.error)
    }
    fetchEnv()
  }, [isAuthenticated])

  const handleSaveEnv = async () => {
    setEnvLoading(true)
    try {
      const res = await fetch('/api/system/config/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envVars)
      })
      const data = await res.json()
      if (data.success) {
        setEnvVars(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setEnvLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/system/downloads/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.dir) {
          setDownloadDir(data.data.dir)
        }
      })
      .catch(console.error)
  }, [isAuthenticated])

  const handleDownloadDirUpdate = (newDir: string) => {
    setDownloadDir(newDir)
    fetch('/api/system/downloads/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: newDir })
    }).catch(console.error)
  }

  useEffect(() => {
    const handleResize = () => setWindowPadX(window.innerWidth < 768 ? 16 : 48)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchServerUiConfig()
      .then((ui) => {
        setDockSize(ui.dockSize)
        setAutoHideDock(ui.autoHideDock)
        setDefaultFullscreen(ui.defaultFullscreen)
        setWallpaper(ui.wallpaper || WALLPAPERS[0])
        setShowWidgets(ui.showWidgets)
        setShowMiniDock(ui.showMiniDock ?? true)
        setDockHideDelay(ui.dockHideDelay)
        setStickyNotifications(ui.stickyNotifications)
      })
      .catch((error) => {
        console.error('Failed to load server UI config', error)
      })
      .finally(() => {
        setUiConfigReady(true)
      })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !uiConfigReady) return
    saveServerUiConfig({
      dockSize,
      autoHideDock,
      defaultFullscreen,
      wallpaper,
      showWidgets,
      showMiniDock,
      dockHideDelay,
      stickyNotifications,
    }).catch((error) => {
      console.error('Failed to save server UI config', error)
    })
  }, [isAuthenticated, uiConfigReady, dockSize, autoHideDock, defaultFullscreen, wallpaper, showWidgets, showMiniDock, dockHideDelay, stickyNotifications])

  useEffect(() => {
    setNotificationBehavior({
      stickyToasts: stickyNotifications,
    })
  }, [stickyNotifications, setNotificationBehavior])

  useEffect(() => {
    if (!autoHideDock) {
      setIsDockVisible(true)
      return
    }
    if (isHoveringDock) {
      setIsDockVisible(true)
      return
    }
    const timer = setTimeout(() => {
      setIsDockVisible(false)
    }, dockHideDelay * 1000)
    return () => clearTimeout(timer)
  }, [autoHideDock, isHoveringDock, dockHideDelay])

  const [miniStats, setMiniStats] = useState<any | null>(null)

  useEffect(() => {
    if (activeApp) {
      setLastActiveApp(activeApp)
      setOpenedApps(prev => {
        if (prev.has(activeApp)) return prev
        const newSet = new Set(prev)
        newSet.add(activeApp)
        return newSet
      })
      if (defaultFullscreen) {
        setMaximizedApps(prev => {
          if (prev.has(activeApp)) return prev
          const next = new Set(prev)
          next.add(activeApp)
          return next
        })
      }
    }
  }, [activeApp, defaultFullscreen])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const fetchMiniStats = async () => {
      try {
        const res = await fetch(withBasePath('/api/system/hardware'))
        const json = await res.json()
        if (json.success) {
          setMiniStats({
            cpu: parseFloat(json.data.cpu.usage),
            mem: parseFloat(json.data.memory.usagePercent)
          })
        }
      } catch (err) {}
    }
    fetchMiniStats()
    const intv = setInterval(fetchMiniStats, 5000)
    return () => clearInterval(intv)
  }, [isAuthenticated])

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveApp(null)
  }

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveApp(null)
  }

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeApp) {
      setMaximizedApps(prev => {
        const next = new Set(prev)
        if (next.has(activeApp)) {
          next.delete(activeApp)
        } else {
          next.add(activeApp)
        }
        return next
      })
    }
  }

  const handleDockAppClick = (appId: AppId) => {
    setActiveApp((current) => (current === appId ? null : appId))
  }

  const handleLogin = async (inputPassword: string) => {
    setLoginLoading(true)
    setLoginError(null)
    try {
      const response = await fetch(withBasePath('/api/system/auth/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword })
      })
      const data = await response.json()
      if (data.success) {
        setPassword(inputPassword)
        setIsAuthenticated(true)
        setLoginError(null)
        localStorage.setItem('tokios-auth', JSON.stringify({ password: inputPassword }))
      } else {
        setLoginError('Senha incorreta. Por favor, tente novamente.')
      }
    } catch (error) {
      setLoginError('Falha na autenticação. Verifique a conexão de rede.')
    } finally {
      setLoginLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading} />
  }

  const showBottomDock = !showMiniDock

  const renderAppContent = (id: AppId) => {
    switch (id) {
      case 'dashboardexecutivo': return <DashboardExecutivo />
      case 'voice': return <VoiceActivationScreen />
      case 'dashboard': return <Dashboard />
      case 'monitor': return <ServiceMonitor />
      case 'files': return <IframeApp url={withBasePath('/proxy/filebrowser/')} title="FileBrowser" />
      case 'downloads': return <DownloadApp />
      case 'notes': return <NotesApp />
      default: return null
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-slate-800 font-sans select-none">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: `url(${wallpaper})`,
          filter: activeApp ? 'brightness(0.95) blur(6px)' : 'brightness(1) blur(0px)'
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-8 bg-white/30 backdrop-blur-md border-b border-white/20 z-[999] flex justify-between items-center px-4 text-xs font-medium text-slate-700 shadow-sm pointer-events-auto">
        <div className="flex items-center space-x-3">
          <div 
            onClick={() => setShowAppLauncher(prev => !prev)}
            className="cursor-pointer hover:bg-white/40 p-1.5 rounded-md transition-colors flex items-center justify-center bg-blue-500/10"
            title="Menu de Aplicativos"
          >
            <Grid className="w-4 h-4 text-blue-600 drop-shadow-sm" />
          </div>
          <div 
            onClick={() => setShowSettings(true)}
            className="cursor-pointer hover:bg-white/40 p-1 rounded-md transition-colors flex items-center justify-center"
            title="Configurações"
          >
            <Settings className="w-3.5 h-3.5 text-slate-700 drop-shadow-sm" />
          </div>
          <span className="font-bold text-slate-800 tracking-wide">TokyOS</span>
          <div
            onClick={() => { localStorage.removeItem('tokios-auth'); setIsAuthenticated(false); setPassword(null); }}
            className="cursor-pointer hover:bg-white/40 p-1 rounded-md transition-colors ml-1"
            title="Bloquear Tela"
          >
            <Lock className="w-3.5 h-3.5 text-slate-700 drop-shadow-sm" />
          </div>
        </div>
        {showMiniDock && (
          <div className="absolute left-1/2 top-0 hidden h-full -translate-x-1/2 items-center md:flex">
            <div className="flex h-7 items-center gap-0.5 rounded-xl border border-white/30 bg-white/20 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] backdrop-blur-xl">
            {APPS.filter(app => openedApps.has(app.id)).map((app) => (
              <button
                key={app.id}
                onClick={() => handleDockAppClick(app.id)}
                title={app.name}
                className={`relative flex h-6 w-7 items-center justify-center rounded-lg transition-colors duration-150 ${activeApp === app.id ? 'bg-white/70 shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'hover:bg-white/45'}`}
              >
                <app.icon className="h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)]" />
                {openedApps.has(app.id) && (
                  <span className={`absolute bottom-0.5 left-1/2 h-0.5 -translate-x-1/2 rounded-full ${activeApp === app.id ? 'w-3 bg-slate-700' : 'w-1.5 bg-slate-500/70'}`} />
                )}
              </button>
            ))}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-4">
          {miniStats && (
            <div className="flex items-center space-x-3 bg-white/40 px-2 py-0.5 rounded-full border border-white/30 shadow-inner">
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-500 font-bold">C</span>
                <div className="w-8 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${miniStats.cpu}%` }} />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-500 font-bold">M</span>
                <div className="w-8 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${miniStats.mem}%` }} />
                </div>
              </div>
            </div>
          )}
          <span className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5 shadow-[0_0_8px_rgba(34,197,94,0.8)]" /> 
            Tailscale Normal
          </span>
          <NotificationCenter />
          <span>{time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      <ToastProvider />

      <AnimatePresence>
        {!activeApp && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`absolute inset-0 z-10 p-8 pt-16 pb-32 ${!activeApp && showWidgets ? 'pr-[700px]' : 'pr-8'}`}
          >
            <div className="grid grid-cols-[repeat(auto-fill,96px)] gap-6 justify-start">
              {DESKTOP_APPS.map(app => (
                <div 
                  key={app.id} 
                  onClick={() => setActiveApp(app.id)}
                  className="flex flex-col items-center justify-center w-24 h-28 rounded-xl hover:bg-white/20 hover:backdrop-blur-md transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/40 backdrop-blur-lg border border-white/50 shadow-xl flex items-center justify-center group-hover:shadow-2xl group-hover:-translate-y-1 transition-all">
                    <app.icon className={`w-8 h-8 ${app.color} drop-shadow-sm`} />
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-800 bg-white/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 shadow-sm text-center w-full truncate">{app.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ 
          opacity: !activeApp && showWidgets ? 1 : 0, 
          x: !activeApp && showWidgets ? 0 : 50,
          pointerEvents: !activeApp && showWidgets ? 'auto' : 'none'
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ 
          position: 'absolute',
          right: 0,
          top: 32,
          bottom: 0,
          width: showWidgets ? `${Math.min(640, window.innerWidth - 320)}px` : '0px',
          zIndex: 20
        }}
      >
        <DesktopWidgets authReady={authFetchReady} onOpenDownloads={() => setActiveApp('downloads')} onOpenDida={() => setActiveApp('dida')} />
      </motion.div>

      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-2xl w-[640px] h-[460px] flex overflow-hidden"
            >
              <div className="w-48 bg-slate-50/50 border-r border-slate-200/50 flex flex-col p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-6">Configurações do sistema</h3>
                <div className="space-y-1">
                  {[ {id:"personal", label:"Personalização"}, {id:"download", label:"Downloads"}, {id:"env", label:"Ambiente & Chaves"}, {id:"about", label:"Sobre"} ].map(tab => (
                    <div 
                      key={tab.id}
                      onClick={() => setSettingsTab(tab.id as any)}
                      className={`px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${settingsTab === tab.id ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-600 hover:bg-slate-200/50"}`}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col relative">
                <div className="absolute top-4 right-4 z-10">
                  <div 
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => setShowSettings(false)}
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                  {settingsTab === "personal" && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                      <h4 className="text-lg font-bold text-slate-800 mb-6">personalização</h4>
                      <div className="space-y-6">
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-3">Papel de parede do sistema</label>
                          <div className="grid grid-cols-5 gap-3 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                            {WALLPAPERS.map((wp, idx) => (
                              <div 
                                key={idx}
                                onClick={() => setWallpaper(wp)}
                                className={`h-12 rounded-lg bg-cover bg-center cursor-pointer border-2 transition-all hover:opacity-90 ${wallpaper === wp ? 'border-blue-500 shadow-md scale-[0.92]' : 'border-transparent hover:border-slate-300'}`}
                                style={{ backgroundImage: `url(${wp})` }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="h-px bg-slate-200/60 my-2" />
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Ocultar Dock automaticamente</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={autoHideDock}
                              onChange={(e) => setAutoHideDock(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Mostrar Widgets na área de trabalho</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={showWidgets}
                              onChange={(e) => setShowWidgets(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Mostrar Mini Dock superior</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={showMiniDock}
                              onChange={(e) => setShowMiniDock(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-slate-700">Exibição permanente de notificação</label>
                            <p className="text-xs text-slate-500 mt-1">Se desativado as notificações desaparecem automaticamente. Se ativado, precisam ser fechadas manualmente.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={stickyNotifications}
                              onChange={(e) => setStickyNotifications(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </div>
                        {autoHideDock && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300 pl-4 border-l-2 border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-sm font-medium text-slate-700">
                                Tempo de atraso para ocultar
                              </label>
                              <span className="text-xs text-slate-500 font-mono">{dockHideDelay}s</span>
                            </div>
                            <input 
                              type="range" 
                              min="1" 
                              max="10" 
                              step="1"
                              value={dockHideDelay}
                              onChange={(e) => setDockHideDelay(parseInt(e.target.value, 10))}
                              className="w-full accent-blue-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        )}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-slate-700">
                              Tamanho do Dock
                            </label>
                            <span className="text-xs text-slate-500 font-mono">{dockSize}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="32" 
                            max="80" 
                            step="4"
                            value={dockSize}
                            onChange={(e) => setDockSize(parseInt(e.target.value, 10))}
                            className="w-full accent-blue-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Pequeno</span>
                            <span>Grande</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-slate-700">Abrir janelas em tela cheia por padrão</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={defaultFullscreen}
                              onChange={(e) => setDefaultFullscreen(e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  {settingsTab === "download" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <h4 className="text-lg font-bold text-slate-800 mb-6">Baixar configurações</h4>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Diretório padrão de downloads e salvamento</label>
                        <input 
                          type="text" 
                          value={downloadDir}
                          onChange={(e) => setDownloadDir(e.target.value)}
                          onBlur={(e) => handleDownloadDirUpdate(e.target.value)}
                          placeholder="~/Downloads"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-shadow"
                        />
                        <p className="text-xs text-slate-500 mt-2">Esta configuração será aplicada globalmente ao caminho de download padrão para músicas e discos de rede. As modificações entram em vigor automaticamente.</p>
                      </div>
                    </div>
                  )}
                  {settingsTab === "env" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-slate-800">Ambiente & Chaves</h4>
                        <button 
                          onClick={handleSaveEnv}
                          disabled={envLoading}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition"
                        >
                          {envLoading ? 'Salvando...' : 'Salvar Arquivo .env'}
                        </button>
                      </div>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-xs text-slate-500">
                          ATENÇÃO: Editar essas chaves pode afetar o acesso ao sistema. O TokyOS será atualizado assim que salvar.
                        </p>
                        {Object.entries(envVars).map(([key, val]) => (
                          <div key={key} className="flex flex-col space-y-1">
                            <label className="text-xs font-mono font-medium text-slate-700">{key}</label>
                            <div className="relative">
                              <input 
                                type={showEnvValues[key] ? "text" : "password"}
                                value={val}
                                onChange={(e) => setEnvVars(prev => ({...prev, [key]: e.target.value}))}
                                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                              />
                              <button
                                type="button"
                                onClick={() => setShowEnvValues(prev => ({...prev, [key]: !prev[key]}))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showEnvValues[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {settingsTab === "about" && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-300 pt-8">
                      <img src={withBasePath("/favicon.svg")} className="w-20 h-20 mb-2 drop-shadow-md" />
                      <h2 className="text-3xl font-bold text-slate-800">TokyOS</h2>
                       <p className="text-slate-500 font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">v1.30.1</p>
                      <div className="h-px w-16 bg-slate-200 my-4" />
                      <div className="text-sm text-slate-600 space-y-2">
                        <p>Data de construção: 2026-04-12</p>
                        <p>Desenvolvedor: <span className="font-bold text-slate-800">gumustudio</span></p>
                      </div>
                      <p className="text-xs text-slate-400 mt-8">© 2026 Bunny Dreams (TokyOS). Licensed under GPL-3.0.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAppLauncher && (
          <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAppLauncher(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-3xl w-[800px] h-[600px] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="text-3xl font-bold text-slate-800">Utilitários e Sistema</h2>
                <div 
                  className="w-10 h-10 rounded-full bg-slate-200/50 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors"
                  onClick={() => setShowAppLauncher(false)}
                >
                  <X className="w-5 h-5 text-slate-600" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
                {(Object.entries(CATEGORY_NAMES) as [AppCategory, string][]).map(([catId, catName]) => {
                  const catApps = APPS.filter(a => a.category === catId);
                  if (catApps.length === 0) return null;
                  return (
                    <div key={catId} className="mb-8 last:mb-0">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">{catName}</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-6">
                        {catApps.map(app => (
                          <div 
                            key={app.id} 
                            onClick={() => {
                              setActiveApp(app.id)
                              setShowAppLauncher(false)
                            }}
                            className="flex flex-col items-center justify-center cursor-pointer group active:scale-95 relative"
                          >
                            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center group-hover:shadow-xl group-hover:-translate-y-1 transition-all border border-slate-100 mb-3 relative">
                              <app.icon className={`w-8 h-8 ${app.color || 'text-blue-500'} drop-shadow-sm`} />
                              
                              {appStatuses && appStatuses[app.id] && (
                                <div 
                                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${appStatuses[app.id].status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} 
                                  title={appStatuses[app.id].message} 
                                />
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-700 text-center leading-tight line-clamp-2">{app.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ 
          opacity: activeApp ? 1 : 0, 
          y: activeApp ? 0 : 20, 
          scale: activeApp ? 1 : 0.98,
          pointerEvents: activeApp ? 'auto' : 'none',
          paddingTop: activeApp && maximizedApps.has(activeApp) ? 32 : 48,
          paddingLeft: activeApp && maximizedApps.has(activeApp) ? 0 : windowPadX,
          paddingRight: activeApp && maximizedApps.has(activeApp) ? 0 : windowPadX,
          paddingBottom: activeApp && maximizedApps.has(activeApp) 
            ? (showBottomDock && isDockVisible ? dockSize + 40 : 0)
            : (showBottomDock && isDockVisible ? dockSize + 48 : 48)
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`absolute z-30 flex flex-col pointer-events-none inset-0`}
      >
        <motion.div 
          animate={{
            borderRadius: activeApp && maximizedApps.has(activeApp) ? 0 : 16
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`w-full h-full bg-white/60 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col ${
            activeApp && maximizedApps.has(activeApp) ? 'border-0 border-transparent' : 'border border-white/50'
          } ${activeApp ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <div className="h-8 bg-white/40 border-b border-white/50 flex items-center px-3 flex-shrink-0 select-none relative transition-colors duration-300" onDoubleClick={handleMaximize}>
            <div className="flex items-center space-x-1.5 z-10">
              <div 
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] cursor-pointer hover:bg-[#ff5f56]/80 flex items-center justify-center group"
              >
                <X className="w-2 h-2 text-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div 
                onClick={handleMinimize}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] cursor-pointer hover:bg-[#ffbd2e]/80 flex items-center justify-center group"
              >
                <Minus className="w-2 h-2 text-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div 
                onClick={handleMaximize}
                className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] cursor-pointer hover:bg-[#27c93f]/80 flex items-center justify-center group"
              >
                <Square className="w-1.5 h-1.5 text-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center space-x-1.5">
                {(() => {
                  const currentApp = APPS.find(a => a.id === (activeApp || lastActiveApp))
                  const AppIcon = currentApp?.icon || DashboardIcon
                  return (
                    <>
                      <AppIcon className="w-3.5 h-3.5 text-slate-600 drop-shadow-sm" />
                      <div className="font-semibold text-xs text-slate-700 tracking-wide drop-shadow-sm">
                        {currentApp?.name}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-white/40 relative">
            {Array.from(openedApps).map(id => (
              <div 
                key={id} 
                className="absolute inset-0 transition-opacity duration-200 overflow-auto"
                style={{ 
                  opacity: activeApp === id ? 1 : 0,
                  pointerEvents: activeApp === id ? 'auto' : 'none',
                  zIndex: activeApp === id ? 10 : 0
                }}
              >
                {renderAppContent(id)}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {showBottomDock && autoHideDock && !isDockVisible && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-4 z-50 pointer-events-auto"
          onMouseEnter={() => setIsHoveringDock(true)}
        />
      )}

      {showBottomDock && (
        <div
          className={`absolute bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-500 ease-in-out ${autoHideDock && !isDockVisible ? 'translate-y-32' : 'translate-y-0'}`}
        >
          <div
            className="bg-white/30 backdrop-blur-2xl border border-white/40 p-2 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center space-x-2 pointer-events-auto"
            onMouseEnter={() => setIsHoveringDock(true)}
            onMouseLeave={() => setIsHoveringDock(false)}
          >
            {APPS.map(app => (
              <div
                key={app.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDockAppClick(app.id)
                }}
                className="relative group cursor-pointer"
              >
                <div
                  className={`rounded-2xl flex items-center justify-center transition-all duration-300 ${activeApp === app.id ? 'bg-white/80 scale-110 shadow-lg' : 'bg-white/30 hover:bg-white/60 hover:-translate-y-2 hover:shadow-xl'}`}
                  style={{ width: dockSize, height: dockSize }}
                >
                  <app.icon className={`${app.color}`} style={{ width: dockSize / 2, height: dockSize / 2 }} />
                </div>
                {activeApp === app.id && (
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-slate-600 rounded-full" />
                )}
                {activeApp !== app.id && openedApps.has(app.id) && (
                  <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-400 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <VoiceAssistantFloating />
    </div>
  )
}

export default App
