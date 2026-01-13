import path from 'path'
import fs from 'fs'

/**
 * Validate bot name for npm package naming conventions.
 */
export function validateBotName(name: string): string | true {
  if (!name) {
    return 'Bot name is required'
  }

  if (name.length > 214) {
    return 'Name must be less than 214 characters'
  }

  if (!/^[a-z0-9]/.test(name)) {
    return 'Name must start with a lowercase letter or number'
  }

  if (!/^[a-z0-9._-]+$/.test(name)) {
    return 'Name can only contain lowercase letters, numbers, hyphens, dots, and underscores'
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    return 'Name cannot start with a dot or underscore'
  }

  return true
}

/**
 * Check if target directory exists and is empty.
 */
export function checkTargetDirectory(targetDir: string): {
  exists: boolean
  isEmpty: boolean
  path: string
} {
  const absolutePath = path.resolve(targetDir)
  const exists = fs.existsSync(absolutePath)

  let isEmpty = true
  if (exists) {
    const files = fs.readdirSync(absolutePath)
    // Allow .git and similar hidden files
    const meaningfulFiles = files.filter(
      (f) => !f.startsWith('.') || f === '.env'
    )
    isEmpty = meaningfulFiles.length === 0
  }

  return {
    exists,
    isEmpty,
    path: absolutePath,
  }
}
