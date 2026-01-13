<script lang="ts">
  import type { SlackImageBlock } from '../../../lib/types'
  import { renderText } from '../context'
  import ImageElement from '../elements/ImageElement.svelte'

  interface Props {
    block: SlackImageBlock
  }

  let { block }: Props = $props()
</script>

<div class="flex flex-col items-center">
  {#if block.title}
    <p class="text-sm text-slack-text-muted mb-1">
      {renderText(block.title)}
    </p>
  {/if}
  <ImageElement imageUrl={block.image_url} altText={block.alt_text} size="lg" />
</div>
