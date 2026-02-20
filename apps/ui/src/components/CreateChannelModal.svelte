<script lang="ts">
  import { X } from '@lucide/svelte'

  const MAX_LENGTH = 80

  interface Props {
    onClose: () => void
    onCreate: (name: string) => void
  }

  let { onClose, onCreate }: Props = $props()

  let channelName = $state('')

  let sanitized = $derived(
    channelName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '')
  )

  let remaining = $derived(MAX_LENGTH - sanitized.length)
  let isValid = $derived(sanitized.length > 0 && remaining >= 0)

  function handleSubmit() {
    if (!isValid) return
    onCreate(sanitized)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  function focusOnMount(node: HTMLElement) {
    node.focus()
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
  onclick={handleBackdropClick}
  role="dialog"
  aria-modal="true"
  aria-labelledby="create-channel-title"
  tabindex="-1"
>
  <div
    class="bg-slack-bg border border-white/20 rounded-xl max-w-lg w-full shadow-2xl flex flex-col"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 shrink-0">
      <h2 id="create-channel-title" class="text-lg font-bold text-slack-text">
        Create a channel
      </h2>
      <button
        onclick={onClose}
        class="p-1.5 rounded-lg text-slack-text-muted hover:text-slack-text hover:bg-white/10 transition-colors"
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>

    <!-- Content -->
    <div class="px-5 pb-2">
      <label
        for="channel-name-input"
        class="block text-[15px] font-semibold text-slack-text mb-2"
      >
        Name
      </label>
      <div
        class="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 focus-within:border-slack-accent focus-within:shadow-[0_0_0_1px_var(--color-slack-accent)] transition-[border-color,box-shadow]"
      >
        <span class="text-slack-text-muted text-[15px]">#</span>
        <input
          id="channel-name-input"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-[15px] text-slack-text placeholder:text-slack-text-muted"
          placeholder="e.g. subscription-budget"
          maxlength={MAX_LENGTH}
          bind:value={channelName}
          use:focusOnMount
        />
        <span
          class="text-sm tabular-nums shrink-0"
          class:text-slack-text-muted={remaining >= 10}
          class:text-log-warn={remaining < 10 && remaining >= 0}
          class:text-log-error={remaining < 0}
        >
          {remaining}
        </span>
      </div>
      <p class="text-[13px] text-slack-text-muted mt-2 leading-snug">
        Channels are where conversations happen around a topic. Use a name that
        is easy to find and understand.
      </p>
    </div>

    <!-- Footer -->
    <div class="flex justify-end px-5 py-4 shrink-0">
      <button
        onclick={handleSubmit}
        disabled={!isValid}
        class="px-4 py-1.5 rounded-lg bg-slack-accent text-white font-semibold text-[15px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:not-disabled:bg-slack-accent-hover"
      >
        Create
      </button>
    </div>
  </div>
</div>
