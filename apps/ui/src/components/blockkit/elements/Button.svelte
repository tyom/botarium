<script lang="ts">
  import type { SlackButtonElement } from '$lib/types'
  import { renderText } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackButtonElement
    onClick?: (actionId: string, value: string) => void
  }

  let { element, onClick }: Props = $props()

  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)

  function handleClick() {
    if (element.confirm) {
      pendingAction = () => onClick?.(element.action_id, element.value ?? '')
      showingConfirm = true
    } else {
      onClick?.(element.action_id, element.value ?? '')
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

<button
  type="button"
  class="c-button {element.style === 'primary'
    ? 'c-button--primary'
    : element.style === 'danger'
      ? 'c-button--danger'
      : 'c-button--outline'}"
  onclick={handleClick}
>
  {renderText(element.text)}
</button>

{#if showingConfirm && element.confirm}
  <ConfirmDialog
    confirm={element.confirm}
    onConfirm={handleConfirm}
    onDeny={handleDeny}
  />
{/if}

<style>
  .c-button {
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    transition:
      background-color 0.15s,
      border-color 0.15s;
    border: 1px solid transparent;
  }

  .c-button--outline {
    background: transparent;
    color: var(--color-slack-text, #d1d2d3);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .c-button--outline:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .c-button--primary {
    background: var(--color-slack-accent, #007a5a);
    color: white;
  }

  .c-button--primary:hover {
    background: var(--color-slack-accent-hover, #148567);
  }

  .c-button--danger {
    background: #dc2626;
    color: white;
  }

  .c-button--danger:hover {
    background: #b91c1c;
  }
</style>
