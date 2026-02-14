/**
 * AI provider error classification utilities.
 *
 * Maps common AI provider errors (auth, rate limit, quota) to helpful messages.
 */

interface ErrorWithStatus extends Error {
  status?: number
  statusCode?: number
}

function getErrorStatus(error: Error): number | undefined {
  return (
    (error as ErrorWithStatus).status || (error as ErrorWithStatus).statusCode
  )
}

/**
 * Check if an error is an authentication error.
 */
export function isAuthError(error: Error): boolean {
  const message = error.message
  const status = getErrorStatus(error)
  return (
    message.includes('API key') ||
    message.includes('401') ||
    message.includes('Unauthorized') ||
    status === 401
  )
}

/**
 * Check if an error is a rate limit error.
 */
export function isRateLimitError(error: Error): boolean {
  const message = error.message
  const status = getErrorStatus(error)
  return (
    message.includes('rate limit') || message.includes('429') || status === 429
  )
}

/**
 * Check if an error is a quota/billing error.
 */
export function isQuotaError(error: Error): boolean {
  const message = error.message
  return message.includes('insufficient_quota') || message.includes('billing')
}

/**
 * Convert AI provider errors to user-friendly messages.
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const defaultMessage = 'Sorry, something went wrong!'

  if (!(error instanceof Error)) {
    return defaultMessage
  }

  if (isAuthError(error)) {
    return 'AI service authentication failed. Please check your API key in Settings.'
  }

  if (isRateLimitError(error)) {
    return 'AI service rate limit reached. Please try again in a moment.'
  }

  if (isQuotaError(error)) {
    return 'Quota exceeded. Please check your billing settings.'
  }

  return defaultMessage
}
