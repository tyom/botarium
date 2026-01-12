/**
 * Electron preload script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'

// Settings type definition (mirrors @tyom/botbox-web/lib/settings-store)
export type AIProvider = 'openai' | 'anthropic' | 'google'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SimulatorSettings {
  aiProvider: AIProvider
  providerKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  modelFast?: string
  modelDefault?: string
  modelThinking?: string
  githubToken?: string
  githubOrg?: string
  tavilyApiKey?: string
  simulatedUserName: string
  appLogLevel?: LogLevel
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // Settings management
  loadSettings: (): Promise<SimulatorSettings | null> =>
    ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: SimulatorSettings): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings),

  // Backend control
  restartBackend: (): Promise<void> => ipcRenderer.invoke('backend:restart'),
  getBackendStatus: (): Promise<{ running: boolean; error?: string }> =>
    ipcRenderer.invoke('backend:status'),

  // Listen for backend events
  onBackendReady: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('backend:ready', handler)
    return () => ipcRenderer.removeListener('backend:ready', handler)
  },
  onBackendError: (callback: (error: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) =>
      callback(error)
    ipcRenderer.on('backend:error', handler)
    return () => ipcRenderer.removeListener('backend:error', handler)
  },

  // Logs panel menu communication
  onToggleLogsPanel: (callback: (visible: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, visible: boolean) =>
      callback(visible)
    ipcRenderer.on('menu:toggle-logs-panel', handler)
    return () => ipcRenderer.removeListener('menu:toggle-logs-panel', handler)
  },
  notifyLogsPanelState: (visible: boolean): void => {
    ipcRenderer.send('logs-panel:state-changed', visible)
  },
})
