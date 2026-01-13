import pc from 'picocolors'
import path from 'path'
import { promptForSelections, type PartialSelections } from './prompts'
import { scaffold } from './scaffold'

export interface CreateBotOptions extends PartialSelections {
  skipInstall?: boolean
}

/**
 * Create a new Botarium bot.
 */
export async function createBot(options: CreateBotOptions = {}): Promise<void> {
  console.log()
  console.log(pc.bold(pc.blue('Create Botarium Bot')))
  console.log()

  // Collect missing options via prompts
  const selections = await promptForSelections({
    name: options.name,
    template: options.template,
    provider: options.provider,
    database: options.database,
  })

  if (!selections) {
    console.log(pc.yellow('Cancelled'))
    process.exit(0)
  }

  console.log()
  console.log(pc.cyan('Scaffolding project...'))

  // Scaffold the project
  const targetDir = await scaffold({
    botName: selections.name,
    template: selections.template,
    useAi: selections.useAi,
    aiProvider: selections.provider,
    dbAdapter: selections.database,
    overwrite: selections.overwrite,
  })

  // Install dependencies
  if (!options.skipInstall) {
    console.log()
    console.log(pc.cyan('Installing dependencies...'))

    const proc = Bun.spawn(['bun', 'install'], {
      cwd: targetDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      console.error(pc.red('Failed to install dependencies'))
      console.error(stderr)
      process.exit(1)
    }

    console.log(pc.green('Dependencies installed!'))
  }

  // Print next steps
  printNextSteps({
    targetDir,
    botName: selections.name,
    template: selections.template,
    useAi: selections.useAi,
    aiProvider: selections.provider,
    dbAdapter: selections.database,
  })
}

function printNextSteps(options: {
  targetDir: string
  botName: string
  template: string
  useAi: boolean
  aiProvider?: string
  dbAdapter: string
}): void {
  const { targetDir, botName, template, useAi, aiProvider, dbAdapter } = options
  const relativePath = path.relative(process.cwd(), targetDir)

  console.log()
  console.log(pc.bold(pc.green(`Success! Created ${botName} at ${relativePath}`)))
  console.log()
  console.log('Next steps:')
  console.log()
  console.log(pc.cyan('  1.'), `cd ${relativePath}`)
  console.log(pc.cyan('  2.'), 'Copy .env.example to .env and configure:')
  console.log(pc.dim(`       cp .env.example .env`))
  console.log()
  console.log('     Required environment variables:')

  // Template-specific env vars
  if (template === 'slack') {
    console.log(pc.dim('       - SLACK_BOT_TOKEN'))
    console.log(pc.dim('       - SLACK_APP_TOKEN'))
    console.log(pc.dim('       - SLACK_SIGNING_SECRET'))
  }

  if (useAi && aiProvider) {
    console.log(pc.dim(`       - ${aiProvider.toUpperCase()}_API_KEY`))
  }

  if (dbAdapter === 'postgres') {
    console.log(pc.dim('       - DATABASE_URL'))
  }

  if (dbAdapter === 'none' && !useAi) {
    console.log(pc.dim('       (none required)'))
  }

  console.log()
  console.log(pc.cyan('  3.'), 'Start the bot:')
  console.log(pc.dim('       bun run dev'))
  console.log()
}
