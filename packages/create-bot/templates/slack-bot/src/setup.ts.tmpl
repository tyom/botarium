/**
 * Botarium setup — factory initialization and cross-package wiring.
 * Edit this file to customize logging, tracing, metrics, and resilience.
 */
import { createBotariumLogger, createToolLogger } from 'botarium/logging'
{{#if isObservability}}
import {
  runWithTrace, getTraceId, getTraceContext,
  createMetricsCollector, buildHealthResponse,
} from '@botarium/observability'
{{/if}}
{{#if isResilience}}
import {
  createBreakerRegistry,
  withErrorBoundary,
} from '@botarium/resilience'
{{/if}}
import { settings } from './settings'

// --- Logger ---
export const logger = createBotariumLogger({
  level: settings.LOG_LEVEL,
{{#if isObservability}}
  // Inject trace ID into every log line automatically
  mixin: () => {
    const traceId = getTraceId()
    return traceId ? { traceId } : {}
  },
{{/if}}
})
export const getToolLogger = createToolLogger(logger)
{{#if isObservability}}

// --- Metrics ---
export const metrics = createMetricsCollector()

// --- Tracing ---
export { runWithTrace, getTraceId, getTraceContext }

// --- Health ---
export function getHealthResponse() {
  return buildHealthResponse({
{{#if isResilience}}
    getBreakerStates: () => breakerRegistry.getStates(),
{{/if}}
  })
}
{{/if}}
{{#if isResilience}}

// --- Circuit Breakers ---
export const breakerRegistry = createBreakerRegistry({
{{#if isObservability}}
  // Wire breaker events to metrics collector
  onSuccess: ({ service, duration }) => {
    metrics.record(service, duration)
  },
  onFailure: ({ service, duration }) => {
    metrics.recordError(service)
    metrics.record(service, duration)
  },
{{/if}}
})

export { withErrorBoundary }
{{/if}}
