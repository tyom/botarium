/**
 * Client for fetching bot configuration schema
 *
 * Fetches from the bot's /config endpoint which exposes:
 * - Schema for each setting (type, label, group, validation)
 * - Current non-secret values
 * - Model tiers per provider
 * - Group definitions for UI organization
 */

import { getElectronAPI, isElectron } from './electron-api'

// Schema field types
export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'secret'
  | 'select'
  | 'model_select'
  | 'boolean'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldCondition {
  field: string
  equals: string
}

export interface SettingSchema {
  type: FieldType
  label: string
  description?: string
  group: string
  required?: boolean
  required_when?: FieldCondition
  condition?: FieldCondition
  options?: SelectOption[]
  min?: number
  max?: number
  placeholder?: string
  tier?: string // For model_select: fast, default, thinking
  provider_field?: string // For model_select: which field determines provider
}

export interface GroupDefinition {
  id: string
  label: string
  order: number
  collapsible?: boolean // Whether the section can be collapsed/expanded
  expanded?: boolean // Whether the section starts expanded (default: true)
}

export interface ConfigSchema {
  settings: Record<string, SettingSchema>
  groups: GroupDefinition[]
  model_tiers: Record<string, Record<string, string[]>>
}

export interface BotConfig {
  schema: ConfigSchema
  values: Record<string, unknown>
}

/**
 * Fetch bot configuration from the /config endpoint
 * Uses IPC in Electron to fetch through main process (which queries the emulator for the config port)
 * @param botId - The bot identifier to fetch config for
 */
export async function fetchBotConfig(botId?: string): Promise<BotConfig | null> {
  if (!botId) {
    console.warn('fetchBotConfig: botId is required')
    return null
  }

  if (!isElectron) {
    console.warn('fetchBotConfig: only supported in Electron mode')
    return null
  }

  const api = getElectronAPI()
  if (!api) {
    console.warn('fetchBotConfig: Electron API not available')
    return null
  }

  try {
    return (await api.fetchBotConfig(botId)) as BotConfig | null
  } catch (error) {
    console.warn('fetchBotConfig: failed to fetch config', error)
    return null
  }
}
