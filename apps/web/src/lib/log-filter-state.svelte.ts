/**
 * Reactive log filter state management
 * Tracks enabled modules and computes frequency counts for the filter toolbar
 */

import { logState } from './log-state.svelte'
import type { LogLevel } from './settings-store'

interface ModuleStat {
  module: string
  count: number
}

interface ModuleStats {
  all: ModuleStat[]
  top5: ModuleStat[]
  overflow: ModuleStat[]
  allModules: Set<string>
}

/** Filter state: Set of enabled module names (all enabled by default) */
export const filterState = $state({
  enabledModules: new Set<string>(),
  seenModules: new Set<string>(), // Track modules we've already processed
  logLevel: 'debug' as LogLevel, // Current log level filter
  // Solo mode tracking for ALT+click toggle
  soloModule: null as string | null, // Currently solo'd module (null if not in solo mode)
  preSoloModules: null as Set<string> | null, // Saved selection before solo
})

/** Compute module frequency counts from logs */
export function getModuleStats(): ModuleStats {
  const counts = new Map<string, number>()

  for (const log of logState.logs) {
    if (log.module) {
      counts.set(log.module, (counts.get(log.module) ?? 0) + 1)
    }
  }

  // Sort by frequency descending
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([module, count]) => ({ module, count }))

  return {
    all: sorted,
    top5: sorted.slice(0, 5),
    overflow: sorted.slice(5),
    allModules: new Set(sorted.map((s) => s.module)),
  }
}

/** Initialize enabled modules when new modules appear */
export function ensureModulesEnabled(stats: ModuleStats): void {
  const allModules = stats.allModules
  let hasNewModules = false

  // Only add modules we haven't seen before (new modules default to enabled)
  for (const module of allModules) {
    if (!filterState.seenModules.has(module)) {
      filterState.seenModules.add(module)
      filterState.enabledModules.add(module)
      hasNewModules = true
    }
  }

  // Trigger reactivity if we added new modules
  if (hasNewModules) {
    filterState.seenModules = new Set(filterState.seenModules)
    filterState.enabledModules = new Set(filterState.enabledModules)
  }
}

/** Toggle a module's enabled state */
export function toggleModule(module: string): void {
  // Clear solo state on manual toggle
  filterState.soloModule = null
  filterState.preSoloModules = null

  if (filterState.enabledModules.has(module)) {
    filterState.enabledModules.delete(module)
  } else {
    filterState.enabledModules.add(module)
  }
  // Trigger reactivity by creating new Set
  filterState.enabledModules = new Set(filterState.enabledModules)
}

/** Solo a module: enable only this module, disable all others (toggles on repeated ALT+click) */
export function soloModule(module: string): void {
  // If already solo'd on this module, restore previous selection
  if (filterState.soloModule === module && filterState.preSoloModules) {
    filterState.enabledModules = new Set(filterState.preSoloModules)
    filterState.soloModule = null
    filterState.preSoloModules = null
    return
  }

  // Save current selection and solo this module
  filterState.preSoloModules = new Set(filterState.enabledModules)
  filterState.soloModule = module
  filterState.enabledModules = new Set([module])
}

/** Check if a module is enabled */
export function isModuleEnabled(module: string): boolean {
  // If module hasn't been seen yet, show it (will be added as enabled shortly)
  if (!filterState.seenModules.has(module)) return true
  return filterState.enabledModules.has(module)
}

/** Reset all modules to enabled (called when logs are cleared) */
export function resetModuleFilters(): void {
  filterState.enabledModules = new Set()
  filterState.seenModules = new Set()
  filterState.soloModule = null
  filterState.preSoloModules = null
}

/** Re-enable all seen modules (reset filters without clearing logs) */
export function resetToAllEnabled(): void {
  // Copy all seen modules to enabled
  filterState.enabledModules = new Set(filterState.seenModules)
  filterState.soloModule = null
  filterState.preSoloModules = null
}

/** Set the log level filter */
export function setLogLevel(level: LogLevel): void {
  filterState.logLevel = level
}

/** Initialize log level from settings */
export function initLogLevel(level: LogLevel): void {
  filterState.logLevel = level
}
