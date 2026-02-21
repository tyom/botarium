/**
 * Channel state operations
 * Channel CRUD, URL hash sync, navigation (switchChannel, openThread, closeThread)
 */

import type { Channel } from '../types'
import { simulatorState } from '../state.svelte'

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
  simulatorState.isDM = channelId.startsWith('D_')
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
    simulatorState.isDM = channelId.startsWith('D_')
    simulatorState.currentThreadTs = threadTs
  }
}

// @deprecated Use initFromHash instead
export function initChannelFromHash(): void {
  initFromHash()
}
