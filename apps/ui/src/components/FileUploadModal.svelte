<script lang="ts">
  import { X, Paperclip } from '@lucide/svelte'
  import type { UploadedFile } from '../lib/types'

  interface Props {
    open: boolean
    filetypes?: string[]
    maxFiles?: number
    currentCount?: number
    onClose: () => void
    onFilesAdded: (files: UploadedFile[]) => void
  }

  let {
    open,
    filetypes = ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxFiles = 4,
    currentCount = 0,
    onClose,
    onFilesAdded,
  }: Props = $props()

  let isDragging = $state(false)
  let fileInput = $state<HTMLInputElement | null>(null)

  // Calculate how many more files can be added
  let remainingSlots = $derived(maxFiles - currentCount)

  // Build accept string for file input
  let acceptTypes = $derived(
    filetypes.map((t) => (t.startsWith('.') ? t : `.${t}`)).join(',')
  )

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    isDragging = false
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault()
    isDragging = false

    const files = Array.from(e.dataTransfer?.files ?? [])
    await processFiles(files)
  }

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    await processFiles(files)
    // Reset input so same file can be selected again
    input.value = ''
  }

  async function processFiles(files: File[]) {
    // Filter to valid file types
    const validFiles = files.filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      return ext && filetypes.includes(ext)
    })

    // Limit to remaining slots
    const filesToProcess = validFiles.slice(0, remainingSlots)
    if (filesToProcess.length === 0) return

    // Convert to UploadedFile format
    const uploadedFiles: UploadedFile[] = await Promise.all(
      filesToProcess.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file)
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: file.name,
          dataUrl,
          mimetype: file.type,
        }
      })
    )

    onFilesAdded(uploadedFiles)
    onClose()
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') {
      onClose()
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4"
    onclick={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="file-upload-title"
    tabindex="-1"
  >
    <div
      class="bg-slack-bg border border-white/20 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-white/10"
      >
        <h2
          id="file-upload-title"
          class="text-lg font-semibold text-slack-text"
        >
          Add file
        </h2>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-slack-text-muted hover:text-slack-text hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <!-- Drop Zone -->
      <div class="p-5">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors {isDragging
            ? 'border-slack-accent bg-slack-accent/10'
            : 'border-white/20'}"
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          <!-- Stacked Images Illustration -->
          <div class="relative mb-6">
            <!-- Back card (purple/pink) -->
            <div
              class="absolute -left-3 -top-2 w-24 h-20 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg transform -rotate-12 shadow-lg"
            ></div>
            <!-- Middle card (blue with decorations) -->
            <div
              class="absolute left-2 top-1 w-24 h-20 bg-linear-to-br from-blue-400 to-blue-600 rounded-lg transform rotate-6 shadow-lg flex items-center justify-center"
            >
              <div
                class="absolute top-2 right-2 w-2 h-4 bg-white/40 rounded"
              ></div>
              <div
                class="absolute top-3 right-5 w-1 h-1 bg-white/40 rounded-full"
              ></div>
              <div
                class="absolute top-5 right-4 w-1 h-1 bg-white/40 rounded-full"
              ></div>
            </div>
            <!-- Front card (landscape with sun) -->
            <div
              class="relative w-28 h-22 bg-linear-to-b from-blue-300 to-blue-500 rounded-lg shadow-lg overflow-hidden"
            >
              <!-- Sun -->
              <div
                class="absolute bottom-4 right-6 w-6 h-6 bg-yellow-400 rounded-full"
              ></div>
              <!-- Hills -->
              <div
                class="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-teal-500 to-teal-400 rounded-t-full scale-150 translate-y-2"
              ></div>
            </div>
          </div>

          <!-- Text -->
          <p class="text-slack-text mb-4">Paste or drag a file here, or</p>

          <!-- Upload Button -->
          <button
            onclick={() => fileInput?.click()}
            class="flex items-center gap-2 px-4 py-2 bg-slack-accent text-white rounded-lg hover:bg-slack-accent-hover transition-colors font-medium"
          >
            <Paperclip size={18} />
            Upload file
          </button>

          <input
            bind:this={fileInput}
            type="file"
            accept={acceptTypes}
            multiple={remainingSlots > 1}
            onchange={handleFileSelect}
            class="hidden"
          />
        </div>
      </div>
    </div>
  </div>
{/if}
