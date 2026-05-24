import { useEffect, useMemo, useState } from 'react'
import {
  PlayIcon,
  PauseIcon,
  FolderOpenIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  QueueListIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  SignalIcon
} from '@heroicons/react/24/solid'
import { DownloadsIcon } from '../components/Icons'
import { withBasePath } from '../lib/basePath'
import DirSetting from '../components/DirSetting'
import { getCleanupLabel, getTaskDisplayName, getTaskStatusLabel, matchesDownloadFilter, type CleanupScope, type DownloadFilter, type Aria2TaskStatus } from './downloadTaskMeta'
import { createAppNotifier } from './notify'
import { frontendLog } from '../lib/logger'

interface Aria2TaskFile {
  path?: string
}

interface Aria2Task {
  gid: string
  status: Aria2TaskStatus
  totalLength: string
  completedLength: string
  downloadSpeed: string
  dir: string
  files: Aria2TaskFile[]
  bittorrent?: {
    info?: {
      name?: string
    }
  }
  errorCode?: string
  errorMessage?: string
}

interface DownloadCounts {
  all: number
  active: number
  waiting: number
  paused: number
  error: number
  completed: number
}

interface DownloadEngineStatus {
  available: boolean
  message: string
  version: string
  downloadDir: string
  globalStat: {
    downloadSpeed: string
    numActive: string
    numWaiting: string
    numStopped: string
  }
}

interface DeleteTaskState {
  task: Aria2Task
}

interface CleanupState {
  scope: CleanupScope
  count: number
}

interface ToastState {
  tone: 'success' | 'error' | 'info'
  message: string
}

const FILTER_LABELS: Record<DownloadFilter, string> = {
  all: 'todos',
  active: 'Baixando',
  waiting: 'Na fila',
  paused: 'Suspenso',
  error: 'falhar',
  completed: 'Concluído'
}

const FILTER_ORDER: DownloadFilter[] = ['all', 'active', 'waiting', 'paused', 'error', 'completed']
const notifyDownloads = createAppNotifier('downloads')

function createEmptyCounts(): DownloadCounts {
  return {
    all: 0,
    active: 0,
    waiting: 0,
    paused: 0,
    error: 0,
    completed: 0
  }
}

function createInitialStatus(): DownloadEngineStatus {
  return {
    available: true,
    message: '',
    version: '',
    downloadDir: '',
    globalStat: {
      downloadSpeed: '0',
      numActive: '0',
      numWaiting: '0',
      numStopped: '0'
    }
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0 || Number.isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function getTaskFileCount(task: Aria2Task) {
  return task.files?.filter((file) => Boolean(file.path)).length || 0
}

function getTaskProgress(task: Aria2Task) {
  const total = parseInt(task.totalLength, 10)
  const completed = parseInt(task.completedLength, 10)
  if (!total) {
    return 0
  }
  return Math.min(100, (completed / total) * 100)
}

function calculateRemainingTime(task: Aria2Task) {
  const total = parseInt(task.totalLength, 10)
  const completed = parseInt(task.completedLength, 10)
  const speed = parseInt(task.downloadSpeed, 10)
  if (speed <= 0 || total <= completed) return '--:--'

  const seconds = Math.floor((total - completed) / speed)
  if (seconds > 86400) return '> 1 céu'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getStatusMeta(task: Aria2Task) {
  switch (task.status) {
    case 'active':
      return {
        label: 'Baixando',
        tone: 'text-cyan-600',
        iconTone: 'bg-cyan-50 text-cyan-500',
        barTone: 'bg-cyan-500',
        icon: <ArrowDownTrayIcon className="w-5 h-5" />
      }
    case 'waiting':
      return {
        label: 'Na fila',
        tone: 'text-amber-600',
        iconTone: 'bg-amber-50 text-amber-500',
        barTone: 'bg-amber-400',
        icon: <QueueListIcon className="w-5 h-5" />
      }
    case 'paused':
      return {
        label: 'Suspenso',
        tone: 'text-slate-500',
        iconTone: 'bg-slate-100 text-slate-400',
        barTone: 'bg-slate-300',
        icon: <PauseIcon className="w-5 h-5" />
      }
    case 'error':
      return {
        label: 'Falha no download',
        tone: 'text-red-600',
        iconTone: 'bg-red-50 text-red-500',
        barTone: 'bg-red-500',
        icon: <ExclamationTriangleIcon className="w-5 h-5" />
      }
    case 'complete':
      return {
        label: 'Concluído',
        tone: 'text-green-600',
        iconTone: 'bg-green-50 text-green-500',
        barTone: 'bg-green-500',
        icon: <CheckCircleIcon className="w-5 h-5" />
      }
    default:
      return {
        label: 'Removido',
        tone: 'text-slate-500',
        iconTone: 'bg-slate-100 text-slate-400',
        barTone: 'bg-slate-300',
        icon: <TrashIcon className="w-5 h-5" />
      }
  }
}

export default function DownloadApp() {
  const [tasks, setTasks] = useState<Aria2Task[]>([])
  const [counts, setCounts] = useState<DownloadCounts>(createEmptyCounts())
  const [engineStatus, setEngineStatus] = useState<DownloadEngineStatus>(createInitialStatus())
  const [loading, setLoading] = useState(true)
  const [showNewTask, setShowNewTask] = useState(false)
  const [showCleanupMenu, setShowCleanupMenu] = useState(false)
  const [newTaskUrl, setNewTaskUrl] = useState('')
  const [downloadDir, setDownloadDir] = useState('')
  const [newTaskDir, setNewTaskDir] = useState('')
  const [filter, setFilter] = useState<DownloadFilter>('all')
  const [deleteTaskState, setDeleteTaskState] = useState<DeleteTaskState | null>(null)
  const [removeLocalFile, setRemoveLocalFile] = useState(false)
  const [cleanupState, setCleanupState] = useState<CleanupState | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [working, setWorking] = useState(false)

  const safeNotify = async (
    title: string,
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
    options?: {
      dedupeKey?: string
      batchKey?: string
      batchTitle?: string
    },
  ) => {
    try {
      await notifyDownloads({
        title,
        message,
        level,
        dedupeKey: options?.dedupeKey,
        batchKey: options?.batchKey,
        batchTitle: options?.batchTitle,
        batchMessageBuilder: options?.batchKey
          ? (count, latestMessage) => `${latestMessage}${count > 1 ? `（No período recente, um total de ${count} Segunda categoria）` : ''}`
          : undefined,
      })
    } catch (errorObj) {
      frontendLog.warn('DownloadApp', 'System notification failed', {
        message: errorObj instanceof Error ? errorObj.message : 'unknown error',
        title,
      })
    }
  }

  const showToast = (tone: ToastState['tone'], message: string) => {
    setToast({ tone, message })
  }

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const refreshStatus = async () => {
    const response = await fetch(withBasePath('/api/system/downloads/status'))
    const json = await response.json()
    if (json.success) {
      setEngineStatus(json.data)
      if (json.data.downloadDir && !downloadDir) {
        setDownloadDir(json.data.downloadDir)
        setNewTaskDir(json.data.downloadDir)
      }
    }
  }

  const refreshTasks = async () => {
    const response = await fetch(withBasePath('/api/system/downloads/tasks'))
    const json = await response.json()
    if (json.success) {
      setTasks(json.data.tasks)
      setCounts(json.data.counts)
      if (!json.data.available && json.data.message) {
        setEngineStatus((current) => ({ ...current, available: false, message: json.data.message }))
      }
    }
  }

  const refreshDownloads = async () => {
    try {
      await Promise.all([refreshStatus(), refreshTasks()])
    } catch (error) {
      console.error(error)
      setEngineStatus((current) => ({
        ...current,
        available: false,
        message: 'O mecanismo de download não pode ser conectado no momento，Por favor confirme Aria2 Correndo。'
      }))
      setTasks([])
      setCounts(createEmptyCounts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshDownloads()
    const timer = window.setInterval(() => {
      void refreshDownloads()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [])

  const handleDownloadDirUpdate = async (nextDir: string) => {
    try {
      const response = await fetch(withBasePath('/api/system/downloads/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir: nextDir })
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || 'Falha ao salvar o diretório de download')
      }
      setDownloadDir(json.data.dir)
      setNewTaskDir(json.data.dir)
      showToast('success', 'O diretório de download padrão foi atualizado')
      await refreshStatus()
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao salvar o diretório de download')
      void safeNotify('Falha na atualização do diretório de download', error.message || 'Falha ao salvar o diretório de download', 'error', {
        dedupeKey: 'config:update-dir-failed',
      })
    }
  }

  const handleTaskAction = async (gid: string, action: 'pause' | 'resume', taskStatus: Aria2TaskStatus) => {
    try {
      setWorking(true)
      const response = await fetch(withBasePath(`/api/system/downloads/task/${gid}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, taskStatus })
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || 'Falha na operação')
      }
      showToast('success', action === 'pause' ? 'A tarefa está pausada' : 'A tarefa foi retomada')
      await refreshTasks()
    } catch (error: any) {
      showToast('error', error.message || 'Falha na operação')
      void safeNotify('Falha na operação de download da tarefa', error.message || 'Falha na operação', 'error', {
        batchKey: `task-action-failed:${action}`,
        batchTitle: action === 'pause' ? 'Falha na pausa da tarefa de download' : 'Falha na recuperação da tarefa de download',
      })
    } finally {
      setWorking(false)
    }
  }

  const handleConfirmDelete = async () => {
    const task = deleteTaskState?.task
    if (!task) {
      return
    }

    try {
      setWorking(true)
      const actionResponse = await fetch(withBasePath(`/api/system/downloads/task/${task.gid}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', taskStatus: task.status })
      })
      const actionJson = await actionResponse.json()
      if (!actionJson.success) {
        throw new Error(actionJson.error || 'Falha ao excluir tarefa')
      }

      if (removeLocalFile) {
        for (const file of task.files || []) {
          if (!file.path) continue
          const fileResponse = await fetch(withBasePath('/api/system/downloads/file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.path })
          })
          const fileJson = await fileResponse.json()
          if (!fileJson.success) {
            throw new Error(fileJson.error || 'Falha ao excluir o arquivo local')
          }
        }
      }

      setDeleteTaskState(null)
      setRemoveLocalFile(false)
      showToast('success', removeLocalFile ? 'Tarefas e arquivos locais excluídos' : 'O registro da tarefa foi excluído')
      await refreshTasks()
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao excluir tarefa')
      void safeNotify('Falha ao excluir tarefa de download', error.message || 'Falha ao excluir tarefa', 'error', {
        batchKey: 'task-delete-failed',
        batchTitle: 'Falha ao excluir tarefa de download',
      })
    } finally {
      setWorking(false)
    }
  }

  const handleAddTask = async () => {
    const url = newTaskUrl.trim()
    const dir = newTaskDir.trim()
    if (!url) {
      showToast('error', 'Por favor preencha o link de download primeiro')
      return
    }

    try {
      setWorking(true)
      const response = await fetch(withBasePath('/api/system/downloads/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, dir })
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || 'Falha ao criar tarefa de download')
      }
      setNewTaskUrl('')
      setShowNewTask(false)
      showToast('success', json.data.statusHint || 'Já adicionado à fila de download')
      await refreshDownloads()
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao criar tarefa de download')
      void safeNotify('Falha ao criar tarefa de download', error.message || 'Falha ao criar tarefa de download', 'error', {
        batchKey: 'task-create-failed',
        batchTitle: 'Falha ao criar tarefa de download',
      })
    } finally {
      setWorking(false)
    }
  }

  const handleCleanup = async () => {
    if (!cleanupState) {
      return
    }

    try {
      setWorking(true)
      const response = await fetch(withBasePath('/api/system/downloads/cleanup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: cleanupState.scope })
      })
      const json = await response.json()
      if (!json.success) {
        throw new Error(json.error || 'Falha ao limpar o histórico de downloads')
      }
      setCleanupState(null)
      showToast('success', `Limpo ${json.data.removedCount} histórico de downloads`)
      await refreshTasks()
    } catch (error: any) {
      showToast('error', error.message || 'Falha ao limpar o histórico de downloads')
      void safeNotify('Falha ao limpar o histórico de downloads', error.message || 'Falha ao limpar o histórico de downloads', 'error', {
        dedupeKey: `cleanup:${cleanupState.scope}:failed`,
      })
    } finally {
      setWorking(false)
    }
  }

  const openTaskFolder = (task: Aria2Task) => {
    const base = withBasePath('/proxy/filebrowser/files')
    const target = task.dir ? `${base}${task.dir}` : withBasePath('/proxy/filebrowser/')
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  const copyPath = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      showToast('success', successMessage)
    } catch {
      showToast('error', 'Falha na cópia，Copie manualmente')
    }
  }

  const filteredTasks = useMemo(() => tasks.filter((task) => matchesDownloadFilter(task.status, filter)), [filter, tasks])

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 relative">
      <div className="flex items-center justify-between gap-4 p-4 bg-white border-b border-slate-200 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap min-w-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <DownloadsIcon className="w-6 h-6 mr-2" />
            Gerenciamento de downloads
          </h2>

          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${engineStatus.available ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <SignalIcon className="w-4 h-4" />
            {engineStatus.available ? 'Baixe o mecanismo on-line' : 'Baixe o mecanismo off-line'}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
            <span>velocidade atual {formatBytes(parseInt(engineStatus.globalStat.downloadSpeed, 10))}/s</span>
            <span>ativo {engineStatus.globalStat.numActive}</span>
            <span>fila {engineStatus.globalStat.numWaiting}</span>
            <span>história {engineStatus.globalStat.numStopped}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <DirSetting
            label="Diretório de download padrão"
            value={downloadDir}
            onChange={handleDownloadDirUpdate}
            description="O que é modificado aqui é Aria2 Diretório padrão global；Ao criar uma nova tarefa, você pode substituir o caminho de salvamento separadamente.。"
          />

          <div className="relative">
            <button
              onClick={() => setShowCleanupMenu((value) => !value)}
              className="flex items-center px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-1.5" /> limpar registro
            </button>
            {showCleanupMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl p-2 z-20">
                {(['completed', 'failed', 'all-history'] as CleanupScope[]).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => {
                      const count = scope === 'completed'
                        ? counts.completed
                        : scope === 'failed'
                          ? counts.error
                          : counts.completed + counts.error
                      setCleanupState({ scope, count })
                      setShowCleanupMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <div className="font-medium">{getCleanupLabel(scope)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {scope === 'completed' ? `Limpeza esperada ${counts.completed} Registros concluídos` : scope === 'failed' ? `Limpeza esperada ${counts.error} fracassado/Registro excluído` : `Limpeza esperada ${counts.completed + counts.error} registros históricos`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setNewTaskDir(downloadDir)
              setShowNewTask(true)
            }}
            className="flex items-center px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-cyan-500/20"
          >
            <PlusIcon className="w-4 h-4 mr-1.5" /> Criar nova tarefa
          </button>
        </div>
      </div>

      {!engineStatus.available && (
        <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">O mecanismo de download não está disponível no momento</p>
            <p>{engineStatus.message}</p>
          </div>
        </div>
      )}

      <div className="px-6 pt-4 flex flex-wrap gap-2">
        {FILTER_ORDER.map((filterKey) => {
          const count = filterKey === 'all'
            ? counts.all
            : filterKey === 'active'
              ? counts.active
              : filterKey === 'waiting'
                ? counts.waiting
                : filterKey === 'paused'
                  ? counts.paused
                  : filterKey === 'error'
                    ? counts.error
                    : counts.completed
          return (
            <button
              key={filterKey}
              onClick={() => setFilter(filterKey)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === filterKey ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {FILTER_LABELS[filterKey]} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      <div className="px-6 pt-3 text-xs text-slate-500 flex flex-wrap gap-4">
        <span>diretório padrão：{downloadDir || 'não definido'}</span>
        <span>desta página“limpar registro”Apenas o histórico de tarefas será limpo，Os arquivos locais não serão excluídos。</span>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4 relative">
        {loading ? (
          <div className="flex justify-center items-center h-32 text-slate-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin mr-2" /> Conectando ao mecanismo de download...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white/70">
            <DownloadsIcon className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-base font-medium text-slate-600 mb-1">Atualmente não há tarefas de download correspondentes</p>
            <p className="text-sm">Pode criar novos HTTP、FTP ou Magnet Baixar tarefa，Você também pode limpar o histórico primeiro。</p>
          </div>
        ) : filteredTasks.map((task) => {
          const progress = getTaskProgress(task)
          const statusMeta = getStatusMeta(task)
          const taskName = getTaskDisplayName(task)
          const fileCount = getTaskFileCount(task)

          return (
            <div key={task.gid} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`mt-0.5 p-2 rounded-lg ${statusMeta.iconTone}`}>
                    {statusMeta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 truncate max-w-2xl" title={taskName}>{taskName}</h3>
                      <span className={`text-xs font-medium ${statusMeta.tone}`}>{getTaskStatusLabel({ status: task.status })}</span>
                    </div>

                    <div className="flex flex-wrap items-center text-xs text-slate-500 mt-1 gap-x-4 gap-y-1">
                      <span>{formatBytes(parseInt(task.completedLength, 10))} / {formatBytes(parseInt(task.totalLength, 10))}</span>
                      {task.status === 'active' && (
                        <>
                          <span className="flex items-center text-cyan-600 font-medium"><ArrowDownTrayIcon className="w-3 h-3 mr-1" /> {formatBytes(parseInt(task.downloadSpeed, 10))}/s</span>
                          <span className="flex items-center"><ClockIcon className="w-3 h-3 mr-1" /> esquerda {calculateRemainingTime(task)}</span>
                        </>
                      )}
                      {fileCount > 1 && <span>{fileCount} arquivos</span>}
                      <span className="truncate max-w-xl" title={task.dir}>salvar em {task.dir || 'Nenhum diretório especificado'}</span>
                    </div>

                    {task.status === 'error' && (
                      <div className="mt-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                        <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{task.errorMessage || task.errorCode || 'Ocorreu um erro na tarefa de download，Por favor, verifique o link、Espaço em disco ou permissões de diretório de download。'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => openTaskFolder(task)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Abra o diretório no gerenciador de arquivos"
                  >
                    <FolderOpenIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyPath(task.dir, 'Diretório de salvamento copiado')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    title="Copiar diretório de salvamento"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                  {(task.status === 'paused' || task.status === 'waiting' || task.status === 'error') && (
                    <button
                      onClick={() => handleTaskAction(task.gid, 'resume', task.status)}
                      className="p-1.5 text-slate-400 hover:text-cyan-500 hover:bg-slate-100 rounded-md transition-colors"
                      title="continuar"
                      disabled={working}
                    >
                      <PlayIcon className="w-4 h-4" />
                    </button>
                  )}
                  {task.status === 'active' && (
                    <button
                      onClick={() => handleTaskAction(task.gid, 'pause', task.status)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-md transition-colors"
                      title="pausa"
                      disabled={working}
                    >
                      <PauseIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTaskState({ task })}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-md transition-colors"
                    title="Excluir tarefa"
                    disabled={working}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${statusMeta.barTone}`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {toast && (
        <div className={`absolute right-6 top-6 z-50 rounded-xl px-4 py-3 shadow-xl text-sm font-medium ${toast.tone === 'success' ? 'bg-emerald-600 text-white' : toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.message}
        </div>
      )}

      {showNewTask && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Crie uma nova tarefa de download</h3>
                <p className="text-xs text-slate-500 mt-1">apoiar HTTP、FTP e Magnet。O diretório de salvamento herda o diretório de download global por padrão.。</p>
              </div>
              <button onClick={() => setShowNewTask(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Baixar link</label>
                <textarea
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all resize-none"
                  placeholder="Cole o link de download aqui ou Magnet..."
                  value={newTaskUrl}
                  onChange={(event) => setNewTaskUrl(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Este diretório de salvamento</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
                  value={newTaskDir}
                  onChange={(event) => setNewTaskDir(event.target.value)}
                  placeholder={downloadDir || '/downloads'}
                />
                <p className="mt-2 text-xs text-slate-500">Se for deixado em branco o diretório padrão atual ainda será usado：{downloadDir || 'Nenhum diretório padrão definido'}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => setShowNewTask(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTask}
                disabled={working}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {working ? 'Enviando...' : 'Comece a baixar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskState && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-5">
              <h3 className="font-bold text-slate-800 text-lg mb-2">Confirmar tarefa de exclusão？</h3>
              <p className="text-sm text-slate-700 font-medium mb-1 truncate" title={getTaskDisplayName(deleteTaskState.task)}>
                {getTaskDisplayName(deleteTaskState.task)}
              </p>
              <p className="text-xs text-slate-500 mb-4">Por padrão, apenas os registros de tarefas são excluídos，Os arquivos no disco rígido não serão excluídos。</p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 mb-4 space-y-1">
                <p>salvar diretório：{deleteTaskState.task.dir || 'não especificado'}</p>
                <p>Número de arquivos：{getTaskFileCount(deleteTaskState.task)}</p>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-red-500 focus:ring-red-500"
                  checked={removeLocalFile}
                  onChange={(event) => setRemoveLocalFile(event.target.checked)}
                />
                <span className="text-sm text-slate-700">Exclua também os arquivos locais</span>
              </label>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setDeleteTaskState(null)
                  setRemoveLocalFile(false)
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={working}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {removeLocalFile ? 'Excluir tarefas e arquivos' : 'Excluir registro de tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cleanupState && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-5">
              <h3 className="font-bold text-slate-800 text-lg mb-2">{getCleanupLabel(cleanupState.scope)}</h3>
              <p className="text-sm text-slate-600 leading-6">
                vai limpar {cleanupState.count} histórico de downloads。Esta operação apenas limpará o histórico de tarefas，Os arquivos locais não serão excluídos。
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => setCleanupState(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCleanup}
                disabled={working}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-60"
              >
                Confirme a limpeza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
