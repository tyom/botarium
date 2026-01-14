import prompts from 'prompts'
import { validateBotName, checkTargetDirectory } from './utils/validate'

export type BotTemplate = 'slack'

export const AVAILABLE_TEMPLATES: { value: BotTemplate; title: string; description: string }[] = [
  { value: 'slack', title: 'Slack', description: 'Slack bot using Bolt SDK' },
  // Future templates:
  // { value: 'discord', title: 'Discord', description: 'Discord bot using discord.js' },
  // { value: 'teams', title: 'Teams', description: 'Microsoft Teams bot' },
]

export const AI_PROVIDERS = [
  { value: 'openai', title: 'OpenAI' },
  { value: 'anthropic', title: 'Anthropic' },
  { value: 'google', title: 'Google' },
] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]['value']

export const DATABASE_OPTIONS = [
  { value: 'none', title: 'None' },
  { value: 'sqlite', title: 'SQLite', description: 'Recommended for getting started' },
  { value: 'postgres', title: 'PostgreSQL' },
] as const

export type DatabaseOption = (typeof DATABASE_OPTIONS)[number]['value']

export interface UserSelections {
  name: string
  template: BotTemplate
  useAi: boolean
  provider?: AiProvider
  database: DatabaseOption
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
      validate: validateBotName,
    })
  }

  if (!partial.template) {
    questions.push({
      type: 'select',
      name: 'template',
      message: 'Bot template:',
      choices: AVAILABLE_TEMPLATES.map((t) => ({
        title: t.title,
        value: t.value,
        description: t.description,
      })),
      initial: 0,
    })
  }

  if (partial.useAi === undefined) {
    questions.push({
      type: 'toggle',
      name: 'useAi',
      message: 'Use AI?',
      initial: true,
      active: 'yes',
      inactive: 'no',
    })
  }

  if (!partial.provider) {
    questions.push({
      type: (_prev, values) => (values.useAi ?? partial.useAi) ? 'select' : null,
      name: 'provider',
      message: 'AI provider:',
      choices: AI_PROVIDERS.map((p) => ({ title: p.title, value: p.value })),
      initial: 0,
    })
  }

  if (!partial.database) {
    questions.push({
      type: 'select',
      name: 'database',
      message: 'Database:',
      choices: DATABASE_OPTIONS.map((d) => ({
        title: d.title,
        value: d.value,
        description: 'description' in d ? d.description : undefined,
      })),
      initial: 0,
    })
  }

  return questions
}

function mergeAnswers(partial: PartialSelections, answers: prompts.Answers<string>): UserSelections | null {
  const useAi = partial.useAi ?? answers.useAi ?? false

  const selections: UserSelections = {
    name: partial.name || answers.name,
    template: (partial.template || answers.template) as BotTemplate,
    useAi,
    provider: useAi ? (partial.provider || answers.provider) as AiProvider : undefined,
    database: (partial.database || answers.database) as DatabaseOption,
  }

  if (!selections.name || !selections.template || !selections.database) {
    return null
  }

  if (selections.useAi && !selections.provider) {
    return null
  }

  const validTemplates = AVAILABLE_TEMPLATES.map((t) => t.value)
  if (!validTemplates.includes(selections.template)) {
    console.error(`Invalid template: ${selections.template}. Available: ${validTemplates.join(', ')}`)
    return null
  }

  return selections
}

async function promptForOverwrite(dirName: string): Promise<boolean> {
  const { overwrite } = await prompts({
    type: 'confirm',
    name: 'overwrite',
    message: `Directory "${dirName}" is not empty. Overwrite?`,
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

  const answers = await prompts(questions, {
    onCancel: () => false,
  })

  if (questions.length > 0 && Object.keys(answers).length === 0) {
    return null
  }

  const selections = mergeAnswers(partial, answers)
  if (!selections) {
    return null
  }

  const targetCheck = checkTargetDirectory(selections.name)
  if (targetCheck.exists && !targetCheck.isEmpty) {
    const shouldOverwrite = await promptForOverwrite(selections.name)
    if (!shouldOverwrite) {
      return null
    }
    selections.overwrite = true
  }

  return selections
}
