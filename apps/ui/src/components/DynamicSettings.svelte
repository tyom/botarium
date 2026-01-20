<script lang="ts">
  import * as Select from '$lib/components/ui/select'
  import * as Tabs from '$lib/components/ui/tabs'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import {
    ChevronDown,
    ChevronRight,
    Check,
    Ban,
    LoaderCircle,
  } from '@lucide/svelte'
  import {
    fetchBotConfig,
    type BotConfig,
    type SettingSchema,
    type GroupDefinition,
  } from '../lib/config-client'
  import { isElectron, getElectronAPI } from '../lib/electron-api'
  import {
    SIMULATOR_SETTINGS_SCHEMA,
    MODEL_TIERS,
    BOT_OVERRIDABLE_SETTINGS,
  } from '../lib/simulator-settings'

  import type { Snippet } from 'svelte'

  interface Props {
    /** Initial form values */
    initialValues: Record<string, unknown>
    /** App-specific overrides (for app settings mode) */
    appOverrides?: Record<string, unknown>
    /** Bindable form data - updated as user edits */
    formData?: Record<string, unknown>
    /** Filter fields by scope: 'global', 'app', or 'all' (default) */
    filterScope?: 'global' | 'app' | 'all'
    /** Additional content to render inside the advanced group */
    advancedContent?: Snippet
    /** Bot ID to fetch config for (required in Electron mode) */
    botId?: string
    /** Global/inherited values to compare against (for showing inherited badge) */
    inheritedValues?: Record<string, unknown>
    /** Enable inherited/override indication */
    showInheritedBadge?: boolean
  }

  let {
    initialValues,
    appOverrides = {},
    formData = $bindable({}),
    filterScope = 'all',
    advancedContent,
    botId,
    inheritedValues = {},
    showInheritedBadge = false,
  }: Props = $props()

  let config: BotConfig | null = $state(null)
  let loading = $state(true)
  let showSecrets: Record<string, boolean> = $state({})
  let collapsedGroups: Record<string, boolean> = $state({})

  // Dynamic model tiers fetched from provider APIs (Electron only)
  let dynamicModelTiers: Record<
    string,
    { fast: string[]; default: string[]; thinking: string[] }
  > | null = $state(null)

  // API key validation state: { fieldKey: { status: 'idle' | 'validating' | 'valid' | 'invalid', error?: string, validatedValue?: string } }
  let apiKeyValidation: Record<
    string,
    {
      status: 'idle' | 'validating' | 'valid' | 'invalid'
      error?: string
      validatedValue?: string
    }
  > = $state({})

  // Track previous initialValues to detect changes
  let prevInitialValues: Record<string, unknown> = {}

  // Initialize form data from initial values
  // Re-sync if initialValues changes (e.g., async loading)
  $effect.pre(() => {
    for (const [key, value] of Object.entries(initialValues)) {
      const prevValue = prevInitialValues[key]
      const currentFormValue = formData[key]

      // Update formData if:
      // 1. formData doesn't have this key yet, OR
      // 2. initialValues changed AND formData still has the old initialValue (not user-modified)
      if (
        currentFormValue === undefined ||
        (prevValue !== value && currentFormValue === prevValue)
      ) {
        formData[key] = value
      }
    }
    prevInitialValues = { ...initialValues }
  })

  // Track the key of the last fetched config to avoid duplicate fetches and detect bot changes
  let lastFetchedKey: string | null = $state(null)

  // Fetch dynamic model tiers from provider APIs (Electron only)
  $effect(() => {
    if (!isElectron) return

    const electronAPI = getElectronAPI()
    if (!electronAPI) return

    electronAPI
      .getModelTiers()
      .then((tiers) => {
        dynamicModelTiers = tiers
      })
      .catch((error) => {
        console.warn('Failed to fetch dynamic model tiers:', error)
      })
  })

  // Fetch config reactively when botId becomes available (or immediately in web mode)
  $effect(() => {
    // In Electron mode, use botId as the key; in web mode, use a constant
    const currentKey = isElectron ? botId : 'web'
    // Skip if no key available or already fetched for this key
    if (!currentKey || lastFetchedKey === currentKey) return

    lastFetchedKey = currentKey

    // Use an async IIFE to handle the fetch
    ;(async () => {
      // Capture key before await to detect stale fetches
      const fetchKey = currentKey
      try {
        const botConfig = await fetchBotConfig(botId)

        // Abort if a newer fetch has started (key changed during await)
        if (lastFetchedKey !== fetchKey) return

        // Always include simulator settings, merged with bot config if available
        const simulatorSettings = SIMULATOR_SETTINGS_SCHEMA.settings as Record<
          string,
          SettingSchema
        >
        const simulatorGroups =
          SIMULATOR_SETTINGS_SCHEMA.groups as GroupDefinition[]

        if (botConfig) {
          // Merge bot config with simulator settings
          // For bot-overridable settings (ai_provider, api keys, models), use simulator schema
          // to ensure all options are available. For other bot settings, use bot's schema.
          const mergedSettings: Record<string, SettingSchema> = {
            ...simulatorSettings,
          }
          for (const [key, schema] of Object.entries(
            botConfig.schema.settings
          )) {
            const isBotOverridable = (
              BOT_OVERRIDABLE_SETTINGS as readonly string[]
            ).includes(key)
            if (!isBotOverridable) {
              // Bot-specific setting - use bot's schema
              mergedSettings[key] = schema
            }
            // For bot-overridable settings, keep the simulator's schema (with full options)
          }

          // Merge groups: simulator groups provide base, bot can override expanded only in bot settings mode
          const simulatorGroupMap = new Map(
            simulatorGroups.map((g) => [g.id, g])
          )
          const mergedGroups: GroupDefinition[] = []
          const seenGroupIds = new Set<string>()

          // First, add bot groups (use simulator's definition, bot can override expanded in bot settings mode)
          for (const botGroup of botConfig.schema.groups) {
            const simGroup = simulatorGroupMap.get(botGroup.id)
            if (simGroup) {
              // Use simulator's definition; only allow bot's expanded override in bot settings mode
              const expanded =
                showInheritedBadge && botGroup.expanded !== undefined
                  ? botGroup.expanded
                  : simGroup.expanded
              mergedGroups.push({
                ...simGroup,
                expanded,
              })
            } else {
              mergedGroups.push(botGroup)
            }
            seenGroupIds.add(botGroup.id)
          }

          // Then add any simulator groups not in bot config
          for (const simGroup of simulatorGroups) {
            if (!seenGroupIds.has(simGroup.id)) {
              mergedGroups.push(simGroup)
            }
          }

          // Deep merge model_tiers per provider to preserve default tiers
          const mergedModelTiers: Record<string, Record<string, string[]>> = {
            ...MODEL_TIERS,
          }
          const botModelTiers = botConfig.schema.model_tiers
          if (botModelTiers) {
            for (const provider of Object.keys(botModelTiers)) {
              mergedModelTiers[provider] = {
                ...MODEL_TIERS[provider],
                ...botModelTiers[provider],
              }
            }
          }

          config = {
            schema: {
              settings: mergedSettings,
              groups: mergedGroups,
              model_tiers: mergedModelTiers,
            },
            values: botConfig.values,
          }
        } else {
          // No bot config - use simulator settings only
          config = {
            schema: {
              settings: simulatorSettings,
              groups: simulatorGroups,
              model_tiers: MODEL_TIERS,
            },
            values: {},
          }
        }

        // Merge values with proper priority:
        // 1. App-specific overrides (from appOverrides) - highest priority
        // 2. Bot config defaults (from config.values)
        // 3. Initial values (from initialValues) - lowest priority
        for (const key of Object.keys(config.schema.settings)) {
          if (appOverrides[key] !== undefined) {
            // User's app-specific override takes priority
            formData[key] = appOverrides[key]
          } else if (
            formData[key] === undefined &&
            config.values[key] !== undefined
          ) {
            // Fall back to bot config value if formData doesn't have it
            formData[key] = config.values[key]
          }
        }

        // Initialize collapsed state from group definitions
        // collapsible: true makes it collapsible, expanded controls initial state (default: true)
        for (const group of config.schema.groups) {
          if (group.collapsible) {
            collapsedGroups[group.id] = group.expanded === false
          }
        }
      } catch (error) {
        // Only apply error state if this fetch is still current
        if (lastFetchedKey === fetchKey) {
          console.error('Failed to fetch bot config:', error)
          config = null
        }
      } finally {
        // Only clear loading if this fetch is still current
        if (lastFetchedKey === fetchKey) {
          loading = false
        }
      }
    })()
  })

  // Get sorted groups
  function getSortedGroups(): GroupDefinition[] {
    if (!config) return []
    return [...config.schema.groups].sort((a, b) => a.order - b.order)
  }

  // Get fields for a group, filtered by scope
  // - 'global' shows simulator settings only (defined in SIMULATOR_SETTINGS_SCHEMA)
  // - 'app' shows bot-specific fields only (not in simulator settings)
  // - 'all' shows everything (but when showInheritedBadge is true, excludes non-overridable simulator settings)
  function getFieldsForGroup(groupId: string): [string, SettingSchema][] {
    if (!config) return []
    return Object.entries(config.schema.settings).filter(([key, schema]) => {
      const matchesGroup = schema.group === groupId
      const isSimulatorSetting = key in SIMULATOR_SETTINGS_SCHEMA.settings
      const isBotOverridable = (
        BOT_OVERRIDABLE_SETTINGS as readonly string[]
      ).includes(key)

      if (filterScope === 'global') return matchesGroup && isSimulatorSetting

      if (filterScope === 'app') return matchesGroup && !isSimulatorSetting

      // 'all' mode: show everything, but when in bot settings mode (showInheritedBadge),
      // exclude simulator settings that aren't bot-overridable
      if (showInheritedBadge && isSimulatorSetting && !isBotOverridable) {
        return false
      }
      return matchesGroup
    })
  }

  // Check if field should be visible based on condition
  function shouldShowField(schema: SettingSchema): boolean {
    if (!schema.condition) return true
    const dependsOnValue = formData[schema.condition.field]
    return dependsOnValue === schema.condition.equals
  }

  // Check if field is required based on required_when
  function isFieldRequired(schema: SettingSchema): boolean {
    if (schema.required) return true
    if (!schema.required_when) return false
    const dependsOnValue = formData[schema.required_when.field]
    return dependsOnValue === schema.required_when.equals
  }

  // Get models for a tier based on current provider
  // Priority: dynamic API → bot config → hardcoded fallback
  function getModelsForTier(tier: string): string[] {
    const provider = formData.ai_provider as string
    if (!provider) return []

    type TierKey = 'fast' | 'default' | 'thinking'
    const tierKey = tier as TierKey

    // Priority 1: Dynamic model tiers from API (Electron only)
    const dynamicTiers = dynamicModelTiers?.[provider]
    if (dynamicTiers?.[tierKey]?.length) {
      return dynamicTiers[tierKey]
    }

    // Priority 2: Bot config model_tiers
    if (config?.schema.model_tiers[provider]?.[tier]?.length) {
      return config.schema.model_tiers[provider][tier]
    }

    // Priority 3: Hardcoded fallback
    return MODEL_TIERS[provider]?.[tier] ?? []
  }

  // Get default model for a tier (first in list)
  function getDefaultModel(tier: string): string {
    const models = getModelsForTier(tier)
    return models[0] ?? ''
  }

  // Check if current provider has an API key configured
  function hasProviderApiKey(): boolean {
    const provider = formData.ai_provider as string
    if (!provider) return false
    const keyField = `${provider}_api_key`
    const key = formData[keyField] as string | undefined
    return !!key && key.length > 0
  }

  function toggleSecret(key: string) {
    showSecrets[key] = !showSecrets[key]
  }

  function toggleGroup(groupId: string) {
    collapsedGroups[groupId] = !collapsedGroups[groupId]
  }

  // Handle provider change - reset model selections
  function handleProviderChange(newProvider: string) {
    formData.ai_provider = newProvider
    // Reset model selections since they're provider-specific
    formData.model_fast = undefined
    formData.model_default = undefined
    formData.model_thinking = undefined
  }

  // Check if a field value is inherited (same as global value)
  function isInherited(key: string): boolean {
    if (!showInheritedBadge) return false

    // Only simulator settings and bot-overridable settings can be inherited from global
    // Bot-specific settings (like bot_name, bot_personality) are never inherited
    const isSimulatorSetting = key in SIMULATOR_SETTINGS_SCHEMA.settings
    const isBotOverridable = (
      BOT_OVERRIDABLE_SETTINGS as readonly string[]
    ).includes(key)
    if (!isSimulatorSetting && !isBotOverridable) {
      return false // Bot-specific fields can't be inherited from global settings
    }

    const currentValue = formData[key]
    const inheritedValue = inheritedValues[key]
    // Treat undefined/empty as inherited if global is also undefined/empty
    if (currentValue === undefined || currentValue === '') {
      return inheritedValue === undefined || inheritedValue === ''
    }
    return currentValue === inheritedValue
  }

  // Check if a field has an override (different from global value)
  function hasOverride(key: string): boolean {
    if (!showInheritedBadge) return false

    // Only simulator settings and bot-overridable settings can have overrides
    // Bot-specific settings (like bot_name, bot_personality) don't have a global value to reset to
    const isSimulatorSetting = key in SIMULATOR_SETTINGS_SCHEMA.settings
    const isBotOverridable = (
      BOT_OVERRIDABLE_SETTINGS as readonly string[]
    ).includes(key)
    if (!isSimulatorSetting && !isBotOverridable) {
      return false
    }

    return !isInherited(key)
  }

  // Clear override for a field (revert to inherited value)
  function clearOverride(key: string) {
    formData[key] = inheritedValues[key]
  }

  // Validate an API key
  async function validateKey(key: string) {
    if (!isElectron) return

    const electronAPI = getElectronAPI()
    if (!electronAPI) return

    const value = formData[key] as string
    if (!value || value.trim() === '') {
      apiKeyValidation[key] = { status: 'invalid', error: 'API key is empty' }
      return
    }

    // Extract provider from key name (e.g., 'openai_api_key' -> 'openai')
    const provider = key.replace('_api_key', '')

    apiKeyValidation[key] = { status: 'validating' }

    try {
      const result = await electronAPI.validateApiKey(provider, value)
      if (result.valid) {
        apiKeyValidation[key] = { status: 'valid', validatedValue: value }
        // Refresh model tiers after successful validation
        // Build complete API keys map from formData merged with the newly validated key
        const allApiKeys: Record<string, string> = {}
        for (const [formKey, formValue] of Object.entries(formData)) {
          if (formKey.endsWith('_api_key') && typeof formValue === 'string') {
            allApiKeys[formKey] = formValue
          }
        }
        allApiKeys[key] = value
        await electronAPI.clearModelCache(provider)
        electronAPI
          .getModelTiers(allApiKeys)
          .then((tiers) => {
            dynamicModelTiers = tiers
          })
          .catch(() => {
            apiKeyValidation[key] = {
              status: 'invalid',
              error: 'Failed to fetch model tiers',
              validatedValue: undefined,
            }
          })
      } else {
        apiKeyValidation[key] = { status: 'invalid', error: result.error, validatedValue: undefined }
      }
    } catch {
      apiKeyValidation[key] = { status: 'invalid', error: 'Validation failed', validatedValue: undefined }
    }
  }

  // Get validation status for a field, resetting if value changed
  function getValidationStatus(
    key: string
  ): 'idle' | 'validating' | 'valid' | 'invalid' {
    const validation = apiKeyValidation[key]
    if (!validation) return 'idle'

    // Reset to idle if value changed since validation
    const currentValue = formData[key] as string
    if (
      validation.validatedValue &&
      validation.validatedValue !== currentValue
    ) {
      return 'idle'
    }

    return validation.status
  }
</script>

{#if loading}
  <div class="p-8 text-center text-(--text-muted)">
    Loading configuration...
  </div>
{:else if !config}
  <div class="p-8 text-center text-(--text-muted)">
    <p class="mb-4">Could not load bot configuration.</p>
    <p class="text-sm">Make sure the bot is running in simulator mode.</p>
  </div>
{:else}
  {@const groupsWithVisibleFields = getSortedGroups().filter((g) => {
    const fields = getFieldsForGroup(g.id)
    return fields.some(([_, schema]) => shouldShowField(schema))
  })}
  {#each groupsWithVisibleFields as group, visibleGroupIndex (group.id)}
    {@const fields = getFieldsForGroup(group.id)}
    {@const visibleFields = fields.filter(([_, schema]) =>
      shouldShowField(schema)
    )}

    {#if visibleFields.length > 0}
      {#if visibleGroupIndex > 0}
        <div class="h-px bg-(--border-color) my-5"></div>
      {/if}

      {#if group.collapsible}
        <!-- Collapsible group -->
        <div class="mb-4">
          <button
            type="button"
            onclick={() => toggleGroup(group.id)}
            class="flex items-center gap-2 mb-3 text-(--text-secondary) font-medium hover:text-(--text-primary) transition-colors w-full text-left"
          >
            {#if collapsedGroups[group.id]}
              <ChevronRight class="size-4" />
            {:else}
              <ChevronDown class="size-4" />
            {/if}
            {group.label}
          </button>
          {#if !collapsedGroups[group.id]}
            {@render groupFields(visibleFields)}
            {#if group.id === 'advanced' && advancedContent}
              {@render advancedContent()}
            {/if}
          {/if}
        </div>
      {:else}
        <Label class="mb-3 text-(--text-secondary) font-medium block">
          {group.label}
        </Label>
        {@render groupFields(visibleFields)}
      {/if}
    {/if}
  {/each}
{/if}

{#snippet groupFields(fields: [string, SettingSchema][])}
  {#each fields as [key, schema] (key)}
    {@render field(key, schema)}
  {/each}
{/snippet}

{#snippet inheritedIndicator(key: string)}
  {#if showInheritedBadge}
    {#if isInherited(key)}
      <span class="text-xs text-(--text-muted) ml-1 italic">(inherited)</span>
    {:else if hasOverride(key)}
      <Button
        type="button"
        variant="link"
        class="h-auto p-0 text-xs ml-1 text-(--accent-color)"
        onclick={() => clearOverride(key)}
      >
        Reset
      </Button>
    {/if}
  {/if}
{/snippet}

{#snippet field(key: string, schema: SettingSchema)}
  <div class="mb-4">
    {#if schema.type === 'select' && key === 'ai_provider'}
      <!-- Special handling for AI provider as tabs -->
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {@render inheritedIndicator(key)}
      </Label>
      <Tabs.Root
        value={formData[key] as string}
        onValueChange={(v) => {
          if (v) handleProviderChange(v)
        }}
        class="w-full"
      >
        <Tabs.List class="w-full grid grid-cols-4">
          {#each schema.options ?? [] as option (option.value)}
            <Tabs.Trigger value={option.value}>{option.label}</Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>
    {:else if schema.type === 'secret'}
      {@const validationStatus = getValidationStatus(key)}
      {@const isApiKeyField = key.endsWith('_api_key')}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {#if !isFieldRequired(schema)}
          <span class="text-xs text-(--text-muted) ml-1">(optional)</span>
        {/if}
        {@render inheritedIndicator(key)}
        <Button
          type="button"
          variant="link"
          class="h-auto p-0 text-xs ml-auto"
          onclick={() => toggleSecret(key)}
        >
          {showSecrets[key] ? 'Hide' : 'Show'}
        </Button>
      </Label>
      <div class="relative">
        <Input
          id={key}
          type={showSecrets[key] ? 'text' : 'password'}
          value={(formData[key] as string) ?? ''}
          oninput={(e) => (formData[key] = e.currentTarget.value)}
          placeholder={schema.placeholder ??
            `Enter ${schema.label.toLowerCase()}`}
          autocomplete="off"
          class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted) {isApiKeyField &&
          isElectron
            ? 'pr-10'
            : ''}"
        />
        {#if isApiKeyField && isElectron && formData[key]}
          <button
            type="button"
            onclick={() => validateKey(key)}
            disabled={validationStatus === 'validating'}
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-(--sidebar-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={validationStatus === 'valid'
              ? 'API key is valid'
              : validationStatus === 'invalid'
                ? apiKeyValidation[key]?.error
                : 'Validate API key'}
          >
            {#if validationStatus === 'validating'}
              <LoaderCircle class="size-4 text-(--text-muted) animate-spin" />
            {:else if validationStatus === 'valid'}
              <Check class="size-4 text-green-500" />
            {:else if validationStatus === 'invalid'}
              <Ban class="size-4 text-red-500" />
            {:else}
              <Check class="size-4 text-(--text-muted)" />
            {/if}
          </button>
        {/if}
      </div>
      {#if validationStatus === 'invalid' && apiKeyValidation[key]?.error}
        <p class="text-xs text-red-500 mt-1">{apiKeyValidation[key].error}</p>
      {/if}
    {:else if schema.type === 'string'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {#if !isFieldRequired(schema)}
          <span class="text-xs text-(--text-muted)">(optional)</span>
        {/if}
        {@render inheritedIndicator(key)}
      </Label>
      <Input
        id={key}
        type="text"
        value={(formData[key] as string) ?? ''}
        oninput={(e) => (formData[key] = e.currentTarget.value)}
        placeholder={schema.placeholder ?? ''}
        autocomplete="off"
        class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted)"
      />
      {#if schema.description}
        <p class="text-xs text-(--text-muted) mt-1">{schema.description}</p>
      {/if}
    {:else if schema.type === 'text'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {@render inheritedIndicator(key)}
      </Label>
      <textarea
        id={key}
        value={(formData[key] as string) ?? ''}
        oninput={(e) => (formData[key] = e.currentTarget.value)}
        placeholder={schema.placeholder ?? ''}
        rows={4}
        class="w-full px-3 py-2 rounded-md bg-(--input-bg) border border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted) resize-none"
      ></textarea>
      {#if schema.description}
        <p class="text-xs text-(--text-muted) mt-1">{schema.description}</p>
      {/if}
    {:else if schema.type === 'number'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {@render inheritedIndicator(key)}
      </Label>
      <Input
        id={key}
        type="number"
        value={(formData[key] as number) ?? 0}
        oninput={(e) => (formData[key] = parseInt(e.currentTarget.value) || 0)}
        min={schema.min}
        max={schema.max}
        class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
      />
      {#if schema.description}
        <p class="text-xs text-(--text-muted) mt-1">{schema.description}</p>
      {/if}
    {:else if schema.type === 'select'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {@render inheritedIndicator(key)}
      </Label>
      <Select.Root
        type="single"
        value={(formData[key] as string) ?? ''}
        onValueChange={(v) => (formData[key] = v)}
      >
        <Select.Trigger
          class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
        >
          {schema.options?.find((o) => o.value === formData[key])?.label ??
            'Select...'}
        </Select.Trigger>
        <Select.Content
          portalProps={{ disabled: true }}
          class="bg-(--main-bg) border-(--border-color)"
        >
          {#each schema.options ?? [] as option (option.value)}
            <Select.Item
              value={option.value}
              label={option.label}
              class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
            />
          {/each}
        </Select.Content>
      </Select.Root>
    {:else if schema.type === 'model_select'}
      {@const tier = schema.tier ?? 'default'}
      {@const models = getModelsForTier(tier)}
      {@const defaultModel = getDefaultModel(tier)}
      {@const hasApiKey = hasProviderApiKey()}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {@render inheritedIndicator(key)}
      </Label>
      {#if schema.description}
        <p class="text-xs text-(--text-muted) mb-2">{schema.description}</p>
      {/if}
      <Select.Root
        type="single"
        value={(formData[key] as string) ?? ''}
        onValueChange={(v) => (formData[key] = v || undefined)}
        disabled={!hasApiKey}
      >
        <Select.Trigger
          class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if hasApiKey}
            {(formData[key] as string) || `Default (${defaultModel})`}
          {:else}
            Enter API key to select model
          {/if}
        </Select.Trigger>
        <Select.Content
          portalProps={{ disabled: true }}
          side="top"
          avoidCollisions={true}
          class="bg-(--main-bg) border-(--border-color) max-h-60 overflow-y-auto"
        >
          <Select.Item
            value=""
            label={`Default (${defaultModel})`}
            class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
          />
          {#each models.slice(1) as model (model)}
            <Select.Item
              value={model}
              label={model}
              class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
            />
          {/each}
        </Select.Content>
      </Select.Root>
    {/if}
  </div>
{/snippet}
