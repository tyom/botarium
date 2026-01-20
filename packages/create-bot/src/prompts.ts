import prompts from 'prompts'
import { validateBotNameForPrompts, checkTargetDirectory } from './utils/validate'
import {
  BOT_TEMPLATES,
  AI_PROVIDERS,
  DB_ADAPTERS,
  type BotTemplate,
  type AiProvider,
  type DbAdapter,
} from './utils/template'
import {
  getTemplateChoices,
  getProviderChoices,
  getDatabaseChoices,
  validateOption,
} from './utils/prompt-options'

// Re-export types for convenience
export type { BotTemplate, AiProvider, DbAdapter }

export interface UserSelections {
  name: string
  template: BotTemplate
  useAi: boolean
  provider?: AiProvider
  database: DbAdapter
  overwrite?: boolean
}

export interface PartialSelections {
  name?: string
  template?: string
  useAi?: boolean
  provider?: string
  database?: string
}

function buildQuestions(partial: PartialSelections): prompts.PromptObject[] {
  const questions: prompts.PromptObject[] = []

  if (!partial.name) {
    questions.push({
      type: 'text',
      name: 'name',
      message: 'Bot name:',
      initial: 'my-bot',
      validate: validateBotNameForPrompts,
    })
  }

  if (!partial.template) {
    questions.push({
      type: 'select',
      name: 'template',
      message: 'Bot template:',
      choices: getTemplateChoices(),
      initial: 0,
    })
  }

  if (partial.useAi === undefined) {
    questions.push({
      type: 'toggle',
      name: 'useAi',
      message: 'Use AI?',
      initial: false,
      active: 'yes',
      inactive: 'no',
    })
  }

  if (!partial.provider) {
    questions.push({
      type: (_prev, values) =>
        (values.useAi ?? partial.useAi) ? 'select' : null,
      name: 'provider',
      message: 'AI provider:',
      choices: getProviderChoices(),
      initial: 0,
    })
  }

  if (!partial.database) {
    questions.push({
      type: 'select',
      name: 'database',
      message: 'Database:',
      choices: getDatabaseChoices(),
      initial: 0,
    })
  }

  return questions
}

function mergeAnswers(
  partial: PartialSelections,
  answers: prompts.Answers<string>
): UserSelections | null {
  const useAi = partial.useAi ?? answers.useAi ?? false

  // Get raw values
  const rawName = partial.name || answers.name
  const rawTemplate = partial.template || answers.template
  const rawProvider = partial.provider || answers.provider
  const rawDatabase = partial.database || answers.database

  // Validate required fields exist
  if (!rawName || !rawTemplate || !rawDatabase) {
    return null
  }

  if (useAi && !rawProvider) {
    return null
  }

  // Validate against source of truth
  const template = validateOption(rawTemplate, BOT_TEMPLATES, 'template')
  if (!template) return null

  const database = validateOption(rawDatabase, DB_ADAPTERS, 'database')
  if (!database) return null

  let provider: AiProvider | undefined
  if (useAi && rawProvider) {
    const validatedProvider = validateOption(rawProvider, AI_PROVIDERS, 'provider')
    if (!validatedProvider) return null
    provider = validatedProvider
  }

  return {
    name: rawName,
    template,
    useAi,
    provider,
    database,
  }
}

async function promptForOverwrite(dirPath: string): Promise<boolean> {
  const { overwrite } = await prompts({
    type: 'confirm',
    name: 'overwrite',
    message: `Directory "${dirPath}" is not empty. Overwrite?`,
    initial: false,
  })
  return overwrite === true
}

/**
 * Prompt for missing selections interactively.
 */
export async function promptForSelections(
  partial: PartialSelections
): Promise<UserSelections | null> {
  const questions = buildQuestions(partial)

  let cancelled = false
  const answers = await prompts(questions, {
    onCancel: () => {
      cancelled = true
      return false
    },
  })

  if (cancelled) {
    return null
  }

  const selections = mergeAnswers(partial, answers)
  if (!selections) {
    return null
  }

  const targetCheck = checkTargetDirectory(selections.name)
  if (targetCheck.exists && !targetCheck.isEmpty) {
    const shouldOverwrite = await promptForOverwrite(targetCheck.path)
    if (!shouldOverwrite) {
      return null
    }
    selections.overwrite = true
  }

  return selections
}
