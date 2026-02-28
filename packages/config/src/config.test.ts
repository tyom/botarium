import { describe, it, expect, afterEach } from 'bun:test'
import { buildConfigResponse } from './response'
import { createConfigServer } from './server'
import type { ConfigFile } from './types'

// =============================================================================
// Fixtures
// =============================================================================

function createMinimalConfig(overrides?: Partial<ConfigFile>): ConfigFile {
  return {
    simulator: { id: 'test-bot' },
    slack: {
      commands: [],
      shortcuts: [],
      actions: {},
      modals: {},
    },
    settings: {},
    groups: [],
    ...overrides,
  }
}

// =============================================================================
// buildConfigResponse
// =============================================================================

describe('buildConfigResponse', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it('includes schema and values for non-secret settings', () => {
    const config = createMinimalConfig({
      settings: {
        bot_name: {
          value: 'TestBot',
          schema: {
            type: 'string',
            label: 'Bot Name',
            group: 'general',
          },
        },
      },
      groups: [{ id: 'general', label: 'General', order: 1 }],
    })

    const response = buildConfigResponse(config)

    expect(response.schema.settings.bot_name).toBeDefined()
    expect(response.schema.settings.bot_name!.type).toBe('string')
    expect(response.values.bot_name).toBe('TestBot')
    expect(response.schema.groups).toHaveLength(1)
  })

  it('returns env var value for secrets with env set', () => {
    process.env.MY_SECRET = 'secret-value'

    const config = createMinimalConfig({
      settings: {
        api_key: {
          env: 'MY_SECRET',
          schema: {
            type: 'secret',
            label: 'API Key',
            group: 'auth',
          },
        },
      },
    })

    const response = buildConfigResponse(config)

    expect(response.values.api_key).toBe('secret-value')
  })

  it('returns empty string for secrets without env set', () => {
    delete process.env.UNSET_SECRET

    const config = createMinimalConfig({
      settings: {
        api_key: {
          env: 'UNSET_SECRET',
          schema: {
            type: 'secret',
            label: 'API Key',
            group: 'auth',
          },
        },
      },
    })

    const response = buildConfigResponse(config)

    expect(response.values.api_key).toBe('')
  })

  it('tracks env overrides excluding emulator-injected vars', () => {
    process.env.USER_SET_VAR = 'user-value'
    process.env.INJECTED_VAR = 'injected-value'
    process.env._EMULATOR_INJECTED_VARS = 'INJECTED_VAR'

    const config = createMinimalConfig({
      settings: {
        user_setting: {
          env: 'USER_SET_VAR',
          schema: { type: 'string', label: 'User Setting', group: 'general' },
        },
        injected_setting: {
          env: 'INJECTED_VAR',
          schema: {
            type: 'string',
            label: 'Injected Setting',
            group: 'general',
          },
        },
      },
    })

    const response = buildConfigResponse(config)

    expect(response.envOverrides).toContain('user_setting')
    expect(response.envOverrides).not.toContain('injected_setting')
  })

  it('passes through model_tiers from config', () => {
    const tiers = { openai: { fast: ['gpt-4o-mini'] } }
    const config = createMinimalConfig({ model_tiers: tiers })

    const response = buildConfigResponse(config)

    expect(response.schema.model_tiers).toEqual(tiers)
  })

  it('returns empty object for model_tiers when undefined', () => {
    const config = createMinimalConfig()

    const response = buildConfigResponse(config)

    expect(response.schema.model_tiers).toEqual({})
  })

  it('prefers env var over config value for non-secret settings', () => {
    process.env.BOT_NAME_ENV = 'EnvBot'

    const config = createMinimalConfig({
      settings: {
        bot_name: {
          value: 'ConfigBot',
          env: 'BOT_NAME_ENV',
          schema: { type: 'string', label: 'Bot Name', group: 'general' },
        },
      },
    })

    const response = buildConfigResponse(config)

    expect(response.values.bot_name).toBe('EnvBot')
  })
})

// =============================================================================
// createConfigServer
// =============================================================================

describe('createConfigServer', () => {
  let server: ReturnType<typeof Bun.serve> | null = null

  afterEach(() => {
    server?.stop(true)
    server = null
  })

  it('starts and returns a server instance with a port', () => {
    server = createConfigServer({
      config: createMinimalConfig(),
    })

    expect(server).not.toBeNull()
    expect(server!.port).toBeGreaterThan(0)
  })

  it('GET /config returns 200 with ConfigResponse shape', async () => {
    server = createConfigServer({
      config: createMinimalConfig({
        settings: {
          bot_name: {
            value: 'Test',
            schema: { type: 'string', label: 'Bot', group: 'g' },
          },
        },
        groups: [{ id: 'g', label: 'General', order: 1 }],
      }),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/config`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.schema).toBeDefined()
    expect(body.values).toBeDefined()
    expect(body.envOverrides).toBeDefined()
    expect(body.schema.settings.bot_name.type).toBe('string')
  })

  it('GET /health returns 200 with custom health data', async () => {
    server = createConfigServer({
      config: createMinimalConfig(),
      getHealthResponse: () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 100,
        dependencies: {},
      }),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/health`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as Record<string, unknown>
    expect(body.status).toBe('healthy')
  })

  it('GET /health returns 503 when unhealthy', async () => {
    server = createConfigServer({
      config: createMinimalConfig(),
      getHealthResponse: () => ({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 100,
        dependencies: {},
      }),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/health`)
    expect(res.status).toBe(503)
  })

  it('GET /health returns { ok: true } when no health callback provided', async () => {
    server = createConfigServer({
      config: createMinimalConfig(),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/health`)
    expect(res.status).toBe(200)

    const body = (await res.json()) as Record<string, unknown>
    expect(body.ok).toBe(true)
  })

  it('GET /unknown returns 404', async () => {
    server = createConfigServer({
      config: createMinimalConfig(),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/unknown`)
    expect(res.status).toBe(404)
  })

  it('includes CORS headers on responses', async () => {
    server = createConfigServer({
      config: createMinimalConfig(),
    })

    const res = await fetch(`http://127.0.0.1:${server!.port}/config`)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})
