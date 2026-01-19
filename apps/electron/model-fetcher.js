/**
 * Dynamic model fetching for AI providers
 * Fetches available models from provider APIs and categorizes them into tiers
 * with in-memory caching and fallback to hardcoded defaults
 */

/* global fetch */

import { electronLogger } from './electron-logger.js'

// Cache duration: 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000

// In-memory cache: { provider: { models, timestamp } }
const modelCache = new Map()

// Hardcoded fallback model tiers (kept in sync with simulator-settings.ts)
const FALLBACK_MODEL_TIERS = {
  openai: {
    fast: ['gpt-5-mini', 'gpt-4o-mini'],
    default: ['gpt-5.2', 'gpt-4o', 'gpt-4o-mini'],
    thinking: ['o3', 'o3-mini'],
  },
  anthropic: {
    fast: ['claude-haiku-4-5'],
    default: ['claude-sonnet-4-5'],
    thinking: ['claude-opus-4-5'],
  },
  google: {
    fast: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    default: ['gemini-3-flash-preview', 'gemini-2.5-pro'],
    thinking: ['gemini-2.5-pro', 'gemini-2.0-flash-thinking-exp'],
  },
  openrouter: {
    fast: ['openai/gpt-4o-mini', 'anthropic/claude-3-5-haiku', 'google/gemini-2.0-flash-001'],
    default: ['openai/gpt-4o', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro'],
    thinking: ['openai/o3-mini', 'anthropic/claude-opus-4', 'google/gemini-2.5-pro'],
  },
}

/**
 * Categorize OpenAI models into tiers
 * @param {string[]} modelIds - List of model IDs from API
 * @returns {{ fast: string[], default: string[], thinking: string[] }}
 */
function categorizeOpenAIModels(modelIds) {
  const tiers = { fast: [], default: [], thinking: [] }

  for (const id of modelIds) {
    const lower = id.toLowerCase()

    // Thinking models: o1, o3 series
    if (lower.startsWith('o3') || lower.startsWith('o3-mini')) {
      tiers.thinking.push(id)
    }
    // Fast models: mini
    else if (lower.includes('mini')) {
      tiers.fast.push(id)
    }
    // Default models: gpt-5.2, gpt-4o etc (non-mini, non-turbo)
    else if (lower.startsWith('gpt-5.2') || lower.startsWith('gpt-4o')) {
      tiers.default.push(id)
    }
  }

  return tiers
}

/**
 * Categorize Anthropic models into tiers
 * @param {string[]} modelIds - List of model IDs from API
 * @returns {{ fast: string[], default: string[], thinking: string[] }}
 */
function categorizeAnthropicModels(modelIds) {
  const tiers = { fast: [], default: [], thinking: [] }

  for (const id of modelIds) {
    const lower = id.toLowerCase()

    // Thinking models: opus
    if (lower.includes('opus')) {
      tiers.thinking.push(id)
    }
    // Fast models: haiku
    else if (lower.includes('haiku')) {
      tiers.fast.push(id)
    }
    // Default models: sonnet
    else if (lower.includes('sonnet')) {
      tiers.default.push(id)
    }
  }

  return tiers
}

/**
 * Categorize Google models into tiers
 * @param {string[]} modelIds - List of model IDs from API
 * @returns {{ fast: string[], default: string[], thinking: string[] }}
 */
function categorizeGoogleModels(modelIds) {
  const tiers = { fast: [], default: [], thinking: [] }

  for (const id of modelIds) {
    const lower = id.toLowerCase()

    // Thinking models: thinking, or pro (also in thinking for complex reasoning)
    if (lower.includes('thinking')) {
      tiers.thinking.push(id)
    }
    // Fast models: flash
    else if (lower.includes('flash')) {
      tiers.fast.push(id)
    }
    // Default models: pro
    else if (lower.includes('pro')) {
      tiers.default.push(id)
      // Pro models can also be used for thinking tasks
      tiers.thinking.push(id)
    }
  }

  return tiers
}

/**
 * Categorize OpenRouter models into tiers
 * Since OpenRouter aggregates models from multiple providers, categorize by naming patterns
 * @param {string[]} modelIds - List of model IDs from API
 * @returns {{ fast: string[], default: string[], thinking: string[] }}
 */
function categorizeOpenRouterModels(modelIds) {
  const tiers = { fast: [], default: [], thinking: [] }

  for (const id of modelIds) {
    const lower = id.toLowerCase()

    // Fast tier: mini, flash, haiku, instant, lite models
    if (
      lower.includes('mini') ||
      lower.includes('flash') ||
      lower.includes('haiku') ||
      lower.includes('instant') ||
      lower.includes('lite')
    ) {
      tiers.fast.push(id)
    }
    // Thinking tier: opus, o1, o3, thinking, deep models
    else if (
      lower.includes('opus') ||
      lower.includes('/o1') ||
      lower.includes('/o3') ||
      lower.includes('thinking') ||
      lower.includes('deep')
    ) {
      tiers.thinking.push(id)
    }
    // Default tier: general-purpose models (sonnet, gpt-4o, pro, etc.)
    else if (
      lower.includes('sonnet') ||
      lower.includes('gpt-4o') ||
      lower.includes('gpt-5') ||
      lower.includes('pro') ||
      lower.includes('claude-3') ||
      lower.includes('gemini')
    ) {
      tiers.default.push(id)
    }
  }

  return tiers
}

/**
 * Fetch models from OpenAI API
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ fast: string[], default: string[], thinking: string[] } | null>}
 */
async function fetchOpenAIModels(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      electronLogger.warn(
        { status: response.status },
        'OpenAI models API returned error'
      )
      return null
    }

    const data = await response.json()
    const modelIds = data.data
      .map((m) => m.id)
      .filter(
        (id) =>
          // Filter to only chat models (gpt, o1, o3)
          id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')
      )
      .sort()

    return categorizeOpenAIModels(modelIds)
  } catch (error) {
    electronLogger.warn(
      { error: error.message },
      'Failed to fetch OpenAI models'
    )
    return null
  }
}

/**
 * Fetch models from Anthropic API
 * @param {string} apiKey - Anthropic API key
 * @returns {Promise<{ fast: string[], default: string[], thinking: string[] } | null>}
 */
async function fetchAnthropicModels(apiKey) {
  try {
    electronLogger.debug('Fetching Anthropic models...')
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      electronLogger.warn(
        { status: response.status, body: text.slice(0, 200) },
        'Anthropic models API returned error'
      )
      return null
    }

    const data = await response.json()
    electronLogger.debug(
      { modelCount: data.data?.length },
      'Anthropic API response received'
    )
    const modelIds = data.data
      .map((m) => m.id)
      .filter((id) =>
        // Filter to Claude models
        id.includes('claude')
      )
      .sort()

    electronLogger.debug({ modelIds }, 'Anthropic models filtered')
    return categorizeAnthropicModels(modelIds)
  } catch (error) {
    electronLogger.warn(
      { error: error.message },
      'Failed to fetch Anthropic models'
    )
    return null
  }
}

/**
 * Fetch models from Google AI API
 * @param {string} apiKey - Google API key
 * @returns {Promise<{ fast: string[], default: string[], thinking: string[] } | null>}
 */
async function fetchGoogleModels(apiKey) {
  try {
    electronLogger.debug('Fetching Google models...')
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      const text = await response.text()
      electronLogger.warn(
        { status: response.status, body: text.slice(0, 200) },
        'Google models API returned error'
      )
      return null
    }

    const data = await response.json()
    electronLogger.debug(
      { modelCount: data.models?.length },
      'Google API response received'
    )
    const modelIds = data.models
      .map((m) => m.name.replace('models/', ''))
      .filter((id) =>
        // Filter to Gemini models
        id.includes('gemini')
      )
      .sort()

    electronLogger.debug({ modelIds }, 'Google models filtered')
    return categorizeGoogleModels(modelIds)
  } catch (error) {
    electronLogger.warn(
      { error: error.message },
      'Failed to fetch Google models'
    )
    return null
  }
}

/**
 * Fetch models from OpenRouter API
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<{ fast: string[], default: string[], thinking: string[] } | null>}
 */
async function fetchOpenRouterModels(apiKey) {
  try {
    electronLogger.debug('Fetching OpenRouter models...')
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      electronLogger.warn(
        { status: response.status, body: text.slice(0, 200) },
        'OpenRouter models API returned error'
      )
      return null
    }

    const data = await response.json()
    electronLogger.debug(
      { modelCount: data.data?.length },
      'OpenRouter API response received'
    )

    // Filter to well-known provider models to avoid overwhelming users
    const allowedPrefixes = [
      'openai/',
      'anthropic/',
      'google/',
      'meta-llama/',
      'mistralai/',
    ]

    const modelIds = data.data
      .map((m) => m.id)
      .filter((id) => allowedPrefixes.some((prefix) => id.startsWith(prefix)))
      .sort()

    electronLogger.debug({ modelCount: modelIds.length }, 'OpenRouter models filtered')
    return categorizeOpenRouterModels(modelIds)
  } catch (error) {
    electronLogger.warn(
      { error: error.message },
      'Failed to fetch OpenRouter models'
    )
    return null
  }
}

/**
 * Get model tiers for a provider, using cache or fetching from API
 * @param {string} provider - Provider name (openai, anthropic, google)
 * @param {string} apiKey - API key for the provider
 * @returns {Promise<{ fast: string[], default: string[], thinking: string[] }>}
 */
async function getModelTiersForProvider(provider, apiKey) {
  // Check cache first
  const cached = modelCache.get(provider)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    electronLogger.debug({ provider }, 'Using cached model tiers')
    return cached.tiers
  }

  // No API key - return fallback
  if (!apiKey) {
    const fallback = FALLBACK_MODEL_TIERS[provider] || { fast: [], default: [], thinking: [] }
    electronLogger.info(
      { provider, fast: fallback.fast.length, default: fallback.default.length, thinking: fallback.thinking.length },
      'No API key, using fallback model tiers'
    )
    return fallback
  }

  electronLogger.debug({ provider, hasKey: !!apiKey }, 'Fetching models from API')

  // Fetch from API
  let tiers = null
  switch (provider) {
    case 'openai':
      tiers = await fetchOpenAIModels(apiKey)
      break
    case 'anthropic':
      tiers = await fetchAnthropicModels(apiKey)
      break
    case 'google':
      tiers = await fetchGoogleModels(apiKey)
      break
    case 'openrouter':
      tiers = await fetchOpenRouterModels(apiKey)
      break
  }

  // Use fallback if fetch failed or returned empty tiers
  if (!tiers || (tiers.fast.length === 0 && tiers.default.length === 0)) {
    electronLogger.debug({ provider }, 'Fetch failed or empty, using fallback')
    tiers = FALLBACK_MODEL_TIERS[provider] || {
      fast: [],
      default: [],
      thinking: [],
    }
  } else {
    // Cache successful result
    modelCache.set(provider, { tiers, timestamp: Date.now() })
    electronLogger.info(
      {
        provider,
        fast: tiers.fast.length,
        default: tiers.default.length,
        thinking: tiers.thinking.length,
      },
      'Fetched and cached model tiers'
    )
  }

  return tiers
}

/**
 * Get all model tiers for all providers
 * @param {Record<string, string>} apiKeys - Map of provider to API key
 * @returns {Promise<Record<string, { fast: string[], default: string[], thinking: string[] }>>}
 */
export async function getModelTiers(apiKeys = {}) {
  const providers = ['openai', 'anthropic', 'google', 'openrouter']
  const result = {}

  // Fetch all providers in parallel
  const promises = providers.map(async (provider) => {
    const apiKey = apiKeys[`${provider}_api_key`] || apiKeys[provider]
    result[provider] = await getModelTiersForProvider(provider, apiKey)
  })

  await Promise.all(promises)
  return result
}

/**
 * Clear the model cache for a specific provider or all providers
 * @param {string} [provider] - Optional provider to clear, or all if not specified
 */
export function clearModelCache(provider) {
  if (provider) {
    modelCache.delete(provider)
    electronLogger.debug({ provider }, 'Cleared model cache for provider')
  } else {
    modelCache.clear()
    electronLogger.debug('Cleared all model caches')
  }
}

/**
 * Get the hardcoded fallback model tiers
 * @returns {Record<string, { fast: string[], default: string[], thinking: string[] }>}
 */
export function getFallbackModelTiers() {
  return FALLBACK_MODEL_TIERS
}

/**
 * Validate an API key by making a lightweight API call
 * @param {string} provider - Provider name (openai, anthropic, google)
 * @param {string} apiKey - API key to validate
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateApiKey(provider, apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is empty' }
  }

  try {
    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (response.ok) {
          return { valid: true }
        }
        const data = await response.json().catch(() => ({}))
        return { valid: false, error: data.error?.message || `HTTP ${response.status}` }
      }

      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        })
        if (response.ok) {
          return { valid: true }
        }
        const data = await response.json().catch(() => ({}))
        return { valid: false, error: data.error?.message || `HTTP ${response.status}` }
      }

      case 'google': {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        )
        if (response.ok) {
          return { valid: true }
        }
        const data = await response.json().catch(() => ({}))
        return { valid: false, error: data.error?.message || `HTTP ${response.status}` }
      }

      case 'openrouter': {
        // Use /api/v1/auth/key endpoint which requires valid authentication
        // The /models endpoint is public and doesn't validate the key
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (response.ok) {
          return { valid: true }
        }
        const data = await response.json().catch(() => ({}))
        return { valid: false, error: data.error?.message || data.error || `HTTP ${response.status}` }
      }

      default:
        return { valid: false, error: `Unknown provider: ${provider}` }
    }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}
