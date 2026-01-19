import pino from 'pino'
import pinoPretty from 'pino-pretty'

const DEFAULT_EMULATOR_PORT = 7557

// Auto-detect simulator mode from SLACK_API_URL
function isLocalUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

// Simulator mode: detected when SLACK_API_URL points to localhost
const isSimulatorMode = isLocalUrl(process.env.SLACK_API_URL)

function getEmulatorUrl(): string {
  // Use SLACK_API_URL if it's a local URL
  if (process.env.SLACK_API_URL && isLocalUrl(process.env.SLACK_API_URL)) {
    return process.env.SLACK_API_URL
  }
  // Fallback to legacy env vars
  if (process.env.EMULATOR_API_URL) {
    return process.env.EMULATOR_API_URL
  }
  const port = process.env.EMULATOR_PORT ?? DEFAULT_EMULATOR_PORT
  return `http://localhost:${port}/api`
}

// Check if running in a real terminal (TTY or VS Code or FORCE_COLOR)
const isInteractiveTerminal =
  process.stdout.isTTY ||
  !!process.env.TERM_PROGRAM ||
  process.env.FORCE_COLOR === '1'

export interface LogEntry {
  level: number
  module?: string
  msg: string
  time: number
  [key: string]: unknown
}

export interface LoggerOptions {
  /** Log level. Default: 'info' */
  level?: pino.Level | 'silent'
  /** Emulator API URL for log forwarding. Default: http://localhost:7557/api */
  emulatorUrl?: string
}

// Forward log to emulator via HTTP POST (fire and forget)
function createLogForwarder(emulatorUrl: string) {
  // Construct the log endpoint URL
  // emulatorUrl may be 'http://localhost:7557' or 'http://localhost:7557/api'
  // The log endpoint is always at /api/simulator/logs
  const baseUrl = emulatorUrl.replace(/\/api\/?$/, '')
  const logEndpoint = `${baseUrl}/api/simulator/logs`

  return async function forwardLogToEmulator(log: LogEntry) {
    try {
      const response = await fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error(`[logger] Failed to forward log: ${response.status}`)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[logger] Error forwarding log to ${logEndpoint}:`, err)
    }
  }
}

function handleLog(log: LogEntry, forwardLog?: (log: LogEntry) => void) {
  if (forwardLog) {
    forwardLog(log)
  }
}

// Stream that captures logs and outputs JSON (for simulator mode without terminal)
function createJsonStream(forwardLog?: (log: LogEntry) => void) {
  return {
    write(chunk: string) {
      try {
        const log = JSON.parse(chunk) as LogEntry
        handleLog(log, forwardLog)
      } catch {
        // Ignore non-JSON
      }
      process.stdout.write(chunk)
    },
  }
}

// Stream that captures logs and pretty-prints (for terminal development)
function createPrettyStream(forwardLog?: (log: LogEntry) => void) {
  const prettyStream = pinoPretty({
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname,module',
    messageFormat: '\x1b[33m[{module}]\x1b[39m {msg}',
  })

  return {
    write(chunk: string) {
      try {
        const log = JSON.parse(chunk) as LogEntry
        handleLog(log, forwardLog)
      } catch {
        // Ignore non-JSON
      }
      prettyStream.write(chunk)
    },
  }
}

// Choose stream based on environment
function getLogStream(forwardLog?: (log: LogEntry) => void) {
  // Pretty-print when running in an interactive terminal (even in simulator mode)
  // JSON output only when:
  // - Running in production without a terminal
  // - Being captured by Electron (stdout piped, no TTY)
  if (isInteractiveTerminal && process.env.NODE_ENV !== 'production') {
    return createPrettyStream(forwardLog)
  }
  // Non-interactive simulator mode: JSON with forwarding
  if (isSimulatorMode) {
    return createJsonStream(forwardLog)
  }
  // Production: raw stdout
  return process.stdout
}

/**
 * Create a pino logger with botarium simulator forwarding support.
 *
 * When SLACK_API_URL points to localhost, logs are forwarded to the simulator.
 *
 * @example
 * ```typescript
 * import { createBotariumLogger } from '@botarium/logger'
 *
 * const logger = createBotariumLogger({ level: 'info' })
 * const appLogger = logger.child({ module: 'App' })
 *
 * appLogger.info('Hello world')
 * ```
 */
export function createBotariumLogger(options?: LoggerOptions): pino.Logger {
  const level = options?.level ?? 'info'
  const emulatorUrl = options?.emulatorUrl ?? getEmulatorUrl()

  // Only forward via HTTP when running in an interactive terminal in simulator mode
  // When running under Electron (stdout piped), Electron handles log forwarding
  const forwardLog =
    isSimulatorMode && isInteractiveTerminal
      ? createLogForwarder(emulatorUrl)
      : undefined

  return pino(
    {
      level,
      base: undefined,
    },
    getLogStream(forwardLog)
  )
}

/**
 * Create a child logger for a specific module
 *
 * @example
 * ```typescript
 * import { createLogger } from '@botarium/logger'
 *
 * const appLogger = createLogger('App')
 * appLogger.info('Application started')
 * ```
 */
export function createLogger(module: string, options?: LoggerOptions): pino.Logger {
  const logger = createBotariumLogger(options)
  return logger.child({ module })
}
