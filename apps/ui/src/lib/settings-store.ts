/**
 * Settings store constants for the Botarium app
 *
 * Settings are now dynamic and driven by bot config schema.
 * This module only contains constants used across the app.
 */

// Log level type for UI filtering
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Internal ID used for message storage - never changes
export const INTERNAL_SIMULATED_USER_ID = '__SIMULATED_USER__'

export const DEFAULT_SIMULATED_USER_NAME = 'You'

// Default settings - minimal defaults for new users
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  ai_provider: 'openai',
  simulated_user_name: DEFAULT_SIMULATED_USER_NAME,
}

/**
 * Get the API key for the current provider from settings
 */
export function getApiKey(settings: Record<string, unknown>): string {
  const provider = settings.ai_provider as string
  if (!provider) return ''
  return (settings[`${provider}_api_key`] as string) ?? ''
}
