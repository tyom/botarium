<script lang="ts">
  import { X, Sparkles } from '@lucide/svelte'
  import {
    createKeydownHandler,
    type KeyboardShortcut,
  } from '../lib/keyboard-shortcuts'

  interface Props {
    imageUrl: string
    imageAlt?: string
    userName?: string
    isBot?: boolean
    timestamp?: string
    channelName?: string
    onClose: () => void
  }

  let {
    imageUrl,
    imageAlt = '',
    userName,
    isBot = false,
    timestamp,
    channelName,
    onClose,
  }: Props = $props()

  let avatarLetter = $derived(userName ? userName.charAt(0).toUpperCase() : '')

  let isZoomed = $state(false)
  let panPosition = $state({ x: 0, y: 0 })
  let isPanning = $state(false)
  let panStart = $state({ x: 0, y: 0 })
  let hasDragged = $state(false)
  let imageEl = $state<HTMLImageElement | null>(null)
  let panelEl = $state<HTMLDivElement | null>(null)
  let wheelTimeout: ReturnType<typeof setTimeout> | null = $state(null)
  let isWheeling = $state(false)

  // Clean up timeout on unmount
  $effect(() => {
    return () => {
      if (wheelTimeout) clearTimeout(wheelTimeout)
    }
  })

  const shortcuts: KeyboardShortcut[] = [
    { key: 'Escape', action: () => onClose() },
  ]
  const handleKeyDown = createKeydownHandler(shortcuts)

  // Calculate max pan distance based on image size vs panel size.
  // At 2x zoom, the zoomed image = 2 * baseSize.
  // Max pan per side = (zoomedSize - panelSize) / 2, clamped to >= 0.
  function getPanBounds() {
    if (!imageEl || !panelEl) return { maxX: 0, maxY: 0 }

    const imgRect = imageEl.getBoundingClientRect()
    const panelRect = panelEl.getBoundingClientRect()
    const scale = isZoomed ? 2 : 1
    const baseWidth = imgRect.width / scale
    const baseHeight = imgRect.height / scale
    const zoomedWidth = baseWidth * 2
    const zoomedHeight = baseHeight * 2

    const maxX = Math.max(0, (zoomedWidth - panelRect.width) / 2)
    const maxY = Math.max(0, (zoomedHeight - panelRect.height) / 2)

    return { maxX, maxY }
  }

  function clampPan(pos: { x: number; y: number }) {
    const { maxX, maxY } = getPanBounds()
    return {
      x: Math.max(-maxX, Math.min(maxX, pos.x)),
      y: Math.max(-maxY, Math.min(maxY, pos.y)),
    }
  }

  function handleImageClick(e: MouseEvent) {
    // Prevent click from propagating to backdrop
    e.stopPropagation()

    // Don't toggle zoom if we just finished dragging
    if (hasDragged) {
      hasDragged = false
      return
    }

    if (isZoomed) {
      isZoomed = false
      panPosition = { x: 0, y: 0 }
    } else {
      if (imageEl && panelEl) {
        const imgRect = imageEl.getBoundingClientRect()
        const panelRect = panelEl.getBoundingClientRect()
        // Cursor offset from panel center
        const panelCenterX = panelRect.left + panelRect.width / 2
        const panelCenterY = panelRect.top + panelRect.height / 2
        const offsetX = e.clientX - panelCenterX
        const offsetY = e.clientY - panelCenterY

        const zoomedWidth = imgRect.width * 2
        const zoomedHeight = imgRect.height * 2
        const maxX = Math.max(0, (zoomedWidth - panelRect.width) / 2)
        const maxY = Math.max(0, (zoomedHeight - panelRect.height) / 2)

        // Pan to keep clicked point stationary after zoom
        panPosition = {
          x: Math.max(-maxX, Math.min(maxX, -offsetX)),
          y: Math.max(-maxY, Math.min(maxY, -offsetY)),
        }
      }

      isZoomed = true
    }
  }

  function handleImageKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (isZoomed) {
        isZoomed = false
        panPosition = { x: 0, y: 0 }
      } else {
        isZoomed = true
      }
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (!isZoomed) return
    e.preventDefault()
    isPanning = true
    hasDragged = false
    panStart = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning) return
    hasDragged = true
    panPosition = clampPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }

  function handleMouseUp() {
    isPanning = false
  }

  function handleWheel(e: WheelEvent) {
    if (!isZoomed) return
    e.preventDefault()

    // Track wheeling state to disable transitions
    isWheeling = true
    if (wheelTimeout) clearTimeout(wheelTimeout)
    wheelTimeout = setTimeout(() => {
      isWheeling = false
    }, 150)

    panPosition = clampPan({
      x: panPosition.x - e.deltaX,
      y: panPosition.y - e.deltaY,
    })
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  let cursorClass = $derived(
    isZoomed
      ? isPanning
        ? 'cursor-grabbing'
        : 'cursor-zoom-out'
      : 'cursor-zoom-in'
  )
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-70"
  onclick={handleBackdropClick}
  onmouseup={handleMouseUp}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseUp}
  onwheel={handleWheel}
  role="presentation"
>
  <div
    bind:this={panelEl}
    role="dialog"
    class="absolute inset-[30px] bg-black/70 backdrop-blur-2xl flex items-center justify-center rounded-xl overflow-hidden"
    onclick={handleBackdropClick}
    aria-modal="true"
  >
  <!-- Author info top-left -->
  {#if userName}
    <div class="absolute top-3 left-4 flex items-center gap-2.5 z-10">
      <div
        class="size-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 {isBot
          ? 'bg-slack-bot-avatar'
          : 'bg-slack-user-avatar'}"
      >
        {#if isBot}
          <Sparkles size={14} />
        {:else}
          {avatarLetter}
        {/if}
      </div>
      <div class="flex flex-col">
        <span class="text-white text-sm font-bold">{userName}</span>
        {#if timestamp || channelName}
          <span class="text-white/50 text-xs flex items-center gap-1">
            {#if timestamp}{timestamp}{/if}
            {#if timestamp && channelName}<span>in</span>{/if}
            {#if channelName}
              <span>{channelName}</span>
            {/if}
          </span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Close button -->
  <button
    class="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
    onclick={onClose}
    aria-label="Close"
  >
    <X size={24} />
  </button>

  <!-- Image container -->
  <div
    class={cursorClass}
    onclick={handleImageClick}
    onkeydown={handleImageKeydown}
    onmousedown={handleMouseDown}
    role="button"
    tabindex="0"
    aria-label={isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
  >
    <img
      bind:this={imageEl}
      src={imageUrl}
      alt={imageAlt}
      class="select-none"
      class:transition-transform={!isPanning && !isWheeling}
      class:duration-200={!isPanning && !isWheeling}
      style:transform={isZoomed
        ? `scale(2) translate(${panPosition.x / 2}px, ${panPosition.y / 2}px)`
        : 'scale(1)'}
      style:max-height="calc(100vh - 160px)"
      style:max-width="calc(100vw - 160px)"
      draggable="false"
    />
  </div>
  </div>
</div>
