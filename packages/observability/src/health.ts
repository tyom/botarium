/**
 * Health Response Builder - Generic health endpoint building block
 *
 * Provides buildHealthResponse() that accepts breaker states via callback,
 * avoiding direct imports from a resilience package.
 *
 * Key differences from Moro's src/config/http-server.ts:
 * - getBreakerStates() direct import replaced with callback in config
 * - Module-level startTime replaced with config.startTime parameter
 * - Removed Moro-specific CORE_SERVICES logic and per-service error/latency sections
 * - Response shape simplified: status + dependencies + timestamp + uptime + optional version
 * - Worst-wins status derivation: any down -> unhealthy, any degraded -> degraded
 */

export interface BreakerStateEntry {
  service: string
  state: 'closed' | 'open' | 'half-open'
}

export interface HealthConfig {
  version?: string
  startTime?: number
  getBreakerStates?: () => BreakerStateEntry[]
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version?: string
  dependencies: Record<string, { status: 'up' | 'degraded' | 'down' }>
}

/**
 * Build a health response from optional breaker states and config.
 *
 * Status uses worst-wins logic:
 * - Any dependency 'down' (breaker open) -> unhealthy
 * - Any dependency 'degraded' (breaker half-open) -> degraded
 * - All dependencies 'up' (breaker closed) or no dependencies -> healthy
 *
 * If no startTime provided, uptime is 0 (avoids module-level startTime pitfall).
 */
export function buildHealthResponse(config?: HealthConfig): HealthResponse {
  const breakerStates = config?.getBreakerStates?.() ?? []

  // Map breaker states to dependency statuses
  const dependencies: HealthResponse['dependencies'] = {}
  for (const { service, state } of breakerStates) {
    const status =
      state === 'closed' ? 'up' : state === 'half-open' ? 'degraded' : 'down'
    dependencies[service] = { status }
  }

  // Worst-wins status derivation
  const depStatuses = Object.values(dependencies)
  let status: HealthResponse['status'] = 'healthy'
  if (depStatuses.some((d) => d.status === 'down')) {
    status = 'unhealthy'
  } else if (depStatuses.some((d) => d.status === 'degraded')) {
    status = 'degraded'
  }

  const effectiveStartTime = config?.startTime ?? Date.now()
  const uptime = Math.round((Date.now() - effectiveStartTime) / 1000)

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime,
    ...(config?.version ? { version: config.version } : {}),
    dependencies,
  }
}
