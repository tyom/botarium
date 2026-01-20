import type { App } from '@slack/bolt'
import type { GenericMessageEvent } from '@slack/types'
{{#if isAi}}
import type { WebClient } from '@slack/web-api'
import {
  shouldShowReactions,
  addThinkingReaction,
  completeReactions,
  removeThinkingOnError,
  type ReactionContext,
} from '../../utils/reactions'
{{/if}}
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackLogger } from '../../utils/logger'
{{#if isAi}}
import { getUserFriendlyErrorMessage } from '../../ai/error'
{{/if}}


export function register(app: App) {
  // Handle direct messages
  app.event('message', async ({ event, client, say }) => {
    // Filter to only handle DMs with text
    if (!('channel_type' in event) || !('user' in event) || !('text' in event)) {
      return
    }

    const messageEvent = event as GenericMessageEvent

    // Only handle DMs (im = instant message)
    if (messageEvent.channel_type !== 'im') {
      return
    }

    // Skip bot messages and message subtypes (edits, deletes, etc.)
    if (messageEvent.subtype || messageEvent.bot_id) {
      return
    }

    const text = messageEvent.text?.trim()
    if (!text) return

    // Only use thread_ts if user is replying in an existing thread
    const isThreadReply = Boolean(messageEvent.thread_ts)
    const threadTs = messageEvent.thread_ts || messageEvent.ts

    slackLogger.info({ user: messageEvent.user, channel: messageEvent.channel }, 'DM received')

    // Process asynchronously to ack within 3 seconds
    processMessage({{#if isAi}}client, {{/if}}say, text, messageEvent, isThreadReply, threadTs)
      .catch(err => slackLogger.error({ err }, 'Unhandled error in processMessage'))
  })
}

async function processMessage(
{{#if isAi}}
  client: WebClient,
{{/if}}
  say: (msg: string | { text: string; thread_ts?: string }) => Promise<unknown>,
  text: string,
  messageEvent: GenericMessageEvent,
  isThreadReply: boolean,
  threadTs: string
) {
{{#if isAi}}
  const useReactions = shouldShowReactions(text)
  const reactionCtx: ReactionContext | undefined = useReactions
    ? { client, channel: messageEvent.channel, timestamp: messageEvent.ts }
    : undefined

{{/if}}
  try {
{{#if isAi}}
    // Add thinking reaction for AI responses
    if (reactionCtx) {
      await addThinkingReaction(reactionCtx)
    }

{{/if}}
    const threadContext: ThreadContext = {
      channelId: messageEvent.channel,
      threadTs: threadTs,
      userId: messageEvent.user ?? '',
      teamId: messageEvent.team ?? '',
      history: [],
    }

    // Generate response
    let response = ''
    for await (const chunk of responseHandler.generateResponse(text, threadContext)) {
      response += chunk
    }

    // Ensure we have a response to send
    if (!response.trim()) {
      response = "I couldn't generate a response. Please try again."
    }

    // In DMs: reply inline unless user is in a thread
    if (isThreadReply) {
      await say({ text: response, thread_ts: threadTs })
    } else {
      await say({ text: response })
    }

{{#if isAi}}
    // Remove thinking and add checkmark for AI responses
    if (reactionCtx) {
      await completeReactions(reactionCtx)
    }
{{/if}}
  } catch (error) {
    // Log the full error for debugging
    slackLogger.error({ error }, 'Error handling DM')

{{#if isAi}}
    // Try to remove thinking reaction on error
    if (reactionCtx) {
      await removeThinkingOnError(reactionCtx)
    }

{{/if}}
    // Provide helpful error message based on error type
{{#if isAi}}
    const errorMessage = getUserFriendlyErrorMessage(error)
{{else}}
    const errorMessage = 'Sorry, something went wrong!'
{{/if}}

    if (isThreadReply) {
      await say({ text: errorMessage, thread_ts: threadTs })
    } else {
      await say({ text: errorMessage })
    }
  }
}
