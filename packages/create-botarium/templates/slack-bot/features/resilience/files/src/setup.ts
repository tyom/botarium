/**
 * Botarium setup — factory initialization and cross-package wiring.
 * Edit this file to customize logging, tracing, metrics, and resilience.
 */
import { createBotariumLogger, createToolLogger } from 'botarium/logging'
import { createBreakerRegistry, withErrorBoundary } from '@botarium/resilience'
import { settings, isSimulatorMode } from './settings'

// --- Logger ---
export const logger = createBotariumLogger({
  level: settings.LOG_LEVEL,
  forwardUrl: isSimulatorMode ? process.env.SLACK_API_URL : undefined,
})
export const getToolLogger = createToolLogger(logger)

// --- Circuit Breakers ---
export const breakerRegistry = createBreakerRegistry({})

export { withErrorBoundary }
