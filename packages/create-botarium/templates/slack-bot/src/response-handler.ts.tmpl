/**
 * Response Handler
 *
 * This is the main file to customize bot responses.
 */
{{#if isAi}}
import { createRouter } from './ai/router'
import { settings{{#if isDb}}, getModel{{/if}} } from './settings'
{{/if}}
{{#if isDb}}
import { buildMemoryContext, extractAndSaveMemory } from './memory'
import { memoryLogger } from './utils/logger'
{{/if}}

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
{{#if isDb}}

async function buildEnhancedSystemPrompt(basePrompt: string, context: ThreadContext): Promise<string> {
  const memoryContext = await buildMemoryContext({
    userId: context.userId,
    teamId: context.teamId,
  })
  return [basePrompt, memoryContext].filter(Boolean).join('\n\n')
}
{{/if}}

export const responseHandler: ResponseHandler = {
  systemPrompt: '{{#if isAi}}You are a helpful assistant. Be concise and friendly.{{else}}You are a helpful assistant.{{/if}}',

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
{{#if isAi}}

    // Router returns complete text (not streamed). The AsyncIterable interface
    // is preserved for listener compatibility.

    // Create a fresh router for this request (isolates model fallback state)
    const router = createRouter()

    // Build context from history
    const historyLimit = Math.min(settings.CONTEXT_HISTORY_LIMIT ?? 20, 100)
    const limitedHistory = historyLimit > 0
      ? context.history.slice(-historyLimit)
      : []

    const historyContext = limitedHistory
      .filter(m => m.content.trim())
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const prompt = historyContext
      ? `Conversation history:\n${historyContext}\n\nUser: ${message}`
      : message
{{#if isDb}}

    // Build enhanced prompt with memory
    const enhancedSystemPrompt = await buildEnhancedSystemPrompt(this.systemPrompt ?? '', context)
    const enhancedPrompt = enhancedSystemPrompt
      ? `${enhancedSystemPrompt}\n\n${prompt}`
      : prompt
    const result = await router.generate({ messages: [{ role: 'user', content: enhancedPrompt }] })
{{else}}
    const result = await router.generate({ messages: [{ role: 'user', content: prompt }] })
{{/if}}

    yield result.text || 'Sorry, I could not generate a response.'
{{#if isDb}}

    // Extract and save any memories from the user's message (fire and forget)
    extractAndSaveMemory({
      model: getModel(),
      message,
      history: context.history,
      userId: context.userId,
      teamId: context.teamId,
      sourceChannel: context.channelId,
      sourceThread: context.threadTs,
    }).catch((err) => {
      memoryLogger.error({ err }, 'Failed to extract and save memory')
    })
{{/if}}
{{else}}

    // Echo response - replace with your logic
    yield `You said: ${message}`
{{/if}}
  },
}
