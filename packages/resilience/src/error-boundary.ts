/**
 * Error boundary wrapper returning structured Result instead of throwing.
 *
 * withErrorBoundary() works standalone (no registry required) or with
 * an optional breaker registry for circuit-breaker-protected execution.
 * Always returns a discriminated union Result -- never throws.
 */

import type { ErrorBoundaryOptions, Result } from './types.js'
import { isCircuitOpenError } from './breaker-registry.js'

// =============================================================================
// Helpers
// =============================================================================

/** Extract a message string from an unknown error value. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// =============================================================================
// Error boundary
// =============================================================================

/**
 * Execute an async operation and return a structured Result.
 *
 * - If `options.registry` is provided, executes through the breaker registry
 * - If no registry, executes the function directly (standalone mode)
 * - On success: returns `{ success: true, data }`
 * - On CircuitOpenError: returns `{ success: false, error, errorType: 'circuit_open' }`
 * - On other errors: classifies via `options.classifyError` or defaults to 'execution_error'
 *
 * Never throws -- always returns a Result.
 */
export async function withErrorBoundary<T>(
  service: string,
  fn: () => Promise<T>,
  options?: ErrorBoundaryOptions
): Promise<Result<T>> {
  try {
    const data = options?.registry
      ? await options.registry.execute(service, fn)
      : await fn()

    return { success: true, data }
  } catch (error) {
    if (isCircuitOpenError(error)) {
      return {
        success: false,
        error: error.message,
        errorType: 'circuit_open',
      }
    }

    const errorType = options?.classifyError?.(error) ?? 'execution_error'

    return {
      success: false,
      error: getErrorMessage(error),
      errorType,
    }
  }
}
