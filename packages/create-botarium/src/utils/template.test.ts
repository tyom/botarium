import { describe, expect, test } from 'bun:test'
import {
  toPascalCase,
  toPackageName,
  createTemplateVars,
  interpolate,
  isInterpolatable,
} from './template'

describe('toPascalCase', () => {
  test('converts hyphenated string', () => {
    expect(toPascalCase('my-bot')).toBe('MyBot')
  })

  test('converts underscored string', () => {
    expect(toPascalCase('my_bot')).toBe('MyBot')
  })

  test('converts spaced string', () => {
    expect(toPascalCase('my bot')).toBe('MyBot')
  })

  test('converts mixed separators', () => {
    expect(toPascalCase('my-bot_name here')).toBe('MyBotNameHere')
  })

  test('handles single word', () => {
    expect(toPascalCase('bot')).toBe('Bot')
  })

  test('handles already capitalized words', () => {
    expect(toPascalCase('MY-BOT')).toBe('MyBot')
  })

  test('handles numbers', () => {
    expect(toPascalCase('my-bot-2')).toBe('MyBot2')
  })
})

describe('toPackageName', () => {
  test('converts to lowercase', () => {
    expect(toPackageName('MyBot')).toBe('mybot')
  })

  test('replaces spaces with hyphens', () => {
    expect(toPackageName('My Bot')).toBe('my-bot')
  })

  test('replaces special characters with hyphens', () => {
    // Trailing hyphens are removed
    expect(toPackageName('my@bot!')).toBe('my-bot')
  })

  test('collapses multiple hyphens', () => {
    expect(toPackageName('my--bot---name')).toBe('my-bot-name')
  })

  test('removes leading and trailing hyphens', () => {
    expect(toPackageName('-my-bot-')).toBe('my-bot')
  })

  test('handles valid package name unchanged', () => {
    expect(toPackageName('my-bot')).toBe('my-bot')
  })
})

describe('createTemplateVars', () => {
  test('creates vars from bot name', () => {
    const vars = createTemplateVars('test-bot')

    expect(vars.botName).toBe('test-bot')
    expect(vars.botNamePascal).toBe('TestBot')
    expect(vars.packageName).toBe('test-bot')
  })

  test('derives pascal case and package name', () => {
    const vars = createTemplateVars('My Cool Bot')

    expect(vars.botName).toBe('My Cool Bot')
    expect(vars.botNamePascal).toBe('MyCoolBot')
    expect(vars.packageName).toBe('my-cool-bot')
  })
})

describe('interpolate', () => {
  test('replaces known variables', () => {
    const vars = createTemplateVars('test-bot')
    const result = interpolate('Hello {{ botName }}!', vars)
    expect(result).toBe('Hello test-bot!')
  })

  test('replaces all variable types', () => {
    const vars = createTemplateVars('my-bot')
    const result = interpolate(
      '{{ botName }} {{ botNamePascal }} {{ packageName }}',
      vars
    )
    expect(result).toBe('my-bot MyBot my-bot')
  })

  test('preserves unknown variables', () => {
    const vars = createTemplateVars('test-bot')
    const result = interpolate('{{ unknownVar }}', vars)
    expect(result).toBe('{{ unknownVar }}')
  })

  test('handles whitespace variations in delimiters', () => {
    const vars = createTemplateVars('test-bot')
    expect(interpolate('{{botName}}', vars)).toBe('test-bot')
    expect(interpolate('{{  botName  }}', vars)).toBe('test-bot')
    expect(interpolate('{{ botName }}', vars)).toBe('test-bot')
  })

  test('handles multiple occurrences', () => {
    const vars = createTemplateVars('test-bot')
    const result = interpolate('{{ botName }} and {{ botName }}', vars)
    expect(result).toBe('test-bot and test-bot')
  })

  test('returns content unchanged when no variables', () => {
    const vars = createTemplateVars('test-bot')
    const result = interpolate('no variables here', vars)
    expect(result).toBe('no variables here')
  })
})

describe('isInterpolatable', () => {
  test('returns true for .ts files', () => {
    expect(isInterpolatable('src/app.ts')).toBe(true)
  })

  test('returns true for .json files', () => {
    expect(isInterpolatable('package.json')).toBe(true)
  })

  test('returns true for .md files', () => {
    expect(isInterpolatable('README.md')).toBe(true)
  })

  test('returns true for .yaml files', () => {
    expect(isInterpolatable('config.yaml')).toBe(true)
  })

  test('returns true for .env.example', () => {
    expect(isInterpolatable('.env.example')).toBe(true)
  })

  test('returns false for .gitignore', () => {
    expect(isInterpolatable('.gitignore')).toBe(false)
  })

  test('returns false for binary files', () => {
    expect(isInterpolatable('image.png')).toBe(false)
  })
})
