<script lang="ts">
  import { tick } from 'svelte'
  import type { MockApp } from '../lib/dispatcher.svelte'
  import {
    deleteMessage,
    sendMessage,
    triggerMessageShortcut,
  } from '../lib/dispatcher.svelte'
  import type { SimulatorMessage } from '../lib/types'
  import {
    getMessageShortcut,
    getReplyCount,
    getThreadDraft,
    getThreadMessages,
    setThreadDraft,
    simulatorState,
  } from '../lib/state.svelte'
  import InputBar from './InputBar.svelte'
  import Message from './Message.svelte'

  interface Props {
    threadTs: string
    mockApp: MockApp
    onImagePreview?: (imageUrl: string, imageAlt: string) => void
  }

  let { threadTs, mockApp, onImagePreview }: Props = $props()

  let messagesContainer: HTMLDivElement
  let draftValue = $state('')

  // Load draft when thread changes (runs immediately on mount too)
  $effect(() => {
    draftValue = getThreadDraft(threadTs)
  })

  // Sync draft to state when value changes
  $effect(() => {
    // Only sync after initial load (avoid overwriting on mount)
    if (draftValue !== getThreadDraft(threadTs)) {
      setThreadDraft(threadTs, draftValue)
    }
  })

  let messages = $derived(
    getThreadMessages(simulatorState.currentChannel, threadTs)
  )
  let parentMessage = $derived(messages.find((m) => m.ts === threadTs))
  let replies = $derived(messages.filter((m) => m.ts !== threadTs))
  let replyCount = $derived(
    getReplyCount(simulatorState.currentChannel, threadTs)
  )
  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    messages.length
    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    })
  })

  async function handleSend(text: string) {
    await sendMessage(mockApp, text, threadTs)
    // Clear draft after sending (InputBar already clears value, but we also clear from state)
    setThreadDraft(threadTs, '')
  }

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
</script>

<div class="h-full overflow-y-auto py-2" bind:this={messagesContainer}>
  {#if parentMessage}
    <div class="py-2">
      <Message
        message={parentMessage}
        onDelete={handleDeleteMessage}
        onGenerateImage={handleGenerateImage}
        {onImagePreview}
      />
    </div>

    {#if replyCount > 0}
      <div
        class="flex items-center gap-3 px-5 py-2 text-xs text-slack-text-muted after:content-[''] after:flex-1 after:h-px after:bg-slack-border"
      >
        <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
      </div>
    {/if}

    {#each replies as message (message.ts)}
      <Message
        {message}
        onDelete={handleDeleteMessage}
        onGenerateImage={handleGenerateImage}
        {onImagePreview}
      />
    {/each}

    <div class="px-3 pt-2 pb-3">
      <InputBar
        placeholder="Reply"
        onSend={handleSend}
        bind:value={draftValue}
      />
    </div>
  {/if}
</div>
