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
  class="h-8 px-3 rounded text-sm font-medium transition-colors
    {element.style === 'primary'
    ? 'bg-slack-accent text-white hover:bg-slack-accent-hover'
    : element.style === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-white/10 text-slack-text hover:bg-white/20'}"
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
