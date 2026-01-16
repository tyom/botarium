import { memoryStore } from '../memory/store'
import { getErrorMessage } from '../utils/error'
import { preferencesLogger } from '../utils/logger'

export interface UserPreferences {
  responseStyle: 'concise' | 'detailed' | 'balanced'
  language: string
  timezone: string
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  responseStyle: 'balanced',
  language: 'en',
  timezone: 'UTC',
}

const PREFERENCE_KEY_SUFFIX = ':preferences'

const lockChains = new Map<string, Promise<void>>()

async function withLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const currentChain = lockChains.get(userId) ?? Promise.resolve()

  const run = currentChain.catch(() => undefined).then(fn)
  const chain: Promise<void> = run.then(
    () => {},
    () => {}
  )
  lockChains.set(userId, chain)
  try {
    return await run
  } finally {
    if (lockChains.get(userId) === chain) {
      lockChains.delete(userId)
    }
  }
}

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  preferencesLogger.debug({ userId }, 'Loading preferences')

  const defaults = { ...DEFAULT_PREFERENCES }

  const key = `${userId}${PREFERENCE_KEY_SUFFIX}`
  const stored = await memoryStore.retrieve('preference', key)

  if (stored) {
    try {
      const savedPrefs = JSON.parse(stored.content) as Partial<UserPreferences>
      preferencesLogger.debug({ prefs: savedPrefs }, 'Loaded saved preferences')
      return { ...defaults, ...savedPrefs }
    } catch (error) {
      preferencesLogger.error(
        { err: error },
        'Failed to parse stored preferences'
      )
    }
  }

  preferencesLogger.debug({ defaults }, 'Using defaults')
  return defaults
}

export async function saveUserPreferences(
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  preferencesLogger.debug({ userId, prefs }, 'Saving preferences')

  await withLock(userId, async () => {
    const key = `${userId}${PREFERENCE_KEY_SUFFIX}`

    const stored = await memoryStore.retrieve('preference', key)
    let existingPrefs: Partial<UserPreferences> = {}

    if (stored) {
      try {
        existingPrefs = JSON.parse(stored.content)
      } catch {
        // Ignore parse errors, start fresh
      }
    }

    const merged = { ...existingPrefs, ...prefs }

    await memoryStore.store({
      category: 'preference',
      key,
      content: JSON.stringify(merged),
      tags: ['user-preference'],
    })

    preferencesLogger.debug('Saved successfully')
  })
}

const RESPONSE_STYLE_ALIASES: Record<string, UserPreferences['responseStyle']> =
  {
    concise: 'concise',
    brief: 'concise',
    short: 'concise',
    detailed: 'detailed',
    verbose: 'detailed',
    long: 'detailed',
    balanced: 'balanced',
    normal: 'balanced',
    default: 'balanced',
  }

export function normalizeResponseStyle(
  value: string
): UserPreferences['responseStyle'] | null {
  return RESPONSE_STYLE_ALIASES[value.toLowerCase().trim()] ?? null
}

export function normalizeTimezone(value: string): string | null {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value })
    return value
  } catch {
    return null
  }
}
