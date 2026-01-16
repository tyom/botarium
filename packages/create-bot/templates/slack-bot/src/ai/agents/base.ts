import { generateText, type ToolSet } from 'ai'
import type { ChatContext } from '../chat'
import { getUserPreferences, type UserPreferences } from '../../preferences'
import { getModel, settings } from '../../settings'
import { chatLogger } from '../../utils/logger'
import { toSlackFormat, truncate } from '../../utils/string'
import { getErrorMessage } from '../../utils/error'

export interface AgentConfig {
  name: string
  tools?: ToolSet
  systemPromptBuilder: (context: ChatContext, preferences: UserPreferences) => string
}

/**
 * Create a specialized agent with specific tools and system prompt.
 */
export function createAgent(config: AgentConfig) {
  return async function agent(
    message: string,
    context: ChatContext,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const preferences = await getUserPreferences(context.user)
    const systemPrompt = config.systemPromptBuilder(context, preferences)

    const messages = [...history, { role: 'user' as const, content: message }]
    const useTools = config.tools && Object.keys(config.tools).length > 0

    chatLogger.info(
      {
        agent: config.name,
        user: context.user,
        message: truncate(message, 100),
        tools: useTools ? Object.keys(config.tools!).length : 0,
      },
      `[${config.name}] Processing message`
    )

    try {
      const result = await generateText({
        model: getModel(),
        system: systemPrompt,
        messages,
        ...(useTools && { tools: config.tools, maxSteps: 5 }),
      })

      const usage = result.usage
      chatLogger.info(
        {
          agent: config.name,
          steps: result.steps.length,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
        },
        `[${config.name}] Response received`
      )

      return toSlackFormat(
        result.text || 'I processed your request but have no text response.'
      )
    } catch (error) {
      const errorMsg = getErrorMessage(error)
      chatLogger.error({ agent: config.name, error: errorMsg }, `[${config.name}] Error`)
      return `Sorry, I encountered an error processing your request. Please try again.`
    }
  }
}

// Response style instructions
export const RESPONSE_STYLE_INSTRUCTIONS: Record<
  UserPreferences['responseStyle'],
  string
> = {
  balanced: '- Be helpful and balanced in your responses',
  concise: '- Be brief and concise - give short, direct answers',
  detailed: '- Be detailed and thorough - provide comprehensive explanations',
}

/**
 * Build base guidelines that apply to all agents.
 */
export function buildBaseGuidelines(
  context: ChatContext,
  preferences: UserPreferences
): string {
  const botName = context.botName || settings.BOT_NAME
  const personality = settings.BOT_PERSONALITY
  const threadStatus = context.thread_ts
    ? `Thread: ${context.thread_ts}`
    : 'This is a new conversation.'

  const now = new Date()
  const currentDateTime = now.toLocaleString('en-US', {
    timeZone: preferences.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  const platformContext = `You are chatting in Slack. The current user is <@${context.user}>.
Channel: ${context.channel}`

  const languageInstruction =
    preferences.language !== 'en'
      ? `- Respond in ${preferences.language} (the user's preferred language)`
      : ''

  return `You are ${botName}, ${personality}.

Current date/time: ${currentDateTime}

${platformContext}
${threadStatus}

## User Preferences
- Response style: ${preferences.responseStyle}
- Language: ${preferences.language}
- Timezone: ${preferences.timezone}

Guidelines:
${RESPONSE_STYLE_INSTRUCTIONS[preferences.responseStyle]}
${languageInstruction}
- Use Slack mrkdwn formatting (bold: *text*, italic: _text_, code: \`code\`)
- Be friendly but professional`
}
