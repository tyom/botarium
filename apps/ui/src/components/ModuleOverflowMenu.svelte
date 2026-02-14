<script lang="ts">
  import { ChevronDown, Check } from '@lucide/svelte'

  interface ModuleStat {
    module: string
    count: number
  }

  interface Props {
    modules: ModuleStat[]
    enabledModules: Set<string>
    onToggle: (module: string) => void
    onSolo: (module: string) => void
  }

  let { modules, enabledModules, onToggle, onSolo }: Props = $props()

  let isOpen = $state(false)
  let containerRef: HTMLDivElement

  function toggle() {
    isOpen = !isOpen
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

  function handleItemClick(module: string, e: MouseEvent) {
    if (e.altKey) {
      onSolo(module)
      isOpen = false // Close menu after solo
    } else {
      onToggle(module)
      // Don't close menu - allow multiple toggles
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={containerRef}>
  <button
    class="module-toggle flex items-center gap-0.5 py-px"
    onclick={toggle}
    title="More modules"
  >
    +{modules.length}
    <ChevronDown size={12} />
  </button>

  {#if isOpen}
    <div
      class="absolute top-full left-0 mt-1 min-w-32 max-h-48 overflow-y-auto bg-(--main-bg) border border-(--border-color) rounded-md shadow-lg z-100"
    >
      {#each modules as { module, count } (module)}
        <button
          class="flex items-center w-full gap-2 px-2.5 py-1.5 bg-transparent border-none text-left text-xs text-(--text-primary) hover:bg-(--sidebar-hover) transition-colors cursor-pointer"
          onclick={(e) => handleItemClick(module, e)}
        >
          <span
            class="size-3.5 flex items-center justify-center border border-(--border-color) rounded-sm {enabledModules.has(
              module
            )
              ? 'bg-slack-accent border-slack-accent'
              : ''}"
          >
            {#if enabledModules.has(module)}
              <Check size={10} class="text-white" />
            {/if}
          </span>
          <span class="flex-1">{module}</span>
          <span class="text-(--text-muted)">{count}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
