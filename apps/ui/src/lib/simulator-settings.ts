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

export const MODEL_TIERS: Record<string, Record<string, string[]>> = {
  openai: {
    fast: ['gpt-4o-mini', 'gpt-4o'],
    default: ['gpt-5.2', 'gpt-4o', 'gpt-4o-mini'],
    thinking: ['o3-mini', 'o1'],
  },
  anthropic: {
    fast: ['claude-haiku-4-5'],
    default: ['claude-sonnet-4-5'],
    thinking: ['claude-opus-4-5'],
  },
  google: {
    fast: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    default: ['gemini-3-flash-preview', 'gemini-2.5-pro'],
    thinking: ['gemini-2.5-pro', 'gemini-2.0-flash-thinking-exp'],
  },
  openrouter: {
    fast: [
      'openai/gpt-4o-mini',
      'anthropic/claude-3-5-haiku',
      'google/gemini-2.0-flash-001',
    ],
    default: [
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.5-pro',
    ],
    thinking: [
      'openai/o3-mini',
      'anthropic/claude-opus-4',
      'google/gemini-2.5-pro',
    ],
  },
}

export interface SimulatorSettings {
  simulated_user_name: string
  emulator_port: number
  data_dir: string
  log_level: LogLevel
  ai_provider: string
  openai_api_key?: string
  anthropic_api_key?: string
  google_api_key?: string
  openrouter_api_key?: string
  model_fast?: string
  model_default?: string
  model_thinking?: string
}

export const DEFAULT_SIMULATOR_SETTINGS: SimulatorSettings = {
  simulated_user_name: 'You',
  emulator_port: 7557,
  data_dir: './data',
  log_level: 'info',
  ai_provider: 'openai',
}

// Settings that bots can override (AI-related settings)
export const BOT_OVERRIDABLE_SETTINGS = [
  'ai_provider',
  'openai_api_key',
  'anthropic_api_key',
  'google_api_key',
  'openrouter_api_key',
  'model_fast',
  'model_default',
  'model_thinking',
] as const

// Schema for UI generation (matches bot config schema format)
export const SIMULATOR_SETTINGS_SCHEMA = {
  settings: {
    ai_provider: {
      type: 'select' as const,
      label: 'AI Provider',
      group: 'ai',
      required: true,
      options: [
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic' },
        { value: 'google', label: 'Google' },
        { value: 'openrouter', label: 'OpenRouter' },
      ],
    },
    openai_api_key: {
      type: 'secret' as const,
      label: 'OpenAI API Key',
      group: 'ai',
      required: true,
      condition: { field: 'ai_provider', equals: 'openai' },
    },
    anthropic_api_key: {
      type: 'secret' as const,
      label: 'Anthropic API Key',
      group: 'ai',
      required: true,
      condition: { field: 'ai_provider', equals: 'anthropic' },
    },
    google_api_key: {
      type: 'secret' as const,
      label: 'Google API Key',
      group: 'ai',
      required: true,
      condition: { field: 'ai_provider', equals: 'google' },
    },
    openrouter_api_key: {
      type: 'secret' as const,
      label: 'OpenRouter API Key',
      group: 'ai',
      required: true,
      condition: { field: 'ai_provider', equals: 'openrouter' },
    },
    model_fast: {
      type: 'model_select' as const,
      label: 'Fast Model',
      description: 'For quick responses, lightweight tasks',
      group: 'ai',
      tier: 'fast',
      provider_field: 'ai_provider',
    },
    model_default: {
      type: 'model_select' as const,
      label: 'Default Model',
      description: 'For general-purpose tasks',
      group: 'ai',
      tier: 'default',
      provider_field: 'ai_provider',
    },
    model_thinking: {
      type: 'model_select' as const,
      label: 'Thinking Model',
      description: 'For complex reasoning tasks',
      group: 'ai',
      tier: 'thinking',
      provider_field: 'ai_provider',
    },
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
    {
      id: 'general',
      label: 'General',
      order: 0,
      collapsible: true,
      expanded: true,
    },
    {
      id: 'ai',
      label: 'AI Settings',
      order: 90,
      collapsible: true,
      expanded: false,
    },
    {
      id: 'advanced',
      label: 'Advanced',
      order: 100,
      collapsible: true,
      expanded: false,
    },
  ],
}
