<script lang="ts">
  import {
    EllipsisVertical,
    Trash2,
    Sparkles,
    ChevronRight,
    Eye,
  } from '@lucide/svelte'
  import type {
    SimulatorMessage,
    Shortcut,
    SlackBlock,
    SlackOption,
    SlackSectionBlock,
    SlackActionsBlock,
    SlackContextActionsBlock,
    SlackInputBlock,
  } from '$lib/types'
  import {
    getAllMessageShortcuts,
    getChannelDisplayName,
    simulatorState,
    isBotUserId,
    getBotByUserId,
  } from '$lib/state.svelte'
  import {
    sendMessageBlockAction,
    triggerMessageShortcut,
  } from '$lib/dispatcher.svelte'
  import { resolveEmoji } from '@botarium/mrkdwn'
  import BlockKitRenderer from './blockkit/BlockKitRenderer.svelte'
  import ImageBlock from './blockkit/blocks/ImageBlock.svelte'
  import { renderMrkdwn } from './blockkit/context'
  import {
    formatTimestamp,
    formatTimestampShort,
    formatRelativeTime,
    formatFullDate,
  } from '$lib/time'
  import * as ContextMenu from '$lib/components/ui/context-menu'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'

  interface Props {
    message: SimulatorMessage
    replyCount?: number
    hasDraft?: boolean
    isGrouped?: boolean
    onOpenThread?: (ts: string) => void
    onDelete?: (ts: string) => void
    onImagePreview?: (
      imageUrl: string,
      imageAlt: string,
      userName?: string,
      isBot?: boolean,
      timestamp?: string,
      channelName?: string
    ) => void
  }

  let {
    message,
    replyCount = 0,
    hasDraft = false,
    isGrouped = false,
    onOpenThread,
    onDelete,
    onImagePreview,
  }: Props = $props()

  let isBot = $derived(isBotUserId(message.user))
  let isEphemeral = $derived(message.subtype === 'ephemeral')
  let shortcutGroups = $derived(getAllMessageShortcuts())
  let hasShortcuts = $derived(shortcutGroups.length > 0)
  let botInfo = $derived(isBot ? getBotByUserId(message.user) : undefined)
  let displayName = $derived.by(() => {
    if (!isBot) return simulatorState.simulatedUserName || 'You'
    return botInfo?.name ?? simulatorState.botName
  })
  let avatarLetter = $derived(displayName.charAt(0).toUpperCase())
  let timestamp = $derived(formatTimestamp(message.ts))
  let timestampShort = $derived(formatTimestampShort(message.ts))
  let fullDate = $derived(formatFullDate(message.ts))
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
      const n = value ? Number(value) : NaN
      return {
        blockId,
        elementType,
        actionValue: !isNaN(n)
          ? { selected_date_time: n }
          : { selected_date_time: undefined },
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

      // Check input block element
      if (block.type === 'input') {
        const inputBlock = block as SlackInputBlock
        const el = inputBlock.element
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

      // Check context_actions block elements
      if (block.type === 'context_actions') {
        const contextActionsBlock = block as SlackContextActionsBlock
        for (const el of contextActionsBlock.elements) {
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

  function handleDelete() {
    onDelete?.(message.ts)
  }

  function handleShortcut(shortcut: Shortcut) {
    triggerMessageShortcut(shortcut.callback_id, {
      ts: message.ts,
      text: message.text,
      file: message.file,
    })
  }

  function getEmoji(name: string): string {
    return resolveEmoji(name) ?? `:${name}:`
  }
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger class="block">
    <div
      class="group flex flex-col px-5 transition-colors duration-100 relative hover:bg-slack-hover {isGrouped
        ? 'py-0.5'
        : 'py-2'}"
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
        {#if onDelete || hasShortcuts}
          <div
            class="absolute -top-3 right-5 z-10 opacity-0 transition-opacity duration-100 bg-slack-bg border border-slack-border rounded-xl p-1 group-hover:opacity-100"
          >
            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                class="flex items-center justify-center size-7 p-0 border-none rounded-lg bg-transparent text-slack-text-secondary cursor-pointer transition-colors duration-100 hover:bg-slack-sidebar-hover hover:text-slack-text"
                aria-label="Message options"
              >
                <EllipsisVertical size={16} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                {#if hasShortcuts}
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger
                      >Connect to apps</DropdownMenu.SubTrigger
                    >
                    <DropdownMenu.SubContent class="min-w-[200px]">
                      {#each shortcutGroups as group, i (group.botId)}
                        {#if i > 0}
                          <DropdownMenu.Separator />
                        {/if}
                        {#each group.shortcuts as shortcut (shortcut.callback_id)}
                          <DropdownMenu.Item
                            onclick={() => handleShortcut(shortcut)}
                          >
                            <span class="flex items-center gap-2 w-full">
                              {#if group.botIcon?.startsWith('http')}
                                <img
                                  src={group.botIcon}
                                  alt=""
                                  class="size-4 rounded object-cover shrink-0"
                                />
                              {:else}
                                <span class="shrink-0 text-sm"
                                  >{group.botIcon ||
                                    group.botName.charAt(0).toUpperCase()}</span
                                >
                              {/if}
                              <span class="font-semibold">{shortcut.name}</span>
                              <span
                                class="text-slack-text-muted ml-auto text-xs"
                                >{group.botName}</span
                              >
                            </span>
                          </DropdownMenu.Item>
                        {/each}
                      {/each}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                  {#if onDelete}
                    <DropdownMenu.Separator />
                  {/if}
                {/if}
                {#if onDelete}
                  <DropdownMenu.Item
                    variant="destructive"
                    onclick={handleDelete}
                  >
                    <Trash2 size={14} />
                    Delete message
                  </DropdownMenu.Item>
                {/if}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        {/if}
        {#if isGrouped}
          <div class="size-9 shrink-0 flex items-center justify-center">
            <span
              class="text-[11px] text-slack-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-100"
              title={fullDate}>{timestampShort}</span
            >
          </div>
        {:else}
          <div
            class="size-9 rounded-lg text-white flex items-center justify-center font-bold text-sm shrink-0 {isBot &&
            !botInfo?.iconUrl
              ? 'bg-slack-bot-avatar'
              : !isBot
                ? 'bg-slack-user-avatar'
                : ''}"
          >
            {#if isBot && botInfo?.iconUrl}
              <img
                src={botInfo.iconUrl}
                alt={displayName}
                class="size-9 rounded-lg object-cover"
              />
            {:else if isBot}
              <Sparkles size={20} />
            {:else}
              {avatarLetter}
            {/if}
          </div>
        {/if}
        <div class="flex-1 min-w-0">
          {#if !isGrouped}
            <div class="flex items-baseline gap-2 mb-1">
              <span class="font-bold text-white">{displayName}</span>
              {#if isBot}
                <span
                  class="bg-white/20 rounded px-0.5 text-[10px] text-white/60 uppercase tracking-wide align-middle"
                  >APP</span
                >
              {/if}
              <span class="text-xs text-slack-text-muted" title={fullDate}
                >{timestamp}</span
              >
            </div>
          {/if}
          {#if hasBlocks}
            <div class="mt-1">
              <BlockKitRenderer
                blocks={message.blocks ?? []}
                onAction={handleMessageBlockAction}
                onImagePreview={(url, alt) =>
                  onImagePreview?.(
                    url,
                    alt,
                    displayName,
                    isBot,
                    formatRelativeTime(message.ts),
                    getChannelDisplayName()
                  )}
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
                <div class="[&_img]:max-h-[360px]">
                  <ImageBlock
                    block={{
                      type: 'image',
                      image_url: message.file.url_private,
                      alt_text: message.file.title || message.file.name,
                      title: message.file.title
                        ? { type: 'plain_text', text: message.file.title }
                        : undefined,
                    }}
                    onImagePreview={(url, alt) =>
                      onImagePreview?.(
                        url,
                        alt,
                        displayName,
                        isBot,
                        formatRelativeTime(message.ts),
                        getChannelDisplayName()
                      )}
                  />
                </div>
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
  {#if onDelete || hasShortcuts}
    <ContextMenu.Content>
      {#if hasShortcuts}
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Connect to apps</ContextMenu.SubTrigger>
          <ContextMenu.SubContent class="min-w-[200px]">
            {#each shortcutGroups as group, i (group.botId)}
              {#if i > 0}
                <ContextMenu.Separator />
              {/if}
              {#each group.shortcuts as shortcut (shortcut.callback_id)}
                <ContextMenu.Item onclick={() => handleShortcut(shortcut)}>
                  <span class="flex items-center gap-2 w-full">
                    {#if group.botIcon?.startsWith('http')}
                      <img
                        src={group.botIcon}
                        alt=""
                        class="size-4 rounded object-cover shrink-0"
                      />
                    {:else}
                      <span class="shrink-0 text-sm"
                        >{group.botIcon ||
                          group.botName.charAt(0).toUpperCase()}</span
                      >
                    {/if}
                    <span class="font-semibold">{shortcut.name}</span>
                    <span class="text-slack-text-muted ml-auto text-xs"
                      >{group.botName}</span
                    >
                  </span>
                </ContextMenu.Item>
              {/each}
            {/each}
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        {#if onDelete}
          <ContextMenu.Separator />
        {/if}
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
  .message-text :global(.slack-mention) {
    background: rgba(29, 155, 209, 0.2);
    color: #1d9bd1;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 500;
  }
</style>
