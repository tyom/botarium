/**
 * @botarium/config
 *
 * Shared configuration types, response builder, and HTTP server factory
 * for the @botarium bot framework.
 */

// Types
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
  ConfigResponse,
} from './types.ts'

// Response builder
export { buildConfigResponse } from './response.ts'

// Server factory
export { createConfigServer } from './server.ts'
export type { ConfigServerOptions } from './server.ts'
