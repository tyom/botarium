type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (msg: string, ...args: unknown[]) => void
  info: (msg: string, ...args: unknown[]) => void
  warn: (msg: string, ...args: unknown[]) => void
  error: (msg: string, ...args: unknown[]) => void
  child: (bindings: { module: string }) => Logger
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const currentLevel = LOG_LEVELS.debug

function formatTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', { hour12: false })
}

function createLogMethod(
  level: LogLevel,
  module?: string
): (msg: string, ...args: unknown[]) => void {
  const levelNum = LOG_LEVELS[level]
  const consoleFn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log

  return (msg: string, ...args: unknown[]) => {
    if (levelNum < currentLevel) return

    const prefix = module ? `[${module}]` : ''
    const time = formatTime()

    if (args.length > 0) {
      consoleFn(
        `%c${time}%c ${prefix}%c ${msg}`,
        'color: gray',
        'color: cyan',
        'color: inherit',
        ...args
      )
    } else {
      consoleFn(
        `%c${time}%c ${prefix}%c ${msg}`,
        'color: gray',
        'color: cyan',
        'color: inherit'
      )
    }
  }
}

function createLogger(module?: string): Logger {
  return {
    debug: createLogMethod('debug', module),
    info: createLogMethod('info', module),
    warn: createLogMethod('warn', module),
    error: createLogMethod('error', module),
    child: (bindings: { module: string }) => createLogger(bindings.module),
  }
}

export const logger = createLogger()

export type ModuleName = 'App' | 'Dispatcher' | 'SSE' | 'LogStream'

export function getLogger(module: ModuleName): Logger {
  return logger.child({ module })
}

export const appLogger = getLogger('App')
export const dispatcherLogger = getLogger('Dispatcher')
export const sseLogger = getLogger('SSE')
export const logStreamLogger = getLogger('LogStream')
