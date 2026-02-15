import type { App } from '@slack/bolt'
import * as commands from './commands/showcase'

export function registerListeners(app: App) {
  commands.register(app)
}
