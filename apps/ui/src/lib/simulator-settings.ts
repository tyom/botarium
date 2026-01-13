/**
 * Static schema for global simulator settings
 *
 * These are infrastructure settings for the simulator itself,
 * independent of any connected bots. Bot-specific settings
 * (AI provider, API keys, etc.) come from each bot's config.yaml.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface SimulatorSettings {
  simulated_user_name: string
  emulator_port: number
  data_dir: string
  log_level: LogLevel
}

export const DEFAULT_SIMULATOR_SETTINGS: SimulatorSettings = {
  simulated_user_name: 'You',
  emulator_port: 7557,
  data_dir: './data',
  log_level: 'info',
}

// Schema for UI generation (matches bot config schema format)
export const SIMULATOR_SETTINGS_SCHEMA = {
  settings: {
    simulated_user_name: {
      type: 'string' as const,
      label: 'Your Name',
      description: 'Display name for your messages in the simulator',
      group: 'general',
      placeholder: 'e.g., John',
    },
    emulator_port: {
      type: 'number' as const,
      label: 'Emulator Port',
      description: 'Port for the Slack emulator server',
      group: 'advanced',
      min: 1024,
      max: 65535,
    },
    data_dir: {
      type: 'string' as const,
      label: 'Data Directory',
      description: 'Directory for storing simulator data',
      group: 'advanced',
      placeholder: './data',
    },
    log_level: {
      type: 'select' as const,
      label: 'Log Level',
      description: 'Minimum log level to display',
      group: 'advanced',
      options: [
        { value: 'debug', label: 'Debug' },
        { value: 'info', label: 'Info' },
        { value: 'warn', label: 'Warning' },
        { value: 'error', label: 'Error' },
      ],
    },
  },
  groups: [
    { id: 'general', label: 'General', order: 1 },
    { id: 'advanced', label: 'Advanced', order: 2, collapsed: true },
  ],
}
