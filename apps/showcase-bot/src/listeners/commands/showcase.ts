import type { App } from '@slack/bolt'
import { showcaseMessages } from '../../messages/showcase-messages'
import { slackLogger } from '../../utils/logger'

const SHOWCASE_CHANNEL = 'C_SHOWCASE'

export function register(app: App) {
  app.command('/showcase', async ({ command, ack, client }) => {
    await ack()

    const arg = command.text.trim().toLowerCase()

    // Handle /showcase clear -- clear channel then re-populate
    if (arg === 'clear') {
      try {
        const history = await client.conversations.history({
          channel: SHOWCASE_CHANNEL,
          limit: 200,
        })
        if (history.messages) {
          for (const msg of history.messages) {
            if (msg.ts) {
              await client.chat.delete({
                channel: SHOWCASE_CHANNEL,
                ts: msg.ts,
              })
            }
          }
        }
        slackLogger.info('Cleared showcase channel')
      } catch (err) {
        slackLogger.warn({ err }, 'Failed to clear showcase channel')
      }
    }

    // Handle /showcase modal -- placeholder for Plan 03
    if (arg === 'modal') {
      // Placeholder -- Plan 03 will add modal opening here
      return
    }

    // Send all showcase messages to #showcase channel
    for (const message of showcaseMessages) {
      try {
        await client.chat.postMessage({
          channel: SHOWCASE_CHANNEL,
          text: message.fallbackText,
          blocks: message.blocks,
        })
      } catch (err) {
        slackLogger.error(
          { err, fallbackText: message.fallbackText },
          'Failed to send showcase message'
        )
      }
    }

    slackLogger.info(
      { messageCount: showcaseMessages.length },
      'Sent showcase messages'
    )
  })
}
