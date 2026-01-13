/**
 * Compile bots from bots.yaml for bundling with the Electron app.
 * Each bot is compiled to a standalone binary in dist/bots/{name}
 */

import { $ } from 'bun'
import path from 'path'
import fs from 'fs'

interface BotConfig {
  name: string
  source: string
  entry?: string
}

interface BotsYaml {
  bots?: BotConfig[]
}

const ROOT_DIR = path.join(import.meta.dir, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist', 'bots')
const YAML_PATH = path.join(ROOT_DIR, 'bots.yaml')

// Simple YAML parser for our specific format
function parseBotsYaml(content: string): BotsYaml {
  const bots: BotConfig[] = []
  let currentBot: Partial<BotConfig> | null = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || trimmed === '') continue
    if (trimmed === 'bots:') continue

    if (trimmed.startsWith('- name:')) {
      if (currentBot && currentBot.name && currentBot.source) {
        bots.push(currentBot as BotConfig)
      }
      currentBot = { name: trimmed.replace('- name:', '').trim() }
    } else if (trimmed.startsWith('source:') && currentBot) {
      currentBot.source = trimmed.replace('source:', '').trim()
    } else if (trimmed.startsWith('entry:') && currentBot) {
      currentBot.entry = trimmed.replace('entry:', '').trim()
    }
  }

  if (currentBot && currentBot.name && currentBot.source) {
    bots.push(currentBot as BotConfig)
  }

  return { bots }
}

async function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.log('No bots.yaml found - nothing to compile')
    process.exit(0)
  }

  const yamlContent = fs.readFileSync(YAML_PATH, 'utf-8')
  const config = parseBotsYaml(yamlContent)
  const bots = config.bots ?? []

  if (bots.length === 0) {
    console.log('No bots configured in bots.yaml')
    process.exit(0)
  }

  console.log(`Found ${bots.length} bot(s) to compile`)

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Compile each bot
  let successCount = 0
  for (const bot of bots) {
    const entry = bot.entry ?? 'src/index.ts'
    const sourcePath = path.resolve(ROOT_DIR, bot.source)
    const entryPath = path.join(sourcePath, entry)
    const outfile = path.join(OUTPUT_DIR, bot.name)

    // Verify source exists
    if (!fs.existsSync(entryPath)) {
      console.error(`Error: Entry point not found: ${entryPath}`)
      console.error(`  Bot "${bot.name}" will be skipped`)
      continue
    }

    console.log(`\nCompiling ${bot.name}...`)
    console.log(`  Source: ${sourcePath}`)
    console.log(`  Entry: ${entry}`)
    console.log(`  Output: ${outfile}`)

    try {
      await $`bun build ${entryPath} --compile --outfile=${outfile}`.quiet()
      console.log(`  Done`)
      successCount++
    } catch (error) {
      console.error(`  Failed to compile ${bot.name}:`, error)
    }
  }

  console.log(`\nCompiled ${successCount}/${bots.length} bot(s) to ${OUTPUT_DIR}`)

  if (successCount === 0 && bots.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
