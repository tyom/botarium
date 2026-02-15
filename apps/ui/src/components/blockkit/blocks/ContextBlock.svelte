<script lang="ts">
  import type {
    SlackContextBlock,
    SlackViewTextObject,
  } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import ImageElement from '../elements/ImageElement.svelte'

  interface Props {
    block: SlackContextBlock
  }

  let { block }: Props = $props()
</script>

<div class="flex flex-wrap items-center gap-2 text-xs text-slack-text-muted">
  {#each block.elements as el, i (i)}
    {#if 'text' in el}
      <span class="mrkdwn">{@html renderMrkdwn(el as SlackViewTextObject)}</span>
    {:else if el.type === 'image'}
      <ImageElement imageUrl={el.image_url} altText={el.alt_text} size="sm" />
    {/if}
  {/each}
</div>
