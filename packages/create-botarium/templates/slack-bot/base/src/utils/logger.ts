import { logger, getToolLogger } from '../setup'

export type ModuleName = 'App' | 'Slack' | 'Chat' | `Tool:${string}`

export function createLogger(module: ModuleName) {
  return logger.child({ module })
}

export const appLogger = createLogger('App')
export const slackLogger = createLogger('Slack')
export const chatLogger = createLogger('Chat')

const toolLoggers = new Map()

export function createToolLogger(toolName: string) {
  if (!toolLoggers.has(toolName)) {
    toolLoggers.set(toolName, getToolLogger(toolName))
  }
  return toolLoggers.get(toolName)!
}
