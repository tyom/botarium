import { describe, expect, test } from 'bun:test'
import { toPascalCase, toPackageName, createTemplateContext } from './template'

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

describe('createTemplateContext', () => {
  test('creates context with AI enabled', () => {
    const ctx = createTemplateContext({
      botName: 'test-bot',
      useAi: true,
      aiProvider: 'openai',
      dbAdapter: 'none',
    })

    expect(ctx.botName).toBe('test-bot')
    expect(ctx.botNamePascal).toBe('TestBot')
    expect(ctx.packageName).toBe('test-bot')
    expect(ctx.isAi).toBe(true)
    expect(ctx.isOpenai).toBe(true)
    expect(ctx.isAnthropic).toBe(false)
    expect(ctx.isGoogle).toBe(false)
    expect(ctx.isOpenrouter).toBe(false)
    expect(ctx.isDb).toBe(false)
  })

  test('creates context with database enabled', () => {
    const ctx = createTemplateContext({
      botName: 'db-bot',
      useAi: false,
      dbAdapter: 'sqlite',
    })

    expect(ctx.isAi).toBe(false)
    expect(ctx.isDb).toBe(true)
    expect(ctx.isSqlite).toBe(true)
    expect(ctx.isPostgres).toBe(false)
  })

  test('creates context with postgres adapter', () => {
    const ctx = createTemplateContext({
      botName: 'pg-bot',
      useAi: false,
      dbAdapter: 'postgres',
    })

    expect(ctx.isDb).toBe(true)
    expect(ctx.isSqlite).toBe(false)
    expect(ctx.isPostgres).toBe(true)
  })

  test('creates context with no AI and no database', () => {
    const ctx = createTemplateContext({
      botName: 'simple-bot',
      useAi: false,
      dbAdapter: 'none',
    })

    expect(ctx.isAi).toBe(false)
    expect(ctx.isDb).toBe(false)
    expect(ctx.isOpenai).toBe(false)
    expect(ctx.isSqlite).toBe(false)
    expect(ctx.isPostgres).toBe(false)
  })

  test('sets correct provider flag for anthropic', () => {
    const ctx = createTemplateContext({
      botName: 'claude-bot',
      useAi: true,
      aiProvider: 'anthropic',
      dbAdapter: 'none',
    })

    expect(ctx.isAnthropic).toBe(true)
    expect(ctx.isOpenai).toBe(false)
  })

  test('sets correct provider flag for google', () => {
    const ctx = createTemplateContext({
      botName: 'gemini-bot',
      useAi: true,
      aiProvider: 'google',
      dbAdapter: 'none',
    })

    expect(ctx.isGoogle).toBe(true)
    expect(ctx.isOpenai).toBe(false)
  })

  test('sets correct provider flag for openrouter', () => {
    const ctx = createTemplateContext({
      botName: 'router-bot',
      useAi: true,
      aiProvider: 'openrouter',
      dbAdapter: 'none',
    })

    expect(ctx.isOpenrouter).toBe(true)
    expect(ctx.isOpenai).toBe(false)
  })
})
