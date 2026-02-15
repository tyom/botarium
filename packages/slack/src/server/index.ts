/**
 * Slack API Emulator Server
 * Main entry point that starts the HTTP + WebSocket server
 */

import { getEmulatorState, type EmulatorState } from './state'
import { SocketModeServer } from './socket-mode'
import { SlackWebAPI } from './web-api'
import type { WorkspaceConfig, SimulatorEvent } from './types'
import { emulatorLogger } from '../lib/logger'
import { DEFAULT_EMULATOR_PORT, getEmulatorPort } from '../lib/config'

export { EmulatorState, getEmulatorState, resetEmulatorState } from './state'
export { SocketModeServer } from './socket-mode'
export { SlackWebAPI } from './web-api'
export * from './types'

interface EmulatorServerOptions {
  port?: number
  host?: string
  workspaceConfig?: WorkspaceConfig
  dataDir?: string
}

export interface LogEntry {
  level: number
  time: number
  msg: string
  module?: string
  [key: string]: unknown
}

interface EmulatorServer {
  state: EmulatorState
  socketMode: SocketModeServer
  webApi: SlackWebAPI
  server: ReturnType<typeof Bun.serve>
  stop: () => void
  /** Broadcast a log entry to all connected log viewers */
  broadcastLog: (log: LogEntry) => void
}

export async function startEmulatorServer(
  options: EmulatorServerOptions = {}
): Promise<EmulatorServer> {
  const port = options.port ?? DEFAULT_EMULATOR_PORT
  const host = options.host ?? 'localhost'
  const wsUrl = `ws://${host}:${port}/ws/socket-mode`

  // Initialize state and servers
  const state = getEmulatorState(options.workspaceConfig)

  // Enable persistence if dataDir is provided (await to ensure DB is ready before accepting requests)
  if (options.dataDir) {
    await state.enablePersistence(options.dataDir).catch((err) => {
      emulatorLogger.error({ err }, 'Failed to enable persistence')
    })
  }
  const socketMode = new SocketModeServer(state)
  const webApi = new SlackWebAPI(state, socketMode, wsUrl)

  // SSE connections for frontend events (messages, reactions)
  const sseConnections = new Set<ReadableStreamDefaultController>()

  // SSE connections for logs
  const logConnections = new Set<ReadableStreamDefaultController>()

  // Function to broadcast logs to all connected log viewers
  const broadcastLog = (log: LogEntry) => {
    const data = `data: ${JSON.stringify(log)}\n\n`
    for (const controller of logConnections) {
      try {
        controller.enqueue(new TextEncoder().encode(data))
      } catch {
        logConnections.delete(controller)
      }
    }
  }

  // Forward events to SSE connections
  webApi.onFrontendEvent((event: SimulatorEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const controller of sseConnections) {
      try {
        controller.enqueue(new TextEncoder().encode(data))
      } catch {
        // Connection closed
        sseConnections.delete(controller)
      }
    }
  })

  const server = Bun.serve<{ connectionId: string }>({
    port,
    idleTimeout: 0, // Disable timeout for SSE/WebSocket connections

    async fetch(req, server) {
      const url = new URL(req.url)
      const path = url.pathname

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods':
              'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        })
      }

      // Health check
      if (path === '/health') {
        return Response.json(
          { status: 'ok', connected_bots: socketMode.getConnectionCount() },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }

      // WebSocket upgrade for Socket Mode
      if (path === '/ws/socket-mode') {
        const connectionId = crypto.randomUUID()
        const upgraded = server.upgrade(req, {
          data: { connectionId },
        })
        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 500 })
        }
        return undefined
      }

      // SSE endpoint for frontend real-time updates
      if (path === '/api/simulator/events') {
        const stream = new ReadableStream({
          start(controller) {
            sseConnections.add(controller)

            // Send initial connection message
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'connected' })}\n\n`
              )
            )
          },
          cancel() {
            // Will be cleaned up on next event
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }

      // POST endpoint to receive logs from external processes (e.g., bot)
      if (path === '/api/simulator/logs' && req.method === 'POST') {
        try {
          const log = (await req.json()) as LogEntry
          broadcastLog(log)
          return Response.json(
            { ok: true },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
          )
        } catch {
          return Response.json(
            { ok: false, error: 'invalid_json' },
            { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
          )
        }
      }

      // SSE endpoint for logs (GET)
      if (path === '/api/simulator/logs' && req.method === 'GET') {
        const stream = new ReadableStream({
          start(controller) {
            logConnections.add(controller)

            // Send initial connection message as a log entry
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  level: 30,
                  time: Date.now(),
                  msg: 'Connected to log stream',
                  module: 'emulator',
                })}\n\n`
              )
            )
          },
          cancel() {
            // Will be cleaned up on next broadcast
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }

      // Simulator settings endpoints (Electron pushes settings, bots can fetch them)
      if (path === '/api/simulator/settings') {
        if (req.method === 'POST') {
          try {
            const settings = (await req.json()) as Record<string, unknown>
            const hadPreviousSettings =
              Object.keys(state.getSimulatorSettings()).length > 0
            state.setSimulatorSettings(settings)

            // If settings changed (not initial push), disconnect bots to force restart
            // Bots running with --watch will auto-restart with new settings
            if (hadPreviousSettings) {
              socketMode.disconnectAllBots('Settings changed - please restart')
            }

            return Response.json(
              { ok: true },
              { headers: { 'Access-Control-Allow-Origin': '*' } }
            )
          } catch {
            return Response.json(
              { ok: false, error: 'invalid_json' },
              { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            )
          }
        }
        if (req.method === 'GET') {
          return Response.json(
            { ok: true, settings: state.getSimulatorSettings() },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
          )
        }
      }

      // Status endpoint
      if (path === '/api/simulator/status') {
        return webApi.getStatus()
      }

      // Simulator user message endpoint (frontend sends user messages here)
      if (path === '/api/simulator/user-message' && req.method === 'POST') {
        return webApi.handleSimulatorUserMessage(await req.json())
      }

      // Message persistence endpoints for frontend
      if (path === '/api/simulator/messages') {
        if (req.method === 'GET') {
          // Get all messages for frontend to load on startup
          const allMessages = state.getAllMessages()
          const response = allMessages.map((msg) => ({
            ts: msg.ts,
            channel: msg.channel,
            user: msg.user,
            text: msg.text,
            threadTs: msg.thread_ts,
            reactions: msg.reactions?.map((r) => ({
              name: r.name,
              count: r.count,
            })),
            file: msg.file,
            ...(msg.blocks ? { blocks: msg.blocks } : {}),
          }))
          return Response.json(response, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          })
        }
        if (req.method === 'DELETE') {
          // Clear all messages
          state.clearAll()
          return Response.json(
            { success: true },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
          )
        }
      }

      // Delete single message
      if (
        path.startsWith('/api/simulator/messages/') &&
        req.method === 'DELETE'
      ) {
        const ts = decodeURIComponent(path.split('/').pop() ?? '')
        state.deleteMessage(ts)
        return Response.json(
          { success: true },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }

      // Clear channel messages
      const channelClearMatch = path.match(
        /^\/api\/simulator\/channels\/([^/]+)\/messages$/
      )
      if (channelClearMatch && req.method === 'DELETE') {
        const channel = decodeURIComponent(channelClearMatch[1] ?? '')
        state.clearChannel(channel)
        return Response.json(
          { success: true },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }

      // Bot registration routes without /api prefix (for external bots using SLACK_API_URL=http://localhost:PORT)
      if (path === '/config/register' && req.method === 'POST') {
        return await webApi.handleConfigRegister(await req.json())
      }

      if (path === '/commands/register' && req.method === 'POST') {
        return webApi.handleCommandRegister(await req.json())
      }

      // Command registration (called by bot at startup)
      if (path === '/api/commands/register' && req.method === 'POST') {
        return webApi.handleCommandRegister(await req.json())
      }

      // App config registration (called by bot at startup)
      if (path === '/api/config/register' && req.method === 'POST') {
        return await webApi.handleConfigRegister(await req.json())
      }

      // Get available commands (called by frontend)
      if (path === '/api/simulator/commands' && req.method === 'GET') {
        return webApi.getSimulatorCommands()
      }

      // Get app config (called by frontend)
      if (path === '/api/simulator/config' && req.method === 'GET') {
        return webApi.getSimulatorConfig()
      }

      // Get connected bots (called by frontend)
      if (path === '/api/simulator/bots' && req.method === 'GET') {
        return webApi.getConnectedBots()
      }

      // Execute slash command (called by frontend)
      if (path === '/api/simulator/slash-command' && req.method === 'POST') {
        return webApi.handleSimulatorSlashCommand(await req.json())
      }

      // View submit (called by frontend when user submits modal)
      if (path === '/api/simulator/view-submit' && req.method === 'POST') {
        return webApi.handleSimulatorViewSubmit(await req.json())
      }

      // View close (called by frontend when user closes modal)
      if (path === '/api/simulator/view-close' && req.method === 'POST') {
        return webApi.handleSimulatorViewClose(await req.json())
      }

      // Block action (called by frontend when user clicks button in modal)
      if (path === '/api/simulator/block-action' && req.method === 'POST') {
        return webApi.handleSimulatorBlockAction(await req.json())
      }

      // Message shortcut (called by frontend when user triggers shortcut from context menu)
      if (path === '/api/simulator/shortcut' && req.method === 'POST') {
        return webApi.handleSimulatorShortcut(await req.json())
      }

      // File upload endpoint (called by Slack SDK at the upload_url)
      const fileUploadMatch = path.match(
        /^\/api\/simulator\/file-upload\/([^/]+)$/
      )
      if (fileUploadMatch && req.method === 'POST') {
        const fileId = fileUploadMatch[1] ?? ''
        return webApi.handleFileUpload(req, fileId)
      }

      // File serving endpoint (serves uploaded files via HTTP)
      const fileServeMatch = path.match(/^\/api\/simulator\/files\/([^/]+)$/)
      if (fileServeMatch && req.method === 'GET') {
        const fileId = fileServeMatch[1] ?? ''
        return await webApi.handleGetFile(fileId)
      }

      // File update endpoint (update file properties like isExpanded)
      if (fileServeMatch && req.method === 'PATCH') {
        const fileId = fileServeMatch[1] ?? ''
        const body = (await req.json()) as { isExpanded?: boolean }
        if (typeof body.isExpanded === 'boolean') {
          await state.updateFileExpanded(fileId, body.isExpanded)
        }
        return Response.json(
          { ok: true },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }

      // Slack Web API endpoints (with /api/ prefix)
      if (path.startsWith('/api/')) {
        return webApi.handleRequest(req, path)
      }

      // Slack Web API endpoints (without /api/ prefix - Bolt SDK calls these directly)
      // Routes like /apps.connections.open, /auth.test, /chat.postMessage, etc.
      if (
        path.startsWith('/apps.') ||
        path.startsWith('/auth.') ||
        path.startsWith('/chat.') ||
        path.startsWith('/conversations.') ||
        path.startsWith('/files.') ||
        path.startsWith('/reactions.') ||
        path.startsWith('/users.') ||
        path.startsWith('/views.')
      ) {
        return webApi.handleRequest(req, `/api${path}`)
      }

      return new Response('Not Found', {
        status: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    },

    websocket: {
      open(ws) {
        socketMode.handleOpen(ws)
      },
      message(ws, message) {
        socketMode.handleMessage(ws, message)
      },
      close(ws) {
        socketMode.handleClose(ws)
      },
      ping(ws, data) {
        // Respond to client pings with pong (keeps connection alive)
        ws.pong(data)
      },
      pong(ws) {
        socketMode.handlePong(ws)
      },
    },
  })

  // Start heartbeat monitor for connection health
  socketMode.startHeartbeat()

  emulatorLogger.info(`Server started on http://${host}:${port}`)
  emulatorLogger.info(`Socket Mode WebSocket: ${wsUrl}`)

  return {
    state,
    socketMode,
    webApi,
    server,
    broadcastLog,
    stop: () => {
      socketMode.stopHeartbeat()
      server.stop()
      emulatorLogger.info('Server stopped')
    },
  }
}

// If run directly, start the server
if (import.meta.main) {
  await startEmulatorServer({
    port: getEmulatorPort(),
    dataDir: process.env.DATA_DIR,
  })
}
