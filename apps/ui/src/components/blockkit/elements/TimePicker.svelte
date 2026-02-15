<script lang="ts">
  import { TimeField } from 'bits-ui'
  import { Time } from '@internationalized/date'
  import type { SlackTimePickerElement } from '../../../lib/types'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackTimePickerElement
    value?: string // HH:mm
    onChange?: (value: string) => void
    compact?: boolean
  }

  let { element, value, onChange, compact = false }: Props = $props()

  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)

  // Convert Slack string to Time for bits-ui
  const timeValue = $derived.by(() => {
    const timeStr = value || element.initial_time
    if (!timeStr) return undefined
    try {
      const [h, m] = timeStr.split(':').map(Number)
      return new Time(h!, m!)
    } catch {
      return undefined
    }
  })

  function handleValueChange(newTime: Time | undefined) {
    if (!newTime) return
    const slackTime = `${String(newTime.hour).padStart(2, '0')}:${String(newTime.minute).padStart(2, '0')}`
    // Skip if value hasn't actually changed
    const currentStr = value || element.initial_time || ''
    if (slackTime === currentStr) return
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
</script>

<div class="inline-flex">
  <TimeField.Root
    value={timeValue}
    onValueChange={handleValueChange}
    hourCycle={24}
    granularity="minute"
  >
    <TimeField.Input
      class="flex items-center gap-0.5 rounded-lg border border-white/20 bg-slack-input text-slack-text transition-colors focus-within:border-slack-accent
        {compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2 text-sm'}"
    >
      {#snippet children({ segments })}
        {#each segments as { part, value: segValue } (part)}
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

{#if showingConfirm && element.confirm}
  <ConfirmDialog confirm={element.confirm} onConfirm={handleConfirm} onDeny={handleDeny} />
{/if}
