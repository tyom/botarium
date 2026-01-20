/**
 * Compile bots from bots.json for bundling with the Electron app.
 * Each bot is compiled to a standalone binary in dist/bots/{name}
 */

import { $ } from 'bun'
import path from 'path'
import fs from 'fs'

// Bot entry - either a simple path string or an object with overrides
type BotEntry = string | { source: string; name?: string; entry?: string }

// Resolved bot config ready for compilation
interface ResolvedBot {
  name: string
  source: string
  entry: string
}

interface BotsConfig {
  bots?: BotEntry[]
}

const ROOT_DIR = path.join(import.meta.dir, '..')
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist', 'bots')
const CONFIG_PATH = path.join(ROOT_DIR, 'bots.json')

// Parse config.yaml from bot's source directory to get simulator.id
function getBotNameFromConfig(sourcePath: string): string | null {
  const configPath = path.join(sourcePath, 'config.yaml')
  if (!fs.existsSync(configPath)) {
    return null
  }
  const content = fs.readFileSync(configPath, 'utf-8')
  let config: { simulator?: { id?: string } }
  try {
    config = Bun.YAML.parse(content) as { simulator?: { id?: string } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to parse ${configPath}: ${message}`)
    return null
  }
  return config.simulator?.id ?? null
}

// Resolve a bot entry to a full config with name
function resolveBotEntry(entry: BotEntry): ResolvedBot | null {
  const source = typeof entry === 'string' ? entry : entry.source
  const sourcePath = path.resolve(ROOT_DIR, source)

  // Get name: use override if provided, otherwise read from config.yaml
  let name: string | undefined
  if (typeof entry === 'object' && entry.name) {
    name = entry.name
  } else {
    name = getBotNameFromConfig(sourcePath) ?? undefined
  }

  if (!name) {
    console.error(`Error: Cannot determine bot name for ${source}`)
    console.error(
      `  No 'name' override provided and no simulator.id found in config.yaml`
    )
    return null
  }

  return {
    name,
    source,
    entry:
      (typeof entry === 'object' ? entry.entry : undefined) ?? 'src/app.ts',
  }
}

async function main() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.log('No bots.json found - nothing to compile')
    process.exit(0)
  }

  const content = fs.readFileSync(CONFIG_PATH, 'utf-8')
  let config: BotsConfig
  try {
    config = JSON.parse(content) as BotsConfig
  } catch (error) {
    console.error(
      `Failed to parse ${CONFIG_PATH}: ${error instanceof Error ? error.message : error}`
    )
    process.exit(1)
  }
  const botEntries = config.bots ?? []

  if (botEntries.length === 0) {
    console.log('No bots configured in bots.json - clearing dist/bots/')
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true })
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'manifest.json'),
      JSON.stringify({ bots: [] }, null, 2)
    )
    process.exit(0)
  }

  // Resolve all bot entries to full configs
  const bots: ResolvedBot[] = []
  for (const entry of botEntries) {
    const resolved = resolveBotEntry(entry)
    if (resolved) {
      const existing = bots.find((b) => b.name === resolved.name)
      if (existing) {
        console.error(`Error: Duplicate bot name "${resolved.name}"`)
        console.error(`  First entry: ${existing.source}`)
        console.error(`  Conflicting entry: ${resolved.source}`)
        console.error(
          `Duplicate names would cause compiled outputs to be overwritten. Please fix before compiling.`
        )
        process.exit(1)
      }
      bots.push(resolved)
    }
  }

  if (bots.length === 0) {
    console.log('No valid bots found after resolving entries')
    process.exit(1)
  }

  console.log(`Found ${bots.length} bot(s) to compile`)

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // Compile each bot
  const compiledBots: { name: string; entry: string }[] = []
  for (const bot of bots) {
    const sourcePath = path.resolve(ROOT_DIR, bot.source)
    const entryPath = path.join(sourcePath, bot.entry)
    const outfile = path.join(OUTPUT_DIR, bot.name)

    // Verify source exists
    if (!fs.existsSync(entryPath)) {
      console.error(`Error: Entry point not found: ${entryPath}`)
      console.error(`  Bot "${bot.name}" will be skipped`)
      continue
    }

    // Remove any pre-existing binary to avoid stale code in manifest
    if (fs.existsSync(outfile)) {
      fs.rmSync(outfile)
    }

    console.log(`\nCompiling ${bot.name}...`)
    console.log(`  Source: ${sourcePath}`)
    console.log(`  Entry: ${bot.entry}`)
    console.log(`  Output: ${outfile}`)

    try {
      await $`bun build ${entryPath} --compile --outfile=${outfile}`.quiet()
      console.log(`  Done`)
      compiledBots.push({ name: bot.name, entry: bot.entry })
    } catch (error) {
      console.error(`  Failed to compile ${bot.name}:`, error)
    }
  }

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json')
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ bots: compiledBots }, null, 2)
  )
  console.log(`\nGenerated manifest: ${manifestPath}`)

  console.log(
    `\nCompiled ${compiledBots.length}/${bots.length} bot(s) to ${OUTPUT_DIR}`
  )

  if (compiledBots.length === 0 && bots.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
