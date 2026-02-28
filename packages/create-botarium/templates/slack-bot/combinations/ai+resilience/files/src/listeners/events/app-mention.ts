import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import {
  addThinkingReaction,
  completeReactions,
  removeThinkingOnError,
  type ReactionContext,
} from '../../utils/reactions'
import { responseHandler, type ThreadContext } from '../../response-handler'
import { botName, botId } from '../../runtime-config'
import { slackLogger } from '../../utils/logger'
import { withErrorBoundary, breakerRegistry } from '../../setup'

type AppMentionArgs = AllMiddlewareArgs &
  SlackEventMiddlewareArgs<'app_mention'>

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function appMention({ event, client, say }: AppMentionArgs) {
  slackLogger.info(
    { user: event.user, channel: event.channel },
    'Mention received'
  )

  // Strip bot mention from message text
  let text = event.text.replace(/<@[A-Z0-9]+(\|[^>]*)?>/g, '')
  if (botName) {
    text = text.replace(new RegExp(`@?${escapeRegExp(botName)}`, 'gi'), '')
  }
  if (botId) {
    text = text.replace(new RegExp(`@?${escapeRegExp(botId)}`, 'gi'), '')
  }
  text = text.trim()

  const threadTs = event.thread_ts || event.ts

  // If no text after mention, send greeting (fast response)
  if (!text) {
    await say({ text: 'Hi! How can I help you?', thread_ts: threadTs })
    return
  }

  // Process asynchronously to ack within 3 seconds
  withErrorBoundary(
    'slack-handler',
    () => processMention(client, say, event, text, threadTs),
    { registry: breakerRegistry }
  )
    .then((result) => {
      if (!result.success) {
        slackLogger.error(
          { error: result.error },
          'Error boundary caught failure in app_mention'
        )
      }
    })
    .catch((err: unknown) => {
      slackLogger.error({ err }, 'Unhandled error in processMention')
    })
}

async function processMention(
  client: AppMentionArgs['client'],
  say: (msg: { text: string; thread_ts: string }) => Promise<unknown>,
  event: AppMentionArgs['event'],
  text: string,
  threadTs: string
) {
  const reactionCtx: ReactionContext = {
    client,
    channel: event.channel,
    timestamp: event.ts,
  }

  try {
    // Add thinking reaction
    await addThinkingReaction(reactionCtx)

    const threadContext: ThreadContext = {
      channelId: event.channel,
      threadTs: threadTs,
      userId: event.user ?? '',
      teamId: '',
      history: [],
    }

    // Generate response
    let response = ''
    for await (const chunk of responseHandler.generateResponse(
      text,
      threadContext
    )) {
      response += chunk
    }

    // Guard against empty responses
    if (response.trim().length === 0) {
      response = "Sorry, I couldn't generate a response right now."
    }

    await say({ text: response, thread_ts: threadTs })

    // Remove thinking and add checkmark
    await completeReactions(reactionCtx)
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
    // Try to remove thinking reaction on error
    await removeThinkingOnError(reactionCtx)
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
