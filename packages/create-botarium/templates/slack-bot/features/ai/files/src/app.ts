import { createSlackBot } from '@botarium/slack'
import { registerListeners } from './listeners/index'
import { reloadSettings } from './settings'
import config from '../config.yaml'

await createSlackBot({
  config,
  listeners: registerListeners,
  simulatorSettingsKeys: [
    'AI_PROVIDER',
    'MODEL_DEFAULT',
    'MODEL_FAST',
    'MODEL_THINKING',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'OPENROUTER_API_KEY',
  ],
  onSettingsUpdate: reloadSettings,
})
