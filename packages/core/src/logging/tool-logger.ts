import type { Logger } from './types'

/**
 * Create a tool logger factory that caches child loggers by tool name.
 * Consumer calls once during setup with their base logger.
 */
export function createToolLogger(
  baseLogger: Logger
): (toolName: string) => Logger {
  const cache = new Map<string, Logger>()

  return (toolName: string): Logger => {
    if (!cache.has(toolName)) {
      cache.set(toolName, baseLogger.child({ module: `Tool:${toolName}` }))
    }
    return cache.get(toolName)!
  }
}
