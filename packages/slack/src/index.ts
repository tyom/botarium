import type { BotboxPlugin, Emulator, EmulatorOptions } from '@tyom/botbox/plugins'
import { startEmulatorServer } from './server'
import { DEFAULT_EMULATOR_PORT } from './lib/config'

export { startEmulatorServer } from './server'
export * from './server/types'

/**
 * Create a Slack emulator instance
 */
function createSlackEmulator(options: EmulatorOptions): Emulator {
  let server: ReturnType<typeof startEmulatorServer> | null = null

  return {
    async start(): Promise<void> {
      server = startEmulatorServer({
        port: options.port,
        // dataDir will be used for persistence in future
      })
    },

    async stop(): Promise<void> {
      if (server) {
        server.stop()
        server = null
      }
    },

    getApiUrl(): string {
      return `http://localhost:${options.port}/api`
    },
  }
}

/**
 * Slack platform plugin for Botbox
 */
export const slackPlugin: BotboxPlugin = {
  name: 'slack',
  displayName: 'Slack',
  createEmulator: createSlackEmulator,
  defaultPort: DEFAULT_EMULATOR_PORT,
  envVarName: 'SLACK_API_URL',
}

export default slackPlugin
