import type { AssistantThreadContextChangedMiddleware } from '@slack/bolt'
import { slackLogger } from '../../utils/logger'

export const assistantContextChanged: AssistantThreadContextChangedMiddleware =
  async ({ saveThreadContext }) => {
    try {
      // Save the new context when user switches channels
      await saveThreadContext()
    } catch (error) {
      slackLogger.error({ error }, 'Error in contextChanged handler')
    }
  }
