/**
 * Static schema for global simulator settings
 *
 * These settings include both infrastructure settings for the simulator
 * and global AI provider settings. AI settings are defined here so they're
 * available in the Settings UI even before any bot connects (discovery mode).
 *
 * When a bot connects, its config.yaml settings are merged with these,
 * with bot-specific settings taking precedence.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SimulatorSettings {
  simulated_user_name: string
  emulator_port: number
  data_dir: string
  log_level: LogLevel
  ai_provider: string
  openai_api_key?: string
  anthropic_api_key?: string
  google_api_key?: string
}

export const DEFAULT_SIMULATOR_SETTINGS: SimulatorSettings = {
  simulated_user_name: 'You',
  emulator_port: 7557,
  data_dir: './data',
  log_level: 'info',
  ai_provider: 'openai',
}

// Schema for UI generation (matches bot config schema format)
// All simulator settings are global scope (not app-specific)
export const SIMULATOR_SETTINGS_SCHEMA = {
  settings: {
    ai_provider: {
      type: 'select' as const,
      label: 'AI Provider',
      group: 'ai',
      scope: 'global' as const,
      required: true,
      options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google' },
      ],
    },
    openai_api_key: {
      type: 'secret' as const,
      label: 'OpenAI API Key',
      group: 'ai',
      scope: 'global' as const,
      required: true,
      condition: { field: 'ai_provider', equals: 'openai' },
    },
    anthropic_api_key: {
      type: 'secret' as const,
      label: 'Anthropic API Key',
      group: 'ai',
      scope: 'global' as const,
      required: true,
      condition: { field: 'ai_provider', equals: 'anthropic' },
    },
    google_api_key: {
      type: 'secret' as const,
      label: 'Google API Key',
      group: 'ai',
      scope: 'global' as const,
      required: true,
      condition: { field: 'ai_provider', equals: 'google' },
    },
    simulated_user_name: {
      type: 'string' as const,
      label: 'Your Name',
      description: 'Display name for your messages in the simulator',
      group: 'general',
      scope: 'global' as const,
      placeholder: 'e.g., John',
    },
    emulator_port: {
      type: 'number' as const,
      label: 'Emulator Port',
      description: 'Port for the Slack emulator server',
      group: 'advanced',
      scope: 'global' as const,
      min: 1024,
      max: 65535,
    },
    data_dir: {
      type: 'string' as const,
      label: 'Data Directory',
      description: 'Directory for storing simulator data',
      group: 'advanced',
      scope: 'global' as const,
      placeholder: './data',
    },
    log_level: {
      type: 'select' as const,
      label: 'Log Level',
      description: 'Minimum log level to display',
      group: 'advanced',
      scope: 'global' as const,
      options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ],
    },
  },
  groups: [
    { id: 'ai', label: 'AI Provider', order: 0 },
    { id: 'general', label: 'General', order: 1 },
    { id: 'advanced', label: 'Advanced', order: 2, collapsed: true },
  ],
}
