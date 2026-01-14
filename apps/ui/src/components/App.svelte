<script lang="ts">
  import { Pane, PaneGroup, PaneResizer } from 'paneforge'
  import { backendState } from '../lib/backend-state.svelte'
  import type { MockApp } from '../lib/dispatcher.svelte'
  import {
    loadMessages,
    sendMessage,
    loadCommands,
    loadAppConfig,
    loadConnectedBots,
  } from '../lib/dispatcher.svelte'
  import { isElectron, getElectronAPI } from '../lib/electron-api'
  import {
    createKeydownHandler,
    type KeyboardShortcut,
  } from '../lib/keyboard-shortcuts'
  import { clearLogs } from '../lib/logger.svelte'
  import { resetModuleFilters } from '../lib/log-filter-state.svelte'
  import {
    closeThread,
    openThread,
    restoreMessages,
    simulatorState,
  } from '../lib/state.svelte'
  import { CHANNELS } from '../lib/types'
  import InputBar from './InputBar.svelte'
  import LoadingSpinner from './LoadingSpinner.svelte'
  import LogPanel from './LogPanel.svelte'
  import LogsContent from './LogsContent.svelte'
  import MessagePanel from './MessagePanel.svelte'
  import RhsPanel from './RhsPanel.svelte'
  import Settings from './Settings.svelte'
  import AppSettings from './AppSettings.svelte'
  import Sidebar from './Sidebar.svelte'
  import ThreadPanel from './ThreadPanel.svelte'
  import ModalOverlay from './ModalOverlay.svelte'
  import ImagePreviewModal from './ImagePreviewModal.svelte'

  interface Props {
    mockApp: MockApp
  }

  let { mockApp }: Props = $props()

  let logPanelVisible = $state(false)
  let rhsTab = $state<'thread' | 'logs'>('thread')
  let mainInputValue = $state('')
  let previewImage = $state<{ url: string; alt: string } | null>(null)

  // Derive active thread from centralized state (synced with URL)
  let activeThreadTs = $derived(simulatorState.currentThreadTs)

  // Check if input should be disabled (bot DM channel and all bots disconnected)
  let isBotInputDisabled = $derived(() => {
    const currentChannel = CHANNELS.find(
      (c) => c.id === simulatorState.currentChannel
    )
    if (currentChannel?.type !== 'dm') return false
    return (
      simulatorState.connectedBots.size > 0 &&
      Array.from(simulatorState.connectedBots.values()).every(
        (bot) => bot.status === 'disconnected'
      )
    )
  })

  const rhsTabs = [
    { id: 'thread', label: 'Thread' },
    { id: 'logs', label: 'Logs' },
  ]

  function handleClearLogs() {
    clearLogs()
    resetModuleFilters()
  }

  const logsMenuItems = [{ label: 'Clear logs', onClick: handleClearLogs }]

  // Initialize backend state on mount
  $effect(() => {
    backendState.initialize(loadStoredMessages)
  })

  // Reset to thread tab when opening a new thread
  $effect(() => {
    if (activeThreadTs) {
      rhsTab = 'thread'
    }
  })

  // Listen for menu-triggered logs panel toggle (Electron only)
  $effect(() => {
    if (!isElectron) return
    const api = getElectronAPI()
    if (!api) return

    const unsubscribe = api.onToggleLogsPanel(() => {
      toggleLogsPanel()
    })

    return unsubscribe
  })

  function toggleLogsPanel() {
    if (activeThreadTs) {
      // Thread is open - toggle between thread and logs tabs
      rhsTab = rhsTab === 'logs' ? 'thread' : 'logs'
    } else {
      // No thread - toggle logs panel visibility
      logPanelVisible = !logPanelVisible
    }
  }

  // Sync logs panel state to menu (Electron only)
  // Checkmark shows when logs are visible (either as panel or as active tab)
  $effect(() => {
    if (!isElectron) return
    const api = getElectronAPI()
    if (!api) return

    const logsVisible = activeThreadTs ? rhsTab === 'logs' : logPanelVisible
    api.notifyLogsPanelState(logsVisible)
  })

  async function loadStoredMessages() {
    const messages = await loadMessages()
    if (messages.length > 0) {
      restoreMessages(messages)
    }
    simulatorState.messagesLoaded = true

    // Load available slash commands, app config, and connected bots from emulator
    // These will be populated after bot registers them
    await Promise.all([loadCommands(), loadAppConfig(), loadConnectedBots()])
  }

  async function handleSend(text: string) {
    await sendMessage(mockApp, text)
  }

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Escape',
      when: () => activeThreadTs !== null,
      action: closeThread,
    },
    // In Electron, the menu accelerator handles Cmd/Ctrl+L
    // This shortcut is for web mode only
    {
      key: 'l',
      ctrl: true,
      when: () => !isElectron,
      action: toggleLogsPanel,
    },
    {
      key: ',',
      ctrl: true,
      action: () => {
        backendState.openSettings()
      },
    },
  ]

  const handleKeyDown = createKeydownHandler(shortcuts)

  function handleOpenThread(ts: string) {
    openThread(ts)
  }

  function handleCloseRhsPanel() {
    closeThread()
    logPanelVisible = false
  }

  function handleRhsTabChange(tabId: string) {
    rhsTab = tabId as 'thread' | 'logs'
  }

  function handleImagePreview(url: string, alt: string) {
    previewImage = { url, alt }
  }

  function handleCloseImagePreview() {
    previewImage = null
  }

  // Determine if side panel is visible (thread or logs)
  let sidePanelVisible = $derived(activeThreadTs !== null || logPanelVisible)
</script>

{#snippet mainContent(logsHidden: boolean)}
  <main class="flex flex-col h-full min-w-0 overflow-hidden flex-1">
    <MessagePanel
      {logsHidden}
      {activeThreadTs}
      onShowLogs={() => (logPanelVisible = true)}
      onOpenThread={handleOpenThread}
      onImagePreview={handleImagePreview}
    />
    <InputBar
      onSend={handleSend}
      disabled={backendState.isInputDisabled || isBotInputDisabled()}
      bind:value={mainInputValue}
    />
  </main>
{/snippet}

<svelte:window onkeydown={handleKeyDown} />

{#if !backendState.settingsLoaded && isElectron}
  <LoadingSpinner delay={1000} />
{:else if backendState.showSettings && !backendState.hasApiKey}
  <!-- Initial setup: full-screen settings (no modal) -->
  <Settings
    settings={backendState.effectiveSettings}
    onSave={backendState.saveSettings}
    onCancel={backendState.closeSettings}
    showCancel={false}
    isModal={false}
  />
{:else if backendState.shouldShowApp}
  {#if backendState.backendError}
    <div
      class="fixed inset-x-0 top-0 px-4 py-2 bg-log-error text-white flex items-center justify-center gap-3 z-1000 text-[13px]"
    >
      <span>Backend error: {backendState.backendError}</span>
      <button
        class="bg-white/20 border border-white/30 text-white px-3 py-1 rounded cursor-pointer text-xs hover:bg-white/30"
        onclick={backendState.openSettings}
      >
        Open Settings
      </button>
    </div>
  {/if}

  <div class="app flex h-screen bg-slack-bg text-slack-text">
    <Sidebar
      onOpenSettings={backendState.openSettings}
      onOpenAppSettings={backendState.openAppSettings}
    />

    {#if sidePanelVisible}
      <PaneGroup
        direction="horizontal"
        autoSaveId="simulator-layout"
        class="flex-1 min-w-0"
      >
        <Pane defaultSize={60} minSize={30}>
          {@render mainContent(false)}
        </Pane>
        <PaneResizer class="pane-resizer" />
        <Pane defaultSize={40} minSize={20} maxSize={60}>
          {#if activeThreadTs}
            <RhsPanel
              tabs={rhsTabs}
              activeTab={rhsTab}
              onTabChange={handleRhsTabChange}
              menuItems={rhsTab === 'logs' ? logsMenuItems : []}
              onClose={handleCloseRhsPanel}
            >
              {#if rhsTab === 'thread'}
                <ThreadPanel
                  threadTs={activeThreadTs}
                  {mockApp}
                  onImagePreview={handleImagePreview}
                />
              {:else}
                <LogsContent />
              {/if}
            </RhsPanel>
          {:else}
            <LogPanel onToggle={() => (logPanelVisible = false)} />
          {/if}
        </Pane>
      </PaneGroup>
    {:else}
      {@render mainContent(true)}
    {/if}
  </div>
{/if}

<!-- Settings modal (always mounted, controlled via open prop) -->
<Settings
  settings={backendState.effectiveSettings}
  onSave={backendState.saveSettings}
  onCancel={backendState.closeSettings}
  showCancel={true}
  isModal={true}
  open={backendState.showSettings && backendState.hasApiKey}
/>

<!-- App Settings modal -->
{#if backendState.showAppSettings}
  <AppSettings
    appId={backendState.showAppSettings.appId}
    appName={backendState.showAppSettings.appName}
    globalSettings={backendState.effectiveSettings}
    appSettings={backendState.getAppSettings(backendState.showAppSettings.appId)}
    onSave={(settings) => backendState.saveAppSettings(backendState.showAppSettings!.appId, settings)}
    onCancel={backendState.closeAppSettings}
    open={true}
  />
{/if}

<!-- Modal overlay for slash command modals -->
<ModalOverlay />

<!-- Image preview modal -->
{#if previewImage}
  <ImagePreviewModal
    imageUrl={previewImage.url}
    imageAlt={previewImage.alt}
    onClose={handleCloseImagePreview}
  />
{/if}

<style lang="postcss">
  @reference '../app.css';

  /* Pane resizer styling - requires :global for attribute selectors */
  .app :global([data-pane-resizer]) {
    @apply w-[3px] -mx-0.5 z-10 relative bg-transparent cursor-col-resize transition-colors duration-150;
  }

  .app :global([data-pane-resizer]:hover),
  .app :global([data-pane-resizer][data-active]) {
    @apply bg-slack-accent;
  }
</style>
