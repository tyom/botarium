<script lang="ts">
  import type {
    SlackSectionBlock,
    SlackButtonElement,
    SlackStaticSelectElement,
  } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import Button from '../elements/Button.svelte'
  import StaticSelect from '../elements/StaticSelect.svelte'
  import ImageElement from '../elements/ImageElement.svelte'

  interface Props {
    block: SlackSectionBlock
    onAction?: (actionId: string, value: string) => void
  }

  let { block, onAction }: Props = $props()
</script>

<div class="flex items-start justify-between gap-4">
  <div class="flex-1">
    {#if block.text}
      <div class="mrkdwn text-slack-text whitespace-pre-wrap">
        {@html renderMrkdwn(block.text)}
      </div>
    {/if}
    {#if block.fields}
      <div class="grid grid-cols-2 gap-2 mt-2">
        {#each block.fields as field, i (i)}
          <div class="mrkdwn text-slack-text text-sm">
            {@html renderMrkdwn(field)}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  {#if block.accessory}
    {#if block.accessory.type === 'button'}
      <div class="shrink-0">
        <Button
          element={block.accessory as SlackButtonElement}
          onClick={onAction}
        />
      </div>
    {:else if block.accessory.type === 'static_select'}
      {@const sel = block.accessory as SlackStaticSelectElement}
      <div class="shrink-0">
        <StaticSelect
          element={sel}
          compact
          onChange={(value) => onAction?.(sel.action_id, value)}
        />
      </div>
    {:else if block.accessory.type === 'image'}
      <ImageElement
        imageUrl={block.accessory.image_url}
        altText={block.accessory.alt_text}
        size="md"
      />
    {/if}
  {/if}
</div>
