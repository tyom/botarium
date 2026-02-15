<script lang="ts">
  import { Clock } from '@lucide/svelte'
  import { TimeField } from 'bits-ui'
  import { Time } from '@internationalized/date'
  import type { SlackTimePickerElement } from '../../../lib/types'
  import { renderText } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackTimePickerElement
    value?: string // HH:mm
    onChange?: (value: string) => void
    compact?: boolean
  }

  let { element, value, onChange, compact = false }: Props = $props()

  let isOpen = $state(false)
  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)
  let triggerRef: HTMLButtonElement
  let containerRef: HTMLDivElement
  let menuStyle = $state('')
  let localTime = $state<Time | undefined>(undefined)

  // Display text: selected value or placeholder
  const displayText = $derived(
    value ||
      element.initial_time ||
      (element.placeholder ? renderText(element.placeholder) : '') ||
      'Select a time'
  )

  const hasValue = $derived(!!(value || element.initial_time))

  function toggle(e: MouseEvent) {
    e.stopPropagation()
    if (!isOpen) {
      // Initialize localTime from current value when opening
      const timeStr = value || element.initial_time
      if (timeStr) {
        try {
          const [h, m] = timeStr.split(':').map(Number)
          localTime = new Time(h!, m!)
        } catch {
          localTime = undefined
        }
      } else {
        localTime = undefined
      }
      isOpen = true
      positionMenu()
    } else {
      isOpen = false
    }
  }

  function positionMenu() {
    if (!triggerRef) return
    const rect = triggerRef.getBoundingClientRect()
    const menuHeight = 120 // approximate popover height
    const menuWidth = 200
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < menuHeight + 8

    // Prevent right-edge overflow
    let left = rect.left
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    if (left < 8) left = 8

    if (openAbove) {
      menuStyle = `position:fixed; bottom:${window.innerHeight - rect.top + 4}px; left:${left}px; width:${menuWidth}px;`
    } else {
      menuStyle = `position:fixed; top:${rect.bottom + 4}px; left:${left}px; width:${menuWidth}px;`
    }
  }

  function handleTimeChange(newTime: Time | undefined) {
    if (!newTime) return
    localTime = newTime
  }

  function handleDone() {
    if (!localTime) return
    const slackTime = `${String(localTime.hour).padStart(2, '0')}:${String(localTime.minute).padStart(2, '0')}`
    isOpen = false
    if (element.confirm) {
      pendingAction = () => onChange?.(slackTime)
      showingConfirm = true
    } else {
      onChange?.(slackTime)
    }
  }

  function handleConfirm() {
    pendingAction?.()
    pendingAction = null
    showingConfirm = false
  }

  function handleDeny() {
    pendingAction = null
    showingConfirm = false
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      isOpen &&
      containerRef &&
      !containerRef.contains(event.target as Node)
    ) {
      isOpen = false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

<div class="inline-flex" bind:this={containerRef}>
  <button
    type="button"
    class="flex items-center gap-2 rounded-lg border border-white/20 bg-slack-input text-slack-text hover:bg-white/10 transition-colors
      {compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2 text-sm'}"
    onclick={toggle}
    bind:this={triggerRef}
    aria-label="Select a time"
    aria-expanded={isOpen}
  >
    <Clock size={16} class="text-slack-text-muted shrink-0" />
    <span class={hasValue ? 'text-slack-text' : 'text-slack-text-muted'}>
      {displayText}
    </span>
  </button>
  {#if isOpen}
    <div
      style={menuStyle}
      class="z-200"
    >
      <div class="bg-slack-sidebar border border-white/20 rounded-lg shadow-lg flex flex-col">
        <!-- Time field -->
        <div class="px-3 py-2.5">
          <TimeField.Root
            value={localTime}
            onValueChange={handleTimeChange}
            hourCycle={24}
            granularity="minute"
          >
            <TimeField.Input
              class="flex items-center gap-0.5 rounded-lg border border-white/20 bg-slack-input text-slack-text transition-colors focus-within:border-slack-accent px-2.5 py-1.5 text-sm"
            >
              {#snippet children({ segments })}
                {#each segments as { part, value: segValue }, i (i)}
                  {#if part === 'literal'}
                    <span class="text-slack-text-muted">{segValue}</span>
                  {:else}
                    <TimeField.Segment
                      {part}
                      class="rounded px-0.5 tabular-nums text-slack-text outline-none focus:bg-slack-accent focus:text-white data-[placeholder]:text-slack-text-muted"
                    >
                      {segValue}
                    </TimeField.Segment>
                  {/if}
                {/each}
              {/snippet}
            </TimeField.Input>
          </TimeField.Root>
        </div>

        <!-- Done button -->
        <div class="px-3 pb-3">
          <button
            type="button"
            class="w-full py-1.5 rounded-lg text-sm font-medium transition-colors
              {localTime
                ? 'bg-slack-accent text-white hover:bg-slack-accent-hover cursor-pointer'
                : 'bg-white/5 text-slack-text-muted cursor-not-allowed'}"
            disabled={!localTime}
            onclick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showingConfirm && element.confirm}
  <ConfirmDialog confirm={element.confirm} onConfirm={handleConfirm} onDeny={handleDeny} />
{/if}
