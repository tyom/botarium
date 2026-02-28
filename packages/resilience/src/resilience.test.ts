import { describe, it, expect, afterEach } from 'bun:test'
import {
  createBreakerRegistry,
  CircuitOpenError,
  isCircuitOpenError,
} from './breaker-registry'
import { withErrorBoundary } from './error-boundary'
import { createDedupTracker } from './dedup'
import type { BreakerRegistry } from './types'
import type { DedupTracker } from './dedup'

// =============================================================================
// Test state cleanup
// =============================================================================

const registries: BreakerRegistry[] = []
const trackers: DedupTracker[] = []

afterEach(() => {
  for (const r of registries) r.dispose()
  registries.length = 0
  for (const t of trackers) t.dispose()
  trackers.length = 0
})

function trackRegistry(r: BreakerRegistry): BreakerRegistry {
  registries.push(r)
  return r
}

function trackTracker(t: DedupTracker): DedupTracker {
  trackers.push(t)
  return t
}

// =============================================================================
// createBreakerRegistry
// =============================================================================

describe('createBreakerRegistry', () => {
  it('creates independent registry instances', async () => {
    const r1 = trackRegistry(createBreakerRegistry({ consecutiveFailures: 2 }))
    const r2 = trackRegistry(createBreakerRegistry({ consecutiveFailures: 2 }))

    // Trigger failures on r1
    for (let i = 0; i < 2; i++) {
      try {
        await r1.execute('svc', async () => {
          throw new Error('fail')
        })
      } catch {
        /* expected */
      }
    }

    // r1 should be open, r2 should work fine
    await expect(r1.execute('svc', async () => 'ok')).rejects.toThrow(
      CircuitOpenError
    )
    expect(await r2.execute('svc', async () => 'ok')).toBe('ok')
  })

  it('lazily creates breakers on first execute() call', () => {
    const registry = trackRegistry(createBreakerRegistry())
    expect(registry.getStates()).toHaveLength(0)
  })

  it('executes function through breaker (success case)', async () => {
    const registry = trackRegistry(createBreakerRegistry())
    const result = await registry.execute('api', async () => 42)
    expect(result).toBe(42)
  })

  it('throws CircuitOpenError after consecutive failures', async () => {
    const registry = trackRegistry(
      createBreakerRegistry({ consecutiveFailures: 2, halfOpenAfterMs: 100 })
    )

    // Trigger 2 consecutive failures
    for (let i = 0; i < 2; i++) {
      try {
        await registry.execute('api', async () => {
          throw new Error('fail')
        })
      } catch {
        /* expected */
      }
    }

    // 3rd call should throw CircuitOpenError, NOT cockatiel's BrokenCircuitError
    try {
      await registry.execute('api', async () => 'ok')
      expect(true).toBe(false) // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(CircuitOpenError)
      expect((err as CircuitOpenError).service).toBe('api')
    }
  })

  it('isCircuitOpenError() returns true for CircuitOpenError instances', () => {
    expect(isCircuitOpenError(new CircuitOpenError('svc'))).toBe(true)
  })

  it('isCircuitOpenError() returns false for regular errors', () => {
    expect(isCircuitOpenError(new Error('nope'))).toBe(false)
    expect(isCircuitOpenError('string')).toBe(false)
    expect(isCircuitOpenError(null)).toBe(false)
  })

  it('calls onSuccess hook with service and duration', async () => {
    const events: { service: string; duration: number }[] = []
    const registry = trackRegistry(
      createBreakerRegistry({
        onSuccess: (e) => events.push(e),
      })
    )

    await registry.execute('api', async () => 'ok')

    expect(events).toHaveLength(1)
    expect(events[0]!.service).toBe('api')
    expect(typeof events[0]!.duration).toBe('number')
  })

  it('calls onFailure hook with service, duration, and error', async () => {
    const events: { service: string; duration: number; error: unknown }[] = []
    const registry = trackRegistry(
      createBreakerRegistry({
        onFailure: (e) => events.push(e),
      })
    )

    try {
      await registry.execute('api', async () => {
        throw new Error('boom')
      })
    } catch {
      /* expected */
    }

    expect(events).toHaveLength(1)
    expect(events[0]!.service).toBe('api')
    expect(typeof events[0]!.duration).toBe('number')
    expect(events[0]!.error).toBeDefined()
  })

  it('getStates() returns current breaker states', async () => {
    const registry = trackRegistry(createBreakerRegistry())
    await registry.execute('api', async () => 'ok')

    const states = registry.getStates()
    expect(states).toHaveLength(1)
    expect(states[0]!.service).toBe('api')
    expect(states[0]!.state).toBe('closed')
  })

  it('dispose() cleans up without throwing', () => {
    const registry = trackRegistry(createBreakerRegistry())
    expect(() => registry.dispose()).not.toThrow()
  })
})

// =============================================================================
// CircuitOpenError
// =============================================================================

describe('CircuitOpenError', () => {
  it('has correct name property', () => {
    const err = new CircuitOpenError('api')
    expect(err.name).toBe('CircuitOpenError')
  })

  it('has correct service property', () => {
    const err = new CircuitOpenError('slack-api')
    expect(err.service).toBe('slack-api')
  })

  it('message includes service name', () => {
    const err = new CircuitOpenError('slack-api')
    expect(err.message).toContain('slack-api')
  })
})

// =============================================================================
// withErrorBoundary
// =============================================================================

describe('withErrorBoundary', () => {
  it('returns Success on successful execution (standalone)', async () => {
    const result = await withErrorBoundary('api', async () => 'hello')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('hello')
    }
  })

  it('returns Failure with execution_error on thrown error (standalone)', async () => {
    const result = await withErrorBoundary('api', async () => {
      throw new Error('boom')
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('execution_error')
      expect(result.error).toContain('boom')
    }
  })

  it('returns Failure with circuit_open when CircuitOpenError thrown', async () => {
    // Create a mock registry that always throws CircuitOpenError
    const mockRegistry: BreakerRegistry = {
      execute: async () => {
        throw new CircuitOpenError('api')
      },
      getStates: () => [],
      isolate: () => ({ dispose: () => {} }),
      dispose: () => {},
    }

    const result = await withErrorBoundary('api', async () => 'ok', {
      registry: mockRegistry,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('circuit_open')
    }
  })

  it('works with registry parameter (success case)', async () => {
    const registry = trackRegistry(createBreakerRegistry())
    const result = await withErrorBoundary('api', async () => 42, { registry })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe(42)
    }
  })

  it('uses custom classifyError callback', async () => {
    const result = await withErrorBoundary(
      'api',
      async () => {
        throw new Error('rate limited')
      },
      {
        classifyError: () => 'rate_limit',
      }
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('rate_limit')
    }
  })

  it('handles non-Error throws gracefully', async () => {
    const result = await withErrorBoundary('api', async () => {
      throw 'string error'
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('string error')
      expect(result.errorType).toBe('execution_error')
    }
  })

  it('never throws (always returns Result)', async () => {
    // Even with absurd inputs, should return Result
    const result = await withErrorBoundary('api', async () => {
      throw { weird: 'object' }
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorType).toBe('execution_error')
    }
  })
})

// =============================================================================
// createDedupTracker
// =============================================================================

describe('createDedupTracker', () => {
  it('creates independent tracker instances', () => {
    const t1 = trackTracker(createDedupTracker({ ttlMs: 1000 }))
    const t2 = trackTracker(createDedupTracker({ ttlMs: 1000 }))

    t1.markPending('msg-1')
    expect(t1.check('msg-1')).toBe('wait')
    expect(t2.check('msg-1')).toBe('process')
  })

  it('check() returns process for unknown ID', () => {
    const tracker = trackTracker(createDedupTracker())
    expect(tracker.check('unknown-id')).toBe('process')
  })

  it('check() returns wait for pending ID', () => {
    const tracker = trackTracker(createDedupTracker())
    tracker.markPending('msg-1')
    expect(tracker.check('msg-1')).toBe('wait')
  })

  it('check() returns skip for complete ID', () => {
    const tracker = trackTracker(createDedupTracker())
    tracker.markPending('msg-1')
    tracker.markDone('msg-1', 'complete')
    expect(tracker.check('msg-1')).toBe('skip')
  })

  it('check() returns process for failed ID (allow retry)', () => {
    const tracker = trackTracker(createDedupTracker())
    tracker.markPending('msg-1')
    tracker.markDone('msg-1', 'failed')
    expect(tracker.check('msg-1')).toBe('process')
  })

  it('check() returns process for expired entry', async () => {
    const tracker = trackTracker(createDedupTracker({ ttlMs: 50 }))
    tracker.markPending('msg-1')
    tracker.markDone('msg-1', 'complete')

    await Bun.sleep(60)

    expect(tracker.check('msg-1')).toBe('process')
  })

  it('markPending + waitForCompletion + markDone lifecycle', async () => {
    const tracker = trackTracker(createDedupTracker({ ttlMs: 5000 }))

    tracker.markPending('msg-1')

    // markDone after short delay
    setTimeout(() => tracker.markDone('msg-1', 'complete'), 10)

    const state = await tracker.waitForCompletion('msg-1')
    expect(state).toBe('complete')
  })

  it('waitForCompletion times out if markDone never called', async () => {
    const tracker = trackTracker(
      createDedupTracker({ ttlMs: 1000, waitTimeoutMs: 50 })
    )

    tracker.markPending('msg-1')
    const state = await tracker.waitForCompletion('msg-1')
    expect(state).toBe('failed')
  })

  it('dispose() stops cleanup interval and clears entries', () => {
    const tracker = trackTracker(createDedupTracker())
    tracker.markPending('msg-1')

    // dispose should not throw and should clear entries
    expect(() => tracker.dispose()).not.toThrow()

    // After dispose, check should return 'process' (entries cleared)
    expect(tracker.check('msg-1')).toBe('process')
  })

  it('cleanup() resolves lingering pending entries as failed', async () => {
    const tracker = trackTracker(createDedupTracker({ ttlMs: 50 }))

    tracker.markPending('msg-1')

    // Start waiting before cleanup
    const waitPromise = tracker.waitForCompletion('msg-1')

    // Wait for entry to expire, then cleanup
    await Bun.sleep(60)
    tracker.cleanup()

    // The pending entry should have been resolved as 'failed'
    const state = await waitPromise
    expect(state).toBe('failed')
  })
})
