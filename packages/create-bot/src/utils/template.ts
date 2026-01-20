import Handlebars from 'handlebars'

// Single source of truth for available options
export const BOT_TEMPLATES = ['slack'] as const
export const AI_PROVIDERS = ['openai', 'anthropic', 'google', 'openrouter'] as const
export const DB_ADAPTERS = ['none', 'sqlite', 'postgres'] as const

// Derive types from const arrays
export type BotTemplate = (typeof BOT_TEMPLATES)[number]
export type AiProvider = (typeof AI_PROVIDERS)[number]
export type DbAdapter = (typeof DB_ADAPTERS)[number]

// Helper types for derived boolean flags
type AdapterFlags = Record<`is${Capitalize<Exclude<DbAdapter, 'none'>>}`, boolean>

export interface TemplateContext extends AdapterFlags {
  // Bot configuration
  botName: string // e.g., "my-bot"
  botNamePascal: string // e.g., "MyBot"
  packageName: string // e.g., "my-bot"

  // Selections
  dbAdapter: DbAdapter

  // Derived flags for conditionals
  isAi: boolean
  isDb: boolean
}

/**
 * Process template content using Handlebars.
 *
 * Syntax:
 * - {{name}} - Variable replacement
 * - {{#if condition}}...{{/if}} - Conditional blocks
 * - {{~#if condition}}...{{~/if}} - Conditional with whitespace trimming
 */
export function processTemplate(content: string, ctx: TemplateContext): string {
  const template = Handlebars.compile(content, { noEscape: true })
  return template(ctx)
}

export interface TemplateOptions {
  botName: string
  useAi: boolean
  dbAdapter: DbAdapter
}

/**
 * Create template context from user selections.
 * Boolean flags are auto-derived from adapter values.
 */
export function createTemplateContext(
  options: TemplateOptions
): TemplateContext {
  const { botName, useAi, dbAdapter } = options

  // Auto-derive boolean flags for each adapter (except 'none')
  const adapterFlags = Object.fromEntries(
    DB_ADAPTERS.filter((a) => a !== 'none').map((a) => [
      `is${capitalize(a)}`,
      dbAdapter === a,
    ])
  ) as Record<`is${Capitalize<Exclude<DbAdapter, 'none'>>}`, boolean>

  return {
    botName,
    botNamePascal: toPascalCase(botName),
    packageName: toPackageName(botName),
    dbAdapter,
    isAi: useAi,
    isDb: dbAdapter !== 'none',
    ...adapterFlags,
  }
}

function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}

export function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

export function toPackageName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
