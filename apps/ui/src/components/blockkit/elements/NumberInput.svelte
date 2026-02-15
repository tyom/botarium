<script lang="ts">
  import type { SlackNumberInputElement } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackNumberInputElement
    value: string
    onChange?: (value: string) => void
  }

  let { element, value, onChange }: Props = $props()

  const displayValue = $derived(value || element.initial_value || '')
</script>

<input
  type="number"
  class="w-full bg-slack-input border border-white/20 rounded-lg px-3 py-2 text-slack-text placeholder:text-slack-text-muted focus:border-white/40 focus:outline-none"
  placeholder={renderText(element.placeholder)}
  value={displayValue}
  step={element.is_decimal_allowed ? 'any' : '1'}
  min={element.min_value}
  max={element.max_value}
  oninput={(e) => onChange?.(e.currentTarget.value)}
/>
