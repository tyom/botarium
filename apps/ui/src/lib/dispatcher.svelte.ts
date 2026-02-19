/**
 * Simulator dispatcher - connects to the Slack API emulator
 * Uses Socket Mode: sends messages via HTTP, receives bot responses via SSE
 */

import {
  simulatorState,
  addMessage,
  updateMessage,
  deleteMessageFromState,
  clearChannelMessagesFromState,
  addReactionToMessage,
  removeReactionFromMessage,
  setAvailableCommands,
  setAppConfig,
  showModal,
  updateModal,
  closeModal,
  updateFileExpandedInState,
  setConnectedBots,
  addConnectedBot,
  markBotDisconnected,
  restoreMessages,
  isBotUserId,
  setChannels,
  addChannelToState,
  removeChannelFromState,
  switchChannel,
} from './state.svelte'
import type {
  SimulatorMessage,
  SlashCommand,
  SlackView,
  SlackFile,
  SlackAppConfig,
  SlackBlock,
  ConnectedBotInfo,
  Channel,
} from './types'
import { INTERNAL_SIMULATED_USER_ID } from './settings-store'
import { dispatcherLogger, sseLogger } from './logger'
import { EMULATOR_API_URL } from './emulator-config'

// SSE connection for real-time updates from emulator
let sseConnection: EventSource | null = null
let initialized = false

interface StoredMessage {
  ts: string
  channel: string
  user: string
  text: string
  subtype?: string
  threadTs?: string
  blocks?: unknown[]
  reactions?: Array<{ name: string; count: number }>
  file?: {
    id: string
    name: string
    title?: string
    mimetype: string
    url_private: string
    thumb_360?: string
    thumb_480?: string
    isExpanded?: boolean
  }
}

/**
 * Load all messages from the emulator
 * Retries with exponential backoff if backend isn't ready
 */
export async function loadMessages(
  maxRetries = 5,
  initialDelayMs = 500
): Promise<StoredMessage[]> {
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`${EMULATOR_API_URL}/api/simulator/messages`)
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      return (await response.json()) as StoredMessage[]
    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        dispatcherLogger.error('Failed to load messages after retries:', error)
        return []
      }
      // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
      const delay = initialDelayMs * Math.pow(2, attempt - 1)
      dispatcherLogger.info(
        `Retrying message load in ${delay}ms (attempt ${attempt}/${maxRetries})`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return []
}

/**
 * Clear all messages from the database
 */
export async function clearAllMessages(): Promise<void> {
  try {
    await fetch(`${EMULATOR_API_URL}/api/simulator/messages`, {
      method: 'DELETE',
    })
  } catch (error) {
    dispatcherLogger.error('Failed to clear messages:', error)
  }
}

/**
 * Delete a single message from both state and database
 */
export async function deleteMessage(
  channel: string,
  ts: string
): Promise<boolean> {
  // Remove from state immediately
  const removed = deleteMessageFromState(channel, ts)
  if (!removed) return false

  // Delete from database
  try {
    const encodedTs = encodeURIComponent(ts)
    await fetch(`${EMULATOR_API_URL}/api/simulator/messages/${encodedTs}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to delete message from DB:', error)
    return true // Still return true since we removed from state
  }
}

/**
 * Clear all messages for a specific channel from both state and database
 */
export async function clearChannelMessages(channel: string): Promise<void> {
  // Clear from state immediately
  clearChannelMessagesFromState(channel)

  // Clear from database
  try {
    const encodedChannel = encodeURIComponent(channel)
    await fetch(
      `${EMULATOR_API_URL}/api/simulator/channels/${encodedChannel}/messages`,
      {
        method: 'DELETE',
      }
    )
  } catch (error) {
    dispatcherLogger.error('Failed to clear channel messages from DB:', error)
  }
}

/**
 * Add a reaction to a message (updates local state)
 * Note: In emulator mode, the emulator handles persistence
 */
export function addReaction(
  channel: string,
  ts: string,
  reaction: string
): void {
  addReactionToMessage(channel, ts, reaction)
}

/**
 * Remove a reaction from a message (updates local state)
 * Note: In emulator mode, the emulator handles persistence
 */
export function removeReaction(
  channel: string,
  ts: string,
  reaction: string
): void {
  removeReactionFromMessage(channel, ts, reaction)
}

// Legacy MockApp interface (kept for compatibility)
export interface MockApp {
  start: () => Promise<void>
}

export function createMockApp(): MockApp {
  return {
    start: async () => {
      // No-op for simulator
    },
  }
}

// =============================================================================
// Emulator SSE Connection
// =============================================================================

/**
 * Initialize the dispatcher - connects to SSE for real-time updates
 * Call this after the backend is ready
 */
export function initializeDispatcher(): void {
  if (initialized) return
  initialized = true
  connectSSE()
  dispatcherLogger.info('Initialized')
}

/**
 * Check if dispatcher is initialized
 */
export function isInitialized(): boolean {
  return initialized
}

/**
 * Reconnect SSE after backend restart.
 * Unlike initializeDispatcher(), this bypasses the initialization guard
 * and properly closes any existing connection before reconnecting.
 */
export function reconnectSSE(): void {
  // Close existing connection if any
  if (sseConnection) {
    sseConnection.close()
    sseConnection = null
  }
  connectSSE()
  dispatcherLogger.info('Reconnected SSE after backend restart')
}

/**
 * Connect to SSE endpoint for real-time updates from emulator
 */
function connectSSE(): void {
  if (sseConnection) return

  sseConnection = new EventSource(`${EMULATOR_API_URL}/api/simulator/events`)

  sseConnection.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      handleSSEEvent(data)
    } catch (err) {
      sseLogger.error('Failed to parse event:', err)
    }
  }

  sseConnection.onerror = (err) => {
    sseLogger.error('Connection error:', err)
    // Close and clear the broken connection
    sseConnection?.close()
    sseConnection = null
    // Reconnect after a delay
    setTimeout(() => {
      if (initialized) {
        connectSSE()
      }
    }, 2000)
  }

  sseLogger.info('Connected to emulator events')
}

/**
 * Handle events received from the emulator via SSE
 */
function handleSSEEvent(event: {
  type: string
  message?: {
    channel: string
    user: string
    text: string
    ts: string
    subtype?: string
    thread_ts?: string
    blocks?: unknown[]
  }
  channel?: string
  ts?: string
  item_ts?: string
  user?: string
  reaction?: string
  viewId?: string
  view?: SlackView
  file?: SlackFile
  bot?: {
    id: string
    appConfig: {
      app: { name: string }
      commands?: Array<{ command: string; description: string }>
      shortcuts?: Array<{ callback_id: string; name: string }>
    }
    connectedAt: string
    status: 'connecting' | 'connected' | 'disconnected'
  }
  botId?: string
}): void {
  switch (event.type) {
    case 'connected':
      sseLogger.info('Emulator connection confirmed')
      // Refresh bot list on SSE reconnect with retry (bot may still be registering)
      loadConnectedBotsWithRetry()
      loadAppConfig()
      loadCommands()
      break

    case 'message':
      if (event.message) {
        const msg = event.message
        // Only add messages from bots (we already added our own messages)
        // Bot user IDs have format U_{botId} (e.g., U_simple) or legacy U_BOT
        if (isBotUserId(msg.user)) {
          addMessage({
            ts: msg.ts,
            user: msg.user,
            text: msg.text,
            subtype: msg.subtype,
            thread_ts: msg.thread_ts,
            channel: msg.channel,
            blocks: msg.blocks as SlackBlock[] | undefined,
          })
        }
      }
      break

    case 'file_shared':
      if (event.message && event.file) {
        const msg = event.message
        const file = event.file
        sseLogger.info(
          `File shared: ${file.name}, mimetype: ${file.mimetype}, url length: ${file.url_private?.length}`
        )
        // Debug: Log first 100 chars of URL to verify format
        if (file.url_private) {
          sseLogger.info(
            `File URL prefix: ${file.url_private.substring(0, 100)}...`
          )
        }
        addMessage({
          ts: msg.ts,
          user: msg.user,
          text: msg.text,
          thread_ts: msg.thread_ts,
          channel: msg.channel,
          file,
          blocks: msg.blocks as SlackBlock[] | undefined,
        })
      }
      break

    case 'message_update':
      if (event.message) {
        const msg = event.message
        updateMessage(msg.channel, msg.ts, {
          text: msg.text,
          blocks: msg.blocks as SlackBlock[] | undefined,
        })
      }
      break

    case 'message_delete':
      if (event.channel && event.ts) {
        deleteMessageFromState(event.channel, event.ts)
      }
      break

    case 'reaction_added':
      if (event.channel && event.item_ts && event.reaction) {
        addReactionToMessage(event.channel, event.item_ts, event.reaction)
      }
      break

    case 'reaction_removed':
      if (event.channel && event.item_ts && event.reaction) {
        removeReactionFromMessage(event.channel, event.item_ts, event.reaction)
      }
      break

    case 'view_open':
      sseLogger.info(
        `Received view_open event: viewId=${event.viewId}, hasView=${!!event.view}`
      )
      if (event.viewId && event.view) {
        sseLogger.info(
          `Opening modal: ${event.viewId}, title: ${event.view.title?.text}`
        )
        showModal(event.viewId, event.view)
        sseLogger.info(
          `Modal state after showModal: ${JSON.stringify(simulatorState.activeModal?.viewId)}`
        )
      }
      break

    case 'view_update':
      if (event.viewId && event.view) {
        sseLogger.info(`Modal updated: ${event.viewId}`)
        updateModal(event.viewId, event.view)
      }
      break

    case 'view_close':
      if (event.viewId) {
        sseLogger.info(`Modal closed: ${event.viewId}`)
        closeModal()
      }
      break

    case 'bot_connected':
      if (event.bot) {
        sseLogger.info(`Bot connected: ${event.bot.appConfig.app.name}`)
        const botInfo: ConnectedBotInfo = {
          id: event.bot.id,
          name: event.bot.appConfig.app.name,
          connectedAt: event.bot.connectedAt,
          status: event.bot.status,
          commands: event.bot.appConfig.commands?.length ?? 0,
          shortcuts: event.bot.appConfig.shortcuts?.length ?? 0,
        }
        addConnectedBot(botInfo)
        // Also update app config and commands when a bot connects
        loadAppConfig()
        loadCommands()
        // Reload messages (DM messages are filtered by simulator scope_id)
        loadMessages().then((messages) => {
          if (messages.length > 0) {
            restoreMessages(messages)
          }
        })
      }
      break

    case 'bot_disconnected':
      if (event.botId) {
        sseLogger.info(`Bot disconnected: ${event.botId}`)
        markBotDisconnected(event.botId)
      }
      break
  }
}

/**
 * Send a user message via the emulator API
 * Returns the timestamp assigned by the emulator (needed for reactions)
 */
async function sendMessageViaEmulator(
  text: string,
  threadTs?: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/user-message`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          channel: simulatorState.currentChannel,
          thread_ts: threadTs,
          user: simulatorState.simulatedUserId,
          user_name: simulatorState.simulatedUserName,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    return result.ts || null
  } catch (error) {
    dispatcherLogger.error('Failed to send message:', error)
    return null
  }
}

/**
 * Check if the bot will respond to this message
 * Bot responds in DMs, threads (auto-response), or when mentioned in channels
 */
function _willBotRespond(text: string, threadTs?: string): boolean {
  if (simulatorState.isDM) return true

  // Bot auto-responds in threads without needing mention
  if (threadTs) return true

  // Check for bot mention (case-insensitive)
  const botName = simulatorState.botName.toLowerCase()
  const lowerText = text.toLowerCase()
  return lowerText.includes(`@${botName}`) || lowerText.includes(botName)
}

/**
 * Send a message via the emulator
 * User message is added to local state with emulator's timestamp for consistency
 * threadTs parameter controls where message is sent:
 * - undefined: send to channel (main input)
 * - string: send to specific thread (thread input)
 */
export async function sendMessage(
  _app: MockApp,
  text: string,
  threadTs?: string
): Promise<SimulatorMessage | null> {
  const channel = simulatorState.currentChannel

  // Send to emulator first to get the authoritative timestamp
  const emulatorTs = await sendMessageViaEmulator(text, threadTs)
  if (!emulatorTs) {
    return null
  }

  // Store user message in local state with emulator's timestamp
  addMessage({
    ts: emulatorTs,
    user: INTERNAL_SIMULATED_USER_ID,
    text,
    thread_ts: threadTs || undefined,
    channel,
  })

  // Response comes via SSE (handleSSEEvent adds bot's message)
  return null
}

// =============================================================================
// Slash Command Functions
// =============================================================================

/**
 * Load available slash commands from the emulator
 * Call this after bot has registered its commands
 */
export async function loadCommands(): Promise<SlashCommand[]> {
  try {
    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/commands`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    const commands = (data.commands ?? []) as SlashCommand[]
    setAvailableCommands(commands)
    dispatcherLogger.info(`Loaded ${commands.length} slash command(s)`)
    return commands
  } catch (error) {
    dispatcherLogger.error('Failed to load commands:', error)
    return []
  }
}

/**
 * Load app config from the emulator
 * Call this after bot has registered its config
 */
export async function loadAppConfig(): Promise<SlackAppConfig | null> {
  try {
    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/config`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    const config = data.config as SlackAppConfig | null
    setAppConfig(config)
    if (config) {
      dispatcherLogger.info(`Loaded app config: ${config.app.name}`)
    }
    return config
  } catch (error) {
    dispatcherLogger.error('Failed to load app config:', error)
    return null
  }
}

/**
 * Load connected bots from the emulator
 */
export async function loadConnectedBots(): Promise<ConnectedBotInfo[]> {
  try {
    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/bots`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    const bots = (data.bots ?? []) as ConnectedBotInfo[]
    setConnectedBots(bots)
    dispatcherLogger.info(`Loaded ${bots.length} connected bot(s)`)
    return bots
  } catch (error) {
    dispatcherLogger.error('Failed to load connected bots:', error)
    return []
  }
}

/**
 * Load connected bots with retry - useful when bot may still be registering
 */
async function loadConnectedBotsWithRetry(
  maxRetries = 5,
  delayMs = 1000
): Promise<ConnectedBotInfo[]> {
  for (let i = 0; i < maxRetries; i++) {
    const bots = await loadConnectedBots()
    if (bots.length > 0) return bots
    if (i < maxRetries - 1) {
      dispatcherLogger.debug(`No bots found, retrying in ${delayMs}ms...`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return []
}

// =============================================================================
// Channel Management Functions
// =============================================================================

/**
 * Load channels from the emulator API
 */
export async function loadChannels(): Promise<Channel[]> {
  try {
    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/channels`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    const data = await response.json()
    const channels = (data.channels ?? []).map(
      (c: { id: string; name: string; isPreset: boolean }) => ({
        id: c.id,
        name: c.name,
        type: 'channel' as const,
        isPreset: c.isPreset,
      })
    )
    setChannels(channels)
    dispatcherLogger.info(`Loaded ${channels.length} channel(s)`)
    return channels
  } catch (error) {
    dispatcherLogger.error('Failed to load channels:', error)
    return []
  }
}

/**
 * Add a new channel via the emulator API
 * On success, adds to state and switches to the new channel
 */
export async function addChannel(name: string): Promise<Channel | null> {
  try {
    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!response.ok) {
      const data = await response.json()
      dispatcherLogger.error(`Failed to add channel: ${data.error}`)
      return null
    }
    const data = await response.json()
    const channel: Channel = {
      id: data.channel.id,
      name: data.channel.name,
      type: 'channel',
      isPreset: false,
    }
    addChannelToState(channel)
    switchChannel(channel.id)
    dispatcherLogger.info(`Added channel: #${channel.name}`)
    return channel
  } catch (error) {
    dispatcherLogger.error('Failed to add channel:', error)
    return null
  }
}

/**
 * Remove a channel via the emulator API
 * On success, removes from state (state auto-switches to #general if needed)
 */
export async function removeChannel(id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/channels/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    if (!response.ok) {
      const data = await response.json()
      dispatcherLogger.error(`Failed to remove channel: ${data.error}`)
      return false
    }
    removeChannelFromState(id)
    dispatcherLogger.info(`Removed channel: ${id}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to remove channel:', error)
    return false
  }
}

/**
 * Execute a slash command via the emulator
 */
export async function executeSlashCommand(
  command: string,
  text: string
): Promise<boolean> {
  dispatcherLogger.info(`Executing slash command: ${command} ${text}`)
  try {
    const payload = {
      command,
      text,
      channel: simulatorState.currentChannel,
      user: simulatorState.simulatedUserId,
      user_name: simulatorState.simulatedUserName,
    }
    dispatcherLogger.info(`Slash command payload: ${JSON.stringify(payload)}`)

    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/slash-command`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    dispatcherLogger.info(`Slash command response: ${JSON.stringify(result)}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to execute slash command:', error)
    return false
  }
}

/**
 * Submit a modal view
 */
export async function submitView(
  viewId: string,
  values: Record<string, Record<string, unknown>>
): Promise<boolean> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/view-submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view_id: viewId, values }),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    dispatcherLogger.info(`Submitted view: ${viewId}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to submit view:', error)
    return false
  }
}

/**
 * Close a modal view (user clicked close or X)
 */
export async function closeView(viewId: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/view-close`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view_id: viewId }),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    dispatcherLogger.info(`Closed view: ${viewId}`)
    closeModal() // Also close locally
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to close view:', error)
    closeModal() // Still close locally even if API fails
    return false
  }
}

/**
 * Send a block action (e.g., button click) from within a modal
 */
export async function sendBlockAction(
  viewId: string,
  actionId: string,
  value: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/block-action`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          view_id: viewId,
          action_id: actionId,
          value,
          user: simulatorState.simulatedUserId,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    dispatcherLogger.info(`Block action sent: ${actionId}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to send block action:', error)
    return false
  }
}

/**
 * Send a block action from within a message (e.g., button click in message blocks)
 * Unlike sendBlockAction (for modals), this sends message_ts + channel_id context
 */
export async function sendMessageBlockAction(
  messageTs: string,
  channelId: string,
  actionId: string,
  blockId: string,
  elementType: string,
  actionValue: {
    value?: string
    selected_option?: { text: { type: string; text: string }; value: string }
    selected_options?: Array<{
      text: { type: string; text: string }
      value: string
    }>
    selected_date?: string
    selected_time?: string
    selected_date_time?: number
  }
): Promise<boolean> {
  try {
    const response = await fetch(
      `${EMULATOR_API_URL}/api/simulator/block-action`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_ts: messageTs,
          channel_id: channelId,
          action_id: actionId,
          block_id: blockId,
          element_type: elementType,
          ...actionValue,
          user: simulatorState.simulatedUserId,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    dispatcherLogger.info(`Message block action sent: ${actionId}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to send message block action:', error)
    return false
  }
}

/**
 * Update file expanded state
 */
export async function updateFileExpanded(
  fileId: string,
  isExpanded: boolean
): Promise<void> {
  // Update local state immediately for responsiveness
  updateFileExpandedInState(fileId, isExpanded)

  try {
    await fetch(`${EMULATOR_API_URL}/api/simulator/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isExpanded }),
    })
  } catch (error) {
    dispatcherLogger.error('Failed to update file expanded state:', error)
  }
}

/**
 * Trigger a message shortcut (e.g., "Generate Image" from context menu)
 */
export async function triggerMessageShortcut(
  callbackId: string,
  message: {
    ts: string
    text: string
    file?: {
      mimetype: string
      url_private: string
    }
  }
): Promise<boolean> {
  dispatcherLogger.info(`Triggering shortcut: ${callbackId}`)
  try {
    const payload = {
      callback_id: callbackId,
      message: {
        ts: message.ts,
        text: message.text,
        files: message.file
          ? [
              {
                mimetype: message.file.mimetype,
                url_private: message.file.url_private,
              },
            ]
          : [],
      },
      channel: simulatorState.currentChannel,
      user: simulatorState.simulatedUserId,
      user_name: simulatorState.simulatedUserName,
    }
    dispatcherLogger.info(`Shortcut payload: ${JSON.stringify(payload)}`)

    const response = await fetch(`${EMULATOR_API_URL}/api/simulator/shortcut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    dispatcherLogger.info(`Shortcut response: ${JSON.stringify(result)}`)
    return true
  } catch (error) {
    dispatcherLogger.error('Failed to trigger shortcut:', error)
    return false
  }
}
