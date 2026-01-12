/**
 * Backend state management for the Botbox web app.
 * Consolidates settings and backend status into a single reactive store.
 *
 * In web-only mode: Settings come from localStorage or defaults.
 * In Electron mode: Settings come from encrypted file storage via IPC.
 */

import { getElectronAPI, isElectron } from './electron-api'
import {
  DEFAULT_SETTINGS,
  getApiKey,
  type SimulatorSettings,
} from './settings-store'
import { simulatorState } from './state.svelte'
import { initializeDispatcher } from './dispatcher.svelte'

const SETTINGS_STORAGE_KEY = 'botbox-settings'

function syncUserSettingsToState(s: SimulatorSettings) {
  simulatorState.simulatedUserName = s.simulatedUserName
}

/**
 * Load settings from localStorage (web mode only)
 */
function loadSettingsFromStorage(): SimulatorSettings | null {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as SimulatorSettings
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Save settings to localStorage (web mode only)
 */
function saveSettingsToStorage(settings: SimulatorSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

function createBackendState() {
  let settings = $state<SimulatorSettings | null>(null)
  let settingsLoaded = $state(false)
  let showSettings = $state(false)
  let backendReady = $state(false)
  let backendError = $state<string | null>(null)
  let initialized = false

  function setBackendReady(onReady: () => void) {
    backendReady = true
    backendError = null
    initializeDispatcher()
    onReady()
  }

  async function initialize(onReady: () => void) {
    // Prevent multiple initializations
    if (initialized) return
    initialized = true

    if (isElectron) {
      await loadSettingsElectron(onReady)
    } else {
      // Browser mode: load from localStorage or use defaults
      const storedSettings = loadSettingsFromStorage()
      const simulatedUserName =
        import.meta.env.VITE_SIMULATED_USER_NAME ||
        storedSettings?.simulatedUserName ||
        DEFAULT_SETTINGS.simulatedUserName

      settings = storedSettings
        ? { ...DEFAULT_SETTINGS, ...storedSettings, simulatedUserName }
        : { ...DEFAULT_SETTINGS, simulatedUserName }

      settingsLoaded = true
      syncUserSettingsToState(settings)
      setBackendReady(onReady)
    }
  }

  async function loadSettingsElectron(onReady: () => void) {
    const api = getElectronAPI()!
    const loaded = (await api.loadSettings()) as
      | (SimulatorSettings & { apiKey?: string })
      | null
    // Merge with defaults to handle new settings fields (including nested providerKeys)
    if (loaded) {
      // Migrate old apiKey field to providerKeys if needed
      const providerKeys = { ...(loaded.providerKeys ?? {}) }
      if (loaded.apiKey && !providerKeys[loaded.aiProvider]) {
        providerKeys[loaded.aiProvider] = loaded.apiKey
      }

      settings = {
        ...DEFAULT_SETTINGS,
        ...loaded,
        providerKeys,
      }
    } else {
      settings = null
    }
    settingsLoaded = true

    if (settings) {
      syncUserSettingsToState(settings)
    }

    // Always set up listeners to catch backend:ready event
    setupBackendListeners(onReady)

    if (!settings || !getApiKey(settings)) {
      showSettings = true
    } else {
      // Check if backend is already running
      const status = await api.getBackendStatus()
      if (status.running && !backendReady) {
        setBackendReady(onReady)
      }
    }
  }

  function setupBackendListeners(onReady: () => void) {
    const api = getElectronAPI()!

    api.onBackendReady(() => {
      setBackendReady(onReady)
    })

    api.onBackendError((error: string) => {
      backendError = error
      backendReady = false
    })
  }

  async function saveSettings(newSettings: SimulatorSettings) {
    const api = getElectronAPI()
    if (api) {
      // Electron mode: save via IPC
      await api.saveSettings(newSettings)
      backendReady = false // Will be set true when backend:ready event fires
    } else {
      // Web mode: save to localStorage
      saveSettingsToStorage(newSettings)
    }
    settings = newSettings
    syncUserSettingsToState(newSettings)
    showSettings = false
  }

  /** Update a single setting without restarting backend (for UI-only settings like log level) */
  async function updateSetting<K extends keyof SimulatorSettings>(
    key: K,
    value: SimulatorSettings[K]
  ) {
    if (!settings) return
    const newSettings = { ...settings, [key]: value }
    const api = getElectronAPI()
    if (api) {
      await api.saveSettings(newSettings)
    } else {
      saveSettingsToStorage(newSettings)
    }
    settings = newSettings
  }

  function openSettings() {
    showSettings = true
  }

  function closeSettings() {
    showSettings = false
  }

  return {
    get settings() {
      return settings
    },
    get settingsLoaded() {
      return settingsLoaded
    },
    get showSettings() {
      return showSettings
    },
    get backendReady() {
      return backendReady
    },
    get backendError() {
      return backendError
    },
    get effectiveSettings() {
      return settings || DEFAULT_SETTINGS
    },
    get hasApiKey() {
      return !!settings && !!getApiKey(settings)
    },
    get shouldShowApp() {
      return (
        !isElectron || (settingsLoaded && !!settings && !!getApiKey(settings))
      )
    },
    get isInputDisabled() {
      return isElectron && !backendReady
    },
    initialize,
    saveSettings,
    updateSetting,
    openSettings,
    closeSettings,
  }
}

export const backendState = createBackendState()
