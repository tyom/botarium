import type { AssistantUserMessageMiddleware } from '@slack/bolt'
{{#if isAi}}
import type { MessageElement } from '@slack/web-api/dist/types/response/ConversationsRepliesResponse'
import {
  shouldShowReactions,
  addThinkingReaction,
  completeReactions,
  removeThinkingOnError,
  type ReactionContext,
} from '../../utils/reactions'
{{else}}
interface ThreadMessage {
  bot_id?: string
  text?: string
}
{{/if}}
import { responseHandler, type ThreadContext } from '../../response-handler'
import { slackLogger } from '../../utils/logger'


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
  const useReactions = shouldShowReactions(message.text) && messageTs
  const reactionCtx: ReactionContext | undefined =
    useReactions ? { client, channel, timestamp: messageTs } : undefined
{{/if}}
  const { userId, teamId } = context

  let streamer: ReturnType<typeof client.chatStream> | undefined

  try {
    // Set thread title to the user's message
    await setTitle(message.text)

    // Show typing indicator
    await setStatus('is thinking...')

{{#if isAi}}
    // Add thinking reaction for AI responses
    if (reactionCtx) {
      await addThinkingReaction(reactionCtx)
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
    streamer = client.chatStream({
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

{{#if isAi}}
    // Remove thinking and add checkmark for AI responses
    if (reactionCtx) {
      await completeReactions(reactionCtx)
    }
{{/if}}
  } catch (error) {
    slackLogger.error({ error }, 'Error in userMessage handler')
{{#if isAi}}
    // Try to remove thinking reaction on error
    if (reactionCtx) {
      await removeThinkingOnError(reactionCtx)
    }
{{/if}}
    await say({ text: 'Sorry, something went wrong!', thread_ts })
  } finally {
    if (streamer) {
      await streamer.stop().catch(() => {})
    }
  }
}
