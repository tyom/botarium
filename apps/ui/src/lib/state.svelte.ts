/**
 * Simulator state management using Svelte 5 runes
 */

import { SvelteMap } from 'svelte/reactivity'
import type {
  SimulatorMessage,
  SlashCommand,
  SlackView,
  SlackAppConfig,
  ConnectedBotInfo,
  Channel,
} from './types'
import { BOT_USER_ID, BOT_NAME, PRESET_CHANNELS } from './types'
import {
  INTERNAL_SIMULATED_USER_ID,
  DEFAULT_SIMULATED_USER_NAME,
} from './settings-store'

// Monotonically increasing message counter for unique timestamps
let messageCounter = 0

export function createTimestamp(): string {
  messageCounter++
  return `${Math.floor(Date.now() / 1000)}.${String(messageCounter).padStart(6, '0')}`
}

// Modal state interface
export interface ModalState {
  viewId: string
  view: SlackView
}

// Shared reactive state object using $state
export const simulatorState = $state({
  currentChannel: 'C_GENERAL',
  currentThreadTs: null as string | null,
  isDM: false,
  isTyping: false,

  // Channel list (loaded from API, includes preset + user-created)
  channels: [...PRESET_CHANNELS] as Channel[],
  channelsLoaded: false,

  // Messages indexed by channel, then by ts
  messages: new SvelteMap<string, SvelteMap<string, SimulatorMessage>>(),
  // Whether messages have been loaded from the database
  messagesLoaded: false,

  // Thread drafts indexed by threadTs
  threadDrafts: new SvelteMap<string, string>(),

  // Bot and user info
  botUserId: BOT_USER_ID,
  botName: BOT_NAME,
  simulatedUserId: INTERNAL_SIMULATED_USER_ID, // Internal ID, never changes
  simulatedUserName: DEFAULT_SIMULATED_USER_NAME,

  // Slash commands (registered by bot)
  availableCommands: [] as SlashCommand[],

  // App config (registered by bot)
  appConfig: null as SlackAppConfig | null,

  // Connected bots (multi-bot support) - keyed by bot ID
  connectedBots: new SvelteMap<string, ConnectedBotInfo>(),

  // Modal state
  activeModal: null as ModalState | null,
})

// Action: Add a message to state
export function addMessage(
  message: Omit<SimulatorMessage, 'reactions'>
): SimulatorMessage {
  const fullMessage: SimulatorMessage = {
    ...message,
    reactions: new SvelteMap(),
  }

  const channel = message.channel
  if (!simulatorState.messages.has(channel)) {
    simulatorState.messages.set(channel, new SvelteMap())
  }
  simulatorState.messages.get(channel)!.set(message.ts, fullMessage)

  return fullMessage
}

// Action: Update an existing message (e.g., chat.update with new blocks/text)
export function updateMessage(
  channel: string,
  ts: string,
  updates: Partial<Pick<SimulatorMessage, 'text' | 'blocks'>>
): void {
  const channelMsgs = simulatorState.messages.get(channel)
  const msg = channelMsgs?.get(ts)
  if (msg && channelMsgs) {
    // Create new object reference to trigger Svelte reactivity (same pattern as addReactionToMessage)
    const defined = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    channelMsgs.set(ts, { ...msg, ...defined })
  }
}

// Action: Add reaction to a message
export function addReactionToMessage(
  channel: string,
  ts: string,
  reaction: string
): void {
  const channelMsgs = simulatorState.messages.get(channel)
  const msg = channelMsgs?.get(ts)
  if (msg && channelMsgs) {
    // Create new message object with new SvelteMap to trigger Svelte reactivity
    const newReactions = new SvelteMap(msg.reactions)
    newReactions.set(reaction, (newReactions.get(reaction) ?? 0) + 1)
    const newMsg = { ...msg, reactions: newReactions }
    channelMsgs.set(ts, newMsg)
  }
}

// Action: Remove reaction from a message
export function removeReactionFromMessage(
  channel: string,
  ts: string,
  reaction: string
): void {
  const channelMsgs = simulatorState.messages.get(channel)
  const msg = channelMsgs?.get(ts)
  if (msg && channelMsgs) {
    // Create new message object with new SvelteMap to trigger Svelte reactivity
    const newReactions = new SvelteMap(msg.reactions)
    const currentCount = newReactions.get(reaction) ?? 0
    if (currentCount <= 1) {
      newReactions.delete(reaction)
    } else {
      newReactions.set(reaction, currentCount - 1)
    }
    const newMsg = { ...msg, reactions: newReactions }
    channelMsgs.set(ts, newMsg)
  }
}

// Get all messages for a channel (sorted by timestamp)
export function getChannelMessages(channel: string): SimulatorMessage[] {
  const channelMsgs = simulatorState.messages.get(channel)
  if (!channelMsgs) return []
  return Array.from(channelMsgs.values()).sort((a, b) =>
    a.ts.localeCompare(b.ts)
  )
}

// Get thread messages
export function getThreadMessages(
  channel: string,
  threadTs: string
): SimulatorMessage[] {
  return getChannelMessages(channel).filter(
    (m) => m.thread_ts === threadTs || m.ts === threadTs
  )
}

// Get reply count for a parent message
export function getReplyCount(channel: string, parentTs: string): number {
  return getChannelMessages(channel).filter(
    (m) => m.thread_ts === parentTs && m.ts !== parentTs
  ).length
}

// Get only parent messages (not thread replies)
export function getParentMessages(channel: string): SimulatorMessage[] {
  return getChannelMessages(channel).filter(
    (m) => !m.thread_ts || m.thread_ts === m.ts
  )
}

// Get current channel messages (derived getter)
export function getCurrentMessages(): SimulatorMessage[] {
  return getChannelMessages(simulatorState.currentChannel)
}

// Get channel display name
export function getChannelDisplayName(): string {
  if (simulatorState.isDM) {
    // Extract bot ID from channel ID "D_{botId}"
    const botId = simulatorState.currentChannel.slice(2)
    const bot = simulatorState.connectedBots.get(botId)
    return bot?.name ?? simulatorState.botName
  }
  // Look up channel name from dynamic channels list
  const channel = simulatorState.channels.find(
    (c) => c.id === simulatorState.currentChannel
  )
  if (channel) return '#' + channel.name
  return '#' + simulatorState.currentChannel.replace(/^C_/, '').toLowerCase()
}

// =============================================================================
// Channel State Management
// =============================================================================

// Set channels (called after loading from API)
export function setChannels(channels: Channel[]): void {
  simulatorState.channels = channels
  simulatorState.channelsLoaded = true
}

// Add a channel to state
export function addChannelToState(channel: Channel): void {
  simulatorState.channels = [...simulatorState.channels, channel]
}

// Remove a channel from state, switching to #general if the deleted channel was active
export function removeChannelFromState(channelId: string): void {
  simulatorState.channels = simulatorState.channels.filter(
    (c) => c.id !== channelId
  )
  if (simulatorState.currentChannel === channelId) {
    switchChannel('C_GENERAL')
  }
}

// Build URL hash from current state
function buildHash(channelId: string, threadTs: string | null): string {
  if (threadTs) {
    return `${channelId}/thread/${threadTs}`
  }
  return channelId
}

// Parse URL hash into channel and thread
export function parseHash(hash: string): {
  channelId: string | null
  threadTs: string | null
} {
  const parts = hash.split('/thread/')
  const channelId = parts[0]
  const threadTs = parts[1] || null

  if (!channelId) {
    return { channelId: null, threadTs: null }
  }

  // DM channels are valid if they match the pattern D_{botId}
  // (actual bot existence is validated at runtime when navigating)
  if (channelId.startsWith('D_')) {
    return { channelId, threadTs }
  }

  // Regular channels must exist in channels list
  // If channels aren't loaded yet, accept any C_ channel ID (validated once channels load)
  if (simulatorState.channelsLoaded) {
    if (!simulatorState.channels.some((c) => c.id === channelId)) {
      return { channelId: null, threadTs: null }
    }
  } else if (!channelId.startsWith('C_')) {
    return { channelId: null, threadTs: null }
  }

  return { channelId, threadTs }
}

// Sync current state to URL hash
function syncToHash(): void {
  if (typeof window === 'undefined') return
  window.location.hash = buildHash(
    simulatorState.currentChannel,
    simulatorState.currentThreadTs
  )
}

// Switch to a channel (closes any open thread)
export function switchChannel(channelId: string): void {
  simulatorState.currentChannel = channelId
  simulatorState.isDM = channelId.startsWith('D')
  simulatorState.currentThreadTs = null
  syncToHash()
}

// Open a thread
export function openThread(threadTs: string): void {
  simulatorState.currentThreadTs = threadTs
  syncToHash()
}

// Close the current thread
export function closeThread(): void {
  simulatorState.currentThreadTs = null
  syncToHash()
}

// Initialize state from URL hash
export function initFromHash(): void {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.slice(1)
  const { channelId, threadTs } = parseHash(hash)

  if (channelId) {
    simulatorState.currentChannel = channelId
    simulatorState.isDM = channelId.startsWith('D')
    simulatorState.currentThreadTs = threadTs
  }
}

// @deprecated Use initFromHash instead
export function initChannelFromHash(): void {
  initFromHash()
}

// Restore messages from database records
export function restoreMessages(
  messages: Array<{
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
  }>
): void {
  // Clear existing messages
  simulatorState.messages = new SvelteMap()

  // Restore messages from database
  for (const msg of messages) {
    const channel = msg.channel
    if (!simulatorState.messages.has(channel)) {
      simulatorState.messages.set(channel, new SvelteMap())
    }

    const fullMessage: SimulatorMessage = {
      ts: msg.ts,
      user: msg.user,
      text: msg.text,
      subtype: msg.subtype,
      thread_ts: msg.threadTs,
      channel,
      reactions: new SvelteMap(
        msg.reactions?.map((r) => [r.name, r.count]) ?? []
      ),
      blocks: msg.blocks as SimulatorMessage['blocks'],
      file: msg.file
        ? {
            id: msg.file.id,
            name: msg.file.name,
            title: msg.file.title || msg.file.name,
            mimetype: msg.file.mimetype,
            url_private: msg.file.url_private,
            thumb_360: msg.file.thumb_360,
            thumb_480: msg.file.thumb_480,
            isExpanded: msg.file.isExpanded,
          }
        : undefined,
    }

    simulatorState.messages.get(channel)!.set(msg.ts, fullMessage)

    // Update message counter to avoid timestamp collisions
    const tsParts = msg.ts.split('.')
    const counterPart = tsParts[1]
    if (counterPart) {
      const counter = parseInt(counterPart, 10)
      if (!isNaN(counter) && counter >= messageCounter) {
        messageCounter = counter + 1
      }
    }
  }
}

// Clear all messages from state
export function clearMessages(): void {
  simulatorState.messages = new SvelteMap()
}

// Delete a single message from state
export function deleteMessageFromState(channel: string, ts: string): boolean {
  const channelMsgs = simulatorState.messages.get(channel)
  if (!channelMsgs || !channelMsgs.has(ts)) return false

  channelMsgs.delete(ts)
  return true
}

// Clear all messages for a specific channel from state
export function clearChannelMessagesFromState(channel: string): void {
  simulatorState.messages.delete(channel)
}

// Update file expanded state in local state
export function updateFileExpandedInState(
  fileId: string,
  isExpanded: boolean
): void {
  for (const channelMessages of simulatorState.messages.values()) {
    for (const message of channelMessages.values()) {
      if (message.file?.id === fileId) {
        // Use .set() to trigger SvelteMap reactivity
        channelMessages.set(message.ts, {
          ...message,
          file: { ...message.file, isExpanded },
        })
        return
      }
    }
  }
}

// Get thread draft
export function getThreadDraft(threadTs: string): string {
  return simulatorState.threadDrafts.get(threadTs) || ''
}

// Set thread draft
export function setThreadDraft(threadTs: string, text: string): void {
  if (text.trim()) {
    simulatorState.threadDrafts.set(threadTs, text)
  } else {
    simulatorState.threadDrafts.delete(threadTs)
  }
}

// Check if thread has draft
export function hasThreadDraft(threadTs: string): boolean {
  const draft = simulatorState.threadDrafts.get(threadTs)
  return !!draft && draft.trim().length > 0
}

// =============================================================================
// Slash Command State
// =============================================================================

// Set available commands (called after loading from emulator)
export function setAvailableCommands(commands: SlashCommand[]): void {
  simulatorState.availableCommands = commands
}

// Get filtered commands based on input
export function getFilteredCommands(filter: string): SlashCommand[] {
  const lowerFilter = filter.toLowerCase()
  return simulatorState.availableCommands.filter(
    (cmd) =>
      cmd.command.toLowerCase().includes(lowerFilter) ||
      cmd.description.toLowerCase().includes(lowerFilter)
  )
}

// =============================================================================
// App Config State
// =============================================================================

// Set app config (called after loading from emulator)
export function setAppConfig(config: SlackAppConfig | null): void {
  simulatorState.appConfig = config
  // Update bot name from config if available
  if (config?.app.name) {
    simulatorState.botName = config.app.name
  }
}

// Get shortcut by callback_id
export function getShortcut(
  callbackId: string
): SlackAppConfig['shortcuts'][number] | undefined {
  return simulatorState.appConfig?.shortcuts.find(
    (s) => s.callback_id === callbackId
  )
}

// Get first message shortcut (for context menu)
export function getMessageShortcut():
  | SlackAppConfig['shortcuts'][number]
  | undefined {
  return simulatorState.appConfig?.shortcuts.find((s) => s.type === 'message')
}

// =============================================================================
// Modal State
// =============================================================================

// Show a modal
export function showModal(viewId: string, view: SlackView): void {
  simulatorState.activeModal = { viewId, view }
}

// Update an existing modal
export function updateModal(viewId: string, view: SlackView): void {
  if (simulatorState.activeModal?.viewId === viewId) {
    simulatorState.activeModal = { viewId, view }
  }
}

// Close the active modal
export function closeModal(): void {
  simulatorState.activeModal = null
}

// =============================================================================
// Connected Bots State
// =============================================================================

// Set all connected bots (called after loading from emulator)
export function setConnectedBots(bots: ConnectedBotInfo[]): void {
  simulatorState.connectedBots.clear()
  for (const bot of bots) {
    simulatorState.connectedBots.set(bot.id, bot)
  }

  // Update bot name from the first bot (prefer connected, then any)
  const connectedBot = bots.find((b) => b.status === 'connected')
  const firstBot = connectedBot ?? bots[0]
  if (firstBot) {
    simulatorState.botName = firstBot.name
  }
}

// Add or update a connected bot
export function addConnectedBot(bot: ConnectedBotInfo): void {
  simulatorState.connectedBots.set(bot.id, bot)

  // Update bot name if this is the first/only bot
  if (simulatorState.connectedBots.size === 1) {
    simulatorState.botName = bot.name
  }
}

// Mark a bot as disconnected (keeps it in list for browsing history)
export function markBotDisconnected(botId: string): void {
  const bot = simulatorState.connectedBots.get(botId)
  if (bot) {
    simulatorState.connectedBots.set(botId, { ...bot, status: 'disconnected' })
  }
}

// Check if a user ID belongs to a bot
// Bot user IDs follow the format U_{botId} (e.g., U_simple, U_my-bot)
export function isBotUserId(userId: string): boolean {
  // Legacy format check
  if (userId === BOT_USER_ID) return true

  // New multi-bot format: U_{botId}
  if (userId.startsWith('U_')) {
    const botId = userId.slice(2)
    // Check if this botId exists in connected bots
    if (simulatorState.connectedBots.has(botId)) return true
    // Also check if it's a valid DM channel bot (for messages from disconnected bots)
    // DM channels follow D_{botId} pattern, so any U_{something} could be a bot
    return true // For display purposes, treat any U_ prefix as a bot
  }

  return false
}

// Get bot info by user ID
// Returns the bot info if the user ID belongs to a registered bot
export function getBotByUserId(userId: string): ConnectedBotInfo | undefined {
  if (userId === BOT_USER_ID) {
    // Legacy: return first connected bot or undefined
    return Array.from(simulatorState.connectedBots.values())[0]
  }

  if (userId.startsWith('U_')) {
    const botId = userId.slice(2)
    return simulatorState.connectedBots.get(botId)
  }

  return undefined
}
