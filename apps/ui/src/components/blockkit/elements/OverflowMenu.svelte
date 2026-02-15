<script lang="ts">
  import { EllipsisVertical } from '@lucide/svelte'
  import type {
    SlackOverflowElement,
    SlackOverflowOption,
  } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackOverflowElement
    onSelect?: (option: SlackOverflowOption) => void
  }

  let { element, onSelect }: Props = $props()

  let isOpen = $state(false)
  let containerRef: HTMLDivElement

  function toggle(e: MouseEvent) {
    e.stopPropagation()
    isOpen = !isOpen
  }

  function handleSelect(option: SlackOverflowOption) {
    isOpen = false
    if (option.url) {
      window.open(option.url, '_blank')
    }
    onSelect?.(option)
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      isOpen &&
      containerRef &&
      !containerRef.contains(event.target as Node)
    ) {
      isOpen = false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

<div class="relative inline-flex" bind:this={containerRef}>
  <button
    type="button"
    class="p-1 rounded text-slack-text-muted hover:bg-white/10 hover:text-slack-text transition-colors"
    onclick={toggle}
    aria-label="More options"
    aria-expanded={isOpen}
  >
    <EllipsisVertical size={18} />
  </button>
  {#if isOpen}
    <div
      class="absolute top-full right-0 mt-1 min-w-36 bg-slack-sidebar border border-white/20 rounded-md shadow-lg z-50 overflow-hidden"
    >
      {#each element.options as option (option.value)}
        <button
          type="button"
          class="block w-full py-2 px-3 bg-transparent border-none text-left text-sm text-slack-text cursor-pointer transition-colors hover:bg-white/10"
          onclick={() => handleSelect(option)}
        >
          {renderText(option.text)}
        </button>
      {/each}
    </div>
  {/if}
</div>
