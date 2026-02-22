import type { App } from '@slack/bolt'
import * as commands from './commands/showcase'
import * as actions from './actions/showcase-actions'
import * as shortcuts from './shortcuts/showcase-shortcuts'

export function registerListeners(app: App) {
  commands.register(app)
  actions.register(app)
  shortcuts.register(app)
}
