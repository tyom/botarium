/**
 * Duck-typed schema interface compatible with both Zod v3 and v4.
 * Only requires the `safeParse` method that we actually call.
 */
export interface SafeParseSchema<T> {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: { message: string } }
}

export interface SafeParseOptions {
  /** Optional context string for error reporting */
  context?: string
  /** Optional error callback — called on parse/validation failure */
  onError?: (info: {
    context?: string
    error: string
    phase: 'json_parse' | 'validation'
  }) => void
}

/**
 * Safely parse JSON and validate against a Zod schema.
 * Returns fallback on parse failure or validation failure.
 * Optionally reports errors via onError callback.
 */
export function safeParse<T>(
  input: string | null | undefined,
  schema: SafeParseSchema<T>,
  fallback: T,
  options?: SafeParseOptions
): T {
  if (!input) return fallback

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (error) {
    options?.onError?.({
      context: options.context,
      error: (error as Error).message,
      phase: 'json_parse',
    })
    return fallback
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    options?.onError?.({
      context: options.context,
      error: result.error.message,
      phase: 'validation',
    })
    return fallback
  }

  return result.data
}

/**
 * Safely parse JSON without schema validation.
 * Returns fallback on parse failure.
 * Optionally reports errors via onError callback.
 */
export function safeParseJson<T>(
  input: string | null | undefined,
  fallback: T,
  options?: SafeParseOptions
): T {
  if (!input) return fallback

  try {
    return JSON.parse(input) as T
  } catch (error) {
    options?.onError?.({
      context: options.context,
      error: (error as Error).message,
      phase: 'json_parse',
    })
    return fallback
  }
}
