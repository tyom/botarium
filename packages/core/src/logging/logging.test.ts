import { describe, test, expect } from 'bun:test'
import { createBotariumLogger, createToolLogger } from './index'

/**
 * Helper: create a capture stream that collects written chunks.
 */
function createCaptureStream() {
  const lines: string[] = []
  return {
    stream: {
      write(chunk: string) {
        lines.push(chunk)
      },
    },
    lines,
  }
}

/**
 * Helper: parse the first captured JSON line.
 */
function parseFirstLine(lines: string[]): Record<string, unknown> {
  expect(lines.length).toBeGreaterThan(0)
  return JSON.parse(lines[0]!) as Record<string, unknown>
}

describe('createBotariumLogger', () => {
  test('creates a logger with info/warn/error/debug/child methods', () => {
    const { stream } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.child).toBe('function')
  })

  test('logger.child returns a Logger with the same interface', () => {
    const { stream } = createCaptureStream()
    const logger = createBotariumLogger({ stream })
    const child = logger.child({ module: 'TestChild' })

    expect(typeof child.info).toBe('function')
    expect(typeof child.warn).toBe('function')
    expect(typeof child.error).toBe('function')
    expect(typeof child.debug).toBe('function')
    expect(typeof child.child).toBe('function')
  })

  test('default level is info when no options provided', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('hello info')
    logger.debug('hello debug')

    // info should be captured, debug should not (level is info by default)
    expect(lines.length).toBe(1)
    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('hello info')
  })

  test('custom level option is respected', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream, level: 'debug' })

    logger.debug('debug message')
    logger.info('info message')

    expect(lines.length).toBe(2)
    const debugLine = JSON.parse(lines[0]!) as Record<string, unknown>
    expect(debugLine.msg).toBe('debug message')
  })

  test('mixin callback is called and its return value appears in log output', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({
      stream,
      mixin: () => ({ traceId: 'abc-123', requestId: 'req-456' }),
    })

    logger.info('test with mixin')

    const parsed = parseFirstLine(lines)
    expect(parsed.traceId).toBe('abc-123')
    expect(parsed.requestId).toBe('req-456')
    expect(parsed.msg).toBe('test with mixin')
  })

  test('logger works without mixin (no trace fields, no errors)', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('no mixin')

    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('no mixin')
    expect(parsed.traceId).toBeUndefined()
  })

  test('logger works without forwardUrl (no forwarding, no errors)', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('no forwarding')

    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('no forwarding')
  })

  test('stream override bypasses auto-detection', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('captured')

    expect(lines.length).toBe(1)
    // Output should be JSON (not pretty-printed) since we used a custom stream
    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('captured')
  })

  test('info accepts (string) signature', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('simple message')

    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('simple message')
  })

  test('info accepts (object, string) signature', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info({ userId: 42 }, 'with context')

    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('with context')
    expect(parsed.userId).toBe(42)
  })

  test('warn accepts both signatures', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.warn('simple warn')
    logger.warn({ code: 'RATE_LIMIT' }, 'rate limited')

    expect(lines.length).toBe(2)
    const line1 = JSON.parse(lines[0]!) as Record<string, unknown>
    const line2 = JSON.parse(lines[1]!) as Record<string, unknown>
    expect(line1.msg).toBe('simple warn')
    expect(line2.msg).toBe('rate limited')
    expect(line2.code).toBe('RATE_LIMIT')
  })

  test('error accepts both signatures', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.error('simple error')
    logger.error({ err: 'something' }, 'error with context')

    expect(lines.length).toBe(2)
    const line1 = JSON.parse(lines[0]!) as Record<string, unknown>
    const line2 = JSON.parse(lines[1]!) as Record<string, unknown>
    expect(line1.msg).toBe('simple error')
    expect(line2.msg).toBe('error with context')
    expect(line2.err).toBe('something')
  })

  test('debug accepts both signatures', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream, level: 'debug' })

    logger.debug('simple debug')
    logger.debug({ detail: true }, 'debug with context')

    expect(lines.length).toBe(2)
    const line1 = JSON.parse(lines[0]!) as Record<string, unknown>
    const line2 = JSON.parse(lines[1]!) as Record<string, unknown>
    expect(line1.msg).toBe('simple debug')
    expect(line2.msg).toBe('debug with context')
    expect(line2.detail).toBe(true)
  })

  test('child({ module: "test" }) returns a new Logger', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })
    const child = logger.child({ module: 'TestModule' })

    child.info('child message')

    const parsed = parseFirstLine(lines)
    expect(parsed.msg).toBe('child message')
    expect(parsed.module).toBe('TestModule')
  })

  test('child logger output includes module binding', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })
    const child = logger.child({ module: 'MyModule' })

    child.warn({ extra: 'data' }, 'warning from child')

    const parsed = parseFirstLine(lines)
    expect(parsed.module).toBe('MyModule')
    expect(parsed.extra).toBe('data')
    expect(parsed.msg).toBe('warning from child')
  })

  test('base is undefined (no pid/hostname in output)', () => {
    const { stream, lines } = createCaptureStream()
    const logger = createBotariumLogger({ stream })

    logger.info('check base')

    const parsed = parseFirstLine(lines)
    expect(parsed.pid).toBeUndefined()
    expect(parsed.hostname).toBeUndefined()
  })
})

describe('createToolLogger', () => {
  test('returns a function that creates child loggers with Tool:{name} module binding', () => {
    const { stream, lines } = createCaptureStream()
    const baseLogger = createBotariumLogger({ stream })
    const getToolLogger = createToolLogger(baseLogger)

    const toolLog = getToolLogger('weather')
    toolLog.info('tool message')

    const parsed = parseFirstLine(lines)
    expect(parsed.module).toBe('Tool:weather')
    expect(parsed.msg).toBe('tool message')
  })

  test('caches loggers — calling with same tool name returns same logger instance', () => {
    const { stream } = createCaptureStream()
    const baseLogger = createBotariumLogger({ stream })
    const getToolLogger = createToolLogger(baseLogger)

    const logger1 = getToolLogger('search')
    const logger2 = getToolLogger('search')

    expect(logger1).toBe(logger2)
  })

  test('different tool names return different logger instances', () => {
    const { stream } = createCaptureStream()
    const baseLogger = createBotariumLogger({ stream })
    const getToolLogger = createToolLogger(baseLogger)

    const logger1 = getToolLogger('search')
    const logger2 = getToolLogger('calculator')

    expect(logger1).not.toBe(logger2)
  })

  test('returned loggers conform to Logger interface', () => {
    const { stream } = createCaptureStream()
    const baseLogger = createBotariumLogger({ stream })
    const getToolLogger = createToolLogger(baseLogger)
    const toolLog = getToolLogger('myTool')

    expect(typeof toolLog.info).toBe('function')
    expect(typeof toolLog.warn).toBe('function')
    expect(typeof toolLog.error).toBe('function')
    expect(typeof toolLog.debug).toBe('function')
    expect(typeof toolLog.child).toBe('function')
  })

  test('multiple tool logger factories are independent', () => {
    const { stream: stream1 } = createCaptureStream()
    const { stream: stream2 } = createCaptureStream()
    const baseLogger1 = createBotariumLogger({ stream: stream1 })
    const baseLogger2 = createBotariumLogger({ stream: stream2 })

    const getToolLogger1 = createToolLogger(baseLogger1)
    const getToolLogger2 = createToolLogger(baseLogger2)

    const log1 = getToolLogger1('search')
    const log2 = getToolLogger2('search')

    // Same tool name but different base loggers — should be different instances
    expect(log1).not.toBe(log2)
  })
})
