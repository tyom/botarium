import type { App } from '@slack/bolt'
import type { GenericMessageEvent } from '@slack/types'
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackLogger } from '../../utils/logger'

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
    processMessage(say, text, messageEvent, isThreadReply, threadTs)
  })
}

async function processMessage(
  say: (msg: string | { text: string; thread_ts?: string }) => Promise<unknown>,
  text: string,
  messageEvent: GenericMessageEvent,
  isThreadReply: boolean,
  threadTs: string
) {
  try {
    const threadContext: ThreadContext = {
      channelId: messageEvent.channel,
      threadTs: threadTs,
      userId: messageEvent.user ?? '',
      teamId: '',
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
  } catch (error) {
    // Log the full error for debugging
    slackLogger.error({ error }, 'Error handling DM')
    
    // Provide helpful error message based on error type
    let errorMessage = 'Sorry, something went wrong!'
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'AI service authentication failed. Please check your API key in Settings.'
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'AI service rate limit reached. Please try again in a moment.'
      }
    }
    
    await say({ text: errorMessage })
  }
}
