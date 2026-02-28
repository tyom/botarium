import type { App } from '@slack/bolt'
import { appMention } from './app-mention'

export function register(app: App) {
  app.event('app_mention', appMention)
}
