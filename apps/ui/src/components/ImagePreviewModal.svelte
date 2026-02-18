<script lang="ts">
  import { X } from '@lucide/svelte'
  import {
    createKeydownHandler,
    type KeyboardShortcut,
  } from '../lib/keyboard-shortcuts'

  interface Props {
    imageUrl: string
    imageAlt?: string
    userName?: string
    onClose: () => void
  }

  let { imageUrl, imageAlt = '', userName, onClose }: Props = $props()

  let isZoomed = $state(false)
  let panPosition = $state({ x: 0, y: 0 })
  let isPanning = $state(false)
  let panStart = $state({ x: 0, y: 0 })
  let hasDragged = $state(false)
  let imageEl = $state<HTMLImageElement | null>(null)
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

  // Calculate max pan distance based on image size vs viewport
  // At 2x zoom, image extends imgBaseSize from center in each direction
  // Max pan = how far we can translate before showing background
  function getPanBounds() {
    if (!imageEl) return { maxX: 0, maxY: 0 }

    const rect = imageEl.getBoundingClientRect()
    // When zoomed, rect is 2x the base display size due to scale(2)
    const scale = isZoomed ? 2 : 1
    const imgWidth = rect.width / scale
    const imgHeight = rect.height / scale

    // At 2x zoom, image extends imgWidth/imgHeight from center
    // Max pan = overflow per side (how far image extends beyond viewport)
    const maxX = Math.max(0, imgWidth - window.innerWidth / 2)
    const maxY = Math.max(0, imgHeight - window.innerHeight / 2)

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
      // Calculate cursor offset from viewport center
      const offsetX = e.clientX - window.innerWidth / 2
      const offsetY = e.clientY - window.innerHeight / 2

      // Calculate bounds using current 1x dimensions (before zoom)
      if (imageEl) {
        const rect = imageEl.getBoundingClientRect()
        const imgWidth = rect.width
        const imgHeight = rect.height

        // At 2x zoom, max translate = imgSize - viewportSize/2
        const maxX = Math.max(0, imgWidth - window.innerWidth / 2)
        const maxY = Math.max(0, imgHeight - window.innerHeight / 2)

        // Pan to keep clicked point stationary after zoom
        // Offset is negated: if cursor is right of center, pan image left
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
  role="dialog"
  class="fixed inset-0 bg-black/90 flex items-center justify-center z-70"
  onclick={handleBackdropClick}
  onmouseup={handleMouseUp}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseUp}
  onwheel={handleWheel}
  aria-modal="true"
>
  <!-- User info top-left -->
  {#if userName}
    <div class="absolute top-4 left-4 flex items-center gap-2 z-10">
      <span class="text-white text-sm font-semibold">{userName}</span>
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
      style:max-height="90vh"
      style:max-width="90vw"
      draggable="false"
    />
  </div>
</div>
