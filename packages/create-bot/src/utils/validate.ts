import path from 'path'
import fs from 'fs'

// ============================================================================
// Types
// ============================================================================

export type ValidationResult = { valid: true } | { valid: false; error: string }

export interface DirectoryCheck {
  exists: boolean
  isEmpty: boolean
  path: string
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for npm package names */
const NPM_PACKAGE_NAME_MAX_LENGTH = 214

/**
 * Files that should be ignored when checking if a directory is "empty".
 * These are typically auto-generated or version control files.
 */
const IGNORABLE_FILES = new Set(['.git', '.gitignore', '.DS_Store'])

/**
 * Files that indicate real content even if they start with a dot.
 */
const MEANINGFUL_DOT_FILES = new Set(['.env', '.eslintrc', '.prettierrc'])

/**
 * Validation rules for bot names.
 * Each rule has a test function and an error message if the test fails.
 */
const BOT_NAME_RULES: Array<{
  test: (name: string) => boolean
  error: string
}> = [
  {
    test: (name) => name.length > 0,
    error: 'Bot name is required',
  },
  {
    test: (name) => name.length <= NPM_PACKAGE_NAME_MAX_LENGTH,
    error: `Name must be less than ${NPM_PACKAGE_NAME_MAX_LENGTH} characters`,
  },
  {
    test: (name) => /^[a-z0-9]/.test(name),
    error: 'Name must start with a lowercase letter or number',
  },
  {
    test: (name) => /^[a-z0-9._-]+$/.test(name),
    error:
      'Name can only contain lowercase letters, numbers, hyphens, dots, and underscores',
  },
]

// ============================================================================
// Functions
// ============================================================================

/**
 * Validate bot name for npm package naming conventions.
 */
export function validateBotName(name: string): ValidationResult {
  for (const rule of BOT_NAME_RULES) {
    if (!rule.test(name)) {
      return { valid: false, error: rule.error }
    }
  }
  return { valid: true }
}

/**
 * Legacy validator for prompts library compatibility.
 * Returns true if valid, or an error string if invalid.
 */
export function validateBotNameForPrompts(name: string): string | true {
  const result = validateBotName(name)
  return result.valid ? true : result.error
}

/**
 * Determines if a file should be ignored when checking directory emptiness.
 */
function isIgnorableFile(filename: string): boolean {
  if (IGNORABLE_FILES.has(filename)) {
    return true
  }
  // Ignore hidden files except for meaningful ones
  if (filename.startsWith('.') && !MEANINGFUL_DOT_FILES.has(filename)) {
    return true
  }
  return false
}

/**
 * Check if target directory exists and is empty.
 */
export function checkTargetDirectory(targetDir: string): DirectoryCheck {
  const absolutePath = path.resolve(targetDir)
  const exists = fs.existsSync(absolutePath)

  let isEmpty = true
  if (exists) {
    const files = fs.readdirSync(absolutePath)
    const meaningfulFiles = files.filter((f) => !isIgnorableFile(f))
    isEmpty = meaningfulFiles.length === 0
  }

  return {
    exists,
    isEmpty,
    path: absolutePath,
  }
}
