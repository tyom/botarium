/**
 * Config loader - parses config.yaml and provides typed access
 *
 * This is the single source of truth for bot configuration.
 * Settings can have:
 *   - value: direct value
 *   - env: reference to environment variable (for secrets)
 *   - schema: metadata for UI generation
 */

import rawConfig from '../config.yaml'
import type {
  FieldType,
  SelectOption,
  FieldCondition,
  SettingSchema,
  SettingDefinition,
  GroupDefinition,
  SlashCommand,
  Shortcut,
  SlackConfig,
  SimulatorConfig,
  ConfigFile,
} from '@botarium/config'

// Re-export types so downstream bot code can import from './runtime-config'
export type {
  FieldType,
  SelectOption,
  FieldCondition,
  SettingSchema,
  SettingDefinition,
  GroupDefinition,
  SlashCommand,
  Shortcut,
  SlackConfig,
  SimulatorConfig,
  ConfigFile,
}

// Export typed config
export const config = rawConfig as ConfigFile

// Get bot name from settings (with fallback)
const botName = (config.settings.bot_name?.value as string) ?? '{{botNamePascal}}'

// Convenience exports for Slack config
// Include app info for emulator registration (derived from bot_name setting)
export const slackConfig = {
  app: { name: botName, id: config.simulator.id },
  ...config.slack,
}
