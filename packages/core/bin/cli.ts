#!/usr/bin/env bun

/**
 * Botarium CLI
 *
 * Usage:
 *   npx botarium create <name>    Create a new bot project
 *   npx botarium --platform slack Start emulator for a platform
 *   npx botarium package          Package bot into distributable app
 */

import { parseArgs } from 'util'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    template: { type: 'string', short: 't' },
    provider: { type: 'string' },
    database: { type: 'string' },
    platform: { type: 'string' },
    port: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

if (positionals.length === 0 || values.help) {
  console.log(`
Botarium - Bot Development Simulator

Usage:
  botarium create <name> -t <template>  Create a new bot project
  botarium --platform <platform>        Start emulator for a platform
  botarium package                      Package bot into distributable app

Options:
  -t, --template <type>  Bot template: slack (required for create)
  --provider <name>      AI provider: openai, anthropic, google
  --database <type>      Database adapter: none, sqlite, postgres
  --platform <name>      Platform plugin to use (e.g., slack)
  --port <number>        Port to run emulator on (default: platform-specific)
  --help, -h             Show this help message

Examples:
  botarium create my-bot -t slack
  botarium create my-bot --template slack --provider anthropic
  botarium --platform slack
  botarium --platform slack --port 8080
  botarium package
`)
  process.exit(0)
}

// Handle create subcommand
if (positionals[0] === 'create') {
  const { createBot } = await import('create-botarium')
  await createBot({
    name: positionals[1],
    template: values.template,
    provider: values.provider,
    database: values.database,
  })
  process.exit(0)
}

// TODO: Implement other CLI commands
console.log('Botarium CLI - coming soon')
console.log('Command:', positionals[0])
