<script module lang="ts">
  // Module-level tracking to persist across component remounts
  // (component remounts when thread panel opens/closes due to layout change)
  const channelScrollPositions = new Map<string, number>()
  let lastScrollState = { channel: '', count: 0 }
  let initialScrollRestored = false

  const SCROLL_STORAGE_KEY = 'simulator:scrollPositions'

  // Load saved scroll positions from sessionStorage
  function loadScrollPositions(): void {
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, number>
        for (const [channel, position] of Object.entries(parsed)) {
          channelScrollPositions.set(channel, position)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Save scroll positions to sessionStorage
  function saveScrollPositions(): void {
    try {
      const obj: Record<string, number> = {}
      for (const [channel, position] of channelScrollPositions) {
        obj[channel] = position
      }
      sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(obj))
    } catch {
      // Ignore storage errors
    }
  }

  // Load on module init
  loadScrollPositions()
</script>

<script lang="ts">
  import { EllipsisVertical, Sparkles, Trash2 } from '@lucide/svelte'
  import { tick } from 'svelte'
  import {
    clearChannelMessages,
    deleteMessage,
    triggerMessageShortcut,
  } from '../lib/dispatcher.svelte'
  import type { SimulatorMessage } from '../lib/types'
  import {
    getChannelDisplayName,
    getChannelMessages,
    getMessageShortcut,
    getParentMessages,
    getReplyCount,
    hasThreadDraft,
    simulatorState,
  } from '../lib/state.svelte'
  import { CHANNELS } from '../lib/types'
  import Message from './Message.svelte'

  interface Props {
    logsHidden?: boolean
    activeThreadTs?: string | null
    onShowLogs?: () => void
    onOpenThread?: (ts: string) => void
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
  }

  let {
    logsHidden = false,
    activeThreadTs = null,
    onShowLogs,
    onOpenThread,
    onImagePreview,
  }: Props = $props()

  let menuOpen = $state(false)

  function handleDeleteMessage(ts: string) {
    deleteMessage(simulatorState.currentChannel, ts)
  }

  function handleGenerateImage(message: SimulatorMessage) {
    const shortcut = getMessageShortcut()
    if (!shortcut) return
    triggerMessageShortcut(shortcut.callback_id, {
      ts: message.ts,
      text: message.text,
      file: message.file,
    })
  }

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation()
    menuOpen = !menuOpen
  }

  function handleClearMessages(e: MouseEvent) {
    e.stopPropagation()
    menuOpen = false
    clearChannelMessages(simulatorState.currentChannel)
  }

  function handleClickOutside() {
    menuOpen = false
  }

  let messagesContainer = $state<HTMLDivElement | null>(null)

  let messages = $derived(getParentMessages(simulatorState.currentChannel))
  let channelName = $derived(getChannelDisplayName())
  let currentChannel = $derived(
    CHANNELS.find((c) => c.id === simulatorState.currentChannel)
  )
  let isBotDisconnected = $derived(
    Array.from(simulatorState.connectedBots.values()).every(
      (bot) => bot.status === 'disconnected'
    )
  )

  // Save scroll position on every scroll event
  function handleScroll() {
    if (messagesContainer) {
      channelScrollPositions.set(
        simulatorState.currentChannel,
        messagesContainer.scrollTop
      )
      saveScrollPositions()
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight
    }
  }

  // Track all messages (including thread replies) to detect new messages
  let allMessagesCount = $derived(
    getChannelMessages(simulatorState.currentChannel).length
  )

  // Restore scroll position on channel change, auto-scroll on new messages
  $effect(() => {
    const channel = simulatorState.currentChannel
    const currentCount = allMessagesCount
    const messagesLoaded = simulatorState.messagesLoaded
    const prevChannel = lastScrollState.channel
    const channelChanged = channel !== prevChannel && prevChannel
    const hasNewMessages = currentCount > lastScrollState.count

    tick().then(() => {
      if (!messagesContainer) return

      if (!initialScrollRestored && messagesLoaded) {
        // Initial load after refresh - restore saved position or scroll to bottom
        initialScrollRestored = true
        if (currentCount > 0) {
          const savedPosition = channelScrollPositions.get(channel)
          messagesContainer.scrollTop =
            savedPosition ?? messagesContainer.scrollHeight
        }
      } else if (channelChanged) {
        // Channel changed - restore saved position or scroll to bottom
        const savedPosition = channelScrollPositions.get(channel)
        messagesContainer.scrollTop =
          savedPosition ?? messagesContainer.scrollHeight
      } else if (hasNewMessages) {
        // New message in same channel - scroll to bottom after DOM update
        requestAnimationFrame(scrollToBottom)
      }
    })

    lastScrollState = { channel, count: currentCount }
  })
</script>

<svelte:window onclick={handleClickOutside} />

<div class="flex flex-col flex-1 min-h-0 bg-slack-bg cursor-default">
  <header
    class="px-5 py-3 border-b border-slack-border shrink-0 flex items-center justify-between drag"
  >
    <h2 class="m-0 text-lg font-bold text-slack-text flex items-center gap-2">
      {#if currentChannel?.type === 'dm'}
        <span
          class="size-5 rounded bg-(--bot-avatar-bg) text-white flex items-center justify-center"
        >
          <Sparkles size={12} />
        </span>
      {/if}
      {channelName}
      {#if currentChannel?.type === 'dm' && isBotDisconnected}
        <span class="text-sm font-normal text-slack-text-muted">
          (disconnected)
        </span>
      {/if}
    </h2>
    <div class="flex items-center gap-2 no-drag">
      {#if logsHidden && onShowLogs}
        <button
          class="bg-slack-sidebar-hover border border-slack-border rounded py-1 px-3 leading-tight text-[13px] text-slack-text-secondary cursor-pointer transition-[background-color,color] duration-100 hover:bg-slack-sidebar-active hover:text-slack-text"
          onclick={onShowLogs}
        >
          Logs
        </button>
      {/if}
      <div class="relative">
        <button
          class="flex items-center justify-center p-1 border-none rounded bg-transparent text-slack-text-secondary cursor-pointer transition-[background-color,color] duration-100 hover:bg-slack-sidebar-hover hover:text-slack-text"
          onclick={toggleMenu}
          aria-label="Channel options"
        >
          <EllipsisVertical size={18} />
        </button>
        {#if menuOpen}
          <div
            class="absolute top-full right-0 mt-1 bg-slack-sidebar border border-slack-border rounded-md shadow-lg overflow-hidden z-100"
          >
            <button
              class="flex items-center gap-2 w-full py-2 px-3 border-none bg-transparent text-log-error text-[13px] cursor-pointer text-left whitespace-nowrap hover:bg-red-500/10"
              onclick={handleClearMessages}
            >
              <Trash2 size={14} />
              <span>Clear messages</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div
    class="flex-1 min-h-0 overflow-y-auto py-4"
    bind:this={messagesContainer}
    onscroll={handleScroll}
  >
    {#if simulatorState.messagesLoaded && messages.length === 0}
      <div
        class="flex flex-col items-center justify-center h-full text-slack-text-muted text-center p-5"
      >
        <p class="my-1">No messages yet. Start typing to begin!</p>
        <p class="my-1 text-sm text-slack-text-secondary">
          Mention <strong class="text-slack-accent"
            >@{simulatorState.botName.toLowerCase()}</strong
          > or type in the DM channel to interact with the bot.
        </p>
      </div>
    {:else if messages.length > 0}
      {#each messages as message (message.ts)}
        <Message
          {message}
          replyCount={getReplyCount(simulatorState.currentChannel, message.ts)}
          hasDraft={activeThreadTs !== message.ts && hasThreadDraft(message.ts)}
          {onOpenThread}
          onDelete={handleDeleteMessage}
          onGenerateImage={handleGenerateImage}
          {onImagePreview}
        />
      {/each}
    {/if}
  </div>
</div>
