<script lang="ts">
  import { X } from '@lucide/svelte'
  import type { Snippet } from 'svelte'
  import IconButton from './IconButton.svelte'
  import DropdownMenu, { type MenuItem } from './DropdownMenu.svelte'

  interface Tab {
    id: string
    label: string
  }

  interface Props {
    title?: string
    tabs?: Tab[]
    activeTab?: string
    onTabChange?: (tabId: string) => void
    menuItems?: MenuItem[]
    onClose: () => void
    children: Snippet
  }

  let {
    title,
    tabs,
    activeTab,
    onTabChange,
    menuItems = [],
    onClose,
    children,
  }: Props = $props()
</script>

<aside
  class="flex flex-col h-full min-h-0 bg-(--main-bg) border-l border-(--border-color)"
>
  <header
    class="flex items-center justify-between px-5 py-3 shrink-0 cursor-default drag"
  >
    <div class="flex items-center">
      {#if tabs && tabs.length > 0}
        <div class="flex gap-1">
          {#each tabs as tab}
            <button
              class="panel-tab"
              data-active={activeTab === tab.id}
              onclick={() => onTabChange?.(tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </div>
      {:else if title}
        <h3 class="m-0 text-lg font-bold text-(--text-primary)">{title}</h3>
      {/if}
    </div>

    <div class="flex items-center gap-1 no-drag">
      {#if menuItems.length > 0}
        <DropdownMenu items={menuItems} />
      {/if}
      <IconButton icon={X} label="Close panel" onclick={onClose} />
    </div>
  </header>

  <div class="flex-1 min-h-0 flex flex-col">
    {@render children()}
  </div>
</aside>
