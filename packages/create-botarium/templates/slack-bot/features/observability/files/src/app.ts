import { createSlackBot } from '@botarium/slack'
import { registerListeners } from './listeners/index'
import config from '../config.yaml'
import { getHealthResponse } from './setup'

await createSlackBot({
  config,
  listeners: registerListeners,
  getHealthResponse,
})
