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
    onOpenAppSettings?: (appId: string, appName: string) => void
  }

  let { onChannelSelect, onOpenSettings, onOpenAppSettings }: Props = $props()

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
      {@const hasBotsForApps =
        section.type !== 'dm' || simulatorState.connectedBots.size > 0}
      {#if hasBotsForApps}
        <div
          class="pt-4 px-5 pb-1 text-sm font-semibold text-(--sidebar-muted) uppercase tracking-wide"
        >
          {section.label}
        </div>
      {/if}
      {#if section.type === 'channel'}
        {#each CHANNELS.filter((c) => c.type === 'channel') as channel}
          {@const isActive = simulatorState.currentChannel === channel.id}
          <div
            class="flex items-center relative hover:bg-(--sidebar-hover) rounded-lg group"
            class:!bg-(--sidebar-active)={isActive}
          >
            <button
              class="flex items-center gap-2 flex-1 px-5 py-1.5 bg-transparent border-none text-[15px] text-left cursor-pointer"
              class:text-(--sidebar-active-text)={isActive}
              class:text-(--sidebar-text)={!isActive}
              onclick={() => handleSelect(channel)}
              onkeydown={(e) => handleKeyDown(e, channel)}
            >
              <span
                class="font-medium"
                class:text-(--sidebar-active-text)={isActive}
                class:text-(--sidebar-muted)={!isActive}>#</span
              >
              <span
                class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {channel.name}
              </span>
            </button>
          </div>
        {/each}
      {:else}
        {#each Array.from(simulatorState.connectedBots.values()) as bot}
          {@const channelId = `D_${bot.id}`}
          {@const isActive = simulatorState.currentChannel === channelId}
          {@const isDisconnected = bot.status === 'disconnected'}
          <div
            class="flex items-center relative hover:bg-(--sidebar-hover) rounded-lg group"
            class:!bg-(--sidebar-active)={isActive}
          >
            <button
              class="flex items-center gap-2 flex-1 px-5 py-1.5 bg-transparent border-none text-[15px] text-left cursor-pointer"
              class:text-(--sidebar-active-text)={isActive}
              class:text-(--sidebar-text)={!isActive}
              onclick={() => switchChannel(channelId)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  switchChannel(channelId)
                }
              }}
            >
              <span
                class="size-5 rounded bg-(--bot-avatar-bg) text-white flex items-center justify-center"
              >
                <Sparkles size={12} />
              </span>
              <span
                class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {bot.name}
              </span>
              {#if isDisconnected}
                <span class="size-2 rounded-full bg-red-500 shrink-0"></span>
              {/if}
            </button>
            {#if !isDisconnected && onOpenAppSettings}
              <IconButton
                icon={Settings}
                size={14}
                label="{bot.name} settings"
                class="opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                onclick={(e) => {
                  e.stopPropagation()
                  onOpenAppSettings(bot.id, bot.name)
                }}
              />
            {/if}
          </div>
        {/each}
      {/if}
    {/each}
  </nav>

  <BotStatusIndicator />
</aside>
