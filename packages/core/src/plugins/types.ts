/**
 * Options for creating an emulator instance
 */
export interface EmulatorOptions {
  /** Port to run the emulator on */
  port: number
  /** Data directory for persistence */
  dataDir?: string
}

/**
 * Emulator instance returned by platform plugins
 */
export interface Emulator {
  /** Start the emulator server */
  start(): Promise<void>
  /** Stop the emulator server */
  stop(): Promise<void>
  /** Get the base URL for bot connections */
  getApiUrl(): string
}

/**
 * Message to be rendered in the UI
 */
export interface Message {
  id: string
  text: string
  userId: string
  userName: string
  timestamp: string
  threadId?: string
  /** Platform-specific payload for rendering */
  payload?: unknown
}

/**
 * Platform plugin interface
 *
 * Implement this interface to add support for a new messaging platform.
 *
 * @example
 * ```typescript
 * import type { BotboxPlugin } from '@tyom/botbox/plugins'
 *
 * const slackPlugin: BotboxPlugin = {
 *   name: 'slack',
 *   displayName: 'Slack',
 *   createEmulator: (options) => new SlackEmulator(options),
 *   defaultPort: 7557,
 *   envVarName: 'SLACK_API_URL',
 * }
 * ```
 */
export interface BotboxPlugin {
  /** Unique plugin identifier (e.g., 'slack', 'whatsapp') */
  name: string

  /** Human-readable name for UI display */
  displayName: string

  /** Create an emulator instance for this platform */
  createEmulator(options: EmulatorOptions): Emulator

  /** Default port for this platform's emulator */
  defaultPort: number

  /** Environment variable name bots should use to connect */
  envVarName: string
}

/**
 * Plugin registry for managing loaded plugins
 */
export interface PluginRegistry {
  /** Register a plugin */
  register(plugin: BotboxPlugin): void

  /** Get a plugin by name */
  get(name: string): BotboxPlugin | undefined

  /** Get all registered plugins */
  getAll(): BotboxPlugin[]

  /** Check if a plugin is registered */
  has(name: string): boolean
}
