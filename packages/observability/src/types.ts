/**
 * Shared types for the @botarium/observability package.
 *
 * All types are generic — no Slack-specific or domain-specific fields.
 */

/**
 * Request-scoped trace context stored via AsyncLocalStorage.
 *
 * All fields are readonly and the object is Object.freeze()'d at creation time.
 * Metadata is a generic bag — callers pass domain-specific fields (channel, user, etc.)
 * via the metadata record rather than dedicated properties.
 */
export interface TraceContext {
  readonly traceId: string
  readonly startTime: number
  readonly metadata: Readonly<Record<string, unknown>>
}

/**
 * Factory-created metrics collector instance.
 *
 * Each instance maintains its own closure-scoped state — no shared globals.
 */
export interface MetricsCollector {
  record(operation: string, durationMs: number): void
  recordError(operation: string): void
  getSnapshot(): MetricsSnapshot
}

/**
 * Point-in-time snapshot of all collected metrics.
 *
 * Returned by MetricsCollector.getSnapshot() — no side effects, no reset.
 */
export interface MetricsSnapshot {
  operations: Record<string, OperationMetrics>
}

/**
 * Per-operation metrics breakdown.
 */
export interface OperationMetrics {
  latency: {
    p95: number
    p99: number
    sampleCount: number
  }
  errors: {
    last1m: number
    last5m: number
  }
}
