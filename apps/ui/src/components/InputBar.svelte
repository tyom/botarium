<script lang="ts">
  import { Send } from '@lucide/svelte'
  import { simulatorState, getChannelDisplayName } from '../lib/state.svelte'
  import { executeSlashCommand } from '../lib/dispatcher.svelte'
  import CommandAutocomplete from './CommandAutocomplete.svelte'
  import type { SlashCommand } from '../lib/types'

  interface Props {
    onSend: (text: string) => void
    disabled?: boolean
    placeholder?: string
    value?: string
  }

  let {
    onSend,
    disabled = false,
    placeholder,
    value = $bindable(''),
  }: Props = $props()
  let inputElement: HTMLTextAreaElement

  let defaultPlaceholder = $derived(`Message ${getChannelDisplayName()}`)
  let resolvedPlaceholder = $derived(placeholder ?? defaultPlaceholder)
  let isDisabled = $derived(disabled || simulatorState.isTyping)
  let canSend = $derived(!isDisabled && value.trim().length > 0)

  // Autocomplete state
  let selectedIndex = $state(0)

  // Check if input is a command (starts with /)
  let isCommandInput = $derived(value.startsWith('/'))

  // Extract filter text (the command name being typed, without the /)
  let commandFilter = $derived(() => {
    if (!isCommandInput) return ''
    const spaceIndex = value.indexOf(' ')
    // Only show autocomplete while typing the command name, not after space
    if (spaceIndex > 0) return ''
    return value.slice(1) // Remove the leading /
  })

  // Should show autocomplete?
  // Show when typing "/" and haven't added a space yet (still typing command name)
  let showAutocomplete = $derived(
    isCommandInput &&
      !value.includes(' ') &&
      simulatorState.availableCommands.length > 0
  )

  // Get filtered commands for autocomplete
  let filteredCommands = $derived(() => {
    const filter = commandFilter().toLowerCase()
    return simulatorState.availableCommands.filter(
      (cmd) =>
        cmd.command.toLowerCase().includes(filter) ||
        cmd.description.toLowerCase().includes(filter)
    )
  })

  // Reset selected index when filter changes
  $effect(() => {
    commandFilter()
    selectedIndex = 0
  })

  // Focus input on channel change or when typing ends
  $effect(() => {
    if (!isDisabled) {
      inputElement?.focus()
    }
  })

  function selectCommand(cmd: SlashCommand) {
    value = cmd.command + ' '
    inputElement?.focus()
  }

  async function handleSubmit(event?: Event) {
    event?.preventDefault()
    if (!canSend) return

    const text = value.trim()
    value = ''

    // Check if this is a slash command
    if (text.startsWith('/')) {
      const spaceIndex = text.indexOf(' ')
      const command = spaceIndex > 0 ? text.slice(0, spaceIndex) : text
      const args = spaceIndex > 0 ? text.slice(spaceIndex + 1) : ''
      await executeSlashCommand(command, args)
    } else {
      onSend(text)
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Handle autocomplete navigation
    if (showAutocomplete) {
      const filtered = filteredCommands()

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, 0)
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        const selected = filtered[selectedIndex]
        if (filtered.length > 0 && selected) {
          selectCommand(selected)
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        // Clear the command input to hide autocomplete
        value = ''
        return
      }

      // Enter selects command if autocomplete is showing
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        const selected = filtered[selectedIndex]
        if (filtered.length > 0 && selected) {
          selectCommand(selected)
        }
        return
      }
    }

    // Regular enter handling (send message)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) {
        handleSubmit()
      }
    }
  }
</script>

<form class="relative px-5 pt-3 pb-5 bg-slack-bg" onsubmit={handleSubmit}>
  {#if showAutocomplete}
    <CommandAutocomplete
      commands={simulatorState.availableCommands}
      filter={commandFilter()}
      {selectedIndex}
      onSelect={selectCommand}
      onHover={(i) => (selectedIndex = i)}
    />
  {/if}
  <div
    class="flex items-end gap-2 bg-slack-input border border-white/20 rounded-lg px-3 py-2 transition-[border-color] duration-150 focus-within:border-slack-accent"
  >
    <textarea
      bind:value
      bind:this={inputElement}
      onkeydown={handleKeyDown}
      placeholder={resolvedPlaceholder}
      disabled={isDisabled}
      rows={1}
      class="flex-1 bg-transparent border-none outline-none text-[15px] text-slack-text py-1 placeholder:text-slack-text-muted disabled:opacity-60 disabled:cursor-not-allowed resize-none field-sizing-content max-h-40"
    ></textarea>
    <button
      type="submit"
      class="bg-slack-accent border-none rounded px-2.5 py-1.5 -mr-1 text-white cursor-pointer flex items-center justify-center transition-[background-color,opacity] duration-150 hover:enabled:bg-slack-accent-hover disabled:opacity-25 disabled:bg-transparent"
      disabled={!canSend}
      aria-label="Send message"
    >
      <Send size={18} />
    </button>
  </div>
</form>
