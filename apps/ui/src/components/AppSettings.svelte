<script lang="ts">
  import { untrack } from 'svelte'
  import { X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button'
  import IconButton from './IconButton.svelte'
  import DynamicSettings from './DynamicSettings.svelte'
  import {
    SIMULATOR_SETTINGS_SCHEMA,
    BOT_OVERRIDABLE_SETTINGS,
  } from '../lib/simulator-settings'

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
    appId,
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

  // Filter global settings to only include inheritable fields (simulator settings + bot-overridable)
  // Bot-specific fields like bot_name shouldn't be inherited from global settings
  const inheritableGlobalSettings = $derived.by(() => {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(globalSettings)) {
      const isSimulatorSetting = key in SIMULATOR_SETTINGS_SCHEMA.settings
      const isBotOverridable = (
        BOT_OVERRIDABLE_SETTINGS as readonly string[]
      ).includes(key)
      if (isSimulatorSetting || isBotOverridable) {
        result[key] = value
      }
    }
    return result
  })

  // Initialize form data with merged settings only when modal opens
  $effect.pre(() => {
    if (open) {
      // Only inherit simulator settings and bot-overridable settings from global
      // Bot-specific fields should come from appSettings or the bot's defaults
      // Use JSON parse/stringify to ensure plain objects (no reactive proxies)
      const merged = { ...inheritableGlobalSettings, ...appSettings }
      formData = untrack(() => JSON.parse(JSON.stringify(merged)))
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
      // Use JSON parse/stringify to create a plain object copy
      // This avoids $state.snapshot issues with reactive proxies
      const snapshot = JSON.parse(JSON.stringify(formData))

      const currentProvider = snapshot.ai_provider

      // Filter out bot-overridable settings that match global values
      // Only save settings that are explicitly different from inherited
      const filteredSettings: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(snapshot)) {
        const isBotOverridable = (
          BOT_OVERRIDABLE_SETTINGS as readonly string[]
        ).includes(key)
        const globalValue = inheritableGlobalSettings[key]
        const isModelField = key.startsWith('model_')

        if (isBotOverridable) {
          // For model fields, check if the value matches the current provider format
          if (isModelField && value) {
            const modelStr = value as string
            const isOpenRouter = currentProvider === 'openrouter'
            const modelHasSlash = modelStr.includes('/')
            // OpenRouter models have format "provider/model", others don't
            const isValidForProvider = isOpenRouter
              ? modelHasSlash
              : !modelHasSlash
            if (!isValidForProvider) {
              // Clear invalid model values (from a different provider)
              // Save empty string to explicitly clear any previous override
              filteredSettings[key] = ''
              continue
            }
          }
          // Only include if different from global
          if (value !== globalValue && value !== undefined && value !== '') {
            filteredSettings[key] = value
          }
        } else {
          // Non-overridable settings always save (bot_name, bot_personality, etc.)
          filteredSettings[key] = value
        }
      }

      await onSave(filteredSettings)
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
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0 border-none rounded-xl bg-(--main-bg) text-(--text-primary) max-w-[480px] w-[calc(100%-2rem)] h-[65vh] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop:bg-black/60"
>
  <form onsubmit={handleSubmit} class="flex flex-col h-full">
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
    <div class="p-5 overflow-y-auto flex-1 min-h-0">
      <DynamicSettings
        initialValues={inheritableGlobalSettings}
        appOverrides={appSettings}
        bind:formData
        filterScope="all"
        inheritedValues={inheritableGlobalSettings}
        showInheritedBadge={true}
        botId={appId}
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
      <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </footer>
  </form>
</dialog>
