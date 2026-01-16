<script lang="ts">
  import { onMount } from 'svelte'
  import * as Select from '$lib/components/ui/select'
  import * as Tabs from '$lib/components/ui/tabs'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { ChevronDown, ChevronRight } from '@lucide/svelte'
  import {
    fetchBotConfig,
    type BotConfig,
    type SettingSchema,
    type GroupDefinition,
  } from '../lib/config-client'
  import { SIMULATOR_SETTINGS_SCHEMA } from '../lib/simulator-settings'

  import type { Snippet } from 'svelte'

  interface Props {
    /** Initial form values */
    initialValues: Record<string, unknown>
    /** Bindable form data - updated as user edits */
    formData?: Record<string, unknown>
    /** Filter fields by scope: 'global', 'app', or 'all' (default) */
    filterScope?: 'global' | 'app' | 'all'
    /** Additional content to render inside the advanced group */
    advancedContent?: Snippet
  }

  let {
    initialValues,
    formData = $bindable({}),
    filterScope = 'all',
    advancedContent,
  }: Props = $props()

  let config: BotConfig | null = $state(null)
  let loading = $state(true)
  let showSecrets: Record<string, boolean> = $state({})
  let collapsedGroups: Record<string, boolean> = $state({})

  // Initialize form data once from initial values
  let initialized = false
  $effect.pre(() => {
    if (!initialized) {
      formData = { ...initialValues }
      initialized = true
    }
  })

  onMount(async () => {
    const botConfig = await fetchBotConfig()

    // Always include simulator settings, merged with bot config if available
    const simulatorSettings = SIMULATOR_SETTINGS_SCHEMA.settings as Record<
      string,
      SettingSchema
    >
    const simulatorGroups = SIMULATOR_SETTINGS_SCHEMA.groups as GroupDefinition[]

    if (botConfig) {
      // Merge bot config with simulator settings
      // Simulator settings come first (lower order), bot settings second
      const mergedSettings = {
        ...simulatorSettings,
        ...botConfig.schema.settings,
      }

      // Merge groups, avoiding duplicates (bot groups take precedence)
      const botGroupIds = new Set(botConfig.schema.groups.map((g) => g.id))
      const uniqueSimulatorGroups = simulatorGroups.filter(
        (g) => !botGroupIds.has(g.id)
      )
      const mergedGroups = [...uniqueSimulatorGroups, ...botConfig.schema.groups]

      config = {
        schema: {
          settings: mergedSettings,
          groups: mergedGroups,
          model_tiers: botConfig.schema.model_tiers,
        },
        values: botConfig.values,
      }
    } else {
      // No bot config - use simulator settings only
      config = {
        schema: {
          settings: simulatorSettings,
          groups: simulatorGroups,
          model_tiers: {},
        },
        values: {},
      }
    }

    // Merge config defaults with initial values
    for (const [key, _] of Object.entries(config.schema.settings)) {
      if (formData[key] === undefined && config.values[key] !== undefined) {
        formData[key] = config.values[key]
      }
    }

    // Initialize collapsed state from group definitions
    for (const group of config.schema.groups) {
      if (group.collapsed) {
        collapsedGroups[group.id] = true
      }
    }

    loading = false
  })

  // Get sorted groups
  function getSortedGroups(): GroupDefinition[] {
    if (!config) return []
    return [...config.schema.groups].sort((a, b) => a.order - b.order)
  }

  // Get fields for a group, filtered by scope
  // Global fields: ai_provider, *_api_key, and 'advanced' group
  // All other fields are app-scoped by default
  function getFieldsForGroup(groupId: string): [string, SettingSchema][] {
    if (!config) return []
    return Object.entries(config.schema.settings).filter(([key, schema]) => {
      const matchesGroup = schema.group === groupId
      // Determine field scope: global for provider/API keys/advanced, app for everything else
      const isGlobalField =
        key === 'ai_provider' ||
        key.endsWith('_api_key') ||
        schema.group === 'advanced'
      const fieldScope = schema.scope ?? (isGlobalField ? 'global' : 'app')
      const matchesScope =
        filterScope === 'all' || fieldScope === filterScope
      return matchesGroup && matchesScope
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
  function getModelsForTier(tier: string): string[] {
    if (!config) return []
    const provider = formData.ai_provider as string
    return config.schema.model_tiers[provider]?.[tier] ?? []
  }

  // Get default model for a tier (first in list)
  function getDefaultModel(tier: string): string {
    const models = getModelsForTier(tier)
    return models[0] ?? ''
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
</script>

{#if loading}
  <div class="p-8 text-center text-(--text-muted)">Loading configuration...</div>
{:else if !config}
  <div class="p-8 text-center text-(--text-muted)">
    <p class="mb-4">Could not load bot configuration.</p>
    <p class="text-sm">Make sure the bot is running in simulator mode.</p>
  </div>
{:else}
  {@const groupsWithVisibleFields = getSortedGroups().filter(g => {
    const fields = getFieldsForGroup(g.id)
    return fields.some(([_, schema]) => shouldShowField(schema))
  })}
  {#each groupsWithVisibleFields as group, visibleGroupIndex}
    {@const fields = getFieldsForGroup(group.id)}
    {@const visibleFields = fields.filter(([_, schema]) =>
      shouldShowField(schema)
    )}

    {#if visibleFields.length > 0}
      {#if visibleGroupIndex > 0}
        <div class="h-px bg-(--border-color) my-5"></div>
      {/if}

      {#if group.collapsed !== undefined}
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
  {#each fields as [key, schema]}
    {@render field(key, schema)}
  {/each}
{/snippet}

{#snippet field(key: string, schema: SettingSchema)}
  <div class="mb-4">
    {#if schema.type === 'select' && key === 'ai_provider'}
      <!-- Special handling for AI provider as tabs -->
      <Tabs.Root
        value={formData[key] as string}
        onValueChange={(v) => {
          if (v) handleProviderChange(v)
        }}
        class="w-full"
      >
        <Tabs.List class="w-full grid grid-cols-3">
          {#each schema.options ?? [] as option}
            <Tabs.Trigger value={option.value}>{option.label}</Tabs.Trigger>
          {/each}
        </Tabs.List>
      </Tabs.Root>
    {:else if schema.type === 'secret'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {#if !isFieldRequired(schema)}
          <span class="text-xs text-(--text-muted) ml-1">(optional)</span>
        {/if}
        <Button
          type="button"
          variant="link"
          class="h-auto p-0 text-xs ml-auto"
          onclick={() => toggleSecret(key)}
        >
          {showSecrets[key] ? 'Hide' : 'Show'}
        </Button>
      </Label>
      <Input
        id={key}
        type={showSecrets[key] ? 'text' : 'password'}
        value={(formData[key] as string) ?? ''}
        oninput={(e) => (formData[key] = e.currentTarget.value)}
        placeholder={schema.placeholder ?? `Enter ${schema.label.toLowerCase()}`}
        autocomplete="off"
        class="h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary) placeholder:text-(--text-muted)"
      />
    {:else if schema.type === 'string'}
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
        {#if !isFieldRequired(schema)}
          <span class="text-xs text-(--text-muted)">(optional)</span>
        {/if}
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
          {#each schema.options ?? [] as option}
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
      <Label for={key} class="mb-1.5 text-(--text-secondary)">
        {schema.label}
      </Label>
      {#if schema.description}
        <p class="text-xs text-(--text-muted) mb-2">{schema.description}</p>
      {/if}
      <Select.Root
        type="single"
        value={(formData[key] as string) ?? ''}
        onValueChange={(v) => (formData[key] = v || undefined)}
      >
        <Select.Trigger
          class="w-full h-10 bg-(--input-bg) border-(--input-border) text-(--text-primary)"
        >
          {(formData[key] as string) || `Default (${defaultModel})`}
        </Select.Trigger>
        <Select.Content
          portalProps={{ disabled: true }}
          class="bg-(--main-bg) border-(--border-color)"
        >
          <Select.Item
            value=""
            label={`Default (${defaultModel})`}
            class="text-(--text-primary) data-highlighted:bg-(--sidebar-hover)"
          />
          {#each models.slice(1) as model}
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
