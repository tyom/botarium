import prompts from 'prompts'
import { validateBotName, checkTargetDirectory } from './utils/validate'

export type BotTemplate = 'slack'

export const AVAILABLE_TEMPLATES: { value: BotTemplate; title: string; description: string }[] = [
  { value: 'slack', title: 'Slack', description: 'Slack bot using Bolt SDK' },
  // Future templates:
  // { value: 'discord', title: 'Discord', description: 'Discord bot using discord.js' },
  // { value: 'teams', title: 'Teams', description: 'Microsoft Teams bot' },
]

export interface UserSelections {
  name: string
  template: BotTemplate
  useAi: boolean
  provider?: 'openai' | 'anthropic' | 'google'
  database: 'none' | 'sqlite' | 'postgres'
  overwrite?: boolean
}

export interface PartialSelections {
  name?: string
  template?: string
  useAi?: boolean
  provider?: string
  database?: string
}

/**
 * Prompt for missing selections interactively.
 */
export async function promptForSelections(
  partial: PartialSelections
): Promise<UserSelections | null> {
  const questions: prompts.PromptObject[] = []

  // Bot name
  if (!partial.name) {
    questions.push({
      type: 'text',
      name: 'name',
      message: 'Bot name:',
      initial: 'my-bot',
      validate: (value) => {
        const result = validateBotName(value)
        return result === true ? true : result
      },
    })
  }

  // Template type
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

  // Use AI?
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

  // AI provider (only if useAi is true)
  if (!partial.provider) {
    questions.push({
      type: (prev, values) => (values.useAi ?? partial.useAi) ? 'select' : null,
      name: 'provider',
      message: 'AI provider:',
      choices: [
        { title: 'OpenAI', value: 'openai' },
        { title: 'Anthropic', value: 'anthropic' },
        { title: 'Google', value: 'google' },
      ],
      initial: 0,
    })
  }

  // Database adapter
  if (!partial.database) {
    questions.push({
      type: 'select',
      name: 'database',
      message: 'Database:',
      choices: [
        { title: 'None', value: 'none' },
        {
          title: 'SQLite',
          value: 'sqlite',
          description: 'Recommended for getting started',
        },
        { title: 'PostgreSQL', value: 'postgres' },
      ],
      initial: 0,
    })
  }

  // Run prompts
  const answers = await prompts(questions, {
    onCancel: () => {
      return false
    },
  })

  // Check if user cancelled
  if (questions.length > 0 && Object.keys(answers).length === 0) {
    return null
  }

  const useAi = partial.useAi ?? answers.useAi ?? false

  const selections: UserSelections = {
    name: partial.name || answers.name,
    template: (partial.template || answers.template) as UserSelections['template'],
    useAi,
    provider: useAi ? (partial.provider || answers.provider) as UserSelections['provider'] : undefined,
    database: (partial.database || answers.database) as UserSelections['database'],
  }

  // Validate selections
  if (!selections.name || !selections.template || !selections.database) {
    return null
  }

  // Provider is required if useAi is true
  if (selections.useAi && !selections.provider) {
    return null
  }

  // Validate template is supported
  const validTemplates = AVAILABLE_TEMPLATES.map((t) => t.value)
  if (!validTemplates.includes(selections.template)) {
    console.error(`Invalid template: ${selections.template}. Available: ${validTemplates.join(', ')}`)
    return null
  }

  // Check target directory
  const targetCheck = checkTargetDirectory(selections.name)
  if (targetCheck.exists && !targetCheck.isEmpty) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory "${selections.name}" is not empty. Overwrite?`,
      initial: false,
    })

    if (!overwrite) {
      return null
    }
    selections.overwrite = true
  }

  return selections
}
