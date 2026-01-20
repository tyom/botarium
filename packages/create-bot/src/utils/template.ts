import Handlebars from 'handlebars'

export type AiProvider = 'openai' | 'anthropic' | 'google' | 'openrouter'
export type DbAdapter = 'none' | 'sqlite' | 'postgres'

export interface TemplateContext {
  // Bot configuration
  botName: string // e.g., "my-bot"
  botNamePascal: string // e.g., "MyBot"
  packageName: string // e.g., "my-bot"

  // Selections
  aiProvider?: AiProvider
  dbAdapter: DbAdapter

  // Derived flags for conditionals
  isAi: boolean
  isOpenai: boolean
  isAnthropic: boolean
  isGoogle: boolean
  isOpenrouter: boolean
  isDb: boolean
  isSqlite: boolean
  isPostgres: boolean
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
  aiProvider?: AiProvider
  dbAdapter: DbAdapter
}

/**
 * Create template context from user selections.
 */
export function createTemplateContext(
  options: TemplateOptions
): TemplateContext {
  const { botName, useAi, aiProvider, dbAdapter } = options

  return {
    botName,
    botNamePascal: toPascalCase(botName),
    packageName: toPackageName(botName),
    aiProvider,
    dbAdapter,
    isAi: useAi,
    isOpenai: aiProvider === 'openai',
    isAnthropic: aiProvider === 'anthropic',
    isGoogle: aiProvider === 'google',
    isOpenrouter: aiProvider === 'openrouter',
    isDb: dbAdapter !== 'none',
    isSqlite: dbAdapter === 'sqlite',
    isPostgres: dbAdapter === 'postgres',
  }
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
