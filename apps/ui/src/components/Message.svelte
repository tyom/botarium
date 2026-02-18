<script lang="ts">
  import {
    EllipsisVertical,
    Trash2,
    Sparkles,
    ChevronRight,
    ImageIcon,
    Eye,
  } from '@lucide/svelte'
  import type {
    SimulatorMessage,
    SlackBlock,
    SlackOption,
    SlackSectionBlock,
    SlackActionsBlock,
  } from '../lib/types'
  import {
    getMessageShortcut,
    simulatorState,
    isBotUserId,
    getBotByUserId,
  } from '../lib/state.svelte'
  import {
    updateFileExpanded,
    sendMessageBlockAction,
  } from '../lib/dispatcher.svelte'
  import BlockKitRenderer from './blockkit/BlockKitRenderer.svelte'
  import { renderMrkdwn } from './blockkit/context'
  import { formatTimestamp, formatRelativeTime } from '../lib/time'
  import * as ContextMenu from '$lib/components/ui/context-menu'

  interface Props {
    message: SimulatorMessage
    replyCount?: number
    hasDraft?: boolean
    onOpenThread?: (ts: string) => void
    onDelete?: (ts: string) => void
    onGenerateImage?: (message: SimulatorMessage) => void
    onImagePreview?: (imageUrl: string, imageAlt: string, userName?: string) => void
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
  let isEphemeral = $derived(message.subtype === 'ephemeral')
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

    // Use unified renderMrkdwn for core mrkdwn-to-HTML conversion
    let html = renderMrkdwn({ type: 'mrkdwn', text })

    // Post-processing: paragraph gaps (replace double-br with block-level gap)
    html = html.replace(/<br><br>/g, '<span class="p-gap"></span>')

    // Wrap @mentions in highlight span AFTER markdown processing
    const escapedUserName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const mentionRegex = new RegExp(`@${escapedUserName}`, 'g')
    html = html.replace(
      mentionRegex,
      `<span class="slack-mention">@${userName}</span>`
    )

    return html
  })

  let hasBlocks = $derived(message.blocks && message.blocks.length > 0)

  function buildActionValue(
    blockId: string,
    element: { type: string; action_id: string; options?: SlackOption[] },
    value: string
  ) {
    const elementType = element.type

    if (elementType === 'static_select' && element.options) {
      const opt = element.options.find((o) => o.value === value)
      return {
        blockId,
        elementType,
        actionValue: opt
          ? { selected_option: { text: opt.text, value: opt.value } }
          : { value },
      }
    }

    if (elementType === 'overflow' && element.options) {
      const opt = element.options.find((o) => o.value === value)
      return {
        blockId,
        elementType,
        actionValue: opt
          ? { selected_option: { text: opt.text, value: opt.value } }
          : { value },
      }
    }

    if (elementType === 'radio_buttons' && element.options) {
      const opt = element.options.find((o) => o.value === value)
      return {
        blockId,
        elementType,
        actionValue: opt
          ? { selected_option: { text: opt.text, value: opt.value } }
          : { value },
      }
    }

    if (elementType === 'checkboxes') {
      try {
        const selectedOptions = JSON.parse(value)
        return {
          blockId,
          elementType,
          actionValue: { selected_options: selectedOptions },
        }
      } catch {
        return {
          blockId,
          elementType,
          actionValue: { selected_options: [] },
        }
      }
    }

    if (elementType === 'datepicker') {
      return {
        blockId,
        elementType,
        actionValue: { selected_date: value },
      }
    }

    if (elementType === 'timepicker') {
      return {
        blockId,
        elementType,
        actionValue: { selected_time: value },
      }
    }

    if (elementType === 'datetimepicker') {
      return {
        blockId,
        elementType,
        actionValue: { selected_date_time: Number(value) },
      }
    }

    // For buttons and other types, use value as-is
    return { blockId, elementType, actionValue: { value } }
  }

  function resolveActionFromBlocks(
    blocks: SlackBlock[],
    actionId: string,
    value: string
  ): {
    blockId: string
    elementType: string
    actionValue: {
      value?: string
      selected_option?: {
        text: { type: string; text: string }
        value: string
      }
      selected_options?: Array<{
        text: { type: string; text: string }
        value: string
      }>
      selected_date?: string
      selected_time?: string
      selected_date_time?: number
    }
  } {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!block) continue
      const blockId = block.block_id || `block_${i}`

      // Check section accessory
      if (block.type === 'section') {
        const sectionBlock = block as SlackSectionBlock
        if (sectionBlock.accessory) {
          const el = sectionBlock.accessory
          if ('action_id' in el && el.action_id === actionId) {
            return buildActionValue(
              blockId,
              el as {
                type: string
                action_id: string
                options?: SlackOption[]
              },
              value
            )
          }
        }
      }

      // Check actions block elements
      if (block.type === 'actions') {
        const actionsBlock = block as SlackActionsBlock
        for (const el of actionsBlock.elements) {
          if ('action_id' in el && el.action_id === actionId) {
            return buildActionValue(
              blockId,
              el as {
                type: string
                action_id: string
                options?: SlackOption[]
              },
              value
            )
          }
        }
      }
    }

    // Fallback: treat as button
    return { blockId: 'unknown', elementType: 'button', actionValue: { value } }
  }

  function handleMessageBlockAction(actionId: string, value: string) {
    const { blockId, elementType, actionValue } = resolveActionFromBlocks(
      message.blocks || [],
      actionId,
      value
    )

    sendMessageBlockAction(
      message.ts,
      message.channel,
      actionId,
      blockId,
      elementType,
      actionValue
    )
  }

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
      class="group flex flex-col px-5 py-2 transition-colors duration-100 relative hover:bg-slack-hover"
    >
      {#if isEphemeral}
        <div
          class="flex items-center gap-1 text-xs text-slack-text-muted mb-1 ml-[2.75rem]"
        >
          <Eye size={14} strokeWidth={1.5} />
          <span>Only visible to you</span>
        </div>
      {/if}
      <div class="flex gap-2">
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
          {#if hasBlocks}
            <div class="mt-1">
              <BlockKitRenderer
                blocks={message.blocks ?? []}
                onAction={handleMessageBlockAction}
                onImagePreview={(url, alt) => onImagePreview?.(url, alt, displayName)}
              />
            </div>
          {:else}
            <div
              class="mrkdwn message-text text-slack-text leading-[1.46] wrap-break-word whitespace-pre-wrap"
            >
              {@html formattedText}
            </div>
          {/if}
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
                        message.file!.title || message.file!.name,
                        displayName
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
              {#each Array.from(message.reactions.entries()) as [reaction, count] (reaction)}
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
  /* Message-specific styles for dynamic content (mrkdwn styles are in app.css) */
  .message-text :global(.p-gap) {
    display: block;
    height: 0.8em;
  }

  .message-text :global(.slack-mention) {
    background: rgba(29, 155, 209, 0.2);
    color: #1d9bd1;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 500;
  }
</style>
