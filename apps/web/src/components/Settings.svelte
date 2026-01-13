<script lang="ts">
  import { X } from '@lucide/svelte'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import IconButton from './IconButton.svelte'
  import DynamicSettings from './DynamicSettings.svelte'
  import type { SimulatorSettings, AIProvider } from '../lib/settings-store'
  import { clearAllMessages } from '../lib/dispatcher.svelte'
  import { clearMessages } from '../lib/state.svelte'

  interface Props {
    settings: SimulatorSettings
    onSave: (settings: SimulatorSettings) => void
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

  // Sync dialog open state with prop
  $effect(() => {
    if (!dialogEl) return
    if (open && !dialogEl.open) {
      dialogEl.showModal()
    } else if (!open && dialogEl.open) {
      dialogEl.close()
    }
  })

  // Convert settings to form values
  function settingsToFormValues(s: SimulatorSettings): Record<string, unknown> {
    return {
      ai_provider: s.aiProvider,
      openai_api_key: s.providerKeys?.openai ?? '',
      anthropic_api_key: s.providerKeys?.anthropic ?? '',
      google_api_key: s.providerKeys?.google ?? '',
      model_fast: s.modelFast,
      model_default: s.modelDefault,
      model_thinking: s.modelThinking,
      github_token: s.githubToken ?? '',
      github_default_org: s.githubOrg ?? '',
      tavily_api_key: s.tavilyApiKey ?? '',
      simulated_user_name: s.simulatedUserName,
    }
  }

  // Convert form values back to settings
  function formValuesToSettings(
    values: Record<string, unknown>
  ): SimulatorSettings {
    const provider = (values.ai_provider as AIProvider) ?? 'openai'
    return {
      aiProvider: provider,
      providerKeys: {
        openai: (values.openai_api_key as string) || undefined,
        anthropic: (values.anthropic_api_key as string) || undefined,
        google: (values.google_api_key as string) || undefined,
      },
      modelFast: (values.model_fast as string) || undefined,
      modelDefault: (values.model_default as string) || undefined,
      modelThinking: (values.model_thinking as string) || undefined,
      githubToken: (values.github_token as string) || undefined,
      githubOrg: (values.github_default_org as string) || undefined,
      tavilyApiKey: (values.tavily_api_key as string) || undefined,
      simulatedUserName:
        (values.simulated_user_name as string) || settings.simulatedUserName,
      appLogLevel: settings.appLogLevel,
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault()
    error = ''

    // Validate API key for selected provider
    const provider = formData.ai_provider as AIProvider
    const keyField = `${provider}_api_key`
    const apiKey = formData[keyField] as string
    if (!apiKey?.trim()) {
      error = 'API key is required'
      return
    }

    saving = true
    try {
      const settingsToSave = formValuesToSettings(formData)
      await onSave(settingsToSave)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save settings'
    } finally {
      saving = false
    }
  }

  function handleCancel() {
    onCancel?.()
  }

  function handleDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      onCancel?.()
    }
  }

  function handleDialogClose() {
    onCancel?.()
  }

  async function handleDeleteAllData() {
    if (deleteConfirmText !== 'DELETE') return
    deleting = true
    try {
      await clearAllMessages()
      clearMessages()
      deleteConfirmText = ''
      deleteSuccess = true
      setTimeout(() => (deleteSuccess = false), 2000)
    } finally {
      deleting = false
    }
  }
</script>

{#if isModal}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
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
        <IconButton icon={X} size={18} label="Close" onclick={onCancel} />
      </header>

      <!-- Scrollable content -->
      <div class="p-5 overflow-y-auto flex-1 min-h-0 max-h-140">
        <DynamicSettings
          initialValues={settingsToFormValues(settings)}
          bind:formData
        />

        <!-- Delete All Data section -->
        <div class="h-px bg-(--border-color) my-5"></div>
        <div class="mb-4">
          <Label class="mb-1.5 text-(--text-secondary)">Delete All Data</Label>
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
        </div>
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
          <Button type="button" variant="outline" onclick={handleCancel}>
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
          initialValues={settingsToFormValues(settings)}
          bind:formData
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
            <Button type="button" variant="outline" onclick={handleCancel}>
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
