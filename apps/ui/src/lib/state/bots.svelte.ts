/**
 * Bot state operations
 * Connected bots, app config, slash commands, modal state
 */

import type {
  SlashCommand,
  SlackView,
  SlackAppConfig,
  ConnectedBotInfo,
} from '../types'
import { BOT_USER_ID } from '../types'
import { simulatorState } from '../state.svelte'

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
    simulatorState.connectedBots.set(botId, {
      ...bot,
      status: 'disconnected',
    })
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
