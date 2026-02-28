import prompts from 'prompts'
import {
  validateBotNameForPrompts,
  checkTargetDirectory,
  BOT_TEMPLATES,
  type BotTemplate,
} from 'create-botarium'
import { getTemplateChoices, validateOption } from './utils/prompt-options'

export interface UserSelections {
  name: string
  template: BotTemplate
  useAi: boolean
  useObservability: boolean
  useResilience: boolean
  overwrite?: boolean
}

export interface PartialSelections {
  name?: string
  template?: string
  useAi?: boolean
  provider?: string
  useObservability?: boolean
  useResilience?: boolean
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

  if (
    partial.useObservability === undefined &&
    partial.useResilience === undefined
  ) {
    questions.push({
      type: 'multiselect',
      name: 'features',
      message: 'Production features:',
      choices: [
        {
          title: 'Observability',
          value: 'observability',
          description: 'Tracing, metrics, health endpoint',
        },
        {
          title: 'Resilience',
          value: 'resilience',
          description: 'Circuit breakers, error boundaries',
        },
      ],
      hint: '- Space to select. Return to submit',
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

  return questions
}

function mergeAnswers(
  partial: PartialSelections,
  answers: prompts.Answers<string>
): UserSelections | null {
  const useAi = partial.useAi ?? answers.useAi ?? false

  // Parse production features from multiselect
  const features: string[] = answers.features ?? []
  const useObservability =
    partial.useObservability ?? features.includes('observability')
  const useResilience = partial.useResilience ?? features.includes('resilience')

  // Get raw values
  const rawName = partial.name || answers.name
  const rawTemplate = partial.template || answers.template

  // Validate required fields exist
  if (!rawName || !rawTemplate) {
    return null
  }

  // Validate against source of truth
  const template = validateOption(rawTemplate, BOT_TEMPLATES, 'template')
  if (!template) return null

  return {
    name: rawName,
    template,
    useAi,
    useObservability,
    useResilience,
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
