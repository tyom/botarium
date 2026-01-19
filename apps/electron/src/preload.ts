/**
 * Electron preload script
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // Settings management - uses dynamic Record<string, unknown> format
  loadSettings: (): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
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

  // Fetch bot config (proxied through main process to avoid CSP issues)
  fetchBotConfig: (botId: string): Promise<unknown | null> =>
    ipcRenderer.invoke('bot:fetchConfig', botId),

  // Dynamic model tiers - fetch from provider APIs
  // Optional apiKeys parameter overrides saved settings (useful for validation before saving)
  getModelTiers: (
    apiKeys?: Record<string, string>
  ): Promise<
    Record<string, { fast: string[]; default: string[]; thinking: string[] }>
  > => ipcRenderer.invoke('models:getTiers', apiKeys),
  clearModelCache: (provider?: string): Promise<void> =>
    ipcRenderer.invoke('models:clearCache', provider),
  validateApiKey: (
    provider: string,
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> =>
    ipcRenderer.invoke('models:validateKey', provider, apiKey),
})
