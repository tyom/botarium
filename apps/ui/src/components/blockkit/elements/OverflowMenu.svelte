<script lang="ts">
  import { Ellipsis } from '@lucide/svelte'
  import type {
    SlackOverflowElement,
    SlackOverflowOption,
  } from '../../../lib/types'
  import { renderText } from '../context'
  import ConfirmDialog from './ConfirmDialog.svelte'

  interface Props {
    element: SlackOverflowElement
    onSelect?: (option: SlackOverflowOption) => void
  }

  let { element, onSelect }: Props = $props()

  let isOpen = $state(false)
  let showingConfirm = $state(false)
  let pendingAction: (() => void) | null = $state(null)
  let triggerRef: HTMLButtonElement
  let containerRef: HTMLDivElement
  let menuStyle = $state('')

  function toggle(e: MouseEvent) {
    e.stopPropagation()
    isOpen = !isOpen
    if (isOpen) {
      positionMenu()
    }
  }

  function positionMenu() {
    if (!triggerRef) return
    const rect = triggerRef.getBoundingClientRect()
    const menuHeight = element.options.length * 36 + 2 // approximate: ~36px per option + border
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < menuHeight + 8

    if (openAbove) {
      menuStyle = `position:fixed; bottom:${window.innerHeight - rect.top + 4}px; right:${window.innerWidth - rect.right}px;`
    } else {
      menuStyle = `position:fixed; top:${rect.bottom + 4}px; right:${window.innerWidth - rect.right}px;`
    }
  }

  function handleSelect(option: SlackOverflowOption) {
    isOpen = false
    if (element.confirm) {
      pendingAction = () => {
        if (option.url) {
          window.open(option.url, '_blank')
        }
        onSelect?.(option)
      }
      showingConfirm = true
    } else {
      if (option.url) {
        window.open(option.url, '_blank')
      }
      onSelect?.(option)
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

  function handleClickOutside(event: MouseEvent) {
    if (
      isOpen &&
      containerRef &&
      !containerRef.contains(event.target as Node)
    ) {
      isOpen = false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      isOpen = false
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeyDown} />

<div class="inline-flex" bind:this={containerRef}>
  <button
    type="button"
    class="h-[34px] px-2 rounded-lg border border-white/20 bg-slack-input text-slack-text-muted hover:bg-white/10 hover:text-slack-text transition-colors inline-flex items-center"
    onclick={toggle}
    bind:this={triggerRef}
    aria-label="More options"
    aria-expanded={isOpen}
  >
    <Ellipsis size={16} />
  </button>
  {#if isOpen}
    <div
      style={menuStyle}
      class="min-w-36 bg-slack-sidebar border border-white/20 rounded-md shadow-lg z-200"
    >
      {#each element.options as option (option.value)}
        <button
          type="button"
          class="block w-full py-2 px-3 bg-transparent border-none text-left text-sm text-slack-text cursor-pointer transition-colors hover:bg-white/10"
          onclick={() => handleSelect(option)}
        >
          {renderText(option.text)}
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if showingConfirm && element.confirm}
  <ConfirmDialog confirm={element.confirm} onConfirm={handleConfirm} onDeny={handleDeny} />
{/if}
