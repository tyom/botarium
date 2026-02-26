import { describe, it, expect } from 'bun:test'
import { runWithTrace, getTraceContext, getTraceId } from './trace'
import { createMetricsCollector } from './metrics'
import { timed } from './timing'
import { buildHealthResponse } from './health'
import type { TraceContext } from './types'
import type { LogMethod, Logger } from 'botarium/logging'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// =============================================================================
// Mock Logger
// =============================================================================

function createMockLogger() {
  const logs: { level: string; obj?: Record<string, unknown>; msg: string }[] =
    []

  function logMethod(level: string): LogMethod {
    return ((objOrMsg: Record<string, unknown> | string, msg?: string) => {
      if (typeof objOrMsg === 'string') logs.push({ level, msg: objOrMsg })
      else logs.push({ level, obj: objOrMsg, msg: msg ?? '' })
    }) as LogMethod
  }

  const logger: Logger = {
    debug: logMethod('debug'),
    warn: logMethod('warn'),
    info: logMethod('info'),
    error: logMethod('error'),
    fatal: logMethod('fatal'),
    child: () => logger,
  }
  return { logger, logs }
}

// =============================================================================
// Trace Context
// =============================================================================

describe('trace context', () => {
  it('runWithTrace() creates a context accessible via getTraceContext()', () => {
    let captured: TraceContext | undefined

    runWithTrace({ channel: 'C123', userId: 'U456' }, () => {
      captured = getTraceContext()
    })

    expect(captured).toBeDefined()
    expect(captured!.traceId).toBeDefined()
    expect(captured!.startTime).toBeGreaterThan(0)
    expect(captured!.metadata.channel).toBe('C123')
    expect(captured!.metadata.userId).toBe('U456')
  })

  it('getTraceId() returns UUID inside traced scope', () => {
    let traceId: string | undefined

    runWithTrace({ channel: 'C1' }, () => {
      traceId = getTraceId()
    })

    expect(traceId).toBeDefined()
    expect(traceId).toMatch(UUID_REGEX)
  })

  it('getTraceId() returns undefined outside traced scope', () => {
    expect(getTraceId()).toBeUndefined()
  })

  it('trace context propagates through async/await', async () => {
    let outerTraceId: string | undefined
    let innerTraceId: string | undefined

    await runWithTrace({ channel: 'C1' }, async () => {
      outerTraceId = getTraceId()
      await new Promise((resolve) => setTimeout(resolve, 10))
      innerTraceId = getTraceId()
    })

    expect(outerTraceId).toBeDefined()
    expect(innerTraceId).toBe(outerTraceId)
  })

  it('nested runWithTrace calls get independent trace IDs', () => {
    let outerTraceId: string | undefined
    let innerTraceId: string | undefined

    runWithTrace({ scope: 'outer' }, () => {
      outerTraceId = getTraceId()

      runWithTrace({ scope: 'inner' }, () => {
        innerTraceId = getTraceId()
      })
    })

    expect(outerTraceId).toBeDefined()
    expect(innerTraceId).toBeDefined()
    expect(outerTraceId).not.toBe(innerTraceId)
  })

  it('metadata is frozen (immutable)', () => {
    runWithTrace({ channel: 'C1' }, () => {
      const ctx = getTraceContext()!
      expect(() => {
        ;(ctx.metadata as Record<string, unknown>).newField = 'x'
      }).toThrow()
    })
  })

  it('TraceContext has no Slack-specific fields', () => {
    runWithTrace({ channel: 'C1' }, () => {
      const ctx = getTraceContext()!
      // Slack-specific fields are NOT own properties of TraceContext
      expect('channel' in ctx).toBe(false)
      expect('user' in ctx).toBe(false)
      expect('team' in ctx).toBe(false)
      // Domain-specific fields live in the metadata bag
      expect(ctx.metadata.channel).toBe('C1')
    })
  })
})

// =============================================================================
// Metrics Collector
// =============================================================================

describe('createMetricsCollector', () => {
  it('record() and getSnapshot() track latency per operation', () => {
    const collector = createMetricsCollector()
    collector.record('ai-call', 100)
    collector.record('ai-call', 200)
    collector.record('ai-call', 300)

    const snapshot = collector.getSnapshot()
    expect(snapshot.operations['ai-call']).toBeDefined()
    expect(snapshot.operations['ai-call']!.latency.sampleCount).toBe(3)
  })

  it('getSnapshot() returns p95/p99 percentiles', () => {
    const collector = createMetricsCollector()
    for (let i = 1; i <= 100; i++) {
      collector.record('op', i)
    }

    const snapshot = collector.getSnapshot()
    const latency = snapshot.operations['op']!.latency
    // p95 should be ~95, p99 should be ~99
    expect(latency.p95).toBeGreaterThanOrEqual(93)
    expect(latency.p95).toBeLessThanOrEqual(97)
    expect(latency.p99).toBeGreaterThanOrEqual(97)
    expect(latency.p99).toBeLessThanOrEqual(100)
  })

  it('recordError() tracks error counts in 1m and 5m windows', () => {
    const collector = createMetricsCollector()
    collector.recordError('api')
    collector.recordError('api')
    collector.recordError('api')

    const snapshot = collector.getSnapshot()
    expect(snapshot.operations['api']!.errors.last1m).toBe(3)
    expect(snapshot.operations['api']!.errors.last5m).toBe(3)
  })

  it('separate collector instances have independent state', () => {
    const collector1 = createMetricsCollector()
    const collector2 = createMetricsCollector()

    collector1.record('ai-call', 100)

    const snapshot2 = collector2.getSnapshot()
    expect(Object.keys(snapshot2.operations).length).toBe(0)
  })

  it('getSnapshot() returns empty operations for fresh collector', () => {
    const collector = createMetricsCollector()
    const snapshot = collector.getSnapshot()
    expect(Object.keys(snapshot.operations).length).toBe(0)
  })

  it('multiple operations tracked independently', () => {
    const collector = createMetricsCollector()
    collector.record('ai-call', 100)
    collector.record('ai-call', 200)
    collector.record('db-query', 50)

    const snapshot = collector.getSnapshot()
    expect(snapshot.operations['ai-call']!.latency.sampleCount).toBe(2)
    expect(snapshot.operations['db-query']!.latency.sampleCount).toBe(1)
  })
})

// =============================================================================
// Timed
// =============================================================================

describe('timed', () => {
  it('logs success at debug level with operation and duration', async () => {
    const { logger, logs } = createMockLogger()
    await timed('test-op', async () => 'ok', logger)

    expect(logs.length).toBe(1)
    expect(logs[0]!.level).toBe('debug')
    expect(logs[0]!.obj!.operation).toBe('test-op')
    expect(logs[0]!.obj!.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('logs failure at warn level and re-throws', async () => {
    const { logger, logs } = createMockLogger()

    await expect(
      timed(
        'fail-op',
        async () => {
          throw new Error('boom')
        },
        logger
      )
    ).rejects.toThrow('boom')

    expect(logs.length).toBe(1)
    expect(logs[0]!.level).toBe('warn')
    expect(logs[0]!.obj!.operation).toBe('fail-op')
  })

  it('returns result and durationMs on success', async () => {
    const { logger } = createMockLogger()
    const { result, durationMs } = await timed(
      'op',
      async () => 'hello',
      logger
    )

    expect(result).toBe('hello')
    expect(typeof durationMs).toBe('number')
    expect(durationMs).toBeGreaterThanOrEqual(0)
  })

  it('auto-attaches traceId when inside runWithTrace', async () => {
    const { logger, logs } = createMockLogger()

    await runWithTrace({ channel: 'C1' }, async () => {
      await timed('traced-op', async () => 'ok', logger)
    })

    expect(logs.length).toBe(1)
    expect(logs[0]!.obj!.traceId).toBeDefined()
    expect(logs[0]!.obj!.traceId).toMatch(UUID_REGEX)
  })

  it('does not include traceId when outside runWithTrace', async () => {
    const { logger, logs } = createMockLogger()
    await timed('untraced-op', async () => 'ok', logger)

    expect(logs.length).toBe(1)
    expect(logs[0]!.obj!.traceId).toBeUndefined()
  })

  it('passes extra meta to log entry', async () => {
    const { logger, logs } = createMockLogger()
    await timed('op', async () => 'ok', logger, { model: 'gpt-4' })

    expect(logs.length).toBe(1)
    expect(logs[0]!.obj!.model).toBe('gpt-4')
  })
})

// =============================================================================
// Health
// =============================================================================

describe('buildHealthResponse', () => {
  it('returns healthy status with no breaker states', () => {
    const response = buildHealthResponse()

    expect(response.status).toBe('healthy')
    expect(Object.keys(response.dependencies).length).toBe(0)
    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(response.uptime).toBeGreaterThanOrEqual(0)
  })

  it('returns healthy when all breakers closed', () => {
    const response = buildHealthResponse({
      getBreakerStates: () => [{ service: 'api', state: 'closed' }],
    })

    expect(response.status).toBe('healthy')
    expect(response.dependencies.api!.status).toBe('up')
  })

  it('returns degraded when any breaker half-open', () => {
    const response = buildHealthResponse({
      getBreakerStates: () => [
        { service: 'api', state: 'closed' },
        { service: 'db', state: 'half-open' },
      ],
    })

    expect(response.status).toBe('degraded')
    expect(response.dependencies.db!.status).toBe('degraded')
  })

  it('returns unhealthy when any breaker open', () => {
    const response = buildHealthResponse({
      getBreakerStates: () => [{ service: 'api', state: 'open' }],
    })

    expect(response.status).toBe('unhealthy')
    expect(response.dependencies.api!.status).toBe('down')
  })

  it('worst-wins: open trumps half-open', () => {
    const response = buildHealthResponse({
      getBreakerStates: () => [
        { service: 'api', state: 'open' },
        { service: 'db', state: 'half-open' },
      ],
    })

    expect(response.status).toBe('unhealthy')
  })

  it('includes version when provided in config', () => {
    const response = buildHealthResponse({ version: '1.2.3' })
    expect(response.version).toBe('1.2.3')
  })

  it('omits version when not provided', () => {
    const response = buildHealthResponse()
    expect(response.version).toBeUndefined()
  })

  it('calculates uptime from provided startTime', () => {
    const response = buildHealthResponse({
      startTime: Date.now() - 5000,
    })
    // uptime is in seconds, should be approximately 5
    expect(response.uptime).toBeGreaterThanOrEqual(4)
    expect(response.uptime).toBeLessThanOrEqual(6)
  })
})
