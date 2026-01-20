<script lang="ts">
  import { EllipsisVertical } from '@lucide/svelte'
  import IconButton from './IconButton.svelte'

  export interface MenuItem {
    label: string
    onClick: () => void
  }

  interface Props {
    items: MenuItem[]
  }

  let { items }: Props = $props()

  let isOpen = $state(false)
  let triggerButton: HTMLDivElement

  function toggle() {
    isOpen = !isOpen
  }

  function handleItemClick(item: MenuItem) {
    item.onClick()
    isOpen = false
  }

  function handleClickOutside(event: MouseEvent) {
    if (
      isOpen &&
      triggerButton &&
      !triggerButton.contains(event.target as Node)
    ) {
      isOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={triggerButton}>
  <IconButton icon={EllipsisVertical} label="More options" onclick={toggle} />
  {#if isOpen}
    <div
      class="absolute top-full right-0 mt-1 min-w-30 bg-(--main-bg) border border-(--border-color) rounded-md shadow-lg z-100 overflow-hidden"
    >
      {#each items as item (item.label)}
        <button
          class="block w-full py-2 px-3 bg-transparent border-none text-left text-sm text-(--text-primary) cursor-pointer transition-colors hover:bg-(--sidebar-hover)"
          onclick={() => handleItemClick(item)}
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>
