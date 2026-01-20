<script lang="ts">
  import { toHTML } from 'slack-markdown'
  import DOMPurify from 'dompurify'
  import {
    EllipsisVertical,
    Trash2,
    Sparkles,
    ChevronRight,
    ImageIcon,
  } from '@lucide/svelte'
  import type { SimulatorMessage } from '../lib/types'
  import {
    getMessageShortcut,
    simulatorState,
    isBotUserId,
    getBotByUserId,
  } from '../lib/state.svelte'
  import { updateFileExpanded } from '../lib/dispatcher.svelte'
  import { formatTimestamp, formatRelativeTime } from '../lib/time'
  import * as ContextMenu from '$lib/components/ui/context-menu'

  interface Props {
    message: SimulatorMessage
    replyCount?: number
    hasDraft?: boolean
    onOpenThread?: (ts: string) => void
    onDelete?: (ts: string) => void
    onGenerateImage?: (message: SimulatorMessage) => void
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
  }

  const EMOJI_MAP: Record<string, string> = {
    thinking_face: '🤔',
    white_check_mark: '✅',
    clock1: '🕐',
    clock2: '🕑',
    clock3: '🕒',
  }

  let {
    message,
    replyCount = 0,
    hasDraft = false,
    onOpenThread,
    onDelete,
    onGenerateImage,
    onImagePreview,
  }: Props = $props()

  let menuOpen = $state(false)
  let menuButton = $state<HTMLButtonElement | null>(null)
  let imageExpanded = $derived(message.file?.isExpanded ?? true)

  let isBot = $derived(isBotUserId(message.user))
  let hasImage = $derived(message.file?.mimetype?.startsWith('image/') ?? false)
  let messageShortcut = $derived(getMessageShortcut())
  let displayName = $derived.by(() => {
    if (!isBot) return simulatorState.simulatedUserName || 'You'
    // Get bot name from connected bots
    const bot = getBotByUserId(message.user)
    return bot?.name ?? simulatorState.botName
  })
  let avatarLetter = $derived(displayName.charAt(0).toUpperCase())
  let timestamp = $derived(formatTimestamp(message.ts))
  let formattedText = $derived.by(() => {
    // Replace internal user IDs BEFORE markdown processing (handles <@userId> format)
    const userName = simulatorState.simulatedUserName || 'You'
    let text = message.text
      .replace(/<@__SIMULATED_USER__>/g, `@${userName}`)
      .replace(/<@U_USER>/g, `@${userName}`)
      // Also handle without angle brackets (for plain text mentions)
      .replace(/@__SIMULATED_USER__\b/g, `@${userName}`)
      .replace(/@U_USER\b/g, `@${userName}`)

    let html = toHTML(text, {
      hrefTarget: '_blank',
    }).replace(/<br><br>/g, '<br><br><span class="p-gap"></span>')

    // Wrap @mentions in highlight span AFTER markdown processing
    const escapedUserName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const mentionRegex = new RegExp(`@${escapedUserName}`, 'g')
    html = html.replace(
      mentionRegex,
      `<span class="slack-mention">@${userName}</span>`
    )

    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'a',
        'b',
        'blockquote',
        'br',
        'code',
        'em',
        'i',
        'pre',
        'span',
        'strong',
      ],
      ALLOWED_ATTR: ['href', 'target', 'class'],
    })
  })

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation()
    menuOpen = !menuOpen
  }

  function handleDelete() {
    menuOpen = false
    onDelete?.(message.ts)
  }

  function handleGenerateImage() {
    onGenerateImage?.(message)
  }

  function handleClickOutside(e: MouseEvent) {
    if (menuButton && !menuButton.contains(e.target as Node)) {
      menuOpen = false
    }
  }

  function getEmoji(name: string): string {
    return EMOJI_MAP[name] || `:${name}:`
  }
</script>

<svelte:window onclick={handleClickOutside} />

<ContextMenu.Root>
  <ContextMenu.Trigger class="block">
    <div
      class="group flex gap-2 px-5 py-2 transition-colors duration-100 relative hover:bg-slack-hover"
    >
      {#if onDelete}
        <div
          class="absolute -top-3 right-5 z-10 opacity-0 transition-opacity duration-100 bg-slack-bg border border-slack-border rounded-xl p-1 group-hover:opacity-100"
        >
          <button
            bind:this={menuButton}
            class="flex items-center justify-center size-7 p-0 border-none rounded-lg bg-transparent text-slack-text-secondary cursor-pointer transition-colors duration-100 hover:bg-slack-sidebar-hover hover:text-slack-text"
            onclick={toggleMenu}
            aria-label="Message options"
          >
            <EllipsisVertical size={16} />
          </button>
          {#if menuOpen}
            <div
              class="absolute top-full right-0 mt-1 bg-slack-sidebar border border-slack-border rounded-md shadow-lg overflow-hidden whitespace-nowrap"
            >
              <button
                class="flex items-center gap-2 w-full py-2 px-3 border-none bg-transparent text-log-error text-[13px] cursor-pointer text-left hover:bg-red-500/10"
                onclick={handleDelete}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          {/if}
        </div>
      {/if}
      <div
        class="size-9 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0 {isBot
          ? 'bg-slack-bot-avatar'
          : 'bg-slack-user-avatar'}"
      >
        {#if isBot}
          <Sparkles size={20} />
        {:else}
          {avatarLetter}
        {/if}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2 mb-1">
          <span class="font-bold text-white">{displayName}</span>
          {#if isBot}
            <span
              class="bg-white/20 rounded px-0.5 text-[10px] text-white/60 uppercase tracking-wide align-middle"
              >APP</span
            >
          {/if}
          <span class="text-xs text-slack-text-muted">{timestamp}</span>
        </div>
        <div
          class="message-text text-slack-text leading-[1.46] wrap-break-word whitespace-pre-wrap"
        >
          {@html formattedText}
        </div>
        {#if message.file}
          <div class="mt-1">
            {#if message.file.mimetype.startsWith('image/')}
              {#if message.file.title}
                <div
                  class="text-[15px] text-slack-text-muted mb-1 flex items-center gap-1"
                >
                  {message.file.title}
                  <button
                    type="button"
                    onclick={() => {
                      if (message.file) {
                        updateFileExpanded(message.file.id, !imageExpanded)
                      }
                    }}
                    class="text-xs opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer bg-transparent border-none p-0.5"
                    class:-rotate-90={!imageExpanded}
                    aria-label={imageExpanded
                      ? 'Collapse image'
                      : 'Expand image'}
                  >
                    &#9660;
                  </button>
                </div>
              {/if}
              {#if imageExpanded}
                <button
                  type="button"
                  class="cursor-zoom-in block bg-transparent border-none p-0"
                  onclick={() =>
                    onImagePreview?.(
                      message.file!.url_private,
                      message.file!.title || message.file!.name
                    )}
                >
                  <img
                    src={message.file.url_private}
                    alt={message.file.title || message.file.name}
                    class="rounded-lg max-h-[360px] max-w-full"
                  />
                </button>
              {/if}
            {:else}
              <div
                class="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10"
              >
                <span class="text-slack-text">{message.file.name}</span>
              </div>
            {/if}
          </div>
        {/if}
        {#if message.reactions.size > 0}
          <div class="flex gap-1 mt-1 flex-wrap">
            {#each Array.from(message.reactions.entries()) as [reaction, count]}
              <span
                class="inline-flex items-center gap-1 bg-slack-reaction border border-slack-reaction-border rounded-xl px-2 py-0.5 text-xs text-slack-text-secondary"
                >{getEmoji(reaction)} {count}</span
              >
            {/each}
          </div>
        {/if}
        {#if (replyCount > 0 || hasDraft) && onOpenThread}
          <button
            class="group/reply flex items-center gap-1.5 w-80 mt-1.5 py-1.5 px-2 -ml-2 -mr-3 bg-transparent border-none rounded-md text-[13px] cursor-pointer transition-colors duration-100 hover:bg-white/4"
            onclick={() => onOpenThread(message.ts)}
          >
            <span
              class="size-5 rounded bg-slack-bot-avatar text-white flex items-center justify-center shrink-0"
            >
              <Sparkles size={12} />
            </span>
            <span
              class="text-blue-500/80 font-bold group-hover/reply:underline"
            >
              {#if replyCount > 0}
                {replyCount}
                {replyCount === 1 ? 'reply' : 'replies'}{#if hasDraft}
                  and 1 draft{/if}
              {:else}
                1 draft
              {/if}
            </span>
            <span class="text-slack-text-muted group-hover/reply:hidden"
              >{formatRelativeTime(message.ts)}</span
            >
            <span class="hidden group-hover/reply:block text-slack-text"
              >View thread</span
            >
            <ChevronRight
              size={16}
              class="hidden group-hover/reply:block ml-auto text-slack-text-muted"
            />
          </button>
        {/if}
      </div>
    </div>
  </ContextMenu.Trigger>
  {#if onDelete || (hasImage && onGenerateImage && messageShortcut)}
    <ContextMenu.Content>
      {#if hasImage && onGenerateImage && messageShortcut}
        <ContextMenu.Item onclick={handleGenerateImage}>
          <ImageIcon size={14} class="text-green-500" />
          {messageShortcut.name}
        </ContextMenu.Item>
      {/if}
      {#if onDelete}
        <ContextMenu.Item variant="destructive" onclick={handleDelete}>
          <Trash2 size={14} />
          Delete message
        </ContextMenu.Item>
      {/if}
    </ContextMenu.Content>
  {/if}
</ContextMenu.Root>

<style>
  /* Slack markdown styles for dynamic content */
  .message-text :global(br + br) {
    display: none;
  }

  .message-text :global(.p-gap) {
    display: block;
    height: 0.8em;
  }

  .message-text :global(code) {
    background: #8881;
    border: 1px solid #8883;
    border-radius: 3px;
    padding: 2px 4px;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: #e6902c;
  }

  .message-text :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 8px 12px;
    margin: 4px 0;
    overflow-x: auto;
    white-space: pre;
  }

  .message-text :global(pre code) {
    background: none;
    border: none;
    padding: 0;
    color: var(--text-primary);
  }

  .message-text :global(a) {
    color: #1d9bd1;
    text-decoration: none;
  }

  .message-text :global(a:hover) {
    text-decoration: underline;
  }

  .message-text :global(.s-mention) {
    background: rgba(232, 171, 76, 0.2);
    color: #e8ab4c;
    padding: 0 2px;
    border-radius: 3px;
  }

  .message-text :global(.slack-mention) {
    background: rgba(29, 155, 209, 0.2);
    color: #1d9bd1;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 500;
  }

  .message-text :global(blockquote) {
    border-left: 4px solid #ddd;
    margin: 4px 0;
    padding-left: 12px;
    color: var(--text-secondary);
  }
</style>
