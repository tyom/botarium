<script lang="ts">
  import type { SlackButtonElement } from '../../../lib/types'
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
    height: 32px;
    padding: 0 12px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
    border: none;
  }

  .c-button--outline {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-slack-text, #d1d2d3);
  }

  .c-button--outline:hover {
    background: rgba(255, 255, 255, 0.2);
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
