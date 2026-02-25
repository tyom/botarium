/**
 * @botarium/resilience
 *
 * Circuit breakers, error boundaries, and message deduplication
 * for the @botarium bot framework.
 */

// Circuit breaker registry
export {
  createBreakerRegistry,
  CircuitOpenError,
  isCircuitOpenError,
} from './breaker-registry.ts'

// Error boundary
export { withErrorBoundary } from './error-boundary.ts'

// Dedup tracker
export { createDedupTracker } from './dedup.ts'

// Types
export type {
  Success,
  Failure,
  Result,
  BreakerState,
  BreakerRegistryConfig,
  BreakerSuccessEvent,
  BreakerFailureEvent,
  ServiceConfig,
  BreakerRegistry,
  ErrorBoundaryOptions,
} from './types.ts'
export type { DedupAction, DedupConfig, DedupTracker } from './dedup.ts'
