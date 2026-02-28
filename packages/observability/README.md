# @botarium/observability

Request-scoped tracing, metrics collection, timing utilities, and health status for Botarium bots. No globals, no singletons — everything is factory-based and injectable.

## Installation

```bash
bun add @botarium/observability
```

## API Overview

### `runWithTrace(metadata, fn)`

Creates a trace context (auto-generated UUID, frozen metadata) and propagates it through async call chains via `AsyncLocalStorage`. Retrieve it anywhere downstream with `getTraceContext()` or `getTraceId()`.

```typescript
import { runWithTrace, getTraceId } from '@botarium/observability'

await runWithTrace({ channel: 'C123', user: 'U456' }, async () => {
  console.log(getTraceId()) // "a1b2c3d4-..."
  await handleMessage() // trace ID available in nested calls
})
```

### `createMetricsCollector()`

Factory that creates an in-memory metrics collector with per-operation latency percentiles (p95, p99) and sliding-window error counts (1m, 5m).

```typescript
import { createMetricsCollector } from '@botarium/observability'

const metrics = createMetricsCollector()

metrics.record('slack-api', 142)
metrics.recordError('slack-api')

const snapshot = metrics.getSnapshot()
// snapshot.operations['slack-api'].latency.p95
// snapshot.operations['slack-api'].errors.last1m
```

### `timed(operation, fn, logger, meta?)`

Wraps an async operation with `performance.now()` timing, logs on completion (debug) or failure (warn), and auto-attaches the current trace ID.

```typescript
import { timed } from '@botarium/observability'

const { result, durationMs } = await timed(
  'fetch-user',
  () => api.getUser(id),
  logger
)
```

### `buildHealthResponse(config?)`

Derives health status from circuit breaker states. Returns `'healthy'`, `'degraded'`, or `'unhealthy'` using worst-wins logic.

```typescript
import { buildHealthResponse } from '@botarium/observability'

const health = buildHealthResponse({
  version: '1.0.0',
  startTime: Date.now(),
  getBreakerStates: () => registry.getStates(),
})
// { status: 'healthy', uptime: 42, dependencies: { ... } }
```

## Wiring to @botarium/resilience

Connect breaker hooks to metrics for production monitoring:

```typescript
import { createMetricsCollector } from '@botarium/observability'
import { createBreakerRegistry } from '@botarium/resilience'

const metrics = createMetricsCollector()

const registry = createBreakerRegistry({
  onSuccess: ({ service, duration }) => metrics.record(service, duration),
  onFailure: ({ service, duration }) => {
    metrics.recordError(service)
    metrics.record(service, duration)
  },
})
```

The hook-based design keeps resilience and observability independent — integration happens in your application code.
