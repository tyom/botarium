#!/usr/bin/env bun

/**
 * Botarium CLI
 *
 * Usage:
 *   npx botarium create <name>    Create a new bot project
 *   npx botarium --platform slack Start emulator for a platform
 *   npx botarium package          Package bot into distributable app
 */

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Botarium - Bot Development Simulator

Usage:
  botarium create <name> -t <template>  Create a new bot project
  botarium --platform <platform>        Start emulator for a platform
  botarium package                      Package bot into distributable app

Options:
  -t, --template <type>  Bot template: slack (required for create)
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
if (args[0] === 'create') {
  const { createBot } = await import('create-botarium')
  await createBot({ name: args[1] })
  process.exit(0)
}

// TODO: Implement other CLI commands
console.log('Botarium CLI - coming soon')
console.log('Args:', args)
