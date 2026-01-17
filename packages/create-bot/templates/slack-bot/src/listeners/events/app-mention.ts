import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt'
import type { AppMentionEvent } from '@slack/types'
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
  processMention(say, event, text, threadTs)
}

async function processMention(
  say: (msg: { text: string; thread_ts: string }) => Promise<unknown>,
  event: AppMentionEvent,
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
    for await (const chunk of responseHandler.generateResponse(text, threadContext)) {
      response += chunk
    }

    await say({ text: response, thread_ts: threadTs })
  } catch (error) {
    slackLogger.error({ error }, 'Error handling app_mention')
    await say({ text: 'Sorry, something went wrong!', thread_ts: threadTs })
  }
}
