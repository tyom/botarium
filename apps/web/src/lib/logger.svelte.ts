/**
 * Log streaming from backend server using SSE
 *
 * This module re-exports from specialized modules for backward compatibility.
 * For new code, consider importing directly from:
 * - ./log-types - Types and constants
 * - ./log-state.svelte - Reactive state management
 * - ./log-parser - Parsing utilities
 * - ./log-stream - SSE connection handling
 */

// Types and constants
export { LEVEL_COLORS, type LogEntry, type LogLevel } from './log-types'

// State management
export { addLog, clearLogs, logState } from './log-state.svelte'

// SSE connection
export { setupLogCapture, type LogStreamOptions } from './log-stream'
