import { createSlackBot } from '@botarium/slack'
import { registerListeners } from './listeners/index'
import config from '../config.yaml'

await createSlackBot({
  config,
  listeners: registerListeners,
})
