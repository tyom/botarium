import type { Choice } from 'prompts'
import { BOT_TEMPLATES, type BotTemplate } from 'create-botarium'

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

/**
 * Validation helpers that work with the source of truth arrays.
 */

export function isValidTemplate(value: string): value is BotTemplate {
  return (BOT_TEMPLATES as readonly string[]).includes(value)
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
