/**
 * Trace Context - AsyncLocalStorage-based request-scoped trace context
 *
 * Provides transparent trace ID propagation through async/await chains
 * without requiring function parameter changes.
 *
 * Key differences from Moro's src/observability/trace-context.ts:
 * - metadata: Record<string, unknown> replaces Slack-specific channel/user fields
 * - TraceContext fields are readonly and object is Object.freeze()'d for immutability
 * - traceId auto-generated as UUID v4 — no caller-provided override
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

import type { TraceContext } from './types.ts'

const traceStore = new AsyncLocalStorage<TraceContext>()

/**
 * Run a function within a new trace context.
 *
 * Creates a unique traceId (UUID v4) and propagates it through the async call chain.
 * The metadata bag is frozen at creation time — immutable for the duration of the trace.
 */
export function runWithTrace<T>(
  metadata: Record<string, unknown>,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const ctx: TraceContext = Object.freeze({
    traceId: randomUUID(),
    startTime: performance.now(),
    metadata: Object.freeze({ ...metadata }),
  })
  return traceStore.run(ctx, fn)
}

/**
 * Get the full trace context for the current async scope.
 *
 * Returns undefined when called outside a traced scope — no magic stubs.
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStore.getStore()
}

/**
 * Get only the traceId for the current async scope.
 *
 * Returns undefined when called outside a traced scope.
 */
export function getTraceId(): string | undefined {
  return traceStore.getStore()?.traceId
}
