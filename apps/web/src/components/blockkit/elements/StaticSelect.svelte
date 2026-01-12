<script lang="ts">
  import type {
    SlackStaticSelectElement,
    SlackOption,
  } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackStaticSelectElement
    value?: SlackOption
    onChange?: (value: string) => void
    /** Smaller styling for actions block vs input block */
    compact?: boolean
  }

  let { element, value, onChange, compact = false }: Props = $props()

  const selectedValue = $derived(value?.value ?? element.initial_option?.value ?? '')
</script>

<select
  class="bg-slack-input border border-white/20 rounded-lg text-slack-text focus:border-white/40 focus:outline-none
    {compact ? 'px-3 py-1.5 text-sm' : 'w-full px-3 py-2'}"
  value={selectedValue}
  onchange={(e) => onChange?.(e.currentTarget.value)}
>
  {#if element.placeholder}
    <option value="" disabled>{renderText(element.placeholder)}</option>
  {/if}
  {#each element.options as option}
    <option value={option.value}>{renderText(option.text)}</option>
  {/each}
</select>
