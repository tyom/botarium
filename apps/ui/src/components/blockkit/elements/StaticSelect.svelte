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
  let selectRef: HTMLSelectElement

  function handleChange(newValue: string) {
    if (element.confirm) {
      // Reset visual selection before showing confirm dialog
      if (selectRef) selectRef.value = selectedValue
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
    if (selectRef) selectRef.value = selectedValue
    pendingAction = null
    showingConfirm = false
  }
</script>

<select
  class="appearance-none bg-slack-input border border-white/20 rounded-lg text-slack-text focus:border-white/40 focus:outline-none
    bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%23ababad%22%3E%3Cpath%20d%3D%22M4.5%206l3.5%203.5L11.5%206%22%20stroke%3D%22%23ababad%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')]
    bg-size-[16px] bg-position-[right_8px_center] bg-no-repeat w-[190px] h-8 pl-3 pr-8
    {compact && 'text-sm'}"
  value={selectedValue}
  onchange={(e) => handleChange(e.currentTarget.value)}
  bind:this={selectRef}
>
  {#if element.placeholder}
    <option value="" disabled>{renderText(element.placeholder)}</option>
  {/if}
  {#each element.options as option (option.text.text)}
    <option value={option.value}>{renderText(option.text)}</option>
  {/each}
</select>

{#if showingConfirm && element.confirm}
  <ConfirmDialog
    confirm={element.confirm}
    onConfirm={handleConfirm}
    onDeny={handleDeny}
  />
{/if}
