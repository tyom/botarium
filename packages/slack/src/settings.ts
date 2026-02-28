import { z } from 'zod'
import type { BaseSettings } from './types'

export const isSimulatorMode = Boolean(process.env.SLACK_API_URL)

function getBaseShape() {
  return {
    SLACK_BOT_TOKEN: isSimulatorMode
      ? z.string().default('xoxb-local')
      : z.string().startsWith('xoxb-'),
    SLACK_APP_TOKEN: isSimulatorMode
      ? z.string().default('xapp-local')
      : z.string().startsWith('xapp-'),
    SLACK_SIGNING_SECRET: isSimulatorMode
      ? z.string().default('local')
      : z.string().min(1),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z
      .enum(['silent', 'debug', 'info', 'warn', 'error'])
      .default('info'),
  }
}

async function fetchSimulatorSettings(): Promise<Record<string, string>> {
  if (!isSimulatorMode) return {}

  const slackApiUrl = process.env.SLACK_API_URL
  if (!slackApiUrl) return {}

  const baseUrl = slackApiUrl.replace(/\/api\/?$/, '')

  try {
    const response = await fetch(`${baseUrl}/api/simulator/settings`)
    if (response.ok) {
      const data = (await response.json()) as {
        ok: boolean
        settings?: Record<string, string>
      }
      return data.settings ?? {}
    }
  } catch {
    // Emulator not available, use env vars only
  }

  return {}
}

export interface CreateSettingsResult<S> {
  settings: S
  reloadSettings(): Promise<void>
  isSimulatorMode: boolean
}

// Zod schema merging requires type assertions because the merged schema
// type cannot be statically inferred across dynamic .merge() calls.
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function createSettings<S = Record<string, never>>(options?: {
  env?: z.ZodType<S>
}): Promise<CreateSettingsResult<BaseSettings & S>> {
  // Build combined schema by merging base + user env
  let schema: z.ZodType = z.object(getBaseShape()) as z.ZodType

  if (options?.env) {
    // Generic ZodType→ZodObject cast required for merge compatibility
    schema = (schema as z.ZodObject<any>).merge(
      options.env as unknown as z.ZodObject<any>
    )
  }

  async function loadSettings() {
    const simulatorSettings = await fetchSimulatorSettings()

    // Merge: env vars take precedence over simulator settings
    const mergedEnv = { ...simulatorSettings, ...process.env }

    const result = (schema as z.ZodObject<any>).safeParse(mergedEnv)

    if (!result.success) {
      console.error('Invalid environment configuration:')
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`)
      }
      throw new Error(
        'Failed to load settings. Check your environment variables.'
      )
    }

    return result.data
  }

  // Initial load
  const initialData = await loadSettings()

  // Mutable settings object — reloadSettings updates properties in place
  const settings = { ...initialData } as BaseSettings & S

  async function reloadSettings() {
    const newData = await loadSettings()
    // Clear existing keys and apply new data in place
    const settingsRecord = settings as Record<string, unknown>
    for (const key of Object.keys(settingsRecord)) {
      delete settingsRecord[key]
    }
    Object.assign(settingsRecord, newData)
  }

  return { settings, reloadSettings, isSimulatorMode }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
