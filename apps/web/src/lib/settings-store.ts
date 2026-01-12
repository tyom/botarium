/**
 * Settings store for the Botarium app
 * In web mode: uses localStorage
 * In Electron mode: uses encrypted file storage
 */

export type AIProvider = 'openai' | 'anthropic' | 'google'
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SimulatorSettings {
  aiProvider: AIProvider
  // API keys stored per provider
  providerKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  // Model configuration per tier (optional - uses defaults if not set)
  modelFast?: string
  modelDefault?: string
  modelThinking?: string
  githubToken?: string
  githubOrg?: string
  tavilyApiKey?: string
  simulatedUserName: string
  // Log level for app log panel (defaults to 'debug')
  appLogLevel?: LogLevel
}

// Helper to get the current API key for the selected provider
export function getApiKey(settings: SimulatorSettings): string {
  return settings.providerKeys[settings.aiProvider] ?? ''
}

// Internal ID used for message storage - never changes
export const INTERNAL_SIMULATED_USER_ID = '__SIMULATED_USER__'

export const DEFAULT_SIMULATED_USER_NAME = 'You'

export const DEFAULT_SETTINGS: SimulatorSettings = {
  aiProvider: 'openai',
  providerKeys: {},
  simulatedUserName: DEFAULT_SIMULATED_USER_NAME,
  appLogLevel: 'debug',
}

/**
 * Convert settings to environment variables for the backend process
 */
export function settingsToEnv(
  settings: SimulatorSettings
): Record<string, string> {
  const env: Record<string, string> = {
    AI_PROVIDER: settings.aiProvider,
  }

  // Set the appropriate API key based on provider
  const keyMap: Record<AIProvider, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
  }
  const apiKeyEnvVar = keyMap[settings.aiProvider]
  const apiKey = getApiKey(settings)
  if (apiKey) {
    env[apiKeyEnvVar] = apiKey
  }

  // Model tier overrides
  if (settings.modelFast) {
    env.AI_MODEL_FAST = settings.modelFast
  }
  if (settings.modelDefault) {
    env.AI_MODEL_DEFAULT = settings.modelDefault
  }
  if (settings.modelThinking) {
    env.AI_MODEL_THINKING = settings.modelThinking
  }

  // Optional GitHub settings
  if (settings.githubToken) {
    env.GITHUB_TOKEN = settings.githubToken
  }
  if (settings.githubOrg) {
    env.GITHUB_DEFAULT_ORG = settings.githubOrg
  }

  // Tavily API key for web search
  if (settings.tavilyApiKey) {
    env.TAVILY_API_KEY = settings.tavilyApiKey
  }

  return env
}

/**
 * Validate that required settings are present
 */
export function validateSettings(settings: SimulatorSettings): {
  valid: boolean
  error?: string
} {
  const apiKey = getApiKey(settings)
  if (!apiKey) {
    return { valid: false, error: 'API key is required' }
  }
  return { valid: true }
}
