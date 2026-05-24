import { withBasePath } from './basePath'

export interface ServerUiConfig {
  dockSize: number
  autoHideDock: boolean
  defaultFullscreen: boolean
  wallpaper: string
  showWidgets: boolean
  showMiniDock: boolean
  dockHideDelay: number
  stickyNotifications: boolean
  musicQuality: string
  quickNote: string
}

export async function fetchServerUiConfig(): Promise<ServerUiConfig> {
  const response = await fetch(withBasePath('/api/system/config/ui'))
  const json = await response.json()
  if (!json.success) {
    throw new Error(json.error || 'Falha ao carregar a configuração da interface do servidor')
  }
  return json.data as ServerUiConfig
}

export async function saveServerUiConfig(nextUi: Partial<ServerUiConfig>): Promise<ServerUiConfig> {
  const response = await fetch(withBasePath('/api/system/config/ui'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nextUi)
  })
  const json = await response.json()
  if (!json.success) {
    throw new Error(json.error || 'Falha ao salvar a configuração da interface do servidor')
  }
  return json.data as ServerUiConfig
}
