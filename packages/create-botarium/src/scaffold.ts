import fs from 'fs'
import path from 'path'
import {
  interpolate,
  isInterpolatable,
  createTemplateVars,
  type TemplateVars,
  type BotTemplate,
} from './utils/template'

// ============================================================================
// Constants
// ============================================================================

const TEMPLATES_DIR = path.join(import.meta.dirname, '../templates')

/** Template directory names by template type */
const TEMPLATE_DIRS: Record<BotTemplate, string> = {
  slack: 'slack-bot',
}

// ============================================================================
// Types
// ============================================================================

export interface ScaffoldOptions {
  botName: string
  template: BotTemplate
  useAi: boolean
  useObservability: boolean
  useResilience: boolean
  targetDir?: string
  overwrite?: boolean
}

export type FeatureName = 'ai' | 'observability' | 'resilience'

/** Features are applied in this order. */
const FEATURE_ORDER: FeatureName[] = ['ai', 'observability', 'resilience']

// ============================================================================
// Helpers
// ============================================================================

/**
 * Derive the list of selected features from scaffold options.
 */
function getSelectedFeatures(options: ScaffoldOptions): FeatureName[] {
  const selected: FeatureName[] = []
  if (options.useAi) selected.push('ai')
  if (options.useObservability) selected.push('observability')
  if (options.useResilience) selected.push('resilience')
  // Maintain canonical order
  return FEATURE_ORDER.filter((f) => selected.includes(f))
}

/**
 * Recursively copy `srcDir` into `targetDir`, running variable interpolation
 * on eligible files. Existing files in `targetDir` are overwritten.
 */
function copyOverlay(
  srcDir: string,
  targetDir: string,
  vars: TemplateVars
): void {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name)
    const destPath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true })
      copyOverlay(srcPath, destPath, vars)
    } else {
      if (isInterpolatable(entry.name)) {
        const content = fs.readFileSync(srcPath, 'utf-8')
        fs.writeFileSync(destPath, interpolate(content, vars))
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

/**
 * Read each selected feature's `deps.json` and merge the dependencies into
 * the target project's `package.json`.
 */
function mergeFeatureDeps(
  targetDir: string,
  templateDir: string,
  selected: FeatureName[]
): void {
  const packageJsonPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) return

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  for (const feature of selected) {
    const depsPath = path.join(templateDir, 'features', feature, 'deps.json')
    if (!fs.existsSync(depsPath)) continue

    const featureDeps = JSON.parse(fs.readFileSync(depsPath, 'utf-8'))
    pkg.dependencies = { ...pkg.dependencies, ...featureDeps }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n')
}

/**
 * Return combination directory names whose constituent features are all
 * selected. E.g. if `['ai', 'resilience']` are selected, `"ai+resilience"`
 * matches but `"ai+observability"` does not.
 */
function getApplicableCombinations(
  selected: FeatureName[],
  combinationsDir: string
): string[] {
  if (!fs.existsSync(combinationsDir)) return []

  const combos = fs
    .readdirSync(combinationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  // Sort by number of constituents (pairs before triples)
  combos.sort((a, b) => a.split('+').length - b.split('+').length)

  return combos.filter((combo) => {
    const parts = combo.split('+')
    return parts.every((p) => selected.includes(p as FeatureName))
  })
}

/**
 * Create .env from .env.example so the bot is ready to configure.
 */
function createEnvFile(targetDir: string): void {
  const envExamplePath = path.join(targetDir, '.env.example')
  const envPath = path.join(targetDir, '.env')
  if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath)
  }
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Scaffold a new bot from the template using base + feature overlay composition.
 *
 * 1. Copy base/ → target
 * 2. For each selected feature: overlay features/{name}/files/ → target
 * 3. For each applicable combination: overlay combinations/{combo}/files/ → target
 * 4. Merge feature deps.json into package.json
 * 5. Copy .env.example → .env
 */
export async function scaffold(options: ScaffoldOptions): Promise<string> {
  const templateName = TEMPLATE_DIRS[options.template]
  if (!templateName) {
    throw new Error(`Template not found: ${options.template}`)
  }

  const templateDir = path.join(TEMPLATES_DIR, templateName)
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

  const vars = createTemplateVars(options.botName)
  const selected = getSelectedFeatures(options)

  // 1. Copy base
  const baseDir = path.join(templateDir, 'base')
  copyOverlay(baseDir, targetDir, vars)

  // 2. Apply feature overlays (in canonical order)
  for (const feature of selected) {
    const featureFilesDir = path.join(templateDir, 'features', feature, 'files')
    if (fs.existsSync(featureFilesDir)) {
      copyOverlay(featureFilesDir, targetDir, vars)
    }
  }

  // 3. Apply combination overlays (pairs first, then triples)
  const combinationsDir = path.join(templateDir, 'combinations')
  const combos = getApplicableCombinations(selected, combinationsDir)
  for (const combo of combos) {
    const comboFilesDir = path.join(combinationsDir, combo, 'files')
    if (fs.existsSync(comboFilesDir)) {
      copyOverlay(comboFilesDir, targetDir, vars)
    }
  }

  // 4. Merge feature dependencies
  mergeFeatureDeps(targetDir, templateDir, selected)

  // 5. Create .env from .env.example
  createEnvFile(targetDir)

  return targetDir
}
