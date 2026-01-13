/**
 * Typed wrapper for the Electron API exposed via preload script.
 * In web-only mode, this always returns null/false to indicate Electron is not available.
 */

/**
 * Interface matching the API exposed in preload.ts
 */
export interface ElectronAPI {
  platform: NodeJS.Platform
  isElectron: true

  // Settings management - uses dynamic Record<string, unknown> format
  loadSettings: () => Promise<Record<string, unknown> | null>
  saveSettings: (settings: Record<string, unknown>) => Promise<void>

  // Backend control
  restartBackend: () => Promise<void>
  getBackendStatus: () => Promise<{ running: boolean; error?: string }>

  // Event listeners (return unsubscribe functions)
  onBackendReady: (callback: () => void) => () => void
  onBackendError: (callback: (error: string) => void) => () => void

  // Logs panel menu communication
  onToggleLogsPanel: (callback: (visible: boolean) => void) => () => void
  notifyLogsPanelState: (visible: boolean) => void
}

/**
 * Check if running in Electron environment.
 * In web-only mode, this is always false.
 */
export const isElectron =
  typeof window !== 'undefined' && 'electronAPI' in window

/**
 * Get the Electron API if available, otherwise null.
 * In web-only mode, this always returns null.
 */
export function getElectronAPI(): ElectronAPI | null {
  if (isElectron) {
    return (window as unknown as { electronAPI: ElectronAPI }).electronAPI
  }
  return null
}

/**
 * Get the Electron API, throwing if not in Electron.
 * In web-only mode, this always throws.
 */
export function requireElectronAPI(): ElectronAPI {
  const api = getElectronAPI()
  if (!api) {
    throw new Error('Electron API not available in web mode')
  }
  return api
}
