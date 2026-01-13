<script lang="ts">
  import { Paperclip, X, Info } from '@lucide/svelte'
  import FileUploadModal from '../../FileUploadModal.svelte'
  import type { SlackFileInputElement, UploadedFile } from '../../../lib/types'

  interface Props {
    element: SlackFileInputElement
    label?: string
    optional?: boolean
    files: UploadedFile[]
    onFilesChange: (files: UploadedFile[]) => void
  }

  let {
    element,
    label,
    optional = true,
    files,
    onFilesChange,
  }: Props = $props()

  let showUploadModal = $state(false)

  let maxFiles = $derived(element.max_files ?? 4)
  let filetypes = $derived(
    element.filetypes ?? ['png', 'jpg', 'jpeg', 'gif', 'webp']
  )

  function handleFilesAdded(newFiles: UploadedFile[]) {
    const combined = [...files, ...newFiles].slice(0, maxFiles)
    onFilesChange(combined)
  }

  function handleRemoveFile(fileId: string) {
    onFilesChange(files.filter((f) => f.id !== fileId))
  }
</script>

<div>
  <!-- Label -->
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm text-slack-text-muted">
      {label ?? 'Reference Images'}
      {#if optional}
        <span class="text-slack-text-muted"> (optional)</span>
      {/if}
    </span>
    <button
      class="p-1 text-slack-text-muted hover:text-slack-text transition-colors"
      aria-label="Information"
    >
      <Info size={16} />
    </button>
  </div>

  <!-- Thumbnails Container -->
  {#if files.length > 0}
    <div class="bg-slack-input border border-white/20 rounded-lg p-3 mb-3">
      <div class="flex flex-wrap gap-2">
        {#each files as file (file.id)}
          <div class="relative group">
            <img
              src={file.dataUrl}
              alt={file.name}
              class="size-16 object-cover rounded-lg border border-white/10"
            />
            <!-- Remove button -->
            <button
              onclick={() => handleRemoveFile(file.id)}
              class="absolute -top-1.5 -right-1.5 size-5 bg-slack-bg border border-white/20 rounded-full flex items-center justify-center text-slack-text-muted hover:text-slack-text hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove {file.name}"
            >
              <X size={12} />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Upload Button -->
  <button
    onclick={() => (showUploadModal = true)}
    disabled={files.length >= maxFiles}
    class="flex items-center gap-2 px-3 py-2 bg-white/10 text-slack-text rounded-lg hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Paperclip size={16} />
    Upload file
  </button>
</div>

<FileUploadModal
  open={showUploadModal}
  {filetypes}
  {maxFiles}
  currentCount={files.length}
  onClose={() => (showUploadModal = false)}
  onFilesAdded={handleFilesAdded}
/>
