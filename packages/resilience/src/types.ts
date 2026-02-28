/**
 * Shared types for the @botarium/resilience package.
 *
 * All types use plain string service names -- no app-specific union types.
 */

// =============================================================================
// Result discriminated union
// =============================================================================

/** Successful operation result containing the data. */
export type Success<T> = { success: true; data: T }

/** Failed operation result with error details and classification. */
export type Failure = { success: false; error: string; errorType: string }

/** Discriminated union result -- consumer narrows via `result.success`. */
export type Result<T> = Success<T> | Failure

// =============================================================================
// Breaker state
// =============================================================================

/** Point-in-time state of a single circuit breaker. */
export interface BreakerState {
  service: string
  state: 'closed' | 'open' | 'half-open'
}

// =============================================================================
// Hook event types
// =============================================================================

/** Event fired on successful execution through a breaker. */
export interface BreakerSuccessEvent {
  service: string
  duration: number
}

/** Event fired on failed execution through a breaker. */
export interface BreakerFailureEvent {
  service: string
  duration: number
  error: unknown
}

// =============================================================================
// Configuration
// =============================================================================

/** Configuration for the breaker registry factory. */
export interface BreakerRegistryConfig {
  /** Consecutive failures before breaker opens (default: 3) */
  consecutiveFailures?: number
  /** Ms before half-open probe after opening (default: 30000) */
  halfOpenAfterMs?: number
  /** Optional hook called on successful execution */
  onSuccess?: (event: BreakerSuccessEvent) => void
  /** Optional hook called on failed execution */
  onFailure?: (event: BreakerFailureEvent) => void
}

/** Per-service configuration override. */
export interface ServiceConfig {
  consecutiveFailures?: number
  halfOpenAfterMs?: number
}

// =============================================================================
// Breaker registry interface
// =============================================================================

/** Factory-created breaker registry instance. */
export interface BreakerRegistry {
  execute<T>(service: string, fn: () => Promise<T>): Promise<T>
  getStates(): BreakerState[]
  isolate(service: string): { dispose(): void }
  dispose(): void
}

// =============================================================================
// Error boundary options
// =============================================================================

/** Options for the withErrorBoundary() wrapper. */
export interface ErrorBoundaryOptions {
  registry?: BreakerRegistry
  classifyError?: (error: unknown) => string
}
