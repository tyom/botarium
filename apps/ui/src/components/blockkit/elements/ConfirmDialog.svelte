<script lang="ts">
  import type { SlackConfirmDialog } from '../../../lib/types'
  import { renderText, renderMrkdwn } from '../context'

  interface Props {
    confirm: SlackConfirmDialog
    onConfirm: () => void
    onDeny: () => void
  }

  let { confirm: dialog, onConfirm, onDeny }: Props = $props()

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onDeny()
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onDeny()
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
  onclick={handleBackdropClick}
>
  <div
    class="bg-slack-bg border border-white/20 rounded-xl max-w-sm w-full p-5 shadow-2xl"
  >
    <h3 class="text-lg font-semibold text-slack-text mb-2">
      {renderText(dialog.title)}
    </h3>
    <div class="text-sm text-slack-text-muted mb-4 mrkdwn">
      {@html renderMrkdwn(dialog.text)}
    </div>
    <div class="flex justify-end gap-3">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-transparent border border-white/20 text-slack-text hover:bg-white/10"
        onclick={onDeny}
      >
        {renderText(dialog.deny)}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg font-medium text-white
          {dialog.style === 'danger'
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-slack-accent hover:bg-slack-accent-hover'}"
        onclick={onConfirm}
      >
        {renderText(dialog.confirm)}
      </button>
    </div>
  </div>
</div>
