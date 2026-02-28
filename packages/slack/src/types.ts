import type { App } from '@slack/bolt'
import type { ConfigFile } from '@botarium/config'

export type { ConfigFile }

export interface BaseSettings {
  SLACK_BOT_TOKEN: string
  SLACK_APP_TOKEN: string
  SLACK_SIGNING_SECRET: string
  PORT: number
  LOG_LEVEL: 'silent' | 'debug' | 'info' | 'warn' | 'error'
}

export interface SlackBotOptions {
  config: ConfigFile
  listeners: (app: App) => void
  simulatorSettingsKeys?: string[]
  onSettingsUpdate?: () => Promise<void>
  getHealthResponse?: () => unknown
}

export interface SlackBot {
  app: App
  isSimulatorMode: boolean
  stop(): Promise<void>
}
