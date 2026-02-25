import pino from 'pino'
import pinoPretty from 'pino-pretty'
import type { Logger, BotariumLoggerOptions } from './types'

interface LogEntry {
  level: number
  module?: string
  msg: string
  time: number
  [key: string]: unknown
}

// Check if running in a real terminal (TTY or VS Code or FORCE_COLOR)
const isInteractiveTerminal =
  process.stdout.isTTY ||
  !!process.env.TERM_PROGRAM ||
  process.env.FORCE_COLOR === '1'

/**
 * Inline safe JSON parse to avoid external dependencies.
 */
function jsonParseOrNull<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    return null
  }
}

/**
 * Create a log forwarder that POSTs log entries to a remote endpoint.
 * Fire-and-forget — errors are logged to console.error.
 */
function createLogForwarder(forwardUrl: string) {
  const baseUrl = forwardUrl.replace(/\/api\/?$/, '')
  const logEndpoint = `${baseUrl}/api/simulator/logs`

  return async function forwardLog(log: LogEntry) {
    try {
      const response = await fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      })
      if (!response.ok) {
        console.error(`[logger] Failed to forward log: ${response.status}`)
      }
    } catch (err) {
      console.error(`[logger] Error forwarding log to ${logEndpoint}:`, err)
    }
  }
}

/**
 * Create a pretty-print stream for interactive terminal development.
 */
function createPrettyStream(forwardLog?: (log: LogEntry) => void) {
  const prettyStream = pinoPretty({
    colorize: true,
    translateTime: 'HH:MM:ss',
    ignore: 'pid,hostname,module',
    messageFormat: '\x1b[33m[{module}]\x1b[39m {msg}',
  })

  if (!forwardLog) return prettyStream

  return {
    write(chunk: string) {
      const log = jsonParseOrNull<LogEntry>(chunk)
      if (log) {
        forwardLog(log)
      }
      prettyStream.write(chunk)
    },
  }
}

/**
 * Create a JSON stream that optionally forwards logs.
 */
function createJsonStream(forwardLog?: (log: LogEntry) => void) {
  if (!forwardLog) return process.stdout

  return {
    write(chunk: string) {
      const log = jsonParseOrNull<LogEntry>(chunk)
      if (log) {
        forwardLog(log)
      }
      process.stdout.write(chunk)
    },
  }
}

/**
 * Wrap a pino logger instance as a package-owned Logger interface.
 * Each method delegates to pino; child wraps the pino child result.
 */
function wrapPinoAsLogger(pinoLogger: pino.Logger): Logger {
  return {
    info(objOrMsg: Record<string, unknown> | string, msg?: string) {
      if (typeof objOrMsg === 'string') {
        pinoLogger.info(objOrMsg)
      } else {
        pinoLogger.info(objOrMsg, msg!)
      }
    },
    warn(objOrMsg: Record<string, unknown> | string, msg?: string) {
      if (typeof objOrMsg === 'string') {
        pinoLogger.warn(objOrMsg)
      } else {
        pinoLogger.warn(objOrMsg, msg!)
      }
    },
    error(objOrMsg: Record<string, unknown> | string, msg?: string) {
      if (typeof objOrMsg === 'string') {
        pinoLogger.error(objOrMsg)
      } else {
        pinoLogger.error(objOrMsg, msg!)
      }
    },
    debug(objOrMsg: Record<string, unknown> | string, msg?: string) {
      if (typeof objOrMsg === 'string') {
        pinoLogger.debug(objOrMsg)
      } else {
        pinoLogger.debug(objOrMsg, msg!)
      }
    },
    child(bindings: { module: string }): Logger {
      return wrapPinoAsLogger(pinoLogger.child(bindings))
    },
  }
}

/**
 * Create a Botarium logger with optional mixin, forwarding, and stream override.
 *
 * - If `options.stream` is provided, use it directly (bypass auto-detection)
 * - If `options.forwardUrl` is provided, create a forwarding stream that posts logs
 *   to the URL (fire-and-forget) AND outputs locally
 * - Otherwise auto-detect: pretty-print for interactive terminal + non-production,
 *   JSON to stdout for production
 * - `options.mixin` is passed directly to pino's mixin option
 */
export function createBotariumLogger(options?: BotariumLoggerOptions): Logger {
  const level = options?.level ?? 'info'
  const mixin = options?.mixin
  const forwardUrl = options?.forwardUrl

  const forwardLog = forwardUrl ? createLogForwarder(forwardUrl) : undefined

  // Determine output stream
  let stream: { write(chunk: string): void }

  if (options?.stream) {
    // Explicit stream override — use directly
    stream = options.stream
  } else if (isInteractiveTerminal && process.env.NODE_ENV !== 'production') {
    // Interactive terminal in non-production — pretty print
    stream = createPrettyStream(forwardLog)
  } else {
    // Production or non-interactive — JSON to stdout
    stream = createJsonStream(forwardLog)
  }

  const pinoLogger = pino(
    {
      level,
      base: undefined,
      ...(mixin ? { mixin } : {}),
    },
    stream as pino.DestinationStream
  )

  return wrapPinoAsLogger(pinoLogger)
}
