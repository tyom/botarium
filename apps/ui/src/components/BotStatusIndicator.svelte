<script lang="ts">
  import { Bot, Circle } from '@lucide/svelte'
  import { simulatorState } from '../lib/state.svelte'

  // Computed values using $derived
  const botsMap = $derived(simulatorState.connectedBots)
  const bots = $derived([...botsMap.values()])
  const connectedCount = $derived(
    bots.filter((b) => b.status === 'connected').length
  )
  const disconnectedCount = $derived(
    bots.filter((b) => b.status === 'disconnected').length
  )
  const hasBots = $derived(botsMap.size > 0)
</script>

<div class="px-5 py-2 border-t border-(--border-color)">
  <div class="flex items-center gap-2 text-sm text-(--sidebar-muted)">
    <Bot size={16} />
    <span class="flex-1">
      {#if !hasBots}
        No bots
      {:else if connectedCount > 0}
        {connectedCount} connected{#if disconnectedCount > 0}, {disconnectedCount}
          offline{/if}
      {:else}
        {disconnectedCount} offline
      {/if}
    </span>
    {#if !hasBots}
      <span title="Waiting for bots">
        <Circle size={8} class="text-yellow-500 fill-yellow-500" />
      </span>
    {/if}
  </div>

  {#if hasBots}
    <div class="mt-1 space-y-0.5">
      {#each bots as bot (bot.id)}
        <div
          class="flex items-center gap-2 text-xs text-(--sidebar-text) pl-6"
          title={bot.status === 'connected'
            ? `Connected at ${new Date(bot.connectedAt).toLocaleTimeString()}`
            : 'Disconnected'}
        >
          <Circle
            size={6}
            class={bot.status === 'connected'
              ? 'text-green-500 fill-green-500'
              : 'text-red-500 fill-red-500'}
          />
          <span class="truncate flex-1">{bot.name}</span>
          <span class="text-(--sidebar-muted)">
            {bot.commands} cmd{bot.commands === 1 ? '' : 's'}
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>
