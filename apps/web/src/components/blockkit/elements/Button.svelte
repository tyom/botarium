<script lang="ts">
  import type { SlackButtonElement } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackButtonElement
    onClick?: (actionId: string, value: string) => void
  }

  let { element, onClick }: Props = $props()
</script>

<button
  class="px-3 py-1.5 rounded text-sm font-medium transition-colors
    {element.style === 'primary'
    ? 'bg-slack-accent text-white hover:bg-slack-accent-hover'
    : element.style === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-white/10 text-slack-text hover:bg-white/20'}"
  onclick={() => onClick?.(element.action_id, element.value ?? '')}
>
  {renderText(element.text)}
</button>
