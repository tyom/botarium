<script lang="ts">
  import type {
    SlackSectionBlock,
    SlackButtonElement,
  } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import Button from '../elements/Button.svelte'
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
      <p class="text-slack-text whitespace-pre-wrap">
        {@html renderMrkdwn(block.text)}
      </p>
    {/if}
    {#if block.fields}
      <div class="grid grid-cols-2 gap-2 mt-2">
        {#each block.fields as field, i (i)}
          <p class="text-slack-text text-sm">
            {@html renderMrkdwn(field)}
          </p>
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
    {:else if block.accessory.type === 'image'}
      <ImageElement
        imageUrl={block.accessory.image_url}
        altText={block.accessory.alt_text}
        size="md"
      />
    {/if}
  {/if}
</div>
