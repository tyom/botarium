#!/usr/bin/env bun

import { parseArgs } from 'util'
import { createBot } from '../src'

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    template: { type: 'string', short: 't' },
    database: { type: 'string' },
    'skip-install': { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
})

if (values.help) {
  console.log(`
Usage: bunx create-botarium [name] [options]

Create a new Botarium bot.

Options:
  -t, --template <type>   Bot template: slack (required)
  --database <adapter>    Database adapter: sqlite | postgres
  --skip-install          Skip running bun install
  --help, -h              Show this help message

Examples:
  bunx create-botarium my-bot -t slack
  bunx create-botarium my-bot -t slack --database postgres
`)
  process.exit(0)
}

createBot({
  name: positionals[0],
  template: values.template,
  database: values.database,
  skipInstall: values['skip-install'],
})
