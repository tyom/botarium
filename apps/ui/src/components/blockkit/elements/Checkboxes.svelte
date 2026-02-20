<script lang="ts">
  import type { SlackCheckboxesElement, SlackOption } from '../../../lib/types'
  import { renderMrkdwn } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackCheckboxesElement
    selectedOptions: SlackOption[] | undefined
    onChange?: (selectedOptions: SlackOption[]) => void
  }

  let { element, selectedOptions, onChange }: Props = $props()

  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)

  function isSelected(option: SlackOption): boolean {
    // Check current selections first (undefined = no interaction, [] = user cleared all)
    if (selectedOptions !== undefined) {
      return selectedOptions.some((o) => o.value === option.value)
    }
    // Fall back to initial options
    return (
      element.initial_options?.some((o) => o.value === option.value) ?? false
    )
  }

  function handleToggle(option: SlackOption, checked: boolean) {
    const current =
      selectedOptions !== undefined
        ? selectedOptions
        : (element.initial_options ?? [])

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

    if (element.confirm) {
      pendingAction = () => onChange?.(newSelected)
      showingConfirm = true
    } else {
      onChange?.(newSelected)
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
        type="checkbox"
        checked={isSelected(option)}
        onchange={(e) => handleToggle(option, e.currentTarget.checked)}
        class="mt-1 size-4 rounded border-white/30 bg-slack-input text-slack-accent focus:ring-slack-accent focus:ring-offset-0 cursor-pointer"
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
