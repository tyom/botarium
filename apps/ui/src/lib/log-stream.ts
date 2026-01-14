/**
 * SSE log streaming from backend server
 */

import { addLog } from './log-state.svelte'
import { parseBackendLog, type BackendLog } from './log-parser'
import { logStreamLogger } from './logger'
import { EMULATOR_API_URL } from './emulator-config'

export interface LogStreamOptions {
  /** Base URL for the API server */
  apiUrl?: string
  /** Called when connection opens */
  onConnect?: () => void
  /** Called when connection errors/disconnects */
  onDisconnect?: () => void
}

/**
 * Connect to backend log stream via SSE
 * @returns Cleanup function to close the connection
 */
export function setupLogCapture(options: LogStreamOptions = {}): () => void {
  const { apiUrl = EMULATOR_API_URL, onConnect, onDisconnect } = options

  logStreamLogger.info('Connecting to backend log stream...')

  const eventSource = new EventSource(`${apiUrl}/api/simulator/logs`)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as BackendLog
      addLog(parseBackendLog(data))
    } catch (error) {
      logStreamLogger.error('Failed to parse log:', error)
    }
  }

  eventSource.onerror = () => {
    logStreamLogger.warn('Log stream disconnected, reconnecting...')
    onDisconnect?.()
  }

  eventSource.onopen = () => {
    logStreamLogger.info('Connected to backend log stream')
    onConnect?.()
  }

  // Return cleanup function
  return () => {
    eventSource.close()
    logStreamLogger.info('Log stream closed')
  }
}
