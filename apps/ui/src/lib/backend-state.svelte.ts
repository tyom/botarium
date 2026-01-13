/**
 * Backend state management for the Botarium web app.
 * Consolidates settings and backend status into a single reactive store.
 *
 * In web-only mode: Settings come from localStorage or defaults.
 * In Electron mode: Settings come from encrypted file storage via IPC.
 */

import { getElectronAPI, isElectron } from './electron-api'
import { DEFAULT_SETTINGS, getApiKey } from './settings-store'
import { simulatorState } from './state.svelte'
import { initializeDispatcher } from './dispatcher.svelte'

const SETTINGS_STORAGE_KEY = 'botarium-settings'

function syncUserSettingsToState(s: Record<string, unknown>) {
  simulatorState.simulatedUserName =
    (s.simulated_user_name as string) || 'You'
}

/**
 * Load settings from localStorage (web mode only)
 */
function loadSettingsFromStorage(): Record<string, unknown> | null {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Record<string, unknown>
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

/**
 * Save settings to localStorage (web mode only)
 */
function saveSettingsToStorage(settings: Record<string, unknown>): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Migrate old camelCase settings format to new snake_case format
 */
function migrateSettings(
  settings: Record<string, unknown>
): Record<string, unknown> {
  // Check if this is the old format (has camelCase keys)
  if (!('aiProvider' in settings)) {
    return settings // Already new format
  }

  const migrated: Record<string, unknown> = {}

  // Map old keys to new keys
  const keyMap: Record<string, string> = {
    aiProvider: 'ai_provider',
    modelFast: 'model_fast',
    modelDefault: 'model_default',
    modelThinking: 'model_thinking',
    githubToken: 'github_token',
    githubOrg: 'github_default_org',
    tavilyApiKey: 'tavily_api_key',
    simulatedUserName: 'simulated_user_name',
    appLogLevel: 'app_log_level',
  }

  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    if (settings[oldKey] !== undefined) {
      migrated[newKey] = settings[oldKey]
    }
  }

  // Handle nested providerKeys
  const providerKeys = settings.providerKeys as
    | Record<string, string>
    | undefined
  if (providerKeys) {
    if (providerKeys.openai) migrated.openai_api_key = providerKeys.openai
    if (providerKeys.anthropic)
      migrated.anthropic_api_key = providerKeys.anthropic
    if (providerKeys.google) migrated.google_api_key = providerKeys.google
  }

  // Handle old single apiKey field
  if (settings.apiKey && settings.aiProvider) {
    const provider = settings.aiProvider as string
    migrated[`${provider}_api_key`] = settings.apiKey
  }

  return migrated
}

function createBackendState() {
  let settings = $state<Record<string, unknown> | null>(null)
  let settingsLoaded = $state(false)
  let showSettings = $state(false)
  let showAppSettings = $state<{ appId: string; appName: string } | null>(null)
  let backendReady = $state(false)
  let backendError = $state<string | null>(null)
  let initialized = false

  function setBackendReady(onReady: () => void | Promise<void>) {
    backendReady = true
    backendError = null
    initializeDispatcher()
    Promise.resolve(onReady()).catch((err) => {
      console.error('Failed to execute onReady callback:', err)
    })
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
      const migratedSettings = storedSettings
        ? migrateSettings(storedSettings)
        : null
      const simulatedUserName =
        import.meta.env.VITE_SIMULATED_USER_NAME ||
        (migratedSettings?.simulated_user_name as string) ||
        DEFAULT_SETTINGS.simulated_user_name

      settings = migratedSettings
        ? { ...DEFAULT_SETTINGS, ...migratedSettings, simulated_user_name: simulatedUserName }
        : { ...DEFAULT_SETTINGS, simulated_user_name: simulatedUserName }

      settingsLoaded = true
      syncUserSettingsToState(settings)
      setBackendReady(onReady)
    }
  }

  async function loadSettingsElectron(onReady: () => void) {
    const api = getElectronAPI()!
    const loaded = await api.loadSettings()
    // Migrate and merge with defaults
    if (loaded) {
      const migrated = migrateSettings(loaded)
      settings = {
        ...DEFAULT_SETTINGS,
        ...migrated,
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

  async function saveSettings(newSettings: Record<string, unknown>) {
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
  async function updateSetting(key: string, value: unknown) {
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

  function getAppSettings(appId: string): Record<string, unknown> {
    if (!settings) return {}
    const appSettings = settings.app_settings as
      | Record<string, Record<string, unknown>>
      | undefined
    return appSettings?.[appId] ?? {}
  }

  async function saveAppSettings(
    appId: string,
    appSettings: Record<string, unknown>
  ) {
    if (!settings) return

    const allAppSettings = (settings.app_settings ?? {}) as Record<
      string,
      Record<string, unknown>
    >
    const newSettings = {
      ...settings,
      app_settings: {
        ...allAppSettings,
        [appId]: appSettings,
      },
    }

    const api = getElectronAPI()
    if (api) {
      // Save without triggering backend restart (app settings only affect model selection)
      await api.saveSettings(newSettings)
    } else {
      saveSettingsToStorage(newSettings)
    }
    settings = newSettings
    showAppSettings = null
  }

  function openAppSettings(appId: string, appName: string) {
    showAppSettings = { appId, appName }
  }

  function closeAppSettings() {
    showAppSettings = null
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
    get showAppSettings() {
      return showAppSettings
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
      return !isElectron || (settingsLoaded && !!settings && !!getApiKey(settings))
    },
    get isInputDisabled() {
      return isElectron && !backendReady
    },
    initialize,
    saveSettings,
    updateSetting,
    openSettings,
    closeSettings,
    getAppSettings,
    saveAppSettings,
    openAppSettings,
    closeAppSettings,
  }
}

export const backendState = createBackendState()
