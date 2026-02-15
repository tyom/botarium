import pino from 'pino'
import { settings, isSimulatorMode } from '../settings'

// Use JSON output in simulator mode (so Electron can parse logs)
// Use pretty output in local dev mode (when running standalone)
const usePretty =
  process.env.NODE_ENV !== 'production' &&
  !isSimulatorMode &&
  process.env.TERM_PROGRAM

export const logger = pino({
  level: settings.LOG_LEVEL,
  transport: usePretty ? { target: 'pino-pretty' } : undefined,
})

export type ModuleName = 'App' | 'Slack'

export function createLogger(module: ModuleName): pino.Logger {
  return logger.child({ module })
}

export const appLogger = createLogger('App')
export const slackLogger = createLogger('Slack')
