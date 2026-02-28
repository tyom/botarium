// Single source of truth for available options
export const BOT_TEMPLATES = ['slack'] as const
export const AI_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
] as const

// Derive types from const arrays
export type BotTemplate = (typeof BOT_TEMPLATES)[number]
export type AiProvider = (typeof AI_PROVIDERS)[number]

export interface TemplateVars {
  botName: string // e.g., "my-bot"
  botNamePascal: string // e.g., "MyBot"
  packageName: string // e.g., "my-bot"
}

/**
 * Create template variables from bot name.
 */
export function createTemplateVars(botName: string): TemplateVars {
  return {
    botName,
    botNamePascal: toPascalCase(botName),
    packageName: toPackageName(botName),
  }
}

/** File extensions eligible for variable interpolation. */
const INTERPOLATABLE_EXTENSIONS = new Set(['.ts', '.json', '.md', '.yaml'])

/** Full file names eligible for variable interpolation. */
const INTERPOLATABLE_NAMES = new Set(['.env.example'])

/**
 * Check whether a file should have `{{ var }}` placeholders replaced.
 */
export function isInterpolatable(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  if (INTERPOLATABLE_EXTENSIONS.has(ext)) {
    return true
  }
  const basename = filePath.slice(
    Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')) + 1
  )
  return INTERPOLATABLE_NAMES.has(basename)
}

/**
 * Simple `{{ var }}` replacement — no template engine required.
 * Unknown variables are preserved as-is.
 */
export function interpolate(content: string, vars: TemplateVars): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVars]
    return value !== undefined ? value : match
  })
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
