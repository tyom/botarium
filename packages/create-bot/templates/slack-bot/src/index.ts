import { createSlackApp } from './slack/app'
import { registerHandlers } from './slack/handlers'
import { settings } from './settings'
import { appLogger } from './utils/logger'

async function main() {
  appLogger.info('Starting {{botName}} Assistant...')

  const app = createSlackApp()
  await registerHandlers(app)
  await app.start()

  // Graceful shutdown handler
  const shutdown = async () => {
    appLogger.info('Shutting down...')
    await app.stop()
    appLogger.info('Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  appLogger.info(
    { provider: settings.AI_PROVIDER },
    `${settings.BOT_NAME} is running!`
  )
}

main().catch((error) => {
  appLogger.fatal({ err: error }, 'Fatal error')
  process.exit(1)
})
