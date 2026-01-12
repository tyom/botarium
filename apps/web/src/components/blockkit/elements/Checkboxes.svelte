<script lang="ts">
  import type { SlackCheckboxesElement, SlackOption } from '../../../lib/types'
  import { renderText } from '../context'

  interface Props {
    element: SlackCheckboxesElement
    selectedOptions: SlackOption[]
    onChange?: (selectedOptions: SlackOption[]) => void
  }

  let { element, selectedOptions, onChange }: Props = $props()

  function isSelected(option: SlackOption): boolean {
    // Check current selections first
    if (selectedOptions.length > 0) {
      return selectedOptions.some((o) => o.value === option.value)
    }
    // Fall back to initial options
    return element.initial_options?.some((o) => o.value === option.value) ?? false
  }

  function handleToggle(option: SlackOption, checked: boolean) {
    const current = selectedOptions.length > 0 ? selectedOptions : (element.initial_options ?? [])

    let newSelected: SlackOption[]
    if (checked) {
      // Add option if not already present
      if (!current.some((o) => o.value === option.value)) {
        newSelected = [...current, option]
      } else {
        newSelected = current
      }
    } else {
      // Remove option
      newSelected = current.filter((o) => o.value !== option.value)
    }
    onChange?.(newSelected)
  }
</script>

<div class="space-y-2">
  {#each element.options as option}
    <label class="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={isSelected(option)}
        onchange={(e) => handleToggle(option, e.currentTarget.checked)}
        class="size-4 rounded border-white/30 bg-slack-input text-slack-accent focus:ring-slack-accent focus:ring-offset-0 cursor-pointer"
      />
      <span class="text-slack-text group-hover:text-white transition-colors">
        {renderText(option.text)}
      </span>
    </label>
  {/each}
</div>
