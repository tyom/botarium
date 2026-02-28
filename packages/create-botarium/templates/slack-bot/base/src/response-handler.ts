/**
 * Response Handler
 *
 * This is the main file to customize bot responses.
 */

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
  systemPrompt: 'You are a helpful assistant.',
  suggestedPrompts: [
    { title: 'Say hello', message: 'Hello!' },
    { title: 'Get help', message: 'What can you help me with?' },
  ],

  async *generateResponse(message, _context) {
    // Handle ping command
    if (message.toLowerCase() === 'ping') {
      yield 'pong'
      return
    }

    // Echo response - replace with your logic
    yield `You said: ${message}`
  },
}
