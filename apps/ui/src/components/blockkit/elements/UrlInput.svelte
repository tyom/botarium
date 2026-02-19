<script lang="ts">
  import type { SlackUrlInputElement } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackUrlInputElement
    value: string
    onChange?: (value: string) => void
  }

  let { element, value, onChange }: Props = $props()

  const displayValue = $derived(value || element.initial_value || '')
  const placeholder = $derived(
    renderText(element.placeholder) || 'https://example.com'
  )
</script>

<input
  type="url"
  class="w-full bg-slack-input border border-white/20 rounded-lg px-3 h-8 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none"
  {placeholder}
  value={displayValue}
  oninput={(e) => onChange?.(e.currentTarget.value)}
/>
