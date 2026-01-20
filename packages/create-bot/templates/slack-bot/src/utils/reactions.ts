/**
 * Slack reaction utilities for AI response indicators.
 *
 * Provides consistent "thinking" and "done" reaction handling across handlers.
 */
import type { WebClient } from '@slack/web-api'
import { slackLogger } from './logger'

// Non-AI commands that don't need thinking/done reactions
const NON_AI_COMMANDS = ['ping']

/**
 * Check if a message should show AI reaction indicators.
 */
export function shouldShowReactions(text: string): boolean {
  return !NON_AI_COMMANDS.includes(text.toLowerCase().trim())
}

export interface ReactionContext {
  client: WebClient
  channel: string
  timestamp: string
}

/**
 * Add "thinking" reaction to indicate AI is processing.
 */
export async function addThinkingReaction(ctx: ReactionContext): Promise<void> {
  await ctx.client.reactions
    .add({
      channel: ctx.channel,
      timestamp: ctx.timestamp,
      name: 'thinking_face',
    })
    .catch((err) =>
      slackLogger.error({ err }, 'Failed to add thinking reaction')
    )
}

/**
 * Remove "thinking" reaction (typically on completion or error).
 */
export async function removeThinkingReaction(
  ctx: ReactionContext
): Promise<void> {
  await ctx.client.reactions
    .remove({
      channel: ctx.channel,
      timestamp: ctx.timestamp,
      name: 'thinking_face',
    })
    .catch((err) =>
      slackLogger.error({ err }, 'Failed to remove thinking reaction')
    )
}

/**
 * Add "done" checkmark reaction to indicate AI completed successfully.
 */
export async function addDoneReaction(ctx: ReactionContext): Promise<void> {
  await ctx.client.reactions
    .add({
      channel: ctx.channel,
      timestamp: ctx.timestamp,
      name: 'white_check_mark',
    })
    .catch((err) =>
      slackLogger.error({ err }, 'Failed to add checkmark reaction')
    )
}

/**
 * Handle reaction cleanup on error (remove thinking, no checkmark).
 */
export async function removeThinkingOnError(
  ctx: ReactionContext
): Promise<void> {
  await ctx.client.reactions
    .remove({
      channel: ctx.channel,
      timestamp: ctx.timestamp,
      name: 'thinking_face',
    })
    .catch(() => {
      // Silently ignore - reaction may not exist
    })
}

/**
 * Complete the reaction flow: remove thinking, add checkmark.
 */
export async function completeReactions(ctx: ReactionContext): Promise<void> {
  await removeThinkingReaction(ctx)
  await addDoneReaction(ctx)
}
