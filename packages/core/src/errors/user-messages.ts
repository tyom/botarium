import type { AppError } from './types'

/**
 * Format an AppError for display to the user.
 *
 * Appends a short trace reference for SystemError and ProviderError
 * (the ones a developer would investigate). Skips trace ref for
 * UserError and RateLimitError since those are self-explanatory.
 */
export function formatUserError(error: AppError, traceId?: string): string {
  const message = error.userMessage()

  // Only append trace ref for errors that need developer investigation
  if (
    traceId &&
    (error.code === 'SYSTEM_ERROR' || error.code === 'PROVIDER_ERROR')
  ) {
    const shortRef = traceId.slice(-8)
    return `${message} (ref: ${shortRef})`
  }

  return message
}
