<script lang="ts">
  import type {
    SlackActionsBlock,
    SlackButtonElement,
    SlackStaticSelectElement,
    SlackOverflowElement,
    SlackRadioButtonsElement,
  } from '../../../lib/types'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import OverflowMenu from '../elements/OverflowMenu.svelte'
  import RadioButtonGroup from '../elements/RadioButtonGroup.svelte'

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
    {:else if element.type === 'overflow'}
      {@const ovf = element as SlackOverflowElement}
      <OverflowMenu
        element={ovf}
        onSelect={(option) => onAction?.(ovf.action_id, option.value)}
      />
    {:else if element.type === 'radio_buttons'}
      {@const radio = element as SlackRadioButtonsElement}
      <RadioButtonGroup
        element={radio}
        onChange={(option) => onAction?.(radio.action_id, option.value)}
      />
    {/if}
  {/each}
</div>
