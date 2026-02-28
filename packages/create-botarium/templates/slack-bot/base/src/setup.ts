import { createBotariumLogger, createToolLogger } from 'botarium/logging'
import { settings, isSimulatorMode } from './settings'

// --- Logger ---
export const logger = createBotariumLogger({
  level: settings.LOG_LEVEL,
  forwardUrl: isSimulatorMode ? process.env.SLACK_API_URL : undefined,
})
export const getToolLogger = createToolLogger(logger)
