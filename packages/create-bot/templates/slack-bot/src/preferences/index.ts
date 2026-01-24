import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db'

export interface PreferencesContext {
  userId: string
  teamId: string
}

export interface UserPreferencesData {
  responseStyle?: string | null
  language?: string | null
  timezone?: string | null
}

/**
 * Get user preferences
 */
export async function getPreferences(
  context: PreferencesContext
): Promise<UserPreferencesData | null> {
  const [result] = await db
    .select()
    .from(schema.userPreferences)
    .where(
      and(
        eq(schema.userPreferences.teamId, context.teamId),
        eq(schema.userPreferences.userId, context.userId)
      )
    )
    .limit(1)

  return result ?? null
}

/**
 * Update user preferences (upsert)
 */
export async function updatePreferences(
  context: PreferencesContext,
  updates: Partial<UserPreferencesData>
): Promise<void> {
  const existing = await getPreferences(context)

  if (existing) {
    await db
      .update(schema.userPreferences)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userPreferences.teamId, context.teamId),
          eq(schema.userPreferences.userId, context.userId)
        )
      )
  } else {
    await db.insert(schema.userPreferences).values({
      teamId: context.teamId,
      userId: context.userId,
      ...updates,
    })
  }
}

/**
 * Build a preferences context section for the system prompt
 */
export function buildPreferencesContext(
  preferences: UserPreferencesData | null
): string {
  if (!preferences) {
    return ''
  }

  const parts: string[] = []

  if (preferences.responseStyle) {
    parts.push(`- Response style: ${preferences.responseStyle}`)
  }
  if (preferences.language) {
    parts.push(`- Preferred language: ${preferences.language}`)
  }
  if (preferences.timezone) {
    parts.push(`- Timezone: ${preferences.timezone}`)
  }

  if (parts.length === 0) {
    return ''
  }

  return `## User Preferences
${parts.join('\n')}`
}
