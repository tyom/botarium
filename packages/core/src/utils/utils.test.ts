import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  safeParse,
  safeParseJson,
  success,
  failure,
  type ToolResult,
} from './index'

interface ErrorInfo {
  context?: string
  error: string
  phase: 'json_parse' | 'validation'
}

/** Creates a typed error collector for onError callbacks */
function errorCollector() {
  const errors: ErrorInfo[] = []
  const onError = (info: ErrorInfo) => {
    errors.push(info)
  }
  return { errors, onError }
}

// =============================================================================
// safeParse
// =============================================================================

describe('safeParse', () => {
  const schema = z.object({ name: z.string(), age: z.number() })
  const fallback = { name: 'unknown', age: 0 }

  test('returns fallback for null input', () => {
    expect(safeParse(null, schema, fallback)).toEqual(fallback)
  })

  test('returns fallback for undefined input', () => {
    expect(safeParse(undefined, schema, fallback)).toEqual(fallback)
  })

  test('returns fallback for empty string input', () => {
    expect(safeParse('', schema, fallback)).toEqual(fallback)
  })

  test('parses valid JSON with matching schema and returns data', () => {
    const input = JSON.stringify({ name: 'Alice', age: 30 })
    const result = safeParse(input, schema, fallback)
    expect(result).toEqual({ name: 'Alice', age: 30 })
  })

  test('returns fallback for invalid JSON (not parseable)', () => {
    const result = safeParse('not-json', schema, fallback)
    expect(result).toEqual(fallback)
  })

  test('returns fallback for JSON that does not match schema', () => {
    const input = JSON.stringify({ name: 123, age: 'not-a-number' })
    const result = safeParse(input, schema, fallback)
    expect(result).toEqual(fallback)
  })

  test('calls onError with phase json_parse on JSON parse failure', () => {
    const { errors, onError } = errorCollector()
    safeParse('not-json', schema, fallback, {
      context: 'test-module',
      onError,
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]!.phase).toBe('json_parse')
    expect(errors[0]!.context).toBe('test-module')
    expect(typeof errors[0]!.error).toBe('string')
  })

  test('calls onError with phase validation on schema validation failure', () => {
    const { errors, onError } = errorCollector()
    const input = JSON.stringify({ name: 123, age: 'bad' })
    safeParse(input, schema, fallback, {
      context: 'validator',
      onError,
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]!.phase).toBe('validation')
    expect(errors[0]!.context).toBe('validator')
    expect(typeof errors[0]!.error).toBe('string')
  })

  test('does not call onError when parsing succeeds', () => {
    const { errors, onError } = errorCollector()
    const input = JSON.stringify({ name: 'Alice', age: 30 })
    safeParse(input, schema, fallback, { onError })

    expect(errors).toHaveLength(0)
  })

  test('works without options (silent mode)', () => {
    // Should not throw even without onError callback
    const result = safeParse('not-json', schema, fallback)
    expect(result).toEqual(fallback)

    const badShape = JSON.stringify({ wrong: 'shape' })
    const result2 = safeParse(badShape, schema, fallback)
    expect(result2).toEqual(fallback)
  })
})

// =============================================================================
// safeParseJson
// =============================================================================

describe('safeParseJson', () => {
  const fallback = { items: [] as string[] }

  test('returns fallback for null input', () => {
    expect(safeParseJson(null, fallback)).toEqual(fallback)
  })

  test('returns fallback for undefined input', () => {
    expect(safeParseJson(undefined, fallback)).toEqual(fallback)
  })

  test('parses valid JSON and returns typed result', () => {
    const input = JSON.stringify({ items: ['a', 'b'] })
    const result = safeParseJson<{ items: string[] }>(input, fallback)
    expect(result).toEqual({ items: ['a', 'b'] })
  })

  test('returns fallback for invalid JSON', () => {
    const result = safeParseJson('not-json', fallback)
    expect(result).toEqual(fallback)
  })

  test('calls onError callback on failure', () => {
    const { errors, onError } = errorCollector()
    safeParseJson('not-json', fallback, {
      context: 'json-test',
      onError,
    })

    expect(errors).toHaveLength(1)
    expect(errors[0]!.phase).toBe('json_parse')
    expect(errors[0]!.context).toBe('json-test')
    expect(typeof errors[0]!.error).toBe('string')
  })

  test('works without options (silent mode)', () => {
    const result = safeParseJson('not-json', fallback)
    expect(result).toEqual(fallback)
  })
})

// =============================================================================
// success / failure / ToolResult
// =============================================================================

describe('success', () => {
  test('creates object with success: true and spread data', () => {
    const result = success({ message: 'done', count: 42 })
    expect(result).toEqual({ success: true, message: 'done', count: 42 })
    expect(result.success).toBe(true)
  })
})

describe('failure', () => {
  test('creates object with success: false and error string', () => {
    const result = failure('something went wrong')
    expect(result).toEqual({ success: false, error: 'something went wrong' })
    expect(result.success).toBe(false)
  })
})

describe('ToolResult type narrowing', () => {
  test('discriminates success and failure via success field', () => {
    function process(result: ToolResult<{ value: number }>): string {
      if (result.success) {
        return `value: ${result.value}`
      } else {
        return `error: ${result.error}`
      }
    }

    const ok = success({ value: 42 })
    expect(process(ok)).toBe('value: 42')

    const err = failure('bad input')
    expect(process(err)).toBe('error: bad input')
  })
})
