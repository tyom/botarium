<script lang="ts">
  import type {
    SlackStaticSelectElement,
    SlackOption,
  } from '../../../lib/types'
  import { renderText } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackStaticSelectElement
    value?: SlackOption
    onChange?: (value: string) => void
    /** Smaller styling for actions block vs input block */
    compact?: boolean
  }

  let { element, value, onChange, compact = false }: Props = $props()

  const selectedValue = $derived(
    value?.value ?? element.initial_option?.value ?? ''
  )

  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)

  function handleChange(newValue: string) {
    if (element.confirm) {
      pendingAction = () => onChange?.(newValue)
      showingConfirm = true
    } else {
      onChange?.(newValue)
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

<select
  class="bg-slack-input border border-white/20 rounded-lg text-slack-text focus:border-white/40 focus:outline-none
    {compact ? 'px-3 py-1.5 text-sm' : 'w-full px-3 py-2'}"
  value={selectedValue}
  onchange={(e) => handleChange(e.currentTarget.value)}
>
  {#if element.placeholder}
    <option value="" disabled>{renderText(element.placeholder)}</option>
  {/if}
  {#each element.options as option (option.text.text)}
    <option value={option.value}>{renderText(option.text)}</option>
  {/each}
</select>

{#if showingConfirm && element.confirm}
  <ConfirmDialog confirm={element.confirm} onConfirm={handleConfirm} onDeny={handleDeny} />
{/if}
