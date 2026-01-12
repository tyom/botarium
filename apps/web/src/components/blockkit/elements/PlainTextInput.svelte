<script lang="ts">
  import type { SlackPlainTextInputElement } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackPlainTextInputElement
    value: string
    onChange?: (value: string) => void
  }

  let { element, value, onChange }: Props = $props()

  const displayValue = $derived(value || element.initial_value || '')
</script>

{#if element.multiline}
  <textarea
    class="w-full bg-slack-input border border-white/20 rounded-lg px-3 py-2 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none resize-none"
    rows={4}
    placeholder={renderText(element.placeholder)}
    value={displayValue}
    oninput={(e) => onChange?.(e.currentTarget.value)}
  ></textarea>
{:else}
  <input
    type="text"
    class="w-full bg-slack-input border border-white/20 rounded-lg px-3 py-2 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none"
    placeholder={renderText(element.placeholder)}
    value={displayValue}
    oninput={(e) => onChange?.(e.currentTarget.value)}
  />
{/if}
