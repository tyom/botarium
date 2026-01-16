import { getErrorMessage } from './error'
import { createToolLogger } from './logger'

export type ToolSuccess<T = Record<string, unknown>> = { success: true } & T
export type ToolError = { success: false; error: string }
export type ToolResult<T = Record<string, unknown>> = ToolSuccess<T> | ToolError

export function success<T extends Record<string, unknown>>(
  data: T
): ToolSuccess<T> {
  return { success: true, ...data }
}

export function failure(error: string): ToolError {
  return { success: false, error }
}

/**
 * Wraps a tool execute function with logging and error handling.
 */
export function withToolLogging<TInput, TOutput extends ToolResult>(
  toolName: string,
  logInput: (input: TInput) => string,
  fn: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput> {
  const log = createToolLogger(toolName)

  return async (input: TInput): Promise<TOutput> => {
    log.info(logInput(input))
    try {
      const result = await fn(input)
      if (result.success) {
        log.info('Success')
      } else {
        log.warn({ error: result.error }, 'Failed')
      }
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      log.error({ err: error }, `Failed: ${message}`)
      return failure(message) as TOutput
    }
  }
}
