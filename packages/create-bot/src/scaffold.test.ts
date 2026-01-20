import { describe, expect, test } from 'bun:test'
import { cleanJson } from './scaffold'

describe('cleanJson', () => {
  test('removes trailing comma before closing brace', () => {
    const input = '{"name": "test",}'
    const result = cleanJson(input)
    expect(JSON.parse(result)).toEqual({ name: 'test' })
  })

  test('removes trailing comma before closing bracket', () => {
    const input = '["a", "b",]'
    const result = cleanJson(input)
    expect(JSON.parse(result)).toEqual(['a', 'b'])
  })

  test('removes multiple trailing commas', () => {
    const input = `{
      "name": "test",
      "deps": {
        "foo": "1.0",
      },
    }`
    const result = cleanJson(input)
    const parsed = JSON.parse(result)
    expect(parsed.name).toBe('test')
    expect(parsed.deps.foo).toBe('1.0')
  })

  test('preserves valid JSON', () => {
    const input = '{"name": "test", "version": "1.0"}'
    const result = cleanJson(input)
    expect(JSON.parse(result)).toEqual({ name: 'test', version: '1.0' })
  })

  test('formats output with 2-space indentation', () => {
    const input = '{"name":"test"}'
    const result = cleanJson(input)
    expect(result).toBe('{\n  "name": "test"\n}\n')
  })

  test('adds trailing newline', () => {
    const input = '{"a": 1}'
    const result = cleanJson(input)
    expect(result.endsWith('\n')).toBe(true)
  })

  test('returns cleaned content if JSON parsing fails', () => {
    const input = '{invalid json,}'
    const result = cleanJson(input)
    // Trailing comma removed but still invalid
    expect(result).toBe('{invalid json}')
  })

  test('handles nested objects with trailing commas', () => {
    const input = `{
      "scripts": {
        "dev": "bun run dev",
        "build": "bun build",
      },
      "dependencies": {
        "react": "^18",
      },
    }`
    const result = cleanJson(input)
    const parsed = JSON.parse(result)
    expect(parsed.scripts.dev).toBe('bun run dev')
    expect(parsed.dependencies.react).toBe('^18')
  })

  test('handles arrays in objects with trailing commas', () => {
    const input = `{
      "files": [
        "src",
        "dist",
      ],
    }`
    const result = cleanJson(input)
    const parsed = JSON.parse(result)
    expect(parsed.files).toEqual(['src', 'dist'])
  })
})
