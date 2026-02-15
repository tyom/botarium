<script lang="ts">
  import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from '@lucide/svelte'
  import { Calendar } from 'bits-ui'
  import { parseDate, type DateValue } from '@internationalized/date'
  import type { SlackDatePickerElement } from '../../../lib/types'
  import { renderText } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackDatePickerElement
    value?: string // YYYY-MM-DD
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

  // Convert Slack string to CalendarDate for bits-ui
  const calendarValue = $derived.by(() => {
    const dateStr = value || element.initial_date
    if (!dateStr) return undefined
    try {
      return parseDate(dateStr)
    } catch {
      return undefined
    }
  })

  // Display text: selected date or placeholder
  const displayText = $derived(
    value ||
      element.initial_date ||
      (element.placeholder ? renderText(element.placeholder) : '') ||
      'Select a date'
  )

  function toggle(e: MouseEvent) {
    e.stopPropagation()
    isOpen = !isOpen
    if (isOpen) {
      positionMenu()
    }
  }

  function positionMenu() {
    if (!triggerRef) return
    const rect = triggerRef.getBoundingClientRect()
    const menuHeight = 320 // approximate calendar height
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < menuHeight + 8

    if (openAbove) {
      menuStyle = `position:fixed; bottom:${window.innerHeight - rect.top + 4}px; left:${rect.left}px;`
    } else {
      menuStyle = `position:fixed; top:${rect.bottom + 4}px; left:${rect.left}px;`
    }
  }

  function handleDateSelect(date: DateValue | undefined) {
    if (!date) return
    const slackDate = date.toString() // Returns YYYY-MM-DD
    isOpen = false
    if (element.confirm) {
      pendingAction = () => onChange?.(slackDate)
      showingConfirm = true
    } else {
      onChange?.(slackDate)
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
    aria-label="Select a date"
    aria-expanded={isOpen}
  >
    <CalendarIcon size={16} class="text-slack-text-muted shrink-0" />
    <span class={value || element.initial_date ? 'text-slack-text' : 'text-slack-text-muted'}>
      {displayText}
    </span>
  </button>
  {#if isOpen}
    <div
      style={menuStyle}
      class="z-200"
    >
      <Calendar.Root
        type="single"
        value={calendarValue}
        onValueChange={handleDateSelect}
        weekdayFormat="short"
        weekStartsOn={1}
        class="bg-slack-sidebar border border-white/20 rounded-lg shadow-lg p-3"
      >
        {#snippet children({ months, weekdays })}
          <Calendar.Header class="flex items-center justify-between mb-2">
            <Calendar.PrevButton class="p-1 rounded hover:bg-white/10 text-slack-text-muted hover:text-slack-text transition-colors">
              <ChevronLeft size={16} />
            </Calendar.PrevButton>
            <Calendar.Heading class="text-sm font-medium text-slack-text" />
            <Calendar.NextButton class="p-1 rounded hover:bg-white/10 text-slack-text-muted hover:text-slack-text transition-colors">
              <ChevronRight size={16} />
            </Calendar.NextButton>
          </Calendar.Header>
          {#each months as month (month.value.toString())}
            <Calendar.Grid class="w-full border-collapse">
              <Calendar.GridHead>
                <Calendar.GridRow class="flex">
                  {#each weekdays as weekday (weekday)}
                    <Calendar.HeadCell class="w-8 h-8 flex items-center justify-center text-xs text-slack-text-muted font-medium">
                      {weekday}
                    </Calendar.HeadCell>
                  {/each}
                </Calendar.GridRow>
              </Calendar.GridHead>
              <Calendar.GridBody>
                {#each month.weeks as weekDates (weekDates.map(d => d.toString()).join('-'))}
                  <Calendar.GridRow class="flex">
                    {#each weekDates as date (date.toString())}
                      <Calendar.Cell {date} month={month.value} class="p-0">
                        {#snippet children({ selected, disabled })}
                          <Calendar.Day
                            class="w-8 h-8 flex items-center justify-center rounded text-sm transition-colors
                              {selected ? 'bg-slack-accent text-white font-medium' : ''}
                              {disabled ? 'text-white/20 cursor-not-allowed' : 'text-slack-text hover:bg-white/10 cursor-pointer'}"
                          >
                            {date.day}
                          </Calendar.Day>
                        {/snippet}
                      </Calendar.Cell>
                    {/each}
                  </Calendar.GridRow>
                {/each}
              </Calendar.GridBody>
            </Calendar.Grid>
          {/each}
        {/snippet}
      </Calendar.Root>
    </div>
  {/if}
</div>

{#if showingConfirm && element.confirm}
  <ConfirmDialog confirm={element.confirm} onConfirm={handleConfirm} onDeny={handleDeny} />
{/if}
