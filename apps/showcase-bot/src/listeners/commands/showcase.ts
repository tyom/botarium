import type { App } from '@slack/bolt'
import { slackLogger } from '../../utils/logger'

const SHOWCASE_CHANNEL = 'C_SHOWCASE'

export function register(app: App) {
  app.command('/showcase', async ({ command, ack, client }) => {
    await ack()
    slackLogger.info('Received /showcase command')
  })
}
