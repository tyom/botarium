<script lang="ts">
  import type { SlackEmailInputElement } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackEmailInputElement
    value: string
    onChange?: (value: string) => void
  }

  let { element, value, onChange }: Props = $props()

  const displayValue = $derived(value || element.initial_value || '')
  const placeholder = $derived(
    renderText(element.placeholder) || 'name@example.com'
  )
</script>

<input
  type="email"
  class="w-full bg-slack-input border border-white/20 rounded-lg px-3 py-2 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none"
  {placeholder}
  value={displayValue}
  oninput={(e) => onChange?.(e.currentTarget.value)}
/>
