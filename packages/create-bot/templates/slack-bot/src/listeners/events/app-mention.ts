import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import type { AppMentionEvent } from '@slack/types'
import type { WebClient } from '@slack/web-api'
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackConfig } from '../../config/loader'
import { slackLogger } from '../../utils/logger'

type AppMentionArgs = AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>

export async function appMention({ event, client, say }: AppMentionArgs) {
  slackLogger.info(
    { user: event.user, channel: event.channel },
    'Mention received'
  )

  // Strip bot mention from message text
  const text = event.text
    .replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
    .replace(new RegExp(`@?${slackConfig.app.name}`, 'gi'), '')
    .replace(new RegExp(`@?${slackConfig.app.id ?? ''}`, 'gi'), '')
    .trim()

  const threadTs = event.thread_ts || event.ts

  // If no text after mention, send greeting (fast response)
  if (!text) {
    await say({ text: 'Hi! How can I help you?', thread_ts: threadTs })
    return
  }

  // Process asynchronously to ack within 3 seconds
  processMention(client, say, event, text, threadTs)
}

async function processMention(
  client: WebClient,
  say: (msg: { text: string; thread_ts: string }) => Promise<unknown>,
  event: AppMentionEvent,
  text: string,
  threadTs: string
) {
  const messageTs = event.ts
  const channel = event.channel

  try {
    // Add thinking reaction
    await client.reactions.add({
      channel,
      timestamp: messageTs,
      name: 'thinking_face',
    }).catch(err => slackLogger.error({ err }, 'Failed to add thinking reaction'))

    const threadContext: ThreadContext = {
      channelId: channel,
      threadTs: threadTs,
      userId: event.user ?? '',
      teamId: '',
      history: [],
    }

    // Generate response
    let response = ''
    for await (const chunk of responseHandler.generateResponse(text, threadContext)) {
      response += chunk
    }

    await say({ text: response, thread_ts: threadTs })

    // Remove thinking and add checkmark
    await client.reactions.remove({
      channel,
      timestamp: messageTs,
      name: 'thinking_face',
    }).catch(err => slackLogger.error({ err }, 'Failed to remove thinking reaction'))
    await client.reactions.add({
      channel,
      timestamp: messageTs,
      name: 'white_check_mark',
    }).catch(err => slackLogger.error({ err }, 'Failed to add checkmark reaction'))
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
    // Try to remove thinking reaction on error
    try {
      await client.reactions.remove({
        channel,
        timestamp: messageTs,
        name: 'thinking_face',
      })
    } catch {
      // Ignore reaction removal errors
    }
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
