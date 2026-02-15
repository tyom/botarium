/**
 * HTTP server for /config endpoint
 *
 * Exposes bot configuration schema for the simulator's Settings UI.
 * Runs alongside Slack Bolt (which uses socket mode).
 */

import { config, type SettingSchema, type GroupDefinition } from './loader'
import { appLogger } from '../utils/logger'

export interface ConfigResponse {
  schema: {
    settings: Record<string, SettingSchema>
    groups: GroupDefinition[]
    model_tiers: Record<string, Record<string, string[]>>
  }
  values: Record<string, unknown>
}

/**
 * Build the config response, excluding secret values
 */
function getConfigResponse(): ConfigResponse {
  const values: Record<string, unknown> = {}
  const settingsSchema: Record<string, SettingSchema> = {}

  for (const [key, def] of Object.entries(config.settings)) {
    // Always include schema
    settingsSchema[key] = def.schema

    // Include values for non-secrets
    // For secrets, include empty string as placeholder
    if (def.schema.type === 'secret') {
      values[key] = ''
    } else if (def.env) {
      // Value comes from env var
      values[key] = process.env[def.env] ?? def.value ?? ''
    } else {
      values[key] = def.value ?? ''
    }
  }

  return {
    schema: {
      settings: settingsSchema,
      groups: config.groups,
      model_tiers: {},
    },
    values,
  }
}

/**
 * Start the config HTTP server on a random available port
 * Returns the server instance with its actual port, or null if failed
 */
export function startConfigServer() {
  try {
    const server = Bun.serve({
      port: 0, // Let OS pick an available port
      hostname: '127.0.0.1', // Explicit IPv4 for Electron compatibility
      async fetch(req) {
        const url = new URL(req.url)

        // CORS preflight
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          })
        }

        const corsHeaders = { 'Access-Control-Allow-Origin': '*' }

        if (url.pathname === '/config') {
          return Response.json(getConfigResponse(), { headers: corsHeaders })
        }

        if (url.pathname === '/health') {
          return Response.json({ ok: true }, { headers: corsHeaders })
        }

        return new Response('Not Found', { status: 404 })
      },
    })

    appLogger.info({ port: server.port }, 'Config server started')
    return server
  } catch (error) {
    appLogger.warn({ error }, 'Failed to start config server (non-fatal)')
    return null
  }
}
