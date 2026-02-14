<script lang="ts">
  import type {
    SlackActionsBlock,
    SlackButtonElement,
    SlackStaticSelectElement,
  } from '../../../lib/types'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'

  interface Props {
    block: SlackActionsBlock
    onAction?: (actionId: string, value: string) => void
  }

  let { block, onAction }: Props = $props()
</script>

<div class="flex flex-wrap gap-2">
  {#each block.elements as element, i (i)}
    {#if element.type === 'button'}
      <Button element={element as SlackButtonElement} onClick={onAction} />
    {:else if element.type === 'static_select'}
      {@const sel = element as SlackStaticSelectElement}
      <StaticSelect
        element={sel}
        compact
        onChange={(value) => onAction?.(sel.action_id, value)}
      />
    {/if}
  {/each}
</div>
