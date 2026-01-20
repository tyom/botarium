import { describe, expect, test } from 'bun:test'
import { validateBotName, validateBotNameForPrompts } from './validate'

describe('validateBotName', () => {
  describe('valid names', () => {
    test('accepts simple lowercase name', () => {
      expect(validateBotName('my-bot')).toEqual({ valid: true })
    })

    test('accepts name starting with number', () => {
      expect(validateBotName('123bot')).toEqual({ valid: true })
    })

    test('accepts name with dots', () => {
      expect(validateBotName('my.bot.name')).toEqual({ valid: true })
    })

    test('accepts name with underscores', () => {
      expect(validateBotName('my_bot_name')).toEqual({ valid: true })
    })

    test('accepts name with mixed separators', () => {
      expect(validateBotName('my-bot_v2.0')).toEqual({ valid: true })
    })
  })

  describe('invalid names', () => {
    test('rejects empty string', () => {
      const result = validateBotName('')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toBe('Bot name is required')
      }
    })

    test('rejects name starting with uppercase', () => {
      const result = validateBotName('MyBot')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('lowercase')
      }
    })

    test('rejects name starting with hyphen', () => {
      const result = validateBotName('-my-bot')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('start with')
      }
    })

    test('rejects name with spaces', () => {
      const result = validateBotName('my bot')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('can only contain')
      }
    })

    test('rejects name with special characters', () => {
      const result = validateBotName('my@bot!')
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('can only contain')
      }
    })

    test('rejects name exceeding max length', () => {
      const longName = 'a'.repeat(215)
      const result = validateBotName(longName)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toContain('less than 214')
      }
    })
  })
})

describe('validateBotNameForPrompts', () => {
  test('returns true for valid name', () => {
    expect(validateBotNameForPrompts('my-bot')).toBe(true)
  })

  test('returns error string for invalid name', () => {
    const result = validateBotNameForPrompts('')
    expect(typeof result).toBe('string')
    expect(result).toBe('Bot name is required')
  })
})
