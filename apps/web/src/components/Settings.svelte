<script lang="ts">
  import type { Snippet } from 'svelte'
  import { X } from '@lucide/svelte'
  import * as Select from '$lib/components/ui/select'
  import * as Tabs from '$lib/components/ui/tabs'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import IconButton from './IconButton.svelte'
  import type { SimulatorSettings } from '../lib/settings-store'
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

  let formData: SimulatorSettings = $state(null!)
  let showApiKey = $state(false)
  let saving = $state(false)
  let error = $state('')
  let dialogEl: HTMLDialogElement | undefined = $state()
  let deleteConfirmText = $state('')
  let deleting = $state(false)
  let deleteSuccess = $state(false)

  // Sync formData when settings prop changes
  $effect.pre(() => {
    formData = {
      ...settings,
      providerKeys: { ...(settings.providerKeys ?? {}) },
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

  const providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
  ] as const

  // Curated model lists per provider per tier
  const MODEL_TIERS = {
    openai: {
      fast: ['gpt-5-mini', 'gpt-4o-mini', 'gpt-4.1-mini'],
      default: ['gpt-5.2', 'gpt-5', 'gpt-4o', 'gpt-4.1'],
      thinking: ['o3', 'o3-mini', 'o1'],
    },
    anthropic: {
      fast: ['claude-haiku-4-5', 'claude-3-5-haiku-latest'],
      default: ['claude-sonnet-4-5', 'claude-sonnet-4-0'],
      thinking: ['claude-opus-4-5', 'claude-opus-4-1'],
    },
    google: {
      fast: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'],
      default: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
      thinking: ['gemini-2.5-pro', 'gemini-3-pro-preview'],
    },
  } as const

  type ModelTier = 'fast' | 'default' | 'thinking'

  // Get default model for tier (first in list)
  function getDefaultForTier(
    provider: SimulatorSettings['aiProvider'],
    tier: ModelTier
  ): string {
    return MODEL_TIERS[provider][tier][0]
  }

  // Get non-default models for tier (skip first item which is the default)
  function getAltModelsForTier(
    provider: SimulatorSettings['aiProvider'],
    tier: ModelTier
  ): readonly string[] {
    return MODEL_TIERS[provider][tier].slice(1)
  }

  // Clear model selections when provider changes (they're provider-specific)
  function handleProviderChange(newProvider: SimulatorSettings['aiProvider']) {
    formData.aiProvider = newProvider
    // Reset model selections since they're provider-specific
    formData.modelFast = undefined
    formData.modelDefault = undefined
    formData.modelThinking = undefined
  }

  async function handleSubmit(event: Event) {
    event.preventDefault()
    error = ''

    const currentKey = formData.providerKeys[formData.aiProvider] ?? ''
    if (!currentKey.trim()) {
      error = 'API key is required'
      return
    }

    saving = true
    try {
      // Create a deep copy to ensure nested objects are properly serialized
      const settingsToSave: SimulatorSettings = {
        ...formData,
        providerKeys: { ...formData.providerKeys },
      }
      await onSave(settingsToSave)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save settings'
    } finally {
      saving = false
    }
  }

  function handleCancel() {
    formData = {
      ...settings,
      providerKeys: { ...(settings.providerKeys ?? {}) },
    }
    onCancel?.()
  }

  function handleDialogClick(event: MouseEvent) {
    // Close on backdrop click
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
    <div class="flex flex-col h-full">
      <header
        class="flex justify-between items-center px-5 py-4 border-b border-(--border-color) shrink-0"
      >
        <h2 class="m-0 text-lg font-bold text-(--text-primary)">Settings</h2>
        <IconButton icon={X} size={18} label="Close" onclick={onCancel} />
      </header>
      <div class="p-5 overflow-y-auto flex-1 min-h-0">
        {@render settingsForm()}
      </div>
    </div>
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
      {@render settingsForm()}
    </div>
  </div>
{/if}

{#snippet formField(id: string, labelText: string, children: Snippet)}
  <div class="mb-4">
    <Label for={id} class="mb-1.5 text-(--text-secondary)">{labelText}</Label>
    {@render children()}
  </div>
{/snippet}

{#snippet inputField(
  id: string,
  label: string,
  type: 'text' | 'password',
  value: string | undefined,
  onInput: (v: string) => void,
  placeholder: string
)}
  {@render formField(id, label, inputControl)}
  {#snippet inputControl()}
    <Input
      {id}
      {type}
      {value}
      oninput={(e) => onInput(e.currentTarget.value)}
      {placeholder}
      autocomplete="off"
      class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted)"
    />
  {/snippet}
{/snippet}

{#snippet settingsForm()}
  <form onsubmit={handleSubmit}>
    <div class="max-h-[500px] overflow-y-auto -mx-4 px-4">
      <div class="mb-4">
        <Label class="mb-3 text-(--text-secondary) font-medium"
          >AI Provider</Label
        >
        <Tabs.Root
          value={formData.aiProvider}
          onValueChange={(v) => {
            if (v) handleProviderChange(v as typeof formData.aiProvider)
          }}
          class="w-full"
        >
          <Tabs.List class="w-full grid grid-cols-3">
            {#each providers as provider}
              <Tabs.Trigger value={provider.value}
                >{provider.label}</Tabs.Trigger
              >
            {/each}
          </Tabs.List>

          {#each providers as provider}
            <Tabs.Content value={provider.value}>
              <div class="mt-3">
                <Label
                  for="apiKey-{provider.value}"
                  class="justify-between mb-1.5 text-(--text-secondary)"
                >
                  API Key
                  <Button
                    type="button"
                    variant="link"
                    class="h-auto p-0 text-xs"
                    onclick={() => (showApiKey = !showApiKey)}
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </Button>
                </Label>
                <Input
                  id="apiKey-{provider.value}"
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.providerKeys[provider.value] ?? ''}
                  oninput={(e) => {
                    formData.providerKeys[provider.value] =
                      e.currentTarget.value
                  }}
                  placeholder="Enter your {provider.label} API key"
                  autocomplete="off"
                  class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted)"
                />
              </div>
            </Tabs.Content>
          {/each}
        </Tabs.Root>
      </div>

      <div class="h-px bg-(--border-color) my-5"></div>

      <!-- Model Configuration Section -->
      <div class="mb-4">
        <Label class="mb-3 text-(--text-secondary) font-medium"
          >Model Configuration</Label
        >
        <Tabs.Root value="default" class="w-full">
          <Tabs.List class="w-full grid grid-cols-3">
            <Tabs.Trigger value="fast">Fast</Tabs.Trigger>
            <Tabs.Trigger value="default">Default</Tabs.Trigger>
            <Tabs.Trigger value="thinking">Thinking</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="fast">
            <p class="text-xs text-(--text-muted) mb-2">
              Used for classification and quick tasks
            </p>
            <Select.Root
              type="single"
              value={formData.modelFast ?? ''}
              onValueChange={(v) => {
                formData.modelFast = v || undefined
              }}
            >
              <Select.Trigger
                class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
              >
                {formData.modelFast ||
                  `Default (${getDefaultForTier(formData.aiProvider, 'fast')})`}
              </Select.Trigger>
              <Select.Content
                portalProps={{ disabled: true }}
                class="bg-(--main-bg) border-(--border-color)"
              >
                <Select.Item
                  value=""
                  label={`Default (${getDefaultForTier(formData.aiProvider, 'fast')})`}
                  class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                />
                {#each getAltModelsForTier(formData.aiProvider, 'fast') as model}
                  <Select.Item
                    value={model}
                    label={model}
                    class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          </Tabs.Content>

          <Tabs.Content value="default">
            <p class="text-xs text-(--text-muted) mb-2">
              Used for standard conversations
            </p>
            <Select.Root
              type="single"
              value={formData.modelDefault ?? ''}
              onValueChange={(v) => {
                formData.modelDefault = v || undefined
              }}
            >
              <Select.Trigger
                class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
              >
                {formData.modelDefault ||
                  `Default (${getDefaultForTier(formData.aiProvider, 'default')})`}
              </Select.Trigger>
              <Select.Content
                portalProps={{ disabled: true }}
                class="bg-(--main-bg) border-(--border-color)"
              >
                <Select.Item
                  value=""
                  label={`Default (${getDefaultForTier(formData.aiProvider, 'default')})`}
                  class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                />
                {#each getAltModelsForTier(formData.aiProvider, 'default') as model}
                  <Select.Item
                    value={model}
                    label={model}
                    class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          </Tabs.Content>

          <Tabs.Content value="thinking">
            <p class="text-xs text-(--text-muted) mb-2">
              Used for complex tasks (automatic fallback)
            </p>
            <Select.Root
              type="single"
              value={formData.modelThinking ?? ''}
              onValueChange={(v) => {
                formData.modelThinking = v || undefined
              }}
            >
              <Select.Trigger
                class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
              >
                {formData.modelThinking ||
                  `Default (${getDefaultForTier(formData.aiProvider, 'thinking')})`}
              </Select.Trigger>
              <Select.Content
                portalProps={{ disabled: true }}
                class="bg-(--main-bg) border-(--border-color)"
              >
                <Select.Item
                  value=""
                  label={`Default (${getDefaultForTier(formData.aiProvider, 'thinking')})`}
                  class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                />
                {#each getAltModelsForTier(formData.aiProvider, 'thinking') as model}
                  <Select.Item
                    value={model}
                    label={model}
                    class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
                  />
                {/each}
              </Select.Content>
            </Select.Root>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div class="h-px bg-(--border-color) my-5"></div>

      {@render inputField(
        'githubToken',
        'GitHub Token (optional)',
        'password',
        formData.githubToken,
        (v) => (formData.githubToken = v),
        'For GitHub tools'
      )}
      {@render inputField(
        'githubOrg',
        'Default GitHub Org (optional)',
        'text',
        formData.githubOrg,
        (v) => (formData.githubOrg = v),
        'e.g., your-org'
      )}
      {@render inputField(
        'tavilyApiKey',
        'Tavily API Key (optional)',
        'password',
        formData.tavilyApiKey,
        (v) => (formData.tavilyApiKey = v),
        'For web search'
      )}

      <div class="h-px bg-(--border-color) my-5"></div>

      {@render inputField(
        'simulatedUserName',
        'Your Name',
        'text',
        formData.simulatedUserName,
        (v) => (formData.simulatedUserName = v),
        'e.g., John'
      )}

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

    {#if error}
      <div
        class="px-3 py-2.5 bg-(--log-error) text-white rounded-md text-[13px] mb-4"
      >
        {error}
      </div>
    {/if}

    <div class="flex gap-3 justify-end mt-6">
      {#if showCancel}
        <Button type="button" variant="outline" onclick={handleCancel}
          >Cancel</Button
        >
      {/if}
      <Button type="submit" disabled={saving}
        >{saving ? 'Saving...' : 'Save'}</Button
      >
    </div>
  </form>
{/snippet}
