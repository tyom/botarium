import type { AssistantThreadStartedMiddleware } from '@slack/bolt'
import { responseHandler } from '../../response-handler'
import { slackLogger } from '../../utils/logger'

export const assistantThreadStarted: AssistantThreadStartedMiddleware = async ({
  event,
  say,
  setSuggestedPrompts,
  saveThreadContext,
}) => {
  const { context } = event.assistant_thread

  try {
    // Send initial greeting
    await say('Hi, how can I help?')

    // Save thread context for future messages
    await saveThreadContext()

    // Set suggested prompts from the response handler
    const prompts = responseHandler.suggestedPrompts
    if (prompts && prompts.length > 0) {
      // Provide channel-specific prompts if in a channel context
      if (context.channel_id) {
        await setSuggestedPrompts({
          title: 'Here are some things I can help with:',
          prompts: [
            {
              title: 'Summarize channel',
              message: 'Please summarize the recent activity in this channel.',
            },
            ...prompts,
          ],
        })
      } else {
        await setSuggestedPrompts({
          title: 'Try these prompts:',
          prompts,
        })
      }
    }
  } catch (error) {
    slackLogger.error({ error }, 'Error in threadStarted handler')
  }
}
