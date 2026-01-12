<script lang="ts">
  import { Settings, Sparkles } from '@lucide/svelte'
  import { CHANNELS, type Channel } from '../lib/types'
  import { simulatorState, switchChannel } from '../lib/state.svelte'
  import IconButton from './IconButton.svelte'
  import BotStatusIndicator from './BotStatusIndicator.svelte'
  import { isElectron } from '../lib/electron-api'

  interface Props {
    onChannelSelect?: (channel: Channel) => void
    onOpenSettings?: () => void
  }

  let { onChannelSelect, onOpenSettings }: Props = $props()

  const sections = [
    { type: 'channel' as const, label: 'Channels' },
    { type: 'dm' as const, label: 'Apps' },
  ]

  function handleSelect(channel: Channel) {
    switchChannel(channel.id)
    onChannelSelect?.(channel)
  }

  function handleKeyDown(event: KeyboardEvent, channel: Channel) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect(channel)
    }
  }

  let isBotDisconnected = $derived(
    simulatorState.connectedBots.size > 0 &&
      Array.from(simulatorState.connectedBots.values()).every(
        (bot) => bot.status === 'disconnected'
      )
  )
</script>

<aside
  class="w-70 shrink-0 bg-(--sidebar-bg) text-(--sidebar-text) cursor-default flex flex-col h-full border-r border-(--border-color)"
>
  {#if isElectron}
    <div class="h-[38px] shrink-0 drag"></div>
  {/if}
  <div class="px-5 py-3 flex items-center justify-between drag">
    <h1 class="text-lg font-bold leading-[1.45] text-(--sidebar-header)">
      Botarium
    </h1>
    {#if onOpenSettings}
      <IconButton
        icon={Settings}
        size={18}
        label="Settings"
        class="no-drag"
        onclick={onOpenSettings}
      />
    {/if}
  </div>

  <nav class="flex-1 overflow-y-auto p-2">
    {#each sections as section}
      {@const hasBotsForApps = section.type !== 'dm' || simulatorState.connectedBots.size > 0}
      {#if hasBotsForApps}
        <div
          class="pt-4 px-5 pb-1 text-sm font-semibold text-(--sidebar-muted) uppercase tracking-wide"
        >
          {section.label}
        </div>
      {/if}
      {#each CHANNELS.filter((c) => c.type === section.type && (c.type !== 'dm' || simulatorState.connectedBots.size > 0)) as channel}
        {@const isActive = simulatorState.currentChannel === channel.id}
        <div
          class="flex items-center relative hover:bg-(--sidebar-hover) rounded-lg"
          class:!bg-(--sidebar-active)={isActive}
        >
          <button
            class="flex items-center gap-2 flex-1 px-5 py-1.5 bg-transparent border-none text-[15px] text-left cursor-pointer"
            class:text-(--sidebar-active-text)={isActive}
            class:text-(--sidebar-text)={!isActive}
            onclick={() => handleSelect(channel)}
            onkeydown={(e) => handleKeyDown(e, channel)}
          >
            {#if channel.type === 'channel'}
              <span
                class="font-medium"
                class:text-(--sidebar-active-text)={isActive}
                class:text-(--sidebar-muted)={!isActive}>#</span
              >
            {:else}
              <span
                class="size-5 rounded bg-(--bot-avatar-bg) text-white flex items-center justify-center"
              >
                <Sparkles size={12} />
              </span>
            {/if}
            <span
              class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {channel.type === 'dm' ? simulatorState.botName : channel.name}
            </span>
            {#if channel.type === 'dm' && isBotDisconnected}
              <span class="size-2 rounded-full bg-red-500 shrink-0"></span>
            {/if}
          </button>
        </div>
      {/each}
    {/each}
  </nav>

  <BotStatusIndicator />
</aside>
