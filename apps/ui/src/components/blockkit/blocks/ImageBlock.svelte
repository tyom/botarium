<script lang="ts">
  import type { SlackImageBlock } from '../../../lib/types'
  import { EMULATOR_API_URL } from '../../../lib/emulator-config'
  import { renderText } from '../context'

  interface Props {
    block: SlackImageBlock
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
  }

  let { block, onImagePreview }: Props = $props()
  let collapsed = $state(false)
  let imageSize = $state<string | null>(null)

  function formatBytes(bytes: number): string {
    if (bytes < 1000) return `${bytes} B`
    if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }

  $effect(() => {
    const controller = new AbortController()
    imageSize = null
    const url = `${EMULATOR_API_URL}/api/simulator/image-size?url=${encodeURIComponent(block.image_url)}`
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { ok: boolean; size?: number }) => {
        if (data.ok && data.size != null) {
          imageSize = formatBytes(data.size)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Failed to fetch image size:', err)
        }
      })
    return () => controller.abort()
  })
</script>

<div class="flex flex-col items-start max-w-[620px]">
  <span class="text-sm text-slack-text-muted">
    {#if block.title}{renderText(block.title)}{/if}
    {#if imageSize}({imageSize}){/if}
    <button
      type="button"
      aria-label="Toggle image details"
      aria-expanded={!collapsed}
      class="text-sm text-[#1d9bd1] hover:underline cursor-pointer mb-1"
      onclick={() => (collapsed = !collapsed)}
    >
      <span
        class="inline-block scale-y-60 transition-transform {collapsed
          ? '-rotate-90'
          : ''}">&#9660;</span
      >
    </button>
  </span>
  {#if !collapsed}
    {#if onImagePreview}
      <button
        type="button"
        class="cursor-zoom-in block bg-transparent border-none p-0"
        onclick={() => onImagePreview!(block.image_url, block.alt_text)}
      >
        <img
          src={block.image_url}
          alt={block.alt_text}
          class="max-w-full rounded-lg"
        />
      </button>
    {:else}
      <img
        src={block.image_url}
        alt={block.alt_text}
        class="max-w-full rounded-lg"
      />
    {/if}
  {/if}
</div>
