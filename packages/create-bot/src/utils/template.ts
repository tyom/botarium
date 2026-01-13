import Handlebars from 'handlebars'

export interface TemplateContext {
  // Bot configuration
  botName: string // e.g., "my-bot"
  botNamePascal: string // e.g., "MyBot"
  packageName: string // e.g., "my-bot"

  // Selections
  useAi: boolean
  aiProvider?: 'openai' | 'anthropic' | 'google'
  dbAdapter: 'none' | 'sqlite' | 'postgres'

  // Derived flags for conditionals
  isAi: boolean
  isOpenai: boolean
  isAnthropic: boolean
  isGoogle: boolean
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
export function processTemplate(
  content: string,
  ctx: TemplateContext
): string {
  const template = Handlebars.compile(content, { noEscape: true })
  return template(ctx)
}

/**
 * Create template context from user selections.
 */
export function createTemplateContext(options: {
  botName: string
  useAi: boolean
  aiProvider?: 'openai' | 'anthropic' | 'google'
  dbAdapter: 'none' | 'sqlite' | 'postgres'
}): TemplateContext {
  return {
    botName: options.botName,
    botNamePascal: toPascalCase(options.botName),
    packageName: toPackageName(options.botName),
    useAi: options.useAi,
    aiProvider: options.aiProvider,
    dbAdapter: options.dbAdapter,
    isAi: options.useAi,
    isOpenai: options.aiProvider === 'openai',
    isAnthropic: options.aiProvider === 'anthropic',
    isGoogle: options.aiProvider === 'google',
    isDb: options.dbAdapter !== 'none',
    isSqlite: options.dbAdapter === 'sqlite',
    isPostgres: options.dbAdapter === 'postgres',
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
