/**
 * Message deduplication tracker with factory-scoped state.
 *
 * createDedupTracker() returns an independent instance -- no module-level globals.
 * Accepts plain string IDs (consumers build composite keys themselves).
 * Implements pending/complete/failed state machine with waitForCompletion().
 */

// =============================================================================
// Types
// =============================================================================

type ProcessingState = 'pending' | 'complete' | 'failed'

/** Action returned by check() indicating how to handle this ID. */
export type DedupAction = 'process' | 'wait' | 'skip'

/** Configuration for the dedup tracker factory. */
export interface DedupConfig {
  /** Time-to-live for entries in ms (default: 60000) */
  ttlMs?: number
  /** Interval for automatic cleanup in ms (default: 30000) */
  cleanupIntervalMs?: number
  /** Timeout for waitForCompletion in ms (default: same as ttlMs) */
  waitTimeoutMs?: number
}

/** Factory-created dedup tracker instance. */
export interface DedupTracker {
  check(id: string): DedupAction
  markPending(id: string): void
  waitForCompletion(id: string): Promise<ProcessingState>
  markDone(id: string, state: 'complete' | 'failed'): void
  cleanup(): void
  dispose(): void
}

// =============================================================================
// Internal entry type
// =============================================================================

interface ProcessingEntry {
  state: ProcessingState
  startedAt: number
  /** Promise that resolves when processing completes (for waiters). */
  completion: Promise<ProcessingState>
  resolve: (state: ProcessingState) => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TTL_MS = 60_000
const DEFAULT_CLEANUP_INTERVAL_MS = 30_000

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an independent dedup tracker instance.
 *
 * All state is closure-scoped -- no module-level globals shared between instances.
 * Auto-cleanup runs via setInterval; call dispose() for clean teardown.
 */
export function createDedupTracker(config?: DedupConfig): DedupTracker {
  const ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS
  const cleanupIntervalMs =
    config?.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS
  const waitTimeoutMs = config?.waitTimeoutMs ?? ttlMs

  const entries = new Map<string, ProcessingEntry>()

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  function cleanupExpired(): void {
    const now = Date.now()
    for (const [key, entry] of entries) {
      if (now - entry.startedAt > ttlMs) {
        if (entry.state === 'pending') {
          entry.resolve('failed')
        }
        entries.delete(key)
      }
    }
  }

  // Start auto-cleanup interval
  const timer: ReturnType<typeof setInterval> = setInterval(
    () => cleanupExpired(),
    cleanupIntervalMs
  )

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  return {
    /**
     * Check if an ID should be processed, waited on, or skipped.
     *
     * - No entry or expired entry -> 'process'
     * - Pending entry -> 'wait' (retry arrived while still processing)
     * - Complete entry -> 'skip' (already handled)
     * - Failed entry -> 'process' (allow reprocessing on retry)
     */
    check(id: string): DedupAction {
      const entry = entries.get(id)

      if (!entry) return 'process'

      // Expired entry -- allow reprocessing
      if (Date.now() - entry.startedAt > ttlMs) {
        entries.delete(id)
        return 'process'
      }

      switch (entry.state) {
        case 'pending':
          return 'wait'
        case 'complete':
          return 'skip'
        case 'failed':
          return 'process'
      }
    },

    /**
     * Mark an ID as pending processing.
     * Creates a completion promise that waiters can await.
     */
    markPending(id: string): void {
      let resolve!: (state: ProcessingState) => void
      const completion = new Promise<ProcessingState>((r) => {
        resolve = r
      })
      entries.set(id, {
        state: 'pending',
        startedAt: Date.now(),
        completion,
        resolve,
      })
    },

    /**
     * Wait for a pending ID to complete processing.
     * Returns the final state, or 'failed' if the entry doesn't exist or times out.
     * Timeout prevents hanging if markDone is never called.
     */
    async waitForCompletion(id: string): Promise<ProcessingState> {
      const entry = entries.get(id)
      if (!entry) return 'failed'

      const timeout = new Promise<ProcessingState>((resolve) => {
        setTimeout(() => resolve('failed'), waitTimeoutMs)
      })

      return Promise.race([entry.completion, timeout])
    },

    /**
     * Mark processing as complete or failed.
     * Resolves the completion promise so waiters are unblocked.
     */
    markDone(id: string, state: 'complete' | 'failed'): void {
      const entry = entries.get(id)
      if (entry) {
        entry.state = state
        entry.resolve(state)
      }
    },

    /**
     * Manually trigger cleanup of expired entries.
     * Resolves lingering pending entries as 'failed' before deleting
     * to prevent promise leaks.
     */
    cleanup(): void {
      cleanupExpired()
    },

    /**
     * Dispose the tracker: stop auto-cleanup interval, resolve any pending
     * entries as 'failed', and clear all state.
     */
    dispose(): void {
      clearInterval(timer)
      // Resolve any pending entries to prevent hanging promises
      for (const entry of entries.values()) {
        if (entry.state === 'pending') {
          entry.resolve('failed')
        }
      }
      entries.clear()
    },
  }
}
