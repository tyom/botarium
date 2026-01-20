import type { BotTemplate, AiProvider, DbAdapter } from './template'

/**
 * Environment variable configurations by template and feature.
 */

// Template-specific required env vars
const TEMPLATE_ENV_VARS: Record<BotTemplate, readonly string[]> = {
  slack: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN', 'SLACK_SIGNING_SECRET'],
}

// AI provider API key env var names
const AI_PROVIDER_ENV_VARS: Record<AiProvider, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
}

// Database adapter env vars
const DB_ADAPTER_ENV_VARS: Partial<Record<DbAdapter, readonly string[]>> = {
  postgres: ['DATABASE_URL'],
}

export interface EnvVarRequirements {
  templateVars: readonly string[]
  aiVar: string | null
  dbVars: readonly string[]
  hasAny: boolean
}

/**
 * Get required environment variables based on configuration.
 */
export function getRequiredEnvVars(options: {
  template: BotTemplate
  useAi: boolean
  aiProvider?: AiProvider
  dbAdapter: DbAdapter
}): EnvVarRequirements {
  const { template, useAi, aiProvider, dbAdapter } = options

  const templateVars = TEMPLATE_ENV_VARS[template] ?? []
  const aiVar = useAi && aiProvider ? AI_PROVIDER_ENV_VARS[aiProvider] : null
  const dbVars = DB_ADAPTER_ENV_VARS[dbAdapter] ?? []

  return {
    templateVars,
    aiVar,
    dbVars,
    hasAny: templateVars.length > 0 || aiVar !== null || dbVars.length > 0,
  }
}
