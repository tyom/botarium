/**
 * Botarium setup — factory initialization and cross-package wiring.
 * Edit this file to customize logging, tracing, metrics, and resilience.
 */
import { createBotariumLogger, createToolLogger } from 'botarium/logging'
import {
  runWithTrace,
  getTraceId,
  getTraceContext,
  createMetricsCollector,
  buildHealthResponse,
} from '@botarium/observability'
import { createBreakerRegistry, withErrorBoundary } from '@botarium/resilience'
import { settings, isSimulatorMode } from './settings'

// --- Logger ---
export const logger = createBotariumLogger({
  level: settings.LOG_LEVEL,
  forwardUrl: isSimulatorMode ? process.env.SLACK_API_URL : undefined,
  // Inject trace ID into every log line automatically
  mixin: () => {
    const traceId = getTraceId()
    return traceId ? { traceId } : {}
  },
})
export const getToolLogger = createToolLogger(logger)

// --- Metrics ---
export const metrics = createMetricsCollector()

// --- Tracing ---
export { runWithTrace, getTraceId, getTraceContext }

// --- Health ---
export function getHealthResponse() {
  return buildHealthResponse({
    getBreakerStates: () => breakerRegistry.getStates(),
  })
}

// --- Circuit Breakers ---
export const breakerRegistry = createBreakerRegistry({
  // Wire breaker events to metrics collector
  onSuccess: ({ service, duration }) => {
    metrics.record(service, duration)
  },
  onFailure: ({ service, duration }) => {
    metrics.recordError(service)
    metrics.record(service, duration)
  },
})

export { withErrorBoundary }
