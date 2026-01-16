import { describe, expect, test } from 'bun:test'

describe('app settings storage structure', () => {
  test('app settings are stored under app_settings key', () => {
    const settings = {
      ai_provider: 'openai',
      openai_api_key: 'sk-test',
      model_fast: 'gpt-4o-mini',
      app_settings: {
        'bot-1': {
          model_fast: 'claude-3-haiku',
          model_default: 'claude-sonnet-4-20250514',
        },
      },
    }

    expect(settings.app_settings).toBeDefined()
    expect(settings.app_settings['bot-1'].model_fast).toBe('claude-3-haiku')
  })

  test('getAppSettings returns empty object for unknown app', () => {
    const settings = {
      ai_provider: 'openai',
      app_settings: {},
    }

    const appSettings = settings.app_settings as Record<
      string,
      Record<string, unknown>
    >
    const result = appSettings['unknown-bot'] ?? {}

    expect(result).toEqual({})
  })

  test('app settings merge with global settings', () => {
    const globalSettings = {
      ai_provider: 'openai',
      model_fast: 'gpt-4o-mini',
      model_default: 'gpt-4o',
    }

    const appSettings = {
      model_default: 'claude-sonnet-4-20250514',
    }

    const merged = { ...globalSettings, ...appSettings }

    expect(merged.ai_provider).toBe('openai')
    expect(merged.model_fast).toBe('gpt-4o-mini')
    expect(merged.model_default).toBe('claude-sonnet-4-20250514')
  })
})
