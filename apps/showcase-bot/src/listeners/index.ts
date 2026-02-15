import type { App } from '@slack/bolt'
import * as commands from './commands/showcase'
import * as actions from './actions/showcase-actions'

export function registerListeners(app: App) {
  commands.register(app)
  actions.register(app)
}
