#!/usr/bin/env bun

/**
 * Botarium CLI
 *
 * Usage:
 *   npx botarium --platform slack
 *   npx @botarium/slack (shorthand)
 *   npx botarium package
 */

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Botarium - Bot Development Simulator

Usage:
  botarium --platform <platform>  Start emulator for a platform
  botarium package                Package bot into distributable app

Options:
  --platform <name>  Platform plugin to use (e.g., slack)
  --port <number>    Port to run emulator on (default: platform-specific)
  --help, -h         Show this help message

Examples:
  botarium --platform slack
  botarium --platform slack --port 8080
  botarium package
`)
  process.exit(0)
}

// TODO: Implement CLI commands
console.log('Botarium CLI - coming soon')
console.log('Args:', args)
