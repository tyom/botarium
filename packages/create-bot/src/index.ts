import path from 'path'
import { promptForSelections, type PartialSelections, type UserSelections } from './prompts'
import { scaffold } from './scaffold'
import { installDependenciesWithOutput } from './utils/install'
import {
  printHeader,
  printStatus,
  printCancelled,
  printSuccess,
  printStep,
  printCommand,
  printEnvVar,
  printSectionHeader,
  printBlankLine,
} from './utils/cli-output'
import { getRequiredEnvVars } from './utils/env-vars'

export interface CreateBotOptions extends PartialSelections {
  skipInstall?: boolean
}

/**
 * Create a new Botarium bot.
 */
export async function createBot(options: CreateBotOptions = {}): Promise<void> {
  printHeader('Create Botarium Bot')

  const selections = await promptForSelections({
    name: options.name,
    template: options.template,
    useAi: options.useAi,
    database: options.database,
  })

  if (!selections) {
    printCancelled()
    process.exit(0)
  }

  printStatus('Scaffolding project...')

  const targetDir = await scaffold({
    botName: selections.name,
    template: selections.template,
    useAi: selections.useAi,
    dbAdapter: selections.database,
    overwrite: selections.overwrite,
  })

  if (!options.skipInstall) {
    const success = await installDependenciesWithOutput(targetDir)
    if (!success) {
      process.exit(1)
    }
  }

  printNextSteps(targetDir, selections)
}

function printNextSteps(targetDir: string, selections: UserSelections): void {
  const relativePath = path.relative(process.cwd(), targetDir)

  printSuccess(`Success! Created ${selections.name} at ${relativePath}`)

  console.log('Next steps:')
  printBlankLine()

  printStep(1, `cd ${relativePath}`)
  printStep(2, 'Configure .env with your credentials:')

  printEnvVarInstructions(selections)

  printStep(3, 'Start the bot:')
  printCommand('bun run dev')
  printBlankLine()
}

function printEnvVarInstructions(selections: UserSelections): void {
  const envVars = getRequiredEnvVars({
    template: selections.template,
    useAi: selections.useAi,
    dbAdapter: selections.database,
  })

  printSectionHeader('Required environment variables:')

  for (const varName of envVars.templateVars) {
    printEnvVar(varName)
  }

  for (const varName of envVars.aiVars) {
    printEnvVar(varName)
  }

  for (const varName of envVars.dbVars) {
    printEnvVar(varName)
  }

  if (!envVars.hasAny) {
    printEnvVar('(none required)')
  }

  printBlankLine()
}
