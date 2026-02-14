<script lang="ts">
  import type { SlashCommand } from '../lib/types'

  interface Props {
    commands: SlashCommand[]
    filter: string
    selectedIndex: number
    onSelect: (command: SlashCommand) => void
    onHover?: (index: number) => void
  }

  let { commands, filter, selectedIndex, onSelect, onHover }: Props = $props()

  // Filter commands based on input
  let filteredCommands = $derived(
    commands.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(filter.toLowerCase()) ||
        cmd.description.toLowerCase().includes(filter.toLowerCase())
    )
  )
</script>

{#if filteredCommands.length > 0}
  <div
    class="absolute bottom-full left-0 mb-1 bg-slack-input border border-white/20 rounded-lg shadow-lg overflow-hidden z-50 max-w-md w-full"
  >
    <div
      class="px-3 py-2 text-xs text-slack-text-muted border-b border-white/10"
    >
      Commands matching "{filter || '/'}"
    </div>
    {#each filteredCommands as cmd, i (cmd.command)}
      <button
        class="w-full px-3 py-2 text-left transition-colors flex items-start gap-3 {i ===
        selectedIndex
          ? 'bg-white/10'
          : 'hover:bg-white/5'}"
        onclick={() => onSelect(cmd)}
        onmouseenter={() => onHover?.(i)}
      >
        <span class="font-medium text-slack-text shrink-0">{cmd.command}</span>
        <span class="text-sm text-slack-text-muted truncate">
          {cmd.description}
        </span>
      </button>
    {/each}
    <div
      class="px-3 py-1.5 text-xs text-slack-text-muted border-t border-white/10 flex gap-4"
    >
      <span
        ><kbd class="px-1 bg-white/10 rounded">Tab</kbd> or
        <kbd class="px-1 bg-white/10 rounded">Enter</kbd> to select</span
      >
      <span><kbd class="px-1 bg-white/10 rounded">Esc</kbd> to dismiss</span>
    </div>
  </div>
{/if}
