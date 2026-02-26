/**
 * Shared configuration types for botarium bots.
 *
 * These types describe the config.yaml schema used by the simulator Settings UI.
 * Defined once here, imported by scaffold templates and concrete bots (e.g. moro).
 */

// Schema field types for UI generation
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

export interface SettingDefinition {
  value?: unknown
  env?: string
  schema: SettingSchema
}

export interface GroupDefinition {
  id: string
  label: string
  order: number
  collapsed?: boolean
  collapsible?: boolean
  expanded?: boolean
}

// Slack app configuration types
export interface SlashCommand {
  command: string
  description: string
  usage_hint?: string
}

export interface Shortcut {
  callback_id: string
  name: string
  description: string
  type: 'message' | 'global'
}

export interface SlackConfig {
  commands: SlashCommand[]
  shortcuts: Shortcut[]
  actions: Record<string, string>
  modals: Record<string, string>
}

// Simulator-specific configuration
export interface SimulatorConfig {
  id: string // Isolates DM messages per-bot in the simulator
  icon_url?: string
}

export interface ConfigFile {
  simulator: SimulatorConfig
  slack: SlackConfig
  settings: Record<string, SettingDefinition>
  groups: GroupDefinition[]
  model_tiers?: Record<string, Record<string, string[]>>
}

// Config endpoint response shape
export interface ConfigResponse {
  schema: {
    settings: Record<string, SettingSchema>
    groups: GroupDefinition[]
    model_tiers: Record<string, Record<string, string[]>>
  }
  values: Record<string, unknown>
  envOverrides: string[]
}
