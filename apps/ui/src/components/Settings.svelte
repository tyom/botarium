<script lang="ts">
  import { X } from '@lucide/svelte'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import IconButton from './IconButton.svelte'
  import DynamicSettings from './DynamicSettings.svelte'
  import { clearAllMessages } from '../lib/dispatcher.svelte'
  import { clearMessages, simulatorState } from '../lib/state.svelte'

  // Get first connected bot ID for fetching config schema
  // (any bot works since we only need the schema for global settings)
  const firstBotId = $derived(
    simulatorState.connectedBots.size > 0
      ? Array.from(simulatorState.connectedBots.keys())[0]
      : undefined
  )

  interface Props {
    settings: Record<string, unknown>
    onSave: (settings: Record<string, unknown>) => void
    onCancel?: () => void
    showCancel?: boolean
    isModal?: boolean
    open?: boolean
  }

  let {
    settings,
    onSave,
    onCancel,
    showCancel = true,
    isModal = false,
    open = false,
  }: Props = $props()

  let formData: Record<string, unknown> = $state({})
  let saving = $state(false)
  let error = $state('')
  let dialogEl: HTMLDialogElement | undefined = $state()
  let deleteConfirmText = $state('')
  let deleting = $state(false)
  let deleteSuccess = $state(false)
  let deleteError = $state('')
  let deleteSuccessTimeout: ReturnType<typeof setTimeout> | null = null

  // Clean up timeout on unmount
  $effect(() => {
    return () => {
      if (deleteSuccessTimeout) clearTimeout(deleteSuccessTimeout)
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
      // Create a plain object for IPC (Svelte 5 $state creates proxies that can't be cloned)
      const settingsToSave = $state.snapshot(formData)
      await onSave(settingsToSave)
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
    onCancel?.()
  }

  async function handleDeleteAllData() {
    if (deleteConfirmText !== 'DELETE') return
    deleting = true
    deleteError = ''
    try {
      await clearAllMessages()
      clearMessages()
      deleteConfirmText = ''
      deleteSuccess = true
      deleteSuccessTimeout = setTimeout(() => (deleteSuccess = false), 2000)
    } catch (e) {
      deleteError = e instanceof Error ? e.message : 'Failed to delete data'
    } finally {
      deleting = false
    }
  }
</script>

{#if isModal}
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
        <h2 class="m-0 text-lg font-bold text-(--text-primary)">Settings</h2>
        <IconButton
          icon={X}
          size={18}
          label="Close"
          onclick={() => dialogEl?.close()}
        />
      </header>

      <!-- Scrollable content -->
      <div class="p-5 overflow-y-auto flex-1 min-h-0 max-h-140">
        <DynamicSettings
          initialValues={settings}
          bind:formData
          filterScope="global"
          botId={firstBotId}
        >
          {#snippet advancedContent()}
            <!-- Delete All Data section -->
            <div class="mb-4 mt-4">
              <Label class="mb-1.5 text-(--text-secondary)"
                >Delete All Data</Label
              >
              <div class="flex gap-2">
                <Input
                  type="text"
                  bind:value={deleteConfirmText}
                  placeholder="Type DELETE to confirm"
                  autocomplete="off"
                  class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted) flex-1"
                />
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  onclick={handleDeleteAllData}
                >
                  {#if deleting}
                    Deleting...
                  {:else if deleteSuccess}
                    Deleted!
                  {:else}
                    DELETE
                  {/if}
                </Button>
              </div>
              {#if deleteError}
                <div
                  class="mt-2 px-3 py-2 bg-(--log-error) text-white rounded-md text-[13px]"
                >
                  {deleteError}
                </div>
              {/if}
            </div>
          {/snippet}
        </DynamicSettings>
      </div>

      <!-- Footer with buttons -->
      <footer
        class="flex gap-3 justify-end px-5 py-4 border-t border-(--border-color) shrink-0"
      >
        {#if error}
          <div
            class="flex-1 px-3 py-2 bg-(--log-error) text-white rounded-md text-[13px]"
          >
            {error}
          </div>
        {/if}
        {#if showCancel}
          <Button
            type="button"
            variant="outline"
            onclick={() => dialogEl?.close()}
          >
            Cancel
          </Button>
        {/if}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </footer>
    </form>
  </dialog>
{:else}
  <!-- Full-screen setup mode -->
  <div
    class="flex items-center justify-center min-h-screen bg-(--main-bg)"
    data-settings="fullscreen"
  >
    <div class="p-6 w-full max-w-2xl mx-auto">
      <h2 class="m-0 mb-6 text-xl font-bold text-(--text-primary)">
        Initial Setup
      </h2>
      <form onsubmit={handleSubmit}>
        <DynamicSettings
          initialValues={settings}
          bind:formData
          filterScope="global"
          botId={firstBotId}
        />

        {#if error}
          <div
            class="px-3 py-2.5 bg-(--log-error) text-white rounded-md text-[13px] mb-4"
          >
            {error}
          </div>
        {/if}

        <div class="flex gap-3 justify-end mt-6">
          {#if showCancel}
            <Button type="button" variant="outline" onclick={onCancel}>
              Cancel
            </Button>
          {/if}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
