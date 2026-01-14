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
  return async function forwardLogToEmulator(log: LogEntry) {
    try {
      await fetch(`${emulatorUrl}/simulator/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
    } catch {
      // Emulator not available, ignore
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
  if (isSimulatorMode && !isInteractiveTerminal) {
    return createJsonStream(forwardLog)
  }
  if (isSimulatorMode || process.env.NODE_ENV !== 'production') {
    return createPrettyStream(forwardLog)
  }
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

  const forwardLog = isSimulatorMode
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
