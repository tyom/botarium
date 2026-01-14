/**
 * Socket Mode WebSocket server for the Slack emulator
 * Implements Slack's Socket Mode protocol for bot connections
 */

import type { ServerWebSocket } from 'bun'
import type {
  SocketModeHello,
  SocketModeEnvelope,
  SocketModeAck,
  SlackEvent,
  SlashCommandPayload,
  MessageShortcutPayload,
} from './types'
import { type EmulatorState } from './state'
import { socketModeLogger } from '../lib/logger'

interface SocketConnection {
  ws: ServerWebSocket<{ connectionId: string }>
  connectionId: string
  appToken: string
  connectedAt: Date
  lastPong: Date // Track last pong response for heartbeat
}

interface PendingAck {
  resolve: () => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
  viewId?: string // Track view ID for view_submission acks
}

// Heartbeat configuration
const HEARTBEAT_INTERVAL_MS = 30_000 // Send ping every 30 seconds
const HEARTBEAT_TIMEOUT_MS = 10_000 // Mark as dead if no pong within 10 seconds

export class SocketModeServer {
  private connections = new Map<string, SocketConnection>()
  private pendingAcks = new Map<string, PendingAck>()
  private state: EmulatorState
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  // Track connection IDs that have been claimed for registration but not yet confirmed
  private claimedConnectionIds = new Set<string>()

  constructor(state: EmulatorState) {
    this.state = state
  }

  /**
   * Start periodic heartbeat to detect dead connections.
   * Should be called after the server starts.
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) return // Already running

    socketModeLogger.info('Starting heartbeat monitor')
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats()
    }, HEARTBEAT_INTERVAL_MS)
  }

  /**
   * Stop the heartbeat monitor.
   * Should be called before the server stops.
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      socketModeLogger.info('Stopped heartbeat monitor')
    }
  }

  /**
   * Check all connections for heartbeat timeouts and send pings.
   */
  private checkHeartbeats(): void {
    const now = new Date()
    const deadConnections: string[] = []

    for (const [connectionId, conn] of this.connections) {
      const timeSinceLastPong = now.getTime() - conn.lastPong.getTime()

      if (timeSinceLastPong > HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS) {
        // Connection hasn't responded to heartbeat within timeout
        socketModeLogger.warn(
          `Connection ${connectionId} missed heartbeat (${Math.round(timeSinceLastPong / 1000)}s since last pong)`
        )
        deadConnections.push(connectionId)
      } else {
        // Send ping to check if connection is still alive
        try {
          conn.ws.ping()
        } catch (err) {
          socketModeLogger.warn(
            { err, connectionId },
            'Failed to send ping, marking as dead'
          )
          deadConnections.push(connectionId)
        }
      }
    }

    // Clean up dead connections
    for (const connectionId of deadConnections) {
      const conn = this.connections.get(connectionId)
      if (conn) {
        this.connections.delete(connectionId)
        const bot = this.state.unregisterBot(connectionId)
        if (bot) {
          socketModeLogger.info(
            `Bot disconnected via heartbeat timeout: ${bot.appConfig.app.name} (${bot.id})`
          )
        }
        try {
          conn.ws.close(1001, 'Heartbeat timeout')
        } catch {
          // Ignore close errors on dead connections
        }
      }
    }

    // Also check for orphaned bots (bots marked connected but no active socket)
    this.markOrphanedBotsDisconnected()
  }

  /**
   * Handle pong response from WebSocket ping.
   */
  handlePong(ws: ServerWebSocket<{ connectionId: string }>): void {
    const connectionId = ws.data.connectionId
    const conn = this.connections.get(connectionId)
    if (conn) {
      conn.lastPong = new Date()
    }
  }

  // ==========================================================================
  // WebSocket Handlers
  // ==========================================================================

  handleOpen(ws: ServerWebSocket<{ connectionId: string }>): void {
    const connectionId = ws.data.connectionId
    socketModeLogger.info(`Connection opened: ${connectionId}`)

    const now = new Date()
    // Store connection with lastPong initialized to now
    this.connections.set(connectionId, {
      ws,
      connectionId,
      appToken: '', // Will be set from URL params
      connectedAt: now,
      lastPong: now, // Initialize lastPong for heartbeat tracking
    })

    // Try to auto-reconnect a disconnected bot (handles hot-reload case)
    const reconnected = this.state.tryReconnectBot(connectionId)
    if (reconnected) {
      socketModeLogger.info(
        `Auto-reconnected bot: ${reconnected.appConfig.app.name} (${reconnected.id})`
      )
    } else {
      // Emit bot_connecting event to notify frontend that a WebSocket is connected
      // but waiting for config registration
      this.state.emitEvent({ type: 'bot_connecting', connectionId })
    }

    // Send hello message
    const hello: SocketModeHello = {
      type: 'hello',
      connection_info: {
        app_id: 'A_SIMULATOR',
      },
      num_connections: this.connections.size,
      debug_info: {
        host: 'localhost',
        started: new Date().toISOString(),
        approximate_connection_time: 3600,
      },
    }

    ws.send(JSON.stringify(hello))
  }

  handleMessage(
    ws: ServerWebSocket<{ connectionId: string }>,
    message: string | Buffer
  ): void {
    const connectionId = ws.data.connectionId

    try {
      const data = JSON.parse(message.toString()) as SocketModeAck

      // Handle acknowledgments from bot
      if (data.envelope_id) {
        const ackKey = `${connectionId}:${data.envelope_id}`
        const pending = this.pendingAcks.get(ackKey)
        if (pending) {
          clearTimeout(pending.timeout)

          // Process response_action in ack payload (for view_submission)
          if (pending.viewId) {
            const payload = data.payload as
              | {
                  response_action?: 'update' | 'clear' | 'errors'
                  view?: unknown
                }
              | undefined

            if (payload?.response_action === 'update' && payload.view) {
              // Update the view with the new content
              this.state.updateView(
                pending.viewId,
                payload.view as import('./types').SlackView
              )
              socketModeLogger.debug(
                `Updated view ${pending.viewId} from ack response_action`
              )
            } else if (payload?.response_action === 'errors') {
              // 'errors' response_action is handled client-side, don't close
              socketModeLogger.debug(
                `View ${pending.viewId} has validation errors`
              )
            } else {
              // No response_action or 'clear' - close the view (Slack's default behavior)
              this.state.closeView(pending.viewId)
              socketModeLogger.debug(
                `Closed view ${pending.viewId} (ack without response_action or clear)`
              )
            }
          }

          pending.resolve()
          this.pendingAcks.delete(ackKey)
          socketModeLogger.debug(
            `Received ack for envelope: ${data.envelope_id}`
          )
        }
      }
    } catch (err) {
      socketModeLogger.error({ err, connectionId }, 'Failed to parse message')
    }
  }

  handleClose(ws: ServerWebSocket<{ connectionId: string }>): void {
    const connectionId = ws.data.connectionId
    socketModeLogger.info(`Connection closed: ${connectionId}`)
    this.connections.delete(connectionId)

    // Mark the bot as disconnected
    const bot = this.state.unregisterBot(connectionId)
    if (bot) {
      socketModeLogger.info(
        `Bot marked disconnected: ${bot.appConfig.app.name} (${bot.id})`
      )
    } else {
      // No bot found for this connection - check for orphaned bots
      // (registered without WebSocket association)
      this.markOrphanedBotsDisconnected()
    }
  }

  /**
   * Mark bots as disconnected if they have no active WebSocket connection.
   * This handles bots that registered without WebSocket association.
   */
  private markOrphanedBotsDisconnected(): void {
    const activeConnectionIds = new Set(this.connections.keys())
    const orphanedBots = this.state.getOrphanedBots(activeConnectionIds)

    for (const bot of orphanedBots) {
      socketModeLogger.info(
        `Marking orphaned bot as disconnected: ${bot.appConfig.app.name} (${bot.id})`
      )
      this.state.markBotDisconnected(bot.id)
    }
  }

  // ==========================================================================
  // Event Dispatching
  // ==========================================================================

  async dispatchEvent(event: SlackEvent): Promise<void> {
    if (this.connections.size === 0) {
      socketModeLogger.warn(
        `No bots connected, event not dispatched: ${event.type}`
      )
      return
    }

    const envelope: SocketModeEnvelope = {
      envelope_id: this.state.generateEnvelopeId(),
      type: 'events_api',
      payload: {
        token: 'simulator_token',
        team_id: this.state.getTeamId(),
        api_app_id: 'A_SIMULATOR',
        event,
        type: 'event_callback',
        event_id: this.state.generateEventId(),
        event_time: Math.floor(Date.now() / 1000),
      },
      accepts_response_payload: false,
    }

    const message = JSON.stringify(envelope)

    // Send to all connected bots
    const sendPromises: Promise<void>[] = []
    for (const conn of this.connections.values()) {
      sendPromises.push(this.sendWithAck(conn, envelope.envelope_id, message))
    }

    // Wait for all acknowledgments (with overall timeout)
    try {
      await Promise.race([
        Promise.all(sendPromises),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Overall dispatch timeout')), 10000)
        ),
      ])
      socketModeLogger.debug(
        `Event dispatched to ${this.connections.size} bot(s): ${event.type}`
      )
    } catch (err) {
      socketModeLogger.error({ err }, 'Failed to dispatch event')
    }
  }

  private async sendWithAck(
    conn: SocketConnection,
    envelopeId: string,
    message: string,
    viewId?: string
  ): Promise<void> {
    // Use composite key to handle multiple connections with same envelope_id
    const ackKey = `${conn.connectionId}:${envelopeId}`

    return new Promise((resolve, reject) => {
      // Set up acknowledgment tracking with timeout
      const timeout = setTimeout(() => {
        this.pendingAcks.delete(ackKey)
        socketModeLogger.warn(`Ack timeout for envelope: ${envelopeId}`)
        resolve() // Don't reject, just warn
      }, 5000)

      this.pendingAcks.set(ackKey, { resolve, reject, timeout, viewId })

      // Send the message
      try {
        conn.ws.send(message)
      } catch (err) {
        clearTimeout(timeout)
        this.pendingAcks.delete(ackKey)
        socketModeLogger.error(
          { err, connectionId: conn.connectionId },
          'Failed to send message'
        )
        resolve() // Don't reject, just warn
      }
    })
  }

  // ==========================================================================
  // Convenience Methods for Common Events
  // ==========================================================================

  async dispatchMessageEvent(
    channel: string,
    user: string,
    text: string,
    ts: string,
    threadTs?: string
  ): Promise<void> {
    const isIM = this.state.isDirectMessage(channel)

    const event: SlackEvent = {
      type: 'message',
      user,
      text,
      channel,
      ts,
      thread_ts: threadTs,
      channel_type: isIM ? 'im' : 'channel',
    }

    await this.dispatchEvent(event)
  }

  async dispatchAppMentionEvent(
    channel: string,
    user: string,
    text: string,
    ts: string,
    threadTs?: string
  ): Promise<void> {
    const event: SlackEvent = {
      type: 'app_mention',
      user,
      text,
      channel,
      ts,
      thread_ts: threadTs,
      channel_type: 'channel',
    }

    await this.dispatchEvent(event)
  }

  async dispatchSlashCommand(payload: SlashCommandPayload): Promise<void> {
    if (this.connections.size === 0) {
      socketModeLogger.warn(
        `No bots connected, slash command not dispatched: ${payload.command}`
      )
      return
    }

    const envelope = {
      envelope_id: this.state.generateEnvelopeId(),
      type: 'slash_commands' as const,
      payload,
      accepts_response_payload: true,
    }

    const message = JSON.stringify(envelope)

    // Send to all connected bots
    const sendPromises: Promise<void>[] = []
    for (const conn of this.connections.values()) {
      sendPromises.push(this.sendWithAck(conn, envelope.envelope_id, message))
    }

    try {
      await Promise.race([
        Promise.all(sendPromises),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Overall dispatch timeout')), 10000)
        ),
      ])
      socketModeLogger.debug(
        `Slash command dispatched to ${this.connections.size} bot(s): ${payload.command}`
      )
    } catch (err) {
      socketModeLogger.error({ err }, 'Failed to dispatch slash command')
    }
  }

  async dispatchInteractive(payload: {
    type: 'view_submission' | 'view_closed' | 'block_actions'
    view?: unknown
    user?: { id: string; username: string }
    actions?: unknown[]
    trigger_id?: string
  }): Promise<void> {
    if (this.connections.size === 0) {
      socketModeLogger.warn(
        `No bots connected, interactive payload not dispatched: ${payload.type}`
      )
      return
    }

    const envelope = {
      envelope_id: this.state.generateEnvelopeId(),
      type: 'interactive' as const,
      payload: {
        ...payload,
        token: 'simulator_token',
        team: { id: this.state.getTeamId(), domain: 'simulator' },
        api_app_id: 'A_SIMULATOR',
      },
      accepts_response_payload: true,
    }

    const message = JSON.stringify(envelope)

    // Extract view ID for view_submission (needed to process response_action in ack)
    const viewId =
      payload.type === 'view_submission' && payload.view
        ? (payload.view as { id?: string }).id
        : undefined

    // Send to all connected bots
    const sendPromises: Promise<void>[] = []
    for (const conn of this.connections.values()) {
      sendPromises.push(
        this.sendWithAck(conn, envelope.envelope_id, message, viewId)
      )
    }

    try {
      await Promise.race([
        Promise.all(sendPromises),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Overall dispatch timeout')), 10000)
        ),
      ])
      socketModeLogger.debug(
        `Interactive payload dispatched to ${this.connections.size} bot(s): ${payload.type}`
      )
    } catch (err) {
      socketModeLogger.error({ err }, 'Failed to dispatch interactive payload')
    }
  }

  async dispatchShortcut(payload: MessageShortcutPayload): Promise<void> {
    if (this.connections.size === 0) {
      socketModeLogger.warn(
        `No bots connected, shortcut not dispatched: ${payload.callback_id}`
      )
      return
    }

    const envelope = {
      envelope_id: this.state.generateEnvelopeId(),
      type: 'interactive' as const,
      payload: {
        ...payload,
        token: 'simulator_token',
        team: { id: this.state.getTeamId(), domain: 'simulator' },
        api_app_id: 'A_SIMULATOR',
      },
      accepts_response_payload: false,
    }

    const message = JSON.stringify(envelope)

    // Send to all connected bots
    const sendPromises: Promise<void>[] = []
    for (const conn of this.connections.values()) {
      sendPromises.push(this.sendWithAck(conn, envelope.envelope_id, message))
    }

    try {
      await Promise.race([
        Promise.all(sendPromises),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Overall dispatch timeout')), 10000)
        ),
      ])
      socketModeLogger.debug(
        `Shortcut dispatched to ${this.connections.size} bot(s): ${payload.callback_id}`
      )
    } catch (err) {
      socketModeLogger.error({ err }, 'Failed to dispatch shortcut')
    }
  }

  // ==========================================================================
  // Status Methods
  // ==========================================================================

  getConnectionCount(): number {
    return this.connections.size
  }

  isConnected(): boolean {
    return this.connections.size > 0
  }

  getConnections(): Array<{ connectionId: string; connectedAt: Date }> {
    return Array.from(this.connections.values()).map((conn) => ({
      connectionId: conn.connectionId,
      connectedAt: conn.connectedAt,
    }))
  }

  /**
   * Find and claim the oldest WebSocket connection that doesn't have a bot associated yet.
   * The connection is atomically claimed to prevent race conditions with concurrent registrations.
   * Used when registering a bot via HTTP to link it to its WebSocket connection.
   *
   * After successful registration, call confirmConnectionClaim() to release the claim.
   * If registration fails, call releaseConnectionClaim() to allow others to use it.
   */
  getUnassociatedConnectionId(): string | undefined {
    // Sort connections by connectedAt (oldest first)
    const sorted = Array.from(this.connections.values()).sort(
      (a, b) => a.connectedAt.getTime() - b.connectedAt.getTime()
    )

    // Find the first connection that:
    // 1. Has no associated bot
    // 2. Is not already claimed by another concurrent registration
    for (const conn of sorted) {
      const bot = this.state.getBotByConnectionId(conn.connectionId)
      if (!bot && !this.claimedConnectionIds.has(conn.connectionId)) {
        // Atomically claim this connection
        this.claimedConnectionIds.add(conn.connectionId)
        socketModeLogger.debug(
          `Claimed connection for registration: ${conn.connectionId}`
        )
        return conn.connectionId
      }
    }

    return undefined
  }

  /**
   * Confirm that a claimed connection has been successfully registered.
   * This releases the claim since the connection now has an associated bot.
   */
  confirmConnectionClaim(connectionId: string): void {
    this.claimedConnectionIds.delete(connectionId)
    socketModeLogger.debug(
      `Confirmed connection registration: ${connectionId}`
    )
  }

  /**
   * Release a claimed connection if registration fails.
   * This allows other concurrent registrations to use the connection.
   */
  releaseConnectionClaim(connectionId: string): void {
    if (this.claimedConnectionIds.delete(connectionId)) {
      socketModeLogger.debug(
        `Released connection claim (registration failed): ${connectionId}`
      )
    }
  }
}
