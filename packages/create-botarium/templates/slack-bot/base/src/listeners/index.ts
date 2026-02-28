import type { App } from '@slack/bolt'
import * as assistant from './assistant/index'
import * as events from './events/index'
import * as messages from './messages/index'

export function registerListeners(app: App) {
  assistant.register(app)
  events.register(app)
  messages.register(app)
}
