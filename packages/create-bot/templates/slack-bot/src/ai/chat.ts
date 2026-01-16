import { generalAgent } from './agents'
import { truncate } from '../utils/string'
import { chatLogger } from '../utils/logger'

export interface ChatContext {
  channel: string
  thread_ts?: string
  user: string
  botName: string
}

/**
 * Process a message using the general agent.
 */
export async function chat(
  message: string,
  context: ChatContext
): Promise<string> {
  chatLogger.info(
    { user: context.user, message: truncate(message, 100) },
    'Processing message'
  )
  return generalAgent(message, context)
}

/**
 * Chat with conversation history for multi-turn conversations.
 */
export async function chatWithHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: ChatContext
): Promise<string> {
  if (messages.length === 0) {
    return 'No message provided.'
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'user')?.content

  if (!lastUserMessage) {
    return 'No user message found.'
  }

  chatLogger.info(
    { user: context.user, message: truncate(lastUserMessage, 100) },
    'Processing message with history'
  )

  const history = messages.slice(0, -1)
  return generalAgent(lastUserMessage, context, history)
}
