# @botarium/resilience

Circuit breakers, error boundaries, and message deduplication for the @botarium bot framework.

## Installation

```bash
bun add @botarium/resilience
```

## API Overview

### `createBreakerRegistry(config?)`

Factory that creates per-service circuit breakers with configurable failure thresholds, half-open probing, and hook-based integration.

### `withErrorBoundary(service, fn, options?)`

Async wrapper that returns a `Result<T>` discriminated union instead of throwing. Works standalone or with a breaker registry.

```typescript
type Success<T> = { success: true; data: T }
type Failure = { success: false; error: string; errorType: string }
type Result<T> = Success<T> | Failure
```

### `createDedupTracker(config?)`

Factory for message deduplication with a pending/complete/failed state machine, auto-cleanup via `setInterval`, and configurable TTL. Accepts plain string IDs -- consumers build composite keys themselves.

## Wiring to @botarium/observability

Connect breaker hooks to metrics collection for production monitoring:

```typescript
import { createMetricsCollector } from '@botarium/observability'
import { createBreakerRegistry, withErrorBoundary } from '@botarium/resilience'

const metrics = createMetricsCollector({ prefix: 'mybot' })

const registry = createBreakerRegistry({
  onSuccess: ({ service, duration }) => {
    metrics.record('breaker_success', duration, { service })
  },
  onFailure: ({ service, duration, error }) => {
    metrics.record('breaker_failure', duration, { service })
  },
})

// Use in your bot handlers
const result = await withErrorBoundary('slack-api', () => fetchSlackData(), {
  registry,
})

if (result.success) {
  // result.data is typed
  console.log(result.data)
} else {
  // result.error and result.errorType available
  console.error(result.errorType, result.error)
}
```

The hook-based design means resilience and observability packages remain independent -- no direct imports between them. Integration happens in your application code.
