/**
 * Config Response Builder
 *
 * Transforms a ConfigFile into a ConfigResponse suitable for the /config endpoint.
 * Handles secret filtering, env override detection, and emulator-injected vars.
 */

import type { ConfigFile, ConfigResponse, SettingSchema } from './types.ts'

/**
 * Build the config response from a ConfigFile, excluding secret values.
 *
 * - Non-secret settings: includes their value (from env or config)
 * - Secret settings with env vars: includes the env value (for override display)
 * - Secret settings without env vars: returns empty string
 * - envOverrides: tracks settings whose value comes from env (excluding emulator-injected)
 * - model_tiers: passed through from config (empty object if undefined)
 */
export function buildConfigResponse(config: ConfigFile): ConfigResponse {
  const values: Record<string, unknown> = {}
  const settingsSchema: Record<string, SettingSchema> = {}
  const envOverrides: string[] = []

  // Get list of vars injected by emulator (not user-set in .env)
  const injectedVars = new Set(
    (process.env._EMULATOR_INJECTED_VARS || '').split(',').filter(Boolean)
  )

  for (const [key, def] of Object.entries(config.settings)) {
    // Always include schema
    settingsSchema[key] = def.schema

    // Track which settings have values set via environment variables
    // Exclude vars that were auto-injected by the emulator (not from user's .env)
    if (def.env && process.env[def.env] && !injectedVars.has(def.env)) {
      envOverrides.push(key)
    }

    // Include values for non-secrets
    // For secrets, include value only if set via env var (for env override display)
    if (def.schema.type === 'secret') {
      values[key] = def.env && process.env[def.env] ? process.env[def.env] : ''
    } else if (def.env) {
      // Value comes from env var
      values[key] = process.env[def.env] ?? def.value ?? ''
    } else {
      values[key] = def.value ?? ''
    }
  }

  return {
    schema: {
      settings: settingsSchema,
      groups: config.groups,
      model_tiers: config.model_tiers ?? {},
    },
    values,
    envOverrides,
  }
}
