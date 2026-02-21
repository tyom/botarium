/**
 * Message state operations
 * CRUD, reactions, file expand, restoration, thread drafts
 */

import { SvelteMap } from 'svelte/reactivity'
import type { SimulatorMessage } from '../types'
import { simulatorState } from '../state.svelte'

// Monotonically increasing message counter for unique timestamps
let messageCounter = 0

export function createTimestamp(): string {
  messageCounter++
  return `${Math.floor(Date.now() / 1000)}.${String(messageCounter).padStart(6, '0')}`
}

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
