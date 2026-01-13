/**
 * Log types and constants
 */

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  module?: string
  message: string
  context?: Record<string, unknown>
}

/** Pino level numbers to names */
export const PINO_LEVELS: Record<number, LogLevel> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
}

/** Level color mapping (Tailwind classes) */
export const LEVEL_COLORS: Record<LogLevel, string> = {
  TRACE: 'text-log-trace',
  DEBUG: 'text-log-debug',
  INFO: 'text-log-info',
  WARN: 'text-log-warn',
  ERROR: 'text-log-error',
  FATAL: 'text-log-fatal font-bold',
}

/** Maximum number of logs to keep in state */
export const MAX_LOGS = 500
