/**
 * Base error class for all application errors.
 * Carries structured metadata and produces user-facing messages.
 */
export abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly httpStatus: number
  abstract readonly isRetryable: boolean

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause })
    this.name = this.constructor.name
  }

  /** User-facing message for Slack -- never exposes raw technical details */
  abstract userMessage(): string
}

/**
 * User input problem -- the message is self-explanatory to the user.
 */
export class UserError extends AppError {
  readonly code = 'USER_ERROR' as const
  readonly httpStatus = 400
  readonly isRetryable = false
  readonly detail: string

  constructor(detail: string, options?: { cause?: unknown }) {
    super(`User error: ${detail}`, options)
    this.detail = detail
  }

  userMessage(): string {
    return this.detail
  }
}

/**
 * Rate limit hit from an AI provider.
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT' as const
  readonly httpStatus = 429
  readonly isRetryable = true
  readonly provider: string
  readonly retryAfterMs?: number

  constructor(
    provider: string,
    options?: { retryAfterMs?: number; cause?: unknown }
  ) {
    super(`Rate limited by ${provider}`, options)
    this.provider = provider
    this.retryAfterMs = options?.retryAfterMs
  }

  userMessage(): string {
    if (this.retryAfterMs) {
      const seconds = Math.ceil(this.retryAfterMs / 1000)
      return `I'm being rate limited right now. Try again in about ${seconds} seconds.`
    }
    return `I'm being rate limited right now. Give me a moment and try again.`
  }
}

/**
 * AI provider error (API failure, model issue, etc).
 */
export class ProviderError extends AppError {
  readonly code = 'PROVIDER_ERROR' as const
  readonly httpStatus: number
  readonly isRetryable: boolean
  readonly provider: string

  constructor(
    provider: string,
    options?: {
      httpStatus?: number
      isRetryable?: boolean
      cause?: unknown
    }
  ) {
    super(`Provider error from ${provider}`, options)
    this.provider = provider
    this.httpStatus = options?.httpStatus ?? 502
    this.isRetryable = options?.isRetryable ?? true
  }

  userMessage(): string {
    return `The AI service is having trouble right now. I'll try again shortly.`
  }
}

/**
 * A tool failed during agent execution.
 */
export class ToolExecutionError extends AppError {
  readonly code = 'TOOL_ERROR' as const
  readonly httpStatus = 500
  readonly isRetryable = false
  readonly toolName: string

  constructor(toolName: string, options?: { cause?: unknown }) {
    super(`Tool execution failed: ${toolName}`, options)
    this.toolName = toolName
  }

  userMessage(): string {
    return `I ran into an issue using one of my tools. Let me try a different approach.`
  }
}

/**
 * Unexpected internal error -- catch-all for unclassified failures.
 */
export class SystemError extends AppError {
  readonly code = 'SYSTEM_ERROR' as const
  readonly httpStatus = 500
  readonly isRetryable = false

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
  }

  userMessage(): string {
    return `Something unexpected went wrong on my end. The team has been notified.`
  }
}
