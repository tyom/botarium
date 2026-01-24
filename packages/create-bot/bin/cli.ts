#!/usr/bin/env bun

import { parseArgs } from 'util'
import { createBot } from '../src'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    template: { type: 'string', short: 't' },
    ai: { type: 'boolean' },
    'no-ai': { type: 'boolean' },
    database: { type: 'string' },
    'skip-install': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

// Resolve --ai / --no-ai flags
const useAi = values.ai === true ? true : values['no-ai'] === true ? false : undefined

if (values.help) {
  console.log(`
Usage: bunx create-botarium [name] [options]

Create a new Botarium bot.

Options:
  -t, --template <type>   Bot template: slack (required)
  --ai, --no-ai           Enable or disable AI features
  --database <adapter>    Database adapter: sqlite | postgres
  --skip-install          Skip running bun install
  --help, -h              Show this help message

Examples:
  bunx create-botarium my-bot -t slack
  bunx create-botarium my-bot -t slack --ai
  bunx create-botarium my-bot -t slack --ai --database sqlite
`)
  process.exit(0)
}

createBot({
  name: positionals[0],
  template: values.template,
  useAi,
  database: values.database,
  skipInstall: values['skip-install'],
})
