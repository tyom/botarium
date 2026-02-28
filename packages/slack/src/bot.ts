import { App, LogLevel } from '@slack/bolt'
import { createConfigServer } from '@botarium/config'
import {
  createBotariumLogger,
  type BotariumLoggerOptions,
} from 'botarium/logging'
import {
  waitForWebSocketConnection,
  registerWithSimulator,
  setupWebSocketLogging,
} from './simulator'
import type { SlackBotOptions, SlackBot } from './types'

export async function createSlackBot(
  options: SlackBotOptions
): Promise<SlackBot> {
  const {
    config,
    listeners,
    simulatorSettingsKeys,
    onSettingsUpdate,
    getHealthResponse,
  } = options

  const isSimulatorMode = Boolean(process.env.SLACK_API_URL)
  const logLevel =
    (process.env.LOG_LEVEL as BotariumLoggerOptions['level']) ?? 'info'

  // Create loggers
  const logger = createBotariumLogger({
    level: logLevel,
    forwardUrl: isSimulatorMode ? process.env.SLACK_API_URL : undefined,
  })
  const appLogger = logger.child({ module: 'App' })
  const slackLogger = logger.child({ module: 'Slack' })

  appLogger.info({ simulatorMode: isSimulatorMode }, 'Starting bot...')

  // Start config server (simulator only)
  let configServer: ReturnType<typeof createConfigServer> = null
  let configServerPort: number | undefined

  if (isSimulatorMode) {
    configServer = createConfigServer({
      config,
      getHealthResponse,
      logger: appLogger,
    })
    if (configServer) {
      configServerPort = configServer.port
    }
  }

  // Simulator tokens (unique per bot for multi-bot support)
  const simulatorBotToken = `xoxb-${config.simulator.id}`
  const simulatorAppToken = `xapp-${config.simulator.id}`

  // Create Bolt App
  const boltLogLevel = logLevel === 'debug' ? LogLevel.DEBUG : LogLevel.INFO

  let app: App
  if (isSimulatorMode) {
    slackLogger.info(
      { apiUrl: process.env.SLACK_API_URL },
      'Connecting to simulator'
    )
    app = new App({
      token: simulatorBotToken,
      appToken: simulatorAppToken,
      socketMode: true,
      logLevel: boltLogLevel,
      clientOptions: {
        slackApiUrl: process.env.SLACK_API_URL,
      },
    })
  } else {
    app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      logLevel: boltLogLevel,
    })
  }

  // Register listeners
  listeners(app)

  // Build registration config from YAML config
  const botName = (config.settings.bot_name?.value as string) ?? 'Bot'
  const slackConfig = {
    app: { name: botName, id: config.simulator.id },
    ...config.slack,
  }

  // Registration helper (closure over needed state)
  const register = async () => {
    if (!configServerPort) {
      slackLogger.warn(
        'Config server not started; skipping simulator registration'
      )
      return
    }
    await registerWithSimulator({
      apiUrl: process.env.SLACK_API_URL!,
      configServerPort,
      slackConfig,
      logger: slackLogger,
      settingsKeys: simulatorSettingsKeys,
      onSettingsApplied: onSettingsUpdate,
    })
  }

  // Setup WS logging + reconnection (simulator only)
  if (isSimulatorMode) {
    setupWebSocketLogging({
      app,
      logger: slackLogger,
      onReconnect: async () => {
        const apiUrl = process.env.SLACK_API_URL
        if (apiUrl) {
          const connected = await waitForWebSocketConnection(apiUrl, 5000)
          if (!connected) {
            slackLogger.warn(
              'WebSocket not tracked after reconnection, attempting registration anyway'
            )
          }
          await register()
        }
      },
    })
  }

  // Start app
  await app.start()
  slackLogger.info('Slack app started')

  // Register with simulator after verifying WebSocket is tracked
  if (isSimulatorMode) {
    const apiUrl = process.env.SLACK_API_URL
    if (apiUrl) {
      slackLogger.info('Waiting for WebSocket connection to be tracked...')
      const connected = await waitForWebSocketConnection(apiUrl, 5000)

      if (!connected) {
        slackLogger.warn(
          'WebSocket not detected after 5s, attempting registration anyway'
        )
      }

      await register()
    }
  }

  // Graceful shutdown
  const stop = async () => {
    appLogger.info('Shutting down...')
    await app.stop()
    if (configServer) {
      configServer.stop()
    }
  }

  process.on('SIGTERM', async () => {
    await stop()
    process.exit(0)
  })
  process.on('SIGINT', async () => {
    await stop()
    process.exit(0)
  })

  appLogger.info(`${botName} is running!`)

  return { app, isSimulatorMode, stop }
}
