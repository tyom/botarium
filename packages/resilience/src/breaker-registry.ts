/**
 * Circuit breaker registry with factory-scoped state.
 *
 * createBreakerRegistry() returns an independent instance -- no module-level globals.
 * Each registry lazily creates per-service circuit breakers identified by plain string names.
 * Hook-based metrics integration via optional onSuccess/onFailure callbacks.
 */

import {
  circuitBreaker,
  handleAll,
  ConsecutiveBreaker,
  CircuitState,
  type CircuitBreakerPolicy,
  isBrokenCircuitError,
} from 'cockatiel'

import type {
  BreakerRegistry,
  BreakerRegistryConfig,
  BreakerState,
} from './types.js'

// =============================================================================
// Package-owned error type
// =============================================================================

/**
 * Error thrown when a circuit breaker is open for a service.
 *
 * This is a package-owned error type -- cockatiel's BrokenCircuitError
 * is never re-exported to consumers.
 */
export class CircuitOpenError extends Error {
  readonly service: string

  constructor(service: string) {
    super(`Circuit open for ${service}`)
    this.name = 'CircuitOpenError'
    this.service = service
  }
}

/**
 * Structural type guard for CircuitOpenError.
 *
 * Uses name-based check (not instanceof) to work across package boundaries
 * and bundler configurations.
 */
export function isCircuitOpenError(error: unknown): error is CircuitOpenError {
  return (
    error instanceof Error &&
    error.name === 'CircuitOpenError' &&
    'service' in error
  )
}

// =============================================================================
// State mapping
// =============================================================================

const CIRCUIT_STATE_MAP: Record<CircuitState, BreakerState['state']> = {
  [CircuitState.Closed]: 'closed',
  [CircuitState.Open]: 'open',
  [CircuitState.HalfOpen]: 'half-open',
  [CircuitState.Isolated]: 'open',
}

// =============================================================================
// Factory
// =============================================================================

/** Default consecutive failures before breaker opens. */
const DEFAULT_CONSECUTIVE_FAILURES = 3

/** Default ms before half-open probe after opening. */
const DEFAULT_HALF_OPEN_AFTER_MS = 30_000

interface Disposable {
  dispose(): void
}

/**
 * Create an independent breaker registry instance.
 *
 * All state is closure-scoped -- no module-level globals shared between instances.
 * Each registry lazily creates per-service circuit breakers on first execute() call.
 */
export function createBreakerRegistry(
  config?: BreakerRegistryConfig
): BreakerRegistry {
  const breakers = new Map<string, CircuitBreakerPolicy>()
  const disposables = new Map<string, Disposable[]>()

  const consecutiveFailures =
    config?.consecutiveFailures ?? DEFAULT_CONSECUTIVE_FAILURES
  const halfOpenAfterMs = config?.halfOpenAfterMs ?? DEFAULT_HALF_OPEN_AFTER_MS

  function getOrCreateBreaker(service: string): CircuitBreakerPolicy {
    let breaker = breakers.get(service)
    if (breaker) return breaker

    breaker = circuitBreaker(handleAll, {
      halfOpenAfter: halfOpenAfterMs,
      breaker: new ConsecutiveBreaker(consecutiveFailures),
    })

    const serviceDisposables: Disposable[] = []

    if (config?.onSuccess) {
      const listener = breaker.onSuccess(({ duration }) => {
        config.onSuccess!({ service, duration })
      })
      serviceDisposables.push(listener)
    }

    if (config?.onFailure) {
      const listener = breaker.onFailure(({ duration, reason }) => {
        config.onFailure!({
          service,
          duration,
          error: reason,
        })
      })
      serviceDisposables.push(listener)
    }

    disposables.set(service, serviceDisposables)
    breakers.set(service, breaker)
    return breaker
  }

  return {
    /**
     * Execute an async function through the circuit breaker for a service.
     *
     * Lazily creates a breaker on first call for each service name.
     * Throws CircuitOpenError (not cockatiel's BrokenCircuitError) when open.
     */
    async execute<T>(service: string, fn: () => Promise<T>): Promise<T> {
      const breaker = getOrCreateBreaker(service)
      try {
        return await breaker.execute(fn)
      } catch (error) {
        if (isBrokenCircuitError(error)) {
          throw new CircuitOpenError(service)
        }
        throw error
      }
    },

    /**
     * Return the current state of all known breakers.
     *
     * Only includes services that have had at least one execute() call.
     */
    getStates(): BreakerState[] {
      return [...breakers.entries()].map(([service, breaker]) => ({
        service,
        state: CIRCUIT_STATE_MAP[breaker.state],
      }))
    },

    /**
     * Force a service's breaker into the open (isolated) state.
     *
     * Returns a disposable that restores the breaker to normal operation.
     */
    isolate(service: string): { dispose(): void } {
      const breaker = getOrCreateBreaker(service)
      return breaker.isolate()
    },

    /**
     * Dispose all breakers and their event listeners.
     *
     * Clears internal state so the registry can be garbage collected.
     */
    dispose(): void {
      for (const serviceDisposables of disposables.values()) {
        for (const d of serviceDisposables) {
          d.dispose()
        }
      }
      disposables.clear()
      breakers.clear()
    },
  }
}
