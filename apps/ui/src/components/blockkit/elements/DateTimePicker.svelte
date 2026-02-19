<script lang="ts">
  import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
  } from '@lucide/svelte'
  import { Calendar, TimeField } from 'bits-ui'
  import { CalendarDate, Time, type DateValue } from '@internationalized/date'
  import type { SlackDateTimePickerElement } from '../../../lib/types'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackDateTimePickerElement
    value?: string // UNIX timestamp as string (formValues stores strings)
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

  // Parse UNIX timestamp into separate CalendarDate and Time
  function parseTimestamp(ts: number): { date: CalendarDate; time: Time } {
    const d = new Date(ts * 1000)
    return {
      date: new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate()),
      time: new Time(d.getHours(), d.getMinutes()),
    }
  }

  // Determine the initial timestamp from value or element.initial_date_time
  const initialTimestamp = $derived.by(() => {
    if (value) {
      const n = Number(value)
      return isNaN(n) ? undefined : n
    }
    return element.initial_date_time
  })

  // Selected date state, initialized from timestamp
  let selectedDate = $state<CalendarDate | undefined>(undefined)
  let selectedTime = $state<Time | undefined>(undefined)
  // Initialize from timestamp when it changes
  $effect(() => {
    const ts = initialTimestamp
    if (ts != null) {
      const parsed = parseTimestamp(ts)
      selectedDate = parsed.date
      selectedTime = parsed.time
    } else {
      selectedDate = undefined
      selectedTime = undefined
    }
  })

  // Display text: formatted date+time or placeholder
  const displayText = $derived.by(() => {
    if (selectedDate && selectedTime) {
      const y = selectedDate.year
      const m = String(selectedDate.month).padStart(2, '0')
      const d = String(selectedDate.day).padStart(2, '0')
      const h = String(selectedTime.hour).padStart(2, '0')
      const min = String(selectedTime.minute).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}`
    }
    return 'Select date and time'
  })

  const hasValue = $derived(selectedDate != null && selectedTime != null)

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
    const menuHeight = 420 // approximate calendar + time field height
    const menuWidth = 280 // calendar is the widest part; time field + Done fit within
    const spaceBelow = window.innerHeight - rect.bottom

    // Prevent right-edge overflow
    let left = rect.left
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    if (left < 8) left = 8

    if (spaceBelow < menuHeight + 8) {
      menuStyle = `position:fixed; bottom:${window.innerHeight - rect.top + 4}px; left:${left}px; width:${menuWidth}px;`
    } else {
      menuStyle = `position:fixed; top:${rect.bottom + 4}px; left:${left}px; width:${menuWidth}px;`
    }
  }

  function handleDateSelect(date: DateValue | undefined) {
    if (!date) return
    selectedDate = new CalendarDate(date.year, date.month, date.day)
    // Default time to 00:00 if not yet set
    if (!selectedTime) {
      selectedTime = new Time(0, 0)
    }
  }

  function handleTimeChange(newTime: Time | undefined) {
    if (!newTime) return
    selectedTime = newTime
  }

  function handleDone() {
    if (!selectedDate || !selectedTime) return
    const timestamp = Math.floor(
      new Date(
        selectedDate.year,
        selectedDate.month - 1,
        selectedDate.day,
        selectedTime.hour,
        selectedTime.minute
      ).getTime() / 1000
    )
    isOpen = false
    if (element.confirm) {
      pendingAction = () => onChange?.(String(timestamp))
      showingConfirm = true
    } else {
      onChange?.(String(timestamp))
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
    class="flex items-center gap-2 rounded-lg border border-white/20 bg-slack-input text-slack-text hover:bg-white/10 transition-colors h-8
      {compact ? 'px-2.5 text-sm' : 'px-3 py-2 text-sm'}"
    onclick={toggle}
    bind:this={triggerRef}
    aria-label="Select date and time"
    aria-expanded={isOpen}
  >
    <CalendarIcon size={16} class="text-slack-text-muted shrink-0" />
    <span class={hasValue ? 'text-slack-text' : 'text-slack-text-muted'}>
      {displayText}
    </span>
  </button>
  {#if isOpen}
    <div style={menuStyle} class="z-200">
      <div
        class="bg-slack-sidebar border border-white/20 rounded-lg shadow-lg flex flex-col"
      >
        <!-- Calendar -->
        <div class="p-3">
          <Calendar.Root
            type="single"
            value={selectedDate}
            onValueChange={handleDateSelect}
            weekdayFormat="short"
            weekStartsOn={1}
          >
            {#snippet children({ months, weekdays })}
              <Calendar.Header class="flex items-center justify-between mb-2">
                <Calendar.PrevButton
                  class="p-1 rounded hover:bg-white/10 text-slack-text-muted hover:text-slack-text transition-colors"
                >
                  <ChevronLeft size={16} />
                </Calendar.PrevButton>
                <Calendar.Heading class="text-sm font-medium text-slack-text" />
                <Calendar.NextButton
                  class="p-1 rounded hover:bg-white/10 text-slack-text-muted hover:text-slack-text transition-colors"
                >
                  <ChevronRight size={16} />
                </Calendar.NextButton>
              </Calendar.Header>
              {#each months as month (month.value.toString())}
                <Calendar.Grid class="w-full border-collapse">
                  <Calendar.GridHead>
                    <Calendar.GridRow class="flex">
                      {#each weekdays as weekday (weekday)}
                        <Calendar.HeadCell
                          class="w-8 h-8 flex items-center justify-center text-xs text-slack-text-muted font-medium"
                        >
                          {weekday}
                        </Calendar.HeadCell>
                      {/each}
                    </Calendar.GridRow>
                  </Calendar.GridHead>
                  <Calendar.GridBody>
                    {#each month.weeks as weekDates (weekDates
                      .map((d) => d.toString())
                      .join('-'))}
                      <Calendar.GridRow class="flex">
                        {#each weekDates as date (date.toString())}
                          <Calendar.Cell {date} month={month.value} class="p-0">
                            {#snippet children({ selected, disabled })}
                              <Calendar.Day
                                class="w-8 h-8 flex items-center justify-center rounded text-sm transition-colors
                                  {selected
                                  ? 'bg-slack-accent text-white font-medium'
                                  : ''}
                                  {disabled
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'text-slack-text hover:bg-white/10 cursor-pointer'}"
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

        <!-- Divider -->
        <div class="border-t border-white/10 mx-3"></div>

        <!-- Time field -->
        <div class="px-3 py-2.5">
          <div class="text-xs text-slack-text-muted mb-1.5">Time</div>
          <TimeField.Root
            value={selectedTime}
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
              {selectedDate && selectedTime
              ? 'bg-slack-accent text-white hover:bg-slack-accent-hover cursor-pointer'
              : 'bg-white/5 text-slack-text-muted cursor-not-allowed'}"
            disabled={!selectedDate || !selectedTime}
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
  <ConfirmDialog
    confirm={element.confirm}
    onConfirm={handleConfirm}
    onDeny={handleDeny}
  />
{/if}
