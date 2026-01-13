#!/usr/bin/env bun

import { createBot } from '../src'

const args = process.argv.slice(2)

// Handle --help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: bunx create-botarium [name] [options]

Create a new Botarium bot.

Options:
  -t, --template <type>   Bot template: slack (required)
  --provider <provider>   AI provider: openai | anthropic | google
  --database <adapter>    Database adapter: sqlite | postgres
  --skip-install          Skip running bun install
  --help, -h              Show this help message

Examples:
  bunx create-botarium my-bot -t slack
  bunx create-botarium my-bot --template slack --provider anthropic
  bunx create-botarium my-bot -t slack --provider openai --database postgres
`)
  process.exit(0)
}

// Parse arguments
function getArgValue(flag: string, altFlag?: string): string | undefined {
  for (const f of [flag, altFlag].filter(Boolean) as string[]) {
    const index = args.indexOf(f)
    if (index > -1 && index + 1 < args.length) {
      const value = args[index + 1]
      if (value && !value.startsWith('-')) {
        return value
      }
    }
  }
  return undefined
}

// Get bot name (first non-flag argument)
const name = args.find((arg) => !arg.startsWith('-'))

const options = {
  name,
  template: getArgValue('--template', '-t'),
  provider: getArgValue('--provider'),
  database: getArgValue('--database'),
  skipInstall: args.includes('--skip-install'),
}

createBot(options)
