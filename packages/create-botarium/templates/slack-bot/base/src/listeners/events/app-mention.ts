import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import { responseHandler, type ThreadContext } from '../../response-handler'
import { botName, botId } from '../../runtime-config'
import { slackLogger } from '../../utils/logger'

type AppMentionArgs = AllMiddlewareArgs &
  SlackEventMiddlewareArgs<'app_mention'>

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function appMention({ event, say }: AppMentionArgs) {
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
  processMention(say, event, text, threadTs).catch((err) => {
    slackLogger.error({ err }, 'Unhandled error in processMention')
  })
}

async function processMention(
  say: (msg: { text: string; thread_ts: string }) => Promise<unknown>,
  event: AppMentionArgs['event'],
  text: string,
  threadTs: string
) {
  try {
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
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
