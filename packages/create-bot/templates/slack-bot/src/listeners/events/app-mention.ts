import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import type { AppMentionEvent } from '@slack/types'
{{#if isAi}}
import type { WebClient } from '@slack/web-api'
import {
  addThinkingReaction,
  completeReactions,
  removeThinkingOnError,
  type ReactionContext,
} from '../../utils/reactions'
{{/if}}
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackConfig } from '../../config/loader'
import { slackLogger } from '../../utils/logger'

type AppMentionArgs = AllMiddlewareArgs & SlackEventMiddlewareArgs<'app_mention'>

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function appMention({ event, client, say }: AppMentionArgs) {
  slackLogger.info(
    { user: event.user, channel: event.channel },
    'Mention received'
  )

  // Strip bot mention from message text
  const text = event.text
    .replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
    .replace(new RegExp(`@?${escapeRegExp(slackConfig.app.name)}`, 'gi'), '')
    .replace(new RegExp(`@?${escapeRegExp(slackConfig.app.id ?? '')}`, 'gi'), '')
    .trim()

  const threadTs = event.thread_ts || event.ts

  // If no text after mention, send greeting (fast response)
  if (!text) {
    await say({ text: 'Hi! How can I help you?', thread_ts: threadTs })
    return
  }

  // Process asynchronously to ack within 3 seconds
  processMention({{#if isAi}}client, {{/if}}say, event, text, threadTs).catch(err => {
    slackLogger.error({ err }, 'Unhandled error in processMention')
  })
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
  const reactionCtx: ReactionContext = {
    client,
    channel: event.channel,
    timestamp: event.ts,
  }

{{/if}}
  try {
{{#if isAi}}
    // Add thinking reaction
    await addThinkingReaction(reactionCtx)

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
    await completeReactions(reactionCtx)
{{/if}}
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
{{#if isAi}}
    // Try to remove thinking reaction on error
    await removeThinkingOnError(reactionCtx)
{{/if}}
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
