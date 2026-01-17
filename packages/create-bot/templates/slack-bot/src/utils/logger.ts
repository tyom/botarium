import pino from 'pino'
import { settings, isSimulatorMode } from '../settings'

// Use JSON output in simulator mode (so Electron can parse logs)
// Use pretty output in local dev mode (when running standalone)
const usePretty = process.env.NODE_ENV !== 'production' && !isSimulatorMode && process.env.TERM_PROGRAM

export const logger = pino({
  level: settings.LOG_LEVEL,
  transport: usePretty ? { target: 'pino-pretty' } : undefined,
})

export type ModuleName =
  | 'App'
  | 'Slack'
  | 'Chat'
  | 'DB'
  | 'Memory'
  | 'Preferences'
  | `Tool:${string}`

export function createLogger(module: ModuleName): pino.Logger {
  return logger.child({ module })
}

export const appLogger = createLogger('App')
export const slackLogger = createLogger('Slack')
export const chatLogger = createLogger('Chat')
export const dbLogger = createLogger('DB')
export const memoryLogger = createLogger('Memory')
export const preferencesLogger = createLogger('Preferences')

const toolLoggers = new Map<string, pino.Logger>()

export function createToolLogger(toolName: string): pino.Logger {
  if (!toolLoggers.has(toolName)) {
    toolLoggers.set(toolName, logger.child({ module: `Tool:${toolName}` }))
  }
  return toolLoggers.get(toolName)!
}
