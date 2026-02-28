import { z } from 'zod'
import { createSettings } from '@botarium/slack'

const botEnv = z.object({
  BOT_NAME: z.string().default('{{ botName }}'),
  BOT_PERSONALITY: z.string().default('Helpful AI assistant'),
})

export const { settings, reloadSettings, isSimulatorMode } =
  await createSettings({ env: botEnv })
