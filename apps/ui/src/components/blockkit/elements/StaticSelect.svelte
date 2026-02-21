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
  class="c-select_input"
  class:c-select_input--compact={compact}
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

<style>
  .c-select_input {
    appearance: none;
    background-color: var(--color-slack-input, #222529);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: var(--color-slack-text, #d1d2d3);
    background-image: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%23ababad%22%3E%3Cpath%20d%3D%22M4.5%206l3.5%203.5L11.5%206%22%20stroke%3D%22%23ababad%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E');
    background-size: 16px;
    background-position: right 8px center;
    background-repeat: no-repeat;
    width: 190px;
    height: 32px;
    padding-left: 12px;
    padding-right: 32px;
  }

  .c-select_input:focus {
    border-color: rgba(255, 255, 255, 0.4);
    outline: none;
  }

  .c-select_input--compact {
    font-size: 14px;
  }
</style>
