import { App, LogLevel } from '@slack/bolt'
import { registerListeners } from './listeners/index'
import { sendShowcaseMessages, HELP_TEXT } from './listeners/commands/showcase'
import { settings, isSimulatorMode } from './settings'
import { startConfigServer } from './config/http-server'
import { slackConfig, config } from './config/loader'
import { appLogger, slackLogger } from './utils/logger'

// Simulator tokens for local mode - unique per bot to enable multi-bot support
const SIMULATOR_BOT_TOKEN = `xoxb-${config.simulator.id}`
const SIMULATOR_APP_TOKEN = `xapp-${config.simulator.id}`

// Track connection state for reconnection handling
let hasConnectedOnce = false

// Config server port (set when server starts)
let configServerPort: number | undefined

/**
 * Poll the emulator's health endpoint to verify a WebSocket connection exists.
 * This ensures registration happens only after the WebSocket is tracked.
 */
async function waitForWebSocketConnection(
  apiUrl: string,
  timeoutMs: number = 4000
): Promise<boolean> {
  const startTime = Date.now()
  const baseUrl = apiUrl.replace(/\/api$/, '')

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) {
        const data = (await response.json()) as { connected_bots?: number }
        // Health endpoint returns connected_bots which tracks WebSocket connections
        if (data.connected_bots && data.connected_bots > 0) {
          return true
        }
      }
    } catch {
      // Emulator not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}

function createApp() {
  const logLevel =
    settings.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO

  if (isSimulatorMode) {
    slackLogger.info(
      { apiUrl: process.env.SLACK_API_URL },
      'Connecting to simulator'
    )
    return new App({
      token: SIMULATOR_BOT_TOKEN,
      appToken: SIMULATOR_APP_TOKEN,
      socketMode: true,
      logLevel,
      clientOptions: {
        slackApiUrl: process.env.SLACK_API_URL,
      },
    })
  }

  return new App({
    token: settings.SLACK_BOT_TOKEN,
    appToken: settings.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel,
  })
}

interface RegistrationResponse {
  ok: boolean
  error?: string
  message?: string
  settings?: Record<string, string>
}

async function registerWithSimulator(maxRetries = 10, retryDelayMs = 1000) {
  const apiUrl = process.env.SLACK_API_URL
  if (!apiUrl) return

  // Build registration payload with actual config server port
  const registrationPayload = {
    ...slackConfig,
    app: { ...slackConfig.app, configPort: configServerPort },
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // apiUrl already includes /api suffix (e.g., http://localhost:7557/api)
      const response = await fetch(`${apiUrl}/config/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      })

      const data = (await response.json()) as RegistrationResponse

      if (!response.ok) {
        // Handle WebSocket not ready - use faster retries for this transient condition
        if (data.error === 'no_websocket_connection') {
          slackLogger.debug(
            { attempt, maxRetries },
            'WebSocket not tracked yet, retrying quickly...'
          )
          await new Promise((resolve) => setTimeout(resolve, 200))
          continue
        }
        throw new Error(
          `HTTP ${response.status}: ${data.message || data.error}`
        )
      }

      // Apply simulator settings to process.env (for API keys, etc.)
      if (data.settings) {
        const apiKeySettings = [
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'GOOGLE_API_KEY',
          'AI_PROVIDER',
        ]
        for (const key of apiKeySettings) {
          if (data.settings[key] && !process.env[key]) {
            process.env[key] = data.settings[key]
            slackLogger.debug(`Applied ${key} from simulator settings`)
          }
        }
      }

      slackLogger.info('Registered with simulator')
      return
    } catch (error) {
      if (attempt < maxRetries) {
        slackLogger.debug(
          { attempt, maxRetries, error: String(error) },
          'Simulator not ready, retrying...'
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      } else {
        slackLogger.warn({ error }, 'Failed to register with simulator')
      }
    }
  }
}

async function main() {
  appLogger.info({ simulatorMode: isSimulatorMode }, 'Starting bot...')

  // Start config server for simulator (uses random port)
  if (isSimulatorMode) {
    const server = startConfigServer()
    if (server) {
      configServerPort = server.port
    }
  }

  const app = createApp()
  registerListeners(app)

  // Add WebSocket event logging for diagnostics (simulator mode only)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receiver = (app as any).receiver as {
    client?: {
      on?: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }

  if (isSimulatorMode && receiver?.client?.on) {
    receiver.client.on('connecting', () =>
      slackLogger.debug('WebSocket connecting...')
    )
    receiver.client.on('connected', async () => {
      slackLogger.info('WebSocket connected')

      if (hasConnectedOnce) {
        // This is a reconnection - re-register with simulator
        slackLogger.info('Reconnected - re-registering with simulator...')
        const apiUrl = process.env.SLACK_API_URL
        if (apiUrl) {
          const connected = await waitForWebSocketConnection(apiUrl, 5000)
          if (!connected) {
            slackLogger.warn(
              'WebSocket not tracked after reconnection, attempting registration anyway'
            )
          }
          await registerWithSimulator()
        }
      }
      hasConnectedOnce = true
    })
    receiver.client.on('disconnected', () =>
      slackLogger.warn('WebSocket disconnected')
    )
    receiver.client.on('error', (err: unknown) =>
      slackLogger.error({ err }, 'WebSocket error')
    )
  }

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

      await registerWithSimulator()

      // Pre-populate #showcase channel with Block Kit examples
      slackLogger.info('Populating #showcase channel...')
      try {
        await sendShowcaseMessages(app.client)
      } catch (err) {
        slackLogger.error({ err }, 'Failed to populate showcase channel')
      }

      // Send help text to bot DM so it's not empty on first open
      // If the last message is already the help text, replace it (avoids duplicates across restarts)
      const dmChannel = `D_${config.simulator.id}`
      try {
        const history = await app.client.conversations.history({
          channel: dmChannel,
          limit: 1,
        })
        const lastMessage = history.messages?.[0]
        if (lastMessage?.ts && lastMessage.text === HELP_TEXT) {
          await app.client.chat.delete({
            channel: dmChannel,
            ts: lastMessage.ts,
          })
        }
        await app.client.chat.postMessage({
          channel: dmChannel,
          text: HELP_TEXT,
        })
      } catch (err) {
        slackLogger.error({ err }, 'Failed to send DM help message')
      }
    }
  }

  // Graceful shutdown
  const shutdown = async () => {
    appLogger.info('Shutting down...')
    await app.stop()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  appLogger.info(`${settings.BOT_NAME} is running!`)
}

main().catch((error) => {
  appLogger.fatal({ error }, 'Fatal error')
  process.exit(1)
})
