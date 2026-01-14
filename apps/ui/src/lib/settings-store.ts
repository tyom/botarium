/**
 * Settings store constants for the Botarium app
 *
 * Global simulator settings are defined in simulator-settings.ts.
 * Bot-specific settings come from each bot's config.yaml.
 */

import {
  DEFAULT_SIMULATOR_SETTINGS,
  type SimulatorSettings,
} from './simulator-settings'

// Re-export types for convenience
export type { SimulatorSettings, LogLevel } from './simulator-settings'

// Internal ID used for message storage - never changes
export const INTERNAL_SIMULATED_USER_ID = '__SIMULATED_USER__'

// Default simulated user name
export const DEFAULT_SIMULATED_USER_NAME = DEFAULT_SIMULATOR_SETTINGS.simulated_user_name

// Default settings for the simulator
export const DEFAULT_SETTINGS: SimulatorSettings = DEFAULT_SIMULATOR_SETTINGS

/**
 * Get the API key for the currently selected provider
 */
export function getApiKey(settings: Record<string, unknown>): string | undefined {
  const provider = settings.ai_provider as string
  if (!provider) return undefined
  return settings[`${provider}_api_key`] as string | undefined
}
