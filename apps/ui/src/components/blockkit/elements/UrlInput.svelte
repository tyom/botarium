<script lang="ts">
  import type { SlackUrlInputElement } from '$lib/types'
  import { renderText } from '../context'

  interface Props {
    id?: string
    element: SlackUrlInputElement
    value: string
    onChange?: (value: string) => void
  }

  let { id, element, value, onChange }: Props = $props()

  const displayValue = $derived(value || element.initial_value || '')
  const placeholder = $derived(
    renderText(element.placeholder) || 'https://example.com'
  )
</script>

<input
  {id}
  type="url"
  class="w-full bg-slack-input border border-white/20 rounded-lg px-3 py-2 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none"
  {placeholder}
  value={displayValue}
  oninput={(e) => onChange?.(e.currentTarget.value)}
/>
