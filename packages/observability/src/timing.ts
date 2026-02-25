/**
 * Timing Wrapper - Structured latency logging for named operations
 *
 * Wraps async operations and logs duration with automatic trace ID injection.
 * Uses injectable Logger parameter (no module-level logger).
 *
 * Key differences from Moro's src/observability/timing.ts:
 * - Logger is a parameter (injectable), not a module-scoped createLogger('Perf')
 * - Log levels: debug for success, warn for failure (Moro used info/error)
 * - Auto-attaches traceId from current trace scope via getTraceId()
 * - Separate from metrics — does NOT auto-record into any metrics collector
 */
import type { Logger } from 'botarium/logging'

import { getTraceId } from './trace.ts'

/**
 * Wrap an async operation with performance timing.
 *
 * Logs once on completion only (no entry log):
 * - Success: debug level with operation, durationMs, optional traceId, and meta
 * - Failure: warn level with operation, durationMs, optional traceId, meta, and error
 *
 * Returns { result, durationMs } on success. Re-throws on failure.
 */
export async function timed<T>(
  operation: string,
  fn: () => Promise<T>,
  logger: Logger,
  meta?: Record<string, unknown>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now()
  try {
    const result = await fn()
    const durationMs = Math.round(performance.now() - start)
    const traceId = getTraceId()
    logger.debug(
      { operation, durationMs, ...(traceId ? { traceId } : {}), ...meta },
      `${operation} completed`
    )
    return { result, durationMs }
  } catch (error) {
    const durationMs = Math.round(performance.now() - start)
    const traceId = getTraceId()
    logger.warn(
      {
        operation,
        durationMs,
        ...(traceId ? { traceId } : {}),
        ...meta,
        err: error,
      },
      `${operation} failed`
    )
    throw error
  }
}
