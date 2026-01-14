<script lang="ts">
  import { tick } from 'svelte'
  import { logState, LEVEL_COLORS } from '../lib/logger.svelte'
  import { isModuleEnabled, filterState } from '../lib/log-filter-state.svelte'
  import LogFilterToolbar from './LogFilterToolbar.svelte'
  import type { LogEntry } from '../lib/log-types'

  let logsContainer: HTMLDivElement

  // Numeric values for log levels (for comparison)
  const LOG_LEVEL_NUMERIC: Record<string, number> = {
    TRACE: 10,
    DEBUG: 20,
    INFO: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60,
    // Also support lowercase for settings
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  }

  // Filter logs based on app log level setting and module filter
  function shouldShowLog(log: LogEntry): boolean {
    // Level filter - use shared filter state
    const settingLevel = filterState.logLevel
    const settingNumeric = LOG_LEVEL_NUMERIC[settingLevel] ?? 20
    const logNumeric = LOG_LEVEL_NUMERIC[log.level] ?? 30
    if (logNumeric < settingNumeric) return false

    // Module filter - logs without module always show
    if (log.module && !isModuleEnabled(log.module)) return false

    return true
  }

  // Filtered logs based on current setting
  let filteredLogs = $derived(logState.logs.filter(shouldShowLog))

  // Auto-scroll to bottom when new logs arrive
  $effect(() => {
    filteredLogs.length
    tick().then(() => {
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight
      }
    })
  })
</script>

<div class="flex flex-col h-full min-h-0 bg-slack-bg">
  <LogFilterToolbar />
  <div
    class="flex-1 min-h-0 overflow-y-auto font-mono text-xs leading-normal py-2"
    bind:this={logsContainer}
  >
    {#if filteredLogs.length === 0}
      <div class="p-3 text-slack-text-muted italic">No logs yet</div>
    {:else}
      {#each filteredLogs as log, i (`${log.timestamp}-${i}`)}
        <div class="px-3 py-0.5 whitespace-pre-wrap break-all hover:bg-white/5">
          <span class="text-log-timestamp">[{log.timestamp}]</span>
          <span
            class="font-semibold mx-1 {LEVEL_COLORS[log.level] ||
              'text-log-info'}">{log.level}</span
          >
          {#if log.module}
            <span class="text-log-module mr-1">[{log.module}]</span>
          {/if}
          <span class="text-log-message">{log.message}</span>
          {#if log.context}
            {#each Object.entries(log.context) as [key, value]}
              <div class="pl-6 text-blue-400">
                {key}: {typeof value === 'object' && value !== null
                  ? JSON.stringify(value)
                  : String(value)}
              </div>
            {/each}
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
