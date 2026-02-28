export {
  success,
  failure,
  type ToolResult,
  type ToolSuccess,
  type ToolError,
} from 'botarium/utils'
import { getErrorMessage } from 'botarium/errors'
import { createToolLogger } from './logger'

/**
 * Wraps a tool execute function with logging and error handling.
 */
export function withToolLogging<
  TInput,
  TOutput extends { success: boolean; error?: string },
>(
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
      return { success: false, error: message } as TOutput
    }
  }
}
