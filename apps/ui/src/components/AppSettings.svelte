<script lang="ts">
  import { untrack } from 'svelte'
  import { X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import IconButton from './IconButton.svelte'
  import DynamicSettings from './DynamicSettings.svelte'

  interface Props {
    appId: string
    appName: string
    globalSettings: Record<string, unknown>
    appSettings: Record<string, unknown>
    onSave: (appSettings: Record<string, unknown>) => void
    onCancel: () => void
    open?: boolean
  }

  let {
    appId: _appId,
    appName,
    globalSettings,
    appSettings,
    onSave,
    onCancel,
    open = false,
  }: Props = $props()

  // Merge global settings (as defaults) with app-specific overrides
  let formData: Record<string, unknown> = $state({})
  let saving = $state(false)
  let error = $state('')
  let dialogEl: HTMLDialogElement | undefined = $state()

  // Initialize form data with merged settings only when modal opens
  $effect.pre(() => {
    if (open) {
      formData = untrack(() => ({ ...globalSettings, ...appSettings }))
    }
  })

  // Sync dialog open state with prop
  $effect(() => {
    if (!dialogEl) return
    if (open && !dialogEl.open) {
      dialogEl.showModal()
    } else if (!open && dialogEl.open) {
      dialogEl.close()
    }
  })

  async function handleSubmit(event: Event) {
    event.preventDefault()
    error = ''
    saving = true
    try {
      const snapshot = $state.snapshot(formData)
      await onSave(snapshot)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save settings'
    } finally {
      saving = false
    }
  }

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      dialogEl?.close() // Let onclose handler call onCancel once
    }
  }

  function handleDialogClose() {
    onCancel()
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={handleDialogClick}
  onclose={handleDialogClose}
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 border-none rounded-xl bg-(--main-bg) text-(--text-primary) max-w-[480px] w-[calc(100%-2rem)] max-h-[85vh] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop:bg-black/60"
>
  <form onsubmit={handleSubmit} class="flex flex-col h-full max-h-[85vh]">
    <!-- Header -->
    <header
      class="flex justify-between items-center px-5 py-4 border-b border-(--border-color) shrink-0"
    >
      <h2 class="m-0 text-lg font-bold text-(--text-primary)">
        {appName} Settings
      </h2>
      <IconButton icon={X} size={18} label="Close" onclick={onCancel} />
    </header>

    <!-- Scrollable content -->
    <div class="p-5 overflow-y-auto flex-1 min-h-0 max-h-140">
      <DynamicSettings
        initialValues={{ ...globalSettings, ...appSettings }}
        bind:formData
        filterScope="app"
      />
    </div>

    <!-- Footer with buttons -->
    <footer
      class="flex gap-3 justify-end items-center px-5 py-4 border-t border-(--border-color) shrink-0"
    >
      {#if error}
        <div
          class="flex-1 px-3 py-2 bg-(--log-error) text-white rounded-md text-[13px]"
        >
          {error}
        </div>
      {/if}
      <Button type="button" variant="outline" onclick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </footer>
  </form>
</dialog>
