import type { ConfigFile } from '@botarium/slack'
import rawConfig from '../config.yaml'

export const config = rawConfig as ConfigFile
export const botName =
  (config.settings.bot_name?.value as string) ?? '{{ botNamePascal }}'
export const botId = config.simulator.id
