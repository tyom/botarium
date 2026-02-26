/**
 * Config Server Factory
 *
 * Creates a Bun HTTP server with /config, /health, and CORS support.
 * Callers provide the response-building functions; this module just wires up routes.
 */

import type { ConfigResponse } from './types.ts'

export interface ConfigServerOptions {
  /** Returns the config response for /config endpoint */
  getConfigResponse: () => ConfigResponse
  /** Returns the health response for /health endpoint. If omitted, returns { ok: true } */
  getHealthResponse?: () => unknown
  /** Optional logger (pino-compatible info/warn) */
  logger?: {
    info: (obj: Record<string, unknown>, msg: string) => void
    warn: (obj: Record<string, unknown>, msg: string) => void
  }
}

/**
 * Start a config HTTP server on a random available port.
 * Returns the Bun server instance, or null if startup fails.
 *
 * Routes:
 * - OPTIONS * — CORS preflight
 * - GET /config — returns ConfigResponse JSON
 * - GET /health — returns health JSON (503 if unhealthy, 200 otherwise)
 * - * — 404 Not Found
 */
export function createConfigServer(
  options: ConfigServerOptions
): ReturnType<typeof Bun.serve> | null {
  const { getConfigResponse, getHealthResponse, logger } = options

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
          if (getHealthResponse) {
            const health = getHealthResponse() as Record<string, unknown>
            const httpStatus = health.status === 'unhealthy' ? 503 : 200
            return Response.json(health, {
              status: httpStatus,
              headers: corsHeaders,
            })
          }
          return Response.json({ ok: true }, { headers: corsHeaders })
        }

        return new Response('Not Found', { status: 404 })
      },
    })

    logger?.info({ port: server.port }, 'Config server started')
    return server
  } catch (error) {
    logger?.warn({ error }, 'Failed to start config server (non-fatal)')
    return null
  }
}
