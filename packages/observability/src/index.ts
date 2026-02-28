/**
 * @botarium/observability
 *
 * Request-scoped tracing, metrics collection, timing, and health primitives
 * for the @botarium bot framework.
 */

// Trace context
export { runWithTrace, getTraceContext, getTraceId } from './trace.ts'

// Metrics
export { createMetricsCollector } from './metrics.ts'

// Timing
export { timed } from './timing.ts'

// Health
export { buildHealthResponse } from './health.ts'

// Types
export type {
  TraceContext,
  MetricsCollector,
  MetricsSnapshot,
  OperationMetrics,
} from './types.ts'
export type {
  BreakerStateEntry,
  HealthConfig,
  HealthResponse,
} from './health.ts'
