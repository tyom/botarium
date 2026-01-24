import type { Choice } from 'prompts'
import {
  BOT_TEMPLATES,
  DB_ADAPTERS,
  type BotTemplate,
  type DbAdapter,
} from './template'

/**
 * Display metadata for prompt choices.
 * Kept separate from the core types to maintain single source of truth.
 */

// Template display info
const TEMPLATE_DISPLAY: Record<
  BotTemplate,
  { title: string; description: string }
> = {
  slack: { title: 'Slack', description: 'Slack bot using Bolt SDK' },
}

// Database display info
const DATABASE_DISPLAY: Record<
  DbAdapter,
  { title: string; description?: string }
> = {
  none: { title: 'None' },
  sqlite: { title: 'SQLite', description: 'Recommended for getting started' },
  postgres: { title: 'PostgreSQL' },
}

/**
 * Build choices array for prompts library from source of truth arrays.
 */

export function getTemplateChoices(): Choice[] {
  return BOT_TEMPLATES.map((value) => ({
    value,
    title: TEMPLATE_DISPLAY[value].title,
    description: TEMPLATE_DISPLAY[value].description,
  }))
}

export function getDatabaseChoices(): Choice[] {
  return DB_ADAPTERS.map((value) => ({
    value,
    title: DATABASE_DISPLAY[value].title,
    description: DATABASE_DISPLAY[value].description,
  }))
}

export function getAiMemoryChoices(): Choice[] {
  return [
    { value: 'sqlite', title: 'Yes', description: 'Remember facts and preferences across conversations' },
    { value: 'none', title: 'No' },
  ]
}

/**
 * Validation helpers that work with the source of truth arrays.
 */

export function isValidTemplate(value: string): value is BotTemplate {
  return (BOT_TEMPLATES as readonly string[]).includes(value)
}

export function isValidDatabase(value: string): value is DbAdapter {
  return (DB_ADAPTERS as readonly string[]).includes(value)
}

/**
 * Generic option validator with error logging.
 * Returns the validated value or null if invalid.
 */
export function validateOption<T extends string>(
  value: string,
  validValues: readonly T[],
  optionName: string
): T | null {
  if ((validValues as readonly string[]).includes(value)) {
    return value as T
  }
  console.error(
    `Invalid ${optionName}: ${value}. Available: ${validValues.join(', ')}`
  )
  return null
}
