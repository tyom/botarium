<script lang="ts">
  import type {
    SlackRadioButtonsElement,
    SlackOption,
  } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackRadioButtonsElement
    selectedOption?: SlackOption
    onChange?: (option: SlackOption) => void
  }

  let { element, selectedOption, onChange }: Props = $props()

  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)

  function isSelected(option: SlackOption): boolean {
    if (selectedOption !== undefined) {
      return selectedOption.value === option.value
    }
    return element.initial_option?.value === option.value
  }

  function handleChange(option: SlackOption) {
    if (element.confirm) {
      pendingAction = () => onChange?.(option)
      showingConfirm = true
    } else {
      onChange?.(option)
    }
  }

  function handleConfirm() {
    pendingAction?.()
    pendingAction = null
    showingConfirm = false
  }

  function handleDeny() {
    pendingAction = null
    showingConfirm = false
  }
</script>

<div class="space-y-2">
  {#each element.options as option (option.value)}
    <label class="flex items-start gap-2 cursor-pointer group">
      <input
        type="radio"
        name={element.action_id}
        checked={isSelected(option)}
        onchange={() => handleChange(option)}
        class="mt-1 size-4 border-white/30 bg-slack-input text-slack-accent focus:ring-slack-accent focus:ring-offset-0 cursor-pointer"
      />
      <div>
        <span
          class="mrkdwn text-slack-text group-hover:text-white transition-colors"
        >
          {@html renderMrkdwn(option.text)}
        </span>
        {#if option.description}
          <div class="text-slack-text-muted text-sm">
            {@html renderMrkdwn(option.description)}
          </div>
        {/if}
      </div>
    </label>
  {/each}
</div>

{#if showingConfirm && element.confirm}
  <ConfirmDialog
    confirm={element.confirm}
    onConfirm={handleConfirm}
    onDeny={handleDeny}
  />
{/if}
