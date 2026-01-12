#!/usr/bin/env bun

/**
 * Botbox CLI
 *
 * Usage:
 *   npx @tyom/botbox --platform slack
 *   npx @tyom/botbox-slack (shorthand)
 *   npx @tyom/botbox package
 */

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Botbox - Bot Development Simulator

Usage:
  botbox --platform <platform>  Start emulator for a platform
  botbox package                Package bot into distributable app

Options:
  --platform <name>  Platform plugin to use (e.g., slack)
  --port <number>    Port to run emulator on (default: platform-specific)
  --help, -h         Show this help message

Examples:
  botbox --platform slack
  botbox --platform slack --port 8080
  botbox package
`)
  process.exit(0)
}

// TODO: Implement CLI commands
console.log('Botbox CLI - coming soon')
console.log('Args:', args)
