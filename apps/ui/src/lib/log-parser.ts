/**
 * Log parsing utilities for backend Pino logs
 */

import { PINO_LEVELS, type LogEntry, type LogLevel } from './log-types'

/** Raw log entry from backend (Pino format) */
export interface BackendLog {
  level: number | string
  time: number
  msg: string
  module?: string
  [key: string]: unknown
}

/** Fields to exclude from context display */
const EXCLUDED_FIELDS = new Set([
  'level',
  'time',
  'msg',
  'module',
  'pid',
  'hostname',
])

/** Format timestamp for display (HH:MM:SS) */
export function formatTime(time: number): string {
  const date = new Date(time)
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Extract context fields from log data (excluding standard fields) */
export function extractContext(
  data: BackendLog
): Record<string, unknown> | undefined {
  const context: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDED_FIELDS.has(key) || value === undefined) continue
    context[key] = value
  }

  return Object.keys(context).length > 0 ? context : undefined
}

/** Valid log level strings derived from PINO_LEVELS values */
const VALID_LOG_LEVELS = new Set(Object.values(PINO_LEVELS))

/** Convert Pino level number to LogLevel string */
function parseLevel(level: number | string): LogLevel {
  if (typeof level === 'number') {
    return PINO_LEVELS[level] ?? 'INFO'
  }
  const upper = String(level).toUpperCase()
  return (VALID_LOG_LEVELS.has(upper as LogLevel) ? upper : 'INFO') as LogLevel
}

/** Parse a backend Pino log entry into a display-friendly LogEntry */
export function parseBackendLog(data: BackendLog): LogEntry {
  return {
    timestamp: formatTime(data.time),
    level: parseLevel(data.level),
    module: data.module,
    message: data.msg,
    context: extractContext(data),
  }
}
