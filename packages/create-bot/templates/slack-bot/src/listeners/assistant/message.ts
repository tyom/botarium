import type { AssistantUserMessageMiddleware } from '@slack/bolt'
{{#if isAi}}
import type { MessageElement } from '@slack/web-api/dist/types/response/ConversationsRepliesResponse'
{{else}}
interface ThreadMessage {
  bot_id?: string
  text?: string
}
{{/if}}
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackLogger } from '../../utils/logger'

{{#if isAi}}
// Non-AI commands that don't need thinking/done reactions
const NON_AI_COMMANDS = ['ping']

function isAIResponse(text: string): boolean {
  return !NON_AI_COMMANDS.includes(text.toLowerCase().trim())
}

{{/if}}
export const assistantUserMessage: AssistantUserMessageMiddleware = async ({
  client,
  message,
  context,
  say,
  setTitle,
  setStatus,
}) => {
  // Validate message shape
  if (
    !('text' in message) ||
    !('thread_ts' in message) ||
    !message.text ||
    !message.thread_ts
  ) {
    return
  }

  const { channel, thread_ts } = message
{{#if isAi}}
  const messageTs = 'ts' in message ? (message.ts as string) : undefined
{{/if}}
  const { userId, teamId } = context
{{#if isAi}}
  const useReactions = isAIResponse(message.text) && messageTs
{{/if}}

  try {
    // Set thread title to the user's message
    await setTitle(message.text)

    // Show typing indicator
    await setStatus('is thinking...')

{{#if isAi}}
    // Add thinking reaction for AI responses
    if (useReactions) {
      await client.reactions.add({
        channel,
        timestamp: messageTs,
        name: 'thinking_face',
      }).catch(err => slackLogger.error({ err }, 'Failed to add thinking reaction'))
    }

{{/if}}
    // Retrieve thread history for context
    const thread = await client.conversations.replies({
      channel,
      ts: thread_ts,
      oldest: thread_ts,
    })

    // Build thread context for the response handler
    const history =
{{#if isAi}}
      thread.messages?.map((m: MessageElement) => ({
{{else}}
      thread.messages?.map((m: ThreadMessage) => ({
{{/if}}
        role: (m.bot_id ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.text || '',
      })) ?? []

    const threadContext: ThreadContext = {
      channelId: channel,
      threadTs: thread_ts,
      userId: userId ?? '',
      teamId: teamId ?? '',
      history,
    }

    // Generate and stream response
    const streamer = client.chatStream({
      channel,
      recipient_team_id: teamId,
      recipient_user_id: userId,
      thread_ts,
    })

    for await (const chunk of responseHandler.generateResponse(
      message.text,
      threadContext
    )) {
      await streamer.append({ markdown_text: chunk })
    }

    await streamer.stop()

{{#if isAi}}
    // Remove thinking and add checkmark for AI responses
    if (useReactions) {
      await client.reactions.remove({
        channel,
        timestamp: messageTs,
        name: 'thinking_face',
      }).catch(err => slackLogger.error({ err }, 'Failed to remove thinking reaction'))
      await client.reactions.add({
        channel,
        timestamp: messageTs,
        name: 'white_check_mark',
      }).catch(err => slackLogger.error({ err }, 'Failed to add checkmark reaction'))
    }
{{/if}}
  } catch (error) {
    slackLogger.error({ error }, 'Error in userMessage handler')
{{#if isAi}}
    // Try to remove thinking reaction on error
    if (useReactions) {
      await client.reactions.remove({
        channel,
        timestamp: messageTs,
        name: 'thinking_face',
      }).catch(() => {})
    }
{{/if}}
    await say({ text: 'Sorry, something went wrong!' })
  }
}
