import fs from 'fs'
import path from 'path'
import {
  processTemplate,
  createTemplateContext,
  type TemplateContext,
  type BotTemplate,
  type DbAdapter,
} from './utils/template'

// ============================================================================
// Constants
// ============================================================================

const TEMPLATES_DIR = path.join(import.meta.dirname, '../templates')

/** Template directory names by template type */
const TEMPLATE_DIRS: Record<BotTemplate, string> = {
  slack: 'slack-bot',
}

/** File extensions that should be processed as templates */
const TEMPLATE_EXTENSIONS = new Set([
  '.tmpl',
  '.ts',
  '.json',
  '.md',
  '.yaml',
  '.env.example',
])

/** Directories to skip when AI is not enabled */
const AI_DEPENDENT_DIRS = new Set(['ai'])

/** Directories to skip when database is not enabled */
const DB_DEPENDENT_DIRS = new Set(['db', 'memory', 'preferences'])

/** Files to skip when database is not enabled (prefix match) */
const DB_DEPENDENT_FILE_PREFIXES = ['drizzle.config']

// ============================================================================
// Types
// ============================================================================

export interface ScaffoldOptions {
  botName: string
  template: BotTemplate
  useAi: boolean
  dbAdapter: DbAdapter
  targetDir?: string
  overwrite?: boolean
}

interface SkipRules {
  directories: Set<string>
  filePrefixes: string[]
  fileExclusions: Map<string, (ctx: TemplateContext) => boolean>
}

// ============================================================================
// Skip Rules
// ============================================================================

/**
 * Build skip rules based on template context.
 * This centralizes all the conditional skip logic.
 */
function buildSkipRules(ctx: TemplateContext): SkipRules {
  const directories = new Set<string>()
  const filePrefixes: string[] = []
  const fileExclusions = new Map<string, (ctx: TemplateContext) => boolean>()

  // AI-dependent directories
  if (!ctx.isAi) {
    AI_DEPENDENT_DIRS.forEach((dir) => directories.add(dir))
  }

  // DB-dependent directories and files
  if (!ctx.isDb) {
    DB_DEPENDENT_DIRS.forEach((dir) => directories.add(dir))
    filePrefixes.push(...DB_DEPENDENT_FILE_PREFIXES)
  }

  // Database adapter file exclusions (skip the one not selected)
  fileExclusions.set('sqlite.ts', (c) => c.isPostgres)
  fileExclusions.set('postgres.ts', (c) => c.isSqlite)

  // AI-dependent files (skip when AI is not enabled)
  fileExclusions.set('reactions.ts', (c) => !c.isAi)

  return { directories, filePrefixes, fileExclusions }
}

function shouldSkip(
  name: string,
  isDirectory: boolean,
  rules: SkipRules,
  ctx: TemplateContext
): boolean {
  if (isDirectory) {
    return rules.directories.has(name)
  }

  // Check prefix matches
  if (rules.filePrefixes.some((prefix) => name.startsWith(prefix))) {
    return true
  }

  // Check specific file exclusions
  const exclusionFn = rules.fileExclusions.get(name)
  if (exclusionFn && exclusionFn(ctx)) {
    return true
  }

  return false
}

// ============================================================================
// File Operations
// ============================================================================

function isTemplateFile(filePath: string): boolean {
  const ext = path.extname(filePath)
  if (TEMPLATE_EXTENSIONS.has(ext)) {
    return true
  }
  // Handle compound extensions like .env.example
  const basename = path.basename(filePath)
  return TEMPLATE_EXTENSIONS.has('.' + basename.split('.').slice(1).join('.'))
}

function getDestinationName(name: string): string {
  // Remove .tmpl extension
  return name.endsWith('.tmpl') ? name.slice(0, -5) : name
}

async function copyFile(
  src: string,
  dest: string,
  ctx: TemplateContext
): Promise<void> {
  if (isTemplateFile(src)) {
    const content = fs.readFileSync(src, 'utf-8')
    const processed = processTemplate(content, ctx)
    fs.writeFileSync(dest, processed)
  } else {
    fs.copyFileSync(src, dest)
  }
}

async function copyDirectory(
  src: string,
  dest: string,
  ctx: TemplateContext,
  rules: SkipRules
): Promise<void> {
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    if (shouldSkip(entry.name, entry.isDirectory(), rules, ctx)) {
      continue
    }

    const srcPath = path.join(src, entry.name)
    const destName = getDestinationName(entry.name)
    const destPath = path.join(dest, destName)

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      await copyDirectory(srcPath, destPath, ctx, rules)
    } else {
      await copyFile(srcPath, destPath, ctx)
    }
  }
}

// ============================================================================
// JSON Cleanup
// ============================================================================

/**
 * Clean JSON by removing trailing commas and reformatting.
 * Handles artifacts from Handlebars conditionals in JSON files.
 */
export function cleanJson(content: string): string {
  // Remove trailing commas before closing braces/brackets
  const cleaned = content.replace(/,(\s*[}\]])/g, '$1')

  try {
    const parsed = JSON.parse(cleaned)
    return JSON.stringify(parsed, null, 2) + '\n'
  } catch {
    return cleaned
  }
}

function cleanupPackageJson(targetDir: string): void {
  const packageJsonPath = path.join(targetDir, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const content = fs.readFileSync(packageJsonPath, 'utf-8')
    fs.writeFileSync(packageJsonPath, cleanJson(content))
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Scaffold a new bot from the template.
 */
export async function scaffold(options: ScaffoldOptions): Promise<string> {
  const templateDir = path.join(TEMPLATES_DIR, TEMPLATE_DIRS[options.template])
  const targetDir = path.resolve(options.targetDir || options.botName)

  // Verify template exists
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template not found: ${options.template}`)
  }

  // Prepare target directory
  if (options.overwrite && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true })
  }
  fs.mkdirSync(targetDir, { recursive: true })

  // Build context and skip rules
  const ctx = createTemplateContext({
    botName: options.botName,
    useAi: options.useAi,
    dbAdapter: options.dbAdapter,
  })
  const rules = buildSkipRules(ctx)

  // Copy template files
  await copyDirectory(templateDir, targetDir, ctx, rules)

  // Clean up generated JSON
  cleanupPackageJson(targetDir)

  return targetDir
}
