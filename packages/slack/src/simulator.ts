import type { App } from '@slack/bolt'
import type { Logger } from 'botarium/logging'

interface RegistrationResponse {
  ok: boolean
  error?: string
  message?: string
  settings?: Record<string, string>
}

export interface RegisterOptions {
  apiUrl: string
  configServerPort: number
  slackConfig: Record<string, unknown>
  logger: Logger
  settingsKeys?: string[]
  onSettingsApplied?: () => Promise<void>
}

/**
 * Poll the emulator's health endpoint to verify this bot's WebSocket connection exists.
 * Captures the initial connected_bots count and waits until it increases,
 * ensuring this specific bot's connection is tracked (not just any bot).
 */
export async function waitForWebSocketConnection(
  apiUrl: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  const startTime = Date.now()
  const baseUrl = apiUrl.replace(/\/api$/, '')

  let initialConnectedBots: number | null = null

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) {
        const data = (await response.json()) as { connected_bots?: number }
        const currentCount = data.connected_bots ?? 0

        if (initialConnectedBots === null) {
          initialConnectedBots = currentCount
        }

        if (currentCount > initialConnectedBots) {
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

export async function registerWithSimulator(
  options: RegisterOptions,
  maxRetries = 10,
  retryDelayMs = 1000
) {
  const {
    apiUrl,
    configServerPort,
    slackConfig,
    logger,
    settingsKeys,
    onSettingsApplied,
  } = options

  const registrationPayload = {
    ...slackConfig,
    app: {
      ...(slackConfig.app as Record<string, unknown>),
      configPort: configServerPort,
    },
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/config/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationPayload),
      })

      const data = (await response.json()) as RegistrationResponse

      if (!response.ok) {
        if (data.error === 'no_websocket_connection') {
          if (attempt === 1) {
            logger.debug('WebSocket not tracked yet, retrying...')
          }
          await new Promise((resolve) => setTimeout(resolve, 200))
          continue
        }
        throw new Error(
          `HTTP ${response.status}: ${data.message || data.error}`
        )
      }

      // Apply simulator settings to process.env (for API keys, etc.)
      if (settingsKeys?.length && data.settings) {
        applySimulatorSettings(data.settings, settingsKeys, logger)
        if (onSettingsApplied) {
          await onSettingsApplied()
        }
      }

      logger.info('Registered with simulator')
      return
    } catch (error) {
      if (attempt < maxRetries) {
        logger.debug(
          { attempt, maxRetries, error: String(error) },
          'Simulator not ready, retrying...'
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      } else {
        logger.warn({ error }, 'Failed to register with simulator')
      }
    }
  }
}

function applySimulatorSettings(
  settings: Record<string, string>,
  settingsKeys: string[],
  logger: Logger
) {
  // Track which vars were previously injected by emulator
  const previouslyInjected = new Set(
    (process.env._EMULATOR_INJECTED_VARS || '').split(',').filter(Boolean)
  )

  // Track which vars we actually apply (not skipped due to .env values)
  const actuallyInjected: string[] = []

  for (const key of settingsKeys) {
    const valueFromEmulator = settings[key]

    // If key was previously injected but is now removed, delete it
    if (valueFromEmulator === undefined) {
      if (previouslyInjected.has(key)) {
        delete process.env[key]
        logger.debug(`Removed ${key} (no longer in simulator settings)`)
      }
      continue
    }

    // Apply if: no existing value, OR value was previously injected (not from .env)
    const canApply = !process.env[key] || previouslyInjected.has(key)
    if (canApply) {
      process.env[key] = valueFromEmulator
      actuallyInjected.push(key)
      logger.debug(`Applied ${key} from simulator settings`)
    }
  }

  // Only mark vars as injected if they were actually applied (not overridden by .env)
  process.env._EMULATOR_INJECTED_VARS = actuallyInjected.join(',')
}

export function setupWebSocketLogging(options: {
  app: App
  logger: Logger
  onReconnect: () => Promise<void>
}) {
  const { app, logger, onReconnect } = options

  // Bolt doesn't expose receiver.client types, so we use unknown + type guard
  const receiver = (app as unknown as { receiver?: { client?: unknown } })
    .receiver
  const wsClient = receiver?.client as
    | { on?: (event: string, handler: (arg?: unknown) => void) => void }
    | undefined

  if (!wsClient?.on) return

  let hasConnectedOnce = false

  wsClient.on('connecting', () => logger.debug('WebSocket connecting...'))
  wsClient.on('connected', async () => {
    logger.info('WebSocket connected')

    if (hasConnectedOnce) {
      logger.info('Reconnected - re-registering with simulator...')
      await onReconnect()
    }
    hasConnectedOnce = true
  })
  wsClient.on('disconnected', () => logger.warn('WebSocket disconnected'))
  wsClient.on('error', (err) => logger.error({ err }, 'WebSocket error'))
}
