import fs from 'fs'
import path from 'path'
import {
  processTemplate,
  createTemplateContext,
  type TemplateContext,
  type AiProvider,
  type DbAdapter,
} from './utils/template'
import type { BotTemplate } from './prompts'

const TEMPLATES_DIR = path.join(import.meta.dirname, '../templates')

/**
 * Get the template directory for a given template type.
 */
function getTemplateDir(template: BotTemplate): string {
  const templateMap: Record<BotTemplate, string> = {
    slack: 'slack-bot',
    // Future templates:
    // discord: 'discord-bot',
    // teams: 'teams-bot',
  }
  return path.join(TEMPLATES_DIR, templateMap[template])
}

export interface ScaffoldOptions {
  botName: string
  template: BotTemplate
  useAi: boolean
  aiProvider?: AiProvider
  dbAdapter: DbAdapter
  targetDir?: string
  overwrite?: boolean
}

/**
 * Scaffold a new bot from the template.
 */
export async function scaffold(options: ScaffoldOptions): Promise<string> {
  const templateDir = getTemplateDir(options.template)
  const targetDir = path.resolve(options.targetDir || options.botName)
  const ctx = createTemplateContext({
    botName: options.botName,
    useAi: options.useAi,
    aiProvider: options.aiProvider,
    dbAdapter: options.dbAdapter,
  })

  // Verify template exists
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template not found: ${options.template}`)
  }

  // Create target directory
  if (options.overwrite && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true })
  }
  fs.mkdirSync(targetDir, { recursive: true })

  // Copy template files
  await copyDirectory(templateDir, targetDir, ctx)

  // Clean up package.json (remove trailing commas from conditionals)
  const packageJsonPath = path.join(targetDir, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    const cleaned = cleanJson(content)
    fs.writeFileSync(packageJsonPath, cleaned)
  }

  return targetDir
}

/**
 * Recursively copy a directory, processing templates.
 */
async function copyDirectory(
  src: string,
  dest: string,
  ctx: TemplateContext
): Promise<void> {
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    let destName = entry.name

    // Remove .tmpl extension
    if (destName.endsWith('.tmpl')) {
      destName = destName.slice(0, -5)
    }

    const destPath = path.join(dest, destName)

    if (entry.isDirectory()) {
      // Skip directories based on context
      if (shouldSkipDirectory(entry.name, ctx)) {
        continue
      }
      fs.mkdirSync(destPath, { recursive: true })
      await copyDirectory(srcPath, destPath, ctx)
    } else {
      await copyFile(srcPath, destPath, ctx)
    }
  }
}

/**
 * Directories to skip based on context.
 */
function shouldSkipDirectory(dirName: string, ctx: TemplateContext): boolean {
  // Skip AI-related directories when AI is disabled
  if (!ctx.isAi && dirName === 'ai') {
    return true
  }

  // Skip DB-related directories when no database selected
  // memory and preferences depend on db
  if (
    !ctx.isDb &&
    (dirName === 'db' || dirName === 'memory' || dirName === 'preferences')
  ) {
    return true
  }

  return false
}

/**
 * Check if a file should be skipped based on context.
 */
function shouldSkipFile(src: string, ctx: TemplateContext): boolean {
  const filename = path.basename(src)

  // Skip drizzle config when no database
  if (!ctx.isDb && filename.startsWith('drizzle.config')) {
    return true
  }

  // Skip database adapter files based on selected adapter
  if (filename === 'sqlite.ts' && ctx.isPostgres) {
    return true
  }
  if (filename === 'postgres.ts' && ctx.isSqlite) {
    return true
  }

  return false
}

/**
 * Copy a single file, processing templates if needed.
 */
async function copyFile(
  src: string,
  dest: string,
  ctx: TemplateContext
): Promise<void> {
  // Skip files that don't apply to this configuration
  if (shouldSkipFile(src, ctx)) {
    return
  }

  const isTemplate =
    src.endsWith('.tmpl') ||
    src.endsWith('.ts') ||
    src.endsWith('.json') ||
    src.endsWith('.md') ||
    src.endsWith('.yaml') ||
    src.endsWith('.env.example')

  if (isTemplate) {
    const content = fs.readFileSync(src, 'utf-8')
    const processed = processTemplate(content, ctx)
    fs.writeFileSync(dest, processed)
  } else {
    fs.copyFileSync(src, dest)
  }
}

/**
 * Clean JSON by removing trailing commas before closing braces/brackets.
 */
function cleanJson(content: string): string {
  // Remove trailing commas
  const cleaned = content.replace(/,(\s*[}\]])/g, '$1')

  // Validate and format
  try {
    const parsed = JSON.parse(cleaned)
    return JSON.stringify(parsed, null, 2) + '\n'
  } catch {
    // If parsing fails, return original cleaned content
    return cleaned
  }
}
