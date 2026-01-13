import { App, LogLevel } from '@slack/bolt'
import { settings } from '../settings'

const isLocalMode = Boolean(process.env.SLACK_API_URL)

// Simulator tokens for local mode
const SIMULATOR_BOT_TOKEN = 'xoxb-simulator-token'
const SIMULATOR_APP_TOKEN = 'xapp-simulator-token'

export function createSlackApp() {
  const logLevel = settings.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO

  if (isLocalMode) {
    console.log(`[Slack] Connecting to emulator at ${process.env.SLACK_API_URL}`)
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

export type SlackApp = ReturnType<typeof createSlackApp>
