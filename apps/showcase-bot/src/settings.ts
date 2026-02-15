import { z } from 'zod'

// Local simulator mode (SLACK_API_URL set)
export const isSimulatorMode = Boolean(process.env.SLACK_API_URL)
const isLocalMode = isSimulatorMode

const envSchema = z.object({
  // Bot Configuration
  BOT_NAME: z.string().default('Showcase Bot'),

  // Slack Configuration (optional in local simulator mode)
  SLACK_BOT_TOKEN: isLocalMode
    ? z.string().default('xoxb-local')
    : z.string().startsWith('xoxb-'),
  SLACK_APP_TOKEN: isLocalMode
    ? z.string().default('xapp-local')
    : z.string().startsWith('xapp-'),
  SLACK_SIGNING_SECRET: isLocalMode
    ? z.string().default('local')
    : z.string().min(1),

  // Server
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(['silent', 'debug', 'info', 'warn', 'error'])
    .default('info'),
})

export type Settings = z.infer<typeof envSchema>

function loadSettings(): Settings {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment configuration:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error(
      'Failed to load settings. Check your environment variables.'
    )
  }

  return result.data
}

export const settings = loadSettings()
