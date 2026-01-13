/**
 * Client for fetching bot configuration schema
 *
 * Fetches from the bot's /config endpoint which exposes:
 * - Schema for each setting (type, label, group, validation)
 * - Current non-secret values
 * - Model tiers per provider
 * - Group definitions for UI organization
 */

// Config server runs on bot port + 1 (default: 3001)
export const DEFAULT_CONFIG_PORT = 3001
export const CONFIG_API_URL = `http://localhost:${DEFAULT_CONFIG_PORT}`

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
  scope?: 'global' | 'app' // defaults to 'global'
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
  collapsed?: boolean
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
 */
export async function fetchBotConfig(): Promise<BotConfig | null> {
  try {
    const response = await fetch(`${CONFIG_API_URL}/config`)
    if (!response.ok) {
      console.error(`Failed to fetch config: HTTP ${response.status}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch bot config:', error)
    return null
  }
}

/**
 * Check if the config server is available
 */
export async function isConfigServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${CONFIG_API_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}
