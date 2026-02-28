/**
 * Response Handler
 *
 * This is the main file to customize bot responses.
 */
import { createRouter } from './ai/router'
import { settings } from './settings'
import { chatLogger } from './utils/logger'

export interface ThreadContext {
  channelId: string
  threadTs: string
  userId: string
  teamId: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface SuggestedPrompt {
  title: string
  message: string
}

export interface ResponseHandler {
  generateResponse(
    message: string,
    context: ThreadContext
  ): AsyncIterable<string>
  systemPrompt?: string
  suggestedPrompts?: SuggestedPrompt[]
}

export const responseHandler: ResponseHandler = {
  systemPrompt: 'You are a helpful assistant. Be concise and friendly.',
  suggestedPrompts: [
    { title: 'Say hello', message: 'Hello!' },
    { title: 'Get help', message: 'What can you help me with?' },
  ],

  async *generateResponse(message, context) {
    // Handle ping command
    if (message.toLowerCase() === 'ping') {
      yield 'pong'
      return
    }

    chatLogger.info(
      { user: context.userId, length: message.length },
      'Processing message'
    )

    // Router returns complete text (not streamed). The AsyncIterable interface
    // is preserved for listener compatibility.

    // Create a fresh router for this request (isolates model fallback state)
    const router = createRouter()

    // Build context from history
    const historyLimit = Math.min(settings.CONTEXT_HISTORY_LIMIT ?? 20, 100)
    const limitedHistory =
      historyLimit > 0 ? context.history.slice(-historyLimit) : []

    const historyContext = limitedHistory
      .filter((m) => m.content.trim())
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = historyContext
      ? `Conversation history:\n${historyContext}\n\nUser: ${message}`
      : message

    const result = await router.generate({
      messages: [{ role: 'user', content: prompt }],
    })

    chatLogger.info({ user: context.userId }, 'Response generated')

    yield result.text || 'Sorry, I could not generate a response.'
  },
}
