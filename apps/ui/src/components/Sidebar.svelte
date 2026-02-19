<script lang="ts">
  import { Plus, Settings, Sparkles } from '@lucide/svelte'
  import type { Channel } from '../lib/types'
  import { simulatorState, switchChannel } from '../lib/state.svelte'
  import { addChannel, removeChannel } from '../lib/dispatcher.svelte'
  import IconButton from './IconButton.svelte'
  import BotStatusIndicator from './BotStatusIndicator.svelte'
  import { isElectron } from '../lib/electron-api'

  interface Props {
    onChannelSelect?: (channel: Channel) => void
    onOpenSettings?: () => void
    onOpenAppSettings?: (appId: string, appName: string) => void
  }

  let { onChannelSelect, onOpenSettings, onOpenAppSettings }: Props = $props()

  // Add channel input state
  let showAddInput = $state(false)
  let newChannelName = $state('')

  // Context menu state
  let contextMenu = $state<{
    x: number
    y: number
    channelId: string
    channelName: string
  } | null>(null)

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

  function handleAddClick() {
    showAddInput = true
    newChannelName = ''
  }

  function handleAddInputKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      const name = newChannelName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
      if (name) {
        addChannel(name)
      }
      showAddInput = false
      newChannelName = ''
    } else if (event.key === 'Escape') {
      showAddInput = false
      newChannelName = ''
    }
  }

  function handleAddInputBlur() {
    showAddInput = false
    newChannelName = ''
  }

  function handleContextMenu(
    event: MouseEvent,
    channelId: string,
    channelName: string
  ) {
    event.preventDefault()
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      channelId,
      channelName,
    }
  }

  function handleDeleteChannel() {
    if (!contextMenu) return
    const { channelId, channelName } = contextMenu
    contextMenu = null
    if (
      window.confirm(
        `Delete #${channelName}? All messages in this channel will be lost.`
      )
    ) {
      removeChannel(channelId)
    }
  }

  function handleCloseContextMenu() {
    contextMenu = null
  }
</script>

<svelte:window onclick={handleCloseContextMenu} />

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
    {#each sections as section (section.type)}
      {@const hasBotsForApps =
        section.type !== 'dm' || simulatorState.connectedBots.size > 0}
      {#if hasBotsForApps}
        <div
          class="pt-4 px-5 pb-1 text-sm font-semibold text-(--sidebar-muted) uppercase tracking-wide flex items-center justify-between"
        >
          <span>{section.label}</span>
          {#if section.type === 'channel'}
            <button
              class="bg-transparent border-none p-0 cursor-pointer flex items-center justify-center text-(--sidebar-muted) hover:text-(--sidebar-text) transition-colors"
              aria-label="Add channel"
              onclick={handleAddClick}
            >
              <Plus size={16} />
            </button>
          {/if}
        </div>
      {/if}
      {#if section.type === 'channel'}
        {#if showAddInput}
          <div class="px-5 py-1">
            <div
              class="flex items-center gap-1 rounded bg-(--sidebar-hover) px-2 py-1"
            >
              <span class="text-(--sidebar-muted) text-sm font-medium">#</span>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                type="text"
                class="flex-1 bg-transparent border-none outline-none text-sm text-(--sidebar-text) placeholder:text-(--sidebar-muted)"
                placeholder="channel-name"
                bind:value={newChannelName}
                onkeydown={handleAddInputKeyDown}
                onblur={handleAddInputBlur}
                autofocus
              />
            </div>
          </div>
        {/if}
        {#each simulatorState.channels.filter((c) => c.type === 'channel') as channel (channel.id)}
          {@const isActive = simulatorState.currentChannel === channel.id}
          <div
            class="flex items-center relative hover:bg-(--sidebar-hover) rounded-lg group"
            class:!bg-(--sidebar-active)={isActive}
            oncontextmenu={!channel.isPreset
              ? (e) => handleContextMenu(e, channel.id, channel.name)
              : undefined}
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
        {#each Array.from(simulatorState.connectedBots.values()) as bot (bot.id)}
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

<!-- Context menu for user-created channels -->
{#if contextMenu}
  <div
    class="fixed min-w-36 bg-(--main-bg) border border-(--border-color) rounded-md shadow-lg z-1000 overflow-hidden"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
  >
    <button
      class="block w-full py-2 px-3 bg-transparent border-none text-left text-sm text-red-400 cursor-pointer transition-colors hover:bg-(--sidebar-hover)"
      onclick={handleDeleteChannel}
    >
      Delete channel
    </button>
  </div>
{/if}
