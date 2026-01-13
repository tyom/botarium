<script lang="ts">
  import * as Select from '$lib/components/ui/select'
  import { RotateCcw } from '@lucide/svelte'
  import {
    getModuleStats,
    filterState,
    toggleModule,
    soloModule,
    ensureModulesEnabled,
    resetToAllEnabled,
    setLogLevel,
    initLogLevel,
  } from '../lib/log-filter-state.svelte'
  import { backendState } from '../lib/backend-state.svelte'
  import type { LogLevel } from '../lib/settings-store'
  import ModuleOverflowMenu from './ModuleOverflowMenu.svelte'

  const logLevels: { value: LogLevel; label: string }[] = [
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warn' },
    { value: 'error', label: 'Error' },
  ]

  // Compute module stats reactively within the component
  let moduleStats = $derived(getModuleStats())

  // Number of visible buttons (dynamically calculated based on available space)
  let visibleCount = $state(5)
  let containerRef: HTMLDivElement
  let leftSideRef: HTMLDivElement
  let rightSideRef: HTMLDivElement

  // Track Alt key for inverse toggle mode (solo)
  let altPressed = $state(false)

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt') altPressed = true
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt') altPressed = false
  }

  // Handle module button click - normal toggle or Alt+click for solo
  function handleModuleClick(module: string, e: MouseEvent) {
    if (e.altKey) {
      soloModule(module)
    } else {
      toggleModule(module)
    }
  }

  // Split modules into visible and overflow based on available space
  let visibleModules = $derived(moduleStats.all.slice(0, visibleCount))
  let overflowModules = $derived(moduleStats.all.slice(visibleCount))

  // Check if any filters are disabled (to show reset button)
  let hasDisabledFilters = $derived(
    moduleStats.all.some((m) => !filterState.enabledModules.has(m.module))
  )

  // Initialize log level from settings on mount
  $effect(() => {
    const settingsLevel = backendState.effectiveSettings.app_log_level as LogLevel | undefined
    if (settingsLevel) {
      initLogLevel(settingsLevel)
    }
  })

  // Ensure new modules are added as enabled when they appear
  $effect(() => {
    if (moduleStats.all.length > 0) {
      ensureModulesEnabled(moduleStats)
    }
  })

  // Calculate how many buttons fit in the available space
  $effect(() => {
    if (!containerRef) return

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(calculateVisibleCount)
    })

    observer.observe(containerRef)
    // Initial calculation after a brief delay to ensure rendering
    setTimeout(calculateVisibleCount, 50)

    return () => observer.disconnect()
  })

  // Recalculate when modules change
  $effect(() => {
    moduleStats.all.length
    setTimeout(calculateVisibleCount, 50)
  })

  function calculateVisibleCount() {
    if (!containerRef || !leftSideRef || !rightSideRef) return
    if (moduleStats.all.length === 0) return

    const containerWidth = containerRef.clientWidth
    const rightSideWidth = rightSideRef.offsetWidth
    const padding = 24 // px-3 = 12px * 2

    // Available width for the left side (filters)
    const availableWidth = containerWidth - rightSideWidth - padding - 12 // 12px gap

    // Get all visible buttons in the left side
    const buttons = leftSideRef.querySelectorAll(
      '.module-toggle:not([aria-hidden])'
    )

    // Estimate: "Module:" label = ~55px, overflow button = ~50px, reset = ~28px, gaps = ~20px
    const fixedWidth = 55 + 50 + 28 + 20
    let remainingWidth = availableWidth - fixedWidth

    // Calculate average button width from visible buttons or estimate
    let avgButtonWidth = 85 // default estimate
    if (buttons.length > 0) {
      let totalBtnWidth = 0
      buttons.forEach((btn) => {
        totalBtnWidth += (btn as HTMLElement).offsetWidth + 6
      })
      avgButtonWidth = totalBtnWidth / buttons.length
    }

    // Calculate how many buttons can fit
    const maxVisible = Math.max(1, Math.floor(remainingWidth / avgButtonWidth))
    const newCount = Math.min(maxVisible, moduleStats.all.length)

    if (newCount !== visibleCount) {
      visibleCount = newCount
    }
  }

  function isEnabled(module: string): boolean {
    return filterState.enabledModules.has(module)
  }

  async function handleLogLevelChange(value: string | undefined) {
    if (!value) return
    const newLevel = value as LogLevel
    setLogLevel(newLevel)
    await backendState.updateSetting('app_log_level', newLevel)
  }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div
  class="flex items-center gap-3 px-3 py-2 border-b border-(--border-color)"
  bind:this={containerRef}
>
  <!-- Left side: Module filters -->
  <div class="flex items-center gap-1.5 flex-1 min-w-0" bind:this={leftSideRef}>
    {#if moduleStats.all.length > 0}
      <span class="text-xs text-(--text-muted) shrink-0">Module:</span>

      {#each visibleModules as { module, count }}
        <button
          class="module-toggle shrink-0"
          data-active={isEnabled(module)}
          data-alt-mode={altPressed}
          onclick={(e) => handleModuleClick(module, e)}
          title="{altPressed
            ? 'Alt+click: show only this module'
            : module} ({count} logs)"
        >
          {module}
          <span class="opacity-60">{count}</span>
        </button>
      {/each}

      {#if overflowModules.length > 0}
        <ModuleOverflowMenu
          modules={overflowModules}
          enabledModules={filterState.enabledModules}
          onToggle={toggleModule}
          onSolo={soloModule}
        />
      {/if}

      {#if hasDisabledFilters}
        <button
          class="p-1 text-(--text-muted) hover:text-(--text-primary) hover:bg-(--sidebar-hover) rounded transition-colors shrink-0"
          onclick={resetToAllEnabled}
          title="Reset filters"
        >
          <RotateCcw size={12} />
        </button>
      {/if}
    {/if}
  </div>

  <!-- Right side: Log level -->
  <div class="flex items-center gap-1.5 shrink-0" bind:this={rightSideRef}>
    <span class="text-xs text-(--text-muted)">Level:</span>
    <Select.Root
      type="single"
      value={filterState.logLevel}
      onValueChange={handleLogLevelChange}
    >
      <Select.Trigger
        size="xs"
        class="min-w-20 px-2 text-xs bg-transparent border border-(--border-color) text-(--text-primary)"
      >
        {logLevels.find((l) => l.value === filterState.logLevel)?.label ??
          'Debug'}
      </Select.Trigger>
      <Select.Content
        portalProps={{ disabled: true }}
        class="bg-(--main-bg) border-(--border-color) min-w-20"
      >
        {#each logLevels as level}
          <Select.Item
            value={level.value}
            label={level.label}
            class="text-xs text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
          />
        {/each}
      </Select.Content>
    </Select.Root>
  </div>
</div>
