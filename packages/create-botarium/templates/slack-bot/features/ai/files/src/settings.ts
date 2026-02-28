import { z } from 'zod'
import { createSettings } from '@botarium/slack'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const botEnv = z.object({
  BOT_NAME: z.string().default('{{ botName }}'),
  BOT_PERSONALITY: z.string().default('Helpful AI assistant'),
  CONTEXT_HISTORY_LIMIT: z.coerce.number().default(20),
  AI_PROVIDER: z
    .enum(['openai', 'anthropic', 'google', 'openrouter'])
    .optional(),
  MODEL_DEFAULT: z.string().optional(),
  MODEL_FAST: z.string().optional(),
  MODEL_THINKING: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
})

export const { settings, reloadSettings, isSimulatorMode } =
  await createSettings({ env: botEnv })

// Default models per provider (used when MODEL_DEFAULT is not set)
// Operators can override via MODEL_DEFAULT environment variable
const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-sonnet-4-5',
  google: 'gemini-3-flash-preview',
  openrouter: 'anthropic/claude-sonnet-4.5',
}

// Fallback models per provider (used by agent prepareStep when primary model fails)
// Operators can override via MODEL_FAST environment variable
const FALLBACK_MODELS: Record<string, string> = {
  openai: 'gpt-5.2-mini',
  anthropic: 'claude-haiku-4',
  google: 'gemini-3-flash-preview',
  openrouter: 'anthropic/claude-haiku-4',
}

// AI Model helper
export function getModel() {
  const provider = settings.AI_PROVIDER || 'openai'
  const modelId = settings.MODEL_DEFAULT || DEFAULT_MODELS[provider]

  if (!modelId) {
    throw new Error(
      `No model configured for provider "${provider}". Set MODEL_DEFAULT in your environment.`
    )
  }

  // Validate required API key for the selected provider
  const apiKeyMap = {
    openai: { key: settings.OPENAI_API_KEY, name: 'OPENAI_API_KEY' },
    anthropic: { key: settings.ANTHROPIC_API_KEY, name: 'ANTHROPIC_API_KEY' },
    google: { key: settings.GOOGLE_API_KEY, name: 'GOOGLE_API_KEY' },
    openrouter: {
      key: settings.OPENROUTER_API_KEY,
      name: 'OPENROUTER_API_KEY',
    },
  } satisfies Record<string, { key: string | undefined; name: string }>

  const apiKeyInfo =
    apiKeyMap[provider as keyof typeof apiKeyMap] ?? apiKeyMap.openai
  if (!apiKeyInfo.key) {
    throw new Error(
      `Missing ${apiKeyInfo.name} for provider "${provider}". Set ${apiKeyInfo.name} in your environment.`
    )
  }

  switch (provider) {
    case 'anthropic':
      return anthropic(modelId)
    case 'google':
      return google(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey: settings.OPENROUTER_API_KEY })(modelId)
    case 'openai':
    default:
      return openai(modelId)
  }
}

/**
 * Get the fallback model for the current provider.
 * Used by agent prepareStep when the primary model fails or after retries.
 * Operators can override via MODEL_FAST environment variable.
 */
export function getFallbackModel() {
  const provider = settings.AI_PROVIDER || 'openai'
  const modelId = settings.MODEL_FAST || FALLBACK_MODELS[provider]

  if (!modelId) {
    throw new Error(
      `No fallback model configured for provider "${provider}". Set MODEL_FAST in your environment.`
    )
  }

  switch (provider) {
    case 'anthropic':
      return anthropic(modelId)
    case 'google':
      return google(modelId)
    case 'openrouter':
      return createOpenRouter({ apiKey: settings.OPENROUTER_API_KEY })(modelId)
    case 'openai':
    default:
      return openai(modelId)
  }
}
