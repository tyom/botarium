/**
 * Reactive log state management using Svelte 5 runes
 */

import { MAX_LOGS, type LogEntry } from './log-types'

/** Shared reactive log state */
export const logState = $state({
  logs: [] as LogEntry[],
})

/** Add a log entry, keeping only the most recent MAX_LOGS entries */
export function addLog(entry: LogEntry): void {
  logState.logs = [...logState.logs, entry].slice(-MAX_LOGS)
}

/** Clear all logs */
export function clearLogs(): void {
  logState.logs = []
}
