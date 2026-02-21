/**
 * Simulator state management using Svelte 5 runes
 *
 * This barrel file defines the shared reactive state object and re-exports
 * all domain operations from ./state/ modules.
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

// Re-export all domain operations
export {
  createTimestamp,
  addMessage,
  updateMessage,
  addReactionToMessage,
  removeReactionFromMessage,
  getChannelMessages,
  getThreadMessages,
  getReplyCount,
  getParentMessages,
  getCurrentMessages,
  restoreMessages,
  clearMessages,
  deleteMessageFromState,
  clearChannelMessagesFromState,
  updateFileExpandedInState,
  getThreadDraft,
  setThreadDraft,
  hasThreadDraft,
} from './state/messages.svelte'

export {
  getChannelDisplayName,
  setChannels,
  addChannelToState,
  removeChannelFromState,
  parseHash,
  switchChannel,
  openThread,
  closeThread,
  initFromHash,
  initChannelFromHash,
} from './state/channels.svelte'

export {
  setAvailableCommands,
  getFilteredCommands,
  setAppConfig,
  getShortcut,
  getMessageShortcut,
  showModal,
  updateModal,
  closeModal,
  setConnectedBots,
  addConnectedBot,
  markBotDisconnected,
  isBotUserId,
  getBotByUserId,
} from './state/bots.svelte'
