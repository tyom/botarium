/**
 * Simple logger for Electron main process
 * Uses pino for structured logging with pretty output
 */

import pino from 'pino'
import pinoPretty from 'pino-pretty'

const isDevelopment = process.env.NODE_ENV !== 'production'

const prettyStream = pinoPretty({
  colorize: true,
  translateTime: 'HH:MM:ss',
  ignore: 'pid,hostname,module',
  messageFormat: '\x1b[35m[{module}]\x1b[39m {msg}',
})

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: undefined,
  },
  isDevelopment ? prettyStream : process.stdout
)

function createLogger(module) {
  return logger.child({ module })
}

export { logger, createLogger }

export const electronLogger = createLogger('Electron')
export const backendLogger = createLogger('Backend')
export const emulatorProcLogger = createLogger('EmulatorProc')
export const botProcLogger = createLogger('BotProc')
