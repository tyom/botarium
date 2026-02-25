import { Assistant } from '@slack/bolt'
import type { App } from '@slack/bolt'
import { assistantThreadStarted } from './thread-started'
import { assistantContextChanged } from './context-changed'
import { assistantUserMessage } from './message'

const assistant = new Assistant({
  threadStarted: assistantThreadStarted,
  threadContextChanged: assistantContextChanged,
  userMessage: assistantUserMessage,
})

export function register(app: App) {
  app.assistant(assistant)
}
