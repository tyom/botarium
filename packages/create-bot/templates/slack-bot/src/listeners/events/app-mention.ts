import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import type { AppMentionEvent } from '@slack/types'
{{#if isAi}}
import type { WebClient } from '@slack/web-api'
{{/if}}
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
  processMention({{#if isAi}}client, {{/if}}say, event, text, threadTs)
}

async function processMention(
{{#if isAi}}
  client: WebClient,
{{/if}}
  say: (msg: { text: string; thread_ts: string }) => Promise<unknown>,
  event: AppMentionEvent,
  text: string,
  threadTs: string
) {
{{#if isAi}}
  const messageTs = event.ts
  const channel = event.channel

{{/if}}
  try {
{{#if isAi}}
    // Add thinking reaction
    await client.reactions.add({
      channel,
      timestamp: messageTs,
      name: 'thinking_face',
    }).catch(err => slackLogger.error({ err }, 'Failed to add thinking reaction'))

{{/if}}
    const threadContext: ThreadContext = {
      channelId: event.channel,
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

{{#if isAi}}
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
{{/if}}
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
{{#if isAi}}
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
{{/if}}
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
