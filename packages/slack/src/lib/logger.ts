import pino from 'pino'
import pinoPretty from 'pino-pretty'

const isDevelopment = process.env.NODE_ENV !== 'production'

const prettyStream = pinoPretty({
  colorize: true,
  translateTime: 'HH:MM:ss',
  ignore: 'pid,hostname,module',
  messageFormat: '\x1b[36m[{module}]\x1b[39m {msg}',
})

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: undefined,
  },
  isDevelopment ? prettyStream : process.stdout
)

export type ModuleName =
  | 'Emulator'
  | 'State'
  | 'WebAPI'
  | 'SocketMode'
  | 'Persistence'

export function createLogger(module: ModuleName): pino.Logger {
  return logger.child({ module })
}

export const emulatorLogger = createLogger('Emulator')
export const stateLogger = createLogger('State')
export const webApiLogger = createLogger('WebAPI')
export const socketModeLogger = createLogger('SocketMode')
export const persistenceLogger = createLogger('Persistence')
