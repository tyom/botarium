import type { BotTemplate } from 'create-botarium'

/**
 * Environment variable configurations by template and feature.
 */

// Template-specific required env vars
const TEMPLATE_ENV_VARS: Record<BotTemplate, readonly string[]> = {
  slack: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'],
}

// All AI-related env vars (provider selection + all API keys)
const AI_ENV_VARS = [
  'AI_PROVIDER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'OPENROUTER_API_KEY',
] as const

export interface EnvVarRequirements {
  templateVars: readonly string[]
  aiVars: readonly string[]
  hasAny: boolean
}

/**
 * Get required environment variables based on configuration.
 */
export function getRequiredEnvVars(options: {
  template: BotTemplate
  useAi: boolean
}): EnvVarRequirements {
  const { template, useAi } = options

  const templateVars = TEMPLATE_ENV_VARS[template] ?? []
  const aiVars = useAi ? AI_ENV_VARS : []

  return {
    templateVars,
    aiVars,
    hasAny: templateVars.length > 0 || aiVars.length > 0,
  }
}
