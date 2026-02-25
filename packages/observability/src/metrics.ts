/**
 * Metrics Collector - Factory-based in-memory metrics collection
 *
 * Provides per-operation latency percentiles and windowed error counts.
 * Each collector instance maintains its own closure-scoped state — no shared globals.
 *
 * Key differences from Moro's src/observability/metrics.ts:
 * - Factory pattern (createMetricsCollector) replaces module-level global Maps
 * - Single MetricsCollector interface replaces individual recordLatency/recordError/etc. functions
 * - recordSuccess and recordLastFailure are dropped (Moro-specific, not in requirements)
 * - Each instance is independent — safe for concurrent tests
 */
import type {
  MetricsCollector,
  MetricsSnapshot,
  OperationMetrics,
} from './types.ts'

// =============================================================================
// Internal Data Structures
// =============================================================================

class RingBuffer {
  private buffer: number[]
  private index = 0
  private count = 0

  constructor(private capacity: number = 1000) {
    this.buffer = new Array(capacity).fill(0)
  }

  push(value: number): void {
    this.buffer[this.index % this.capacity] = value
    this.index++
    this.count = Math.min(this.count + 1, this.capacity)
  }

  percentile(p: number): number {
    if (this.count === 0) return 0
    const sorted = this.buffer.slice(0, this.count).sort((a, b) => a - b)
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, idx)] ?? 0
  }

  get sampleCount(): number {
    return this.count
  }
}

class SlidingWindowCounter {
  private buckets = new Map<number, number>()

  constructor(
    private windowMs: number,
    private bucketMs: number
  ) {}

  increment(): void {
    const bucket = Math.floor(Date.now() / this.bucketMs)
    this.buckets.set(bucket, (this.buckets.get(bucket) ?? 0) + 1)
    this.prune()
  }

  count(): number {
    this.prune()
    let total = 0
    for (const c of this.buckets.values()) total += c
    return total
  }

  private prune(): void {
    const cutoff =
      Math.floor(Date.now() / this.bucketMs) -
      Math.ceil(this.windowMs / this.bucketMs)
    for (const bucket of this.buckets.keys()) {
      if (bucket < cutoff) this.buckets.delete(bucket)
    }
  }
}

// =============================================================================
// Helper
// =============================================================================

function getOrCreate<T>(map: Map<string, T>, key: string, factory: () => T): T {
  let value = map.get(key)
  if (!value) {
    value = factory()
    map.set(key, value)
  }
  return value
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new metrics collector instance.
 *
 * Each instance maintains its own closure-scoped Maps for latency buffers
 * and error counters — no module-level globals, no shared state between instances.
 *
 * Fixed dual time windows: 1-minute and 5-minute (not configurable per CONTEXT decisions).
 */
export function createMetricsCollector(): MetricsCollector {
  const latencyBuffers = new Map<string, RingBuffer>()
  const errorCounters1m = new Map<string, SlidingWindowCounter>()
  const errorCounters5m = new Map<string, SlidingWindowCounter>()

  return {
    record(operation: string, durationMs: number): void {
      getOrCreate(latencyBuffers, operation, () => new RingBuffer(1000)).push(
        durationMs
      )
    },

    recordError(operation: string): void {
      getOrCreate(
        errorCounters1m,
        operation,
        () => new SlidingWindowCounter(60_000, 10_000)
      ).increment()
      getOrCreate(
        errorCounters5m,
        operation,
        () => new SlidingWindowCounter(300_000, 60_000)
      ).increment()
    },

    getSnapshot(): MetricsSnapshot {
      const operations: Record<string, OperationMetrics> = {}
      const allOps = new Set([
        ...latencyBuffers.keys(),
        ...errorCounters1m.keys(),
      ])

      for (const op of allOps) {
        const buf = latencyBuffers.get(op)
        operations[op] = {
          latency: {
            p95: buf?.percentile(95) ?? 0,
            p99: buf?.percentile(99) ?? 0,
            sampleCount: buf?.sampleCount ?? 0,
          },
          errors: {
            last1m: errorCounters1m.get(op)?.count() ?? 0,
            last5m: errorCounters5m.get(op)?.count() ?? 0,
          },
        }
      }

      return { operations }
    },
  }
}
