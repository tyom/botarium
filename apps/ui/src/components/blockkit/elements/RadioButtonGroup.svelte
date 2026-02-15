<script lang="ts">
  import type { SlackRadioButtonsElement, SlackOption } from '../../../lib/types'
  import { renderMrkdwn } from '../context'

  interface Props {
    element: SlackRadioButtonsElement
    selectedOption?: SlackOption
    onChange?: (option: SlackOption) => void
  }

  let { element, selectedOption, onChange }: Props = $props()

  function isSelected(option: SlackOption): boolean {
    if (selectedOption !== undefined) {
      return selectedOption.value === option.value
    }
    return element.initial_option?.value === option.value
  }

  function handleChange(option: SlackOption) {
    onChange?.(option)
  }
</script>

<div class="space-y-2">
  {#each element.options as option (option.value)}
    <label class="flex items-center gap-2 cursor-pointer group">
      <input
        type="radio"
        name={element.action_id}
        checked={isSelected(option)}
        onchange={() => handleChange(option)}
        class="size-4 border-white/30 bg-slack-input text-slack-accent focus:ring-slack-accent focus:ring-offset-0 cursor-pointer"
      />
      <span class="mrkdwn text-slack-text group-hover:text-white transition-colors">
        {@html renderMrkdwn(option.text)}
      </span>
    </label>
  {/each}
</div>
