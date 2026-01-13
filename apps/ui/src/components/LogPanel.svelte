<script lang="ts">
  import RhsPanel from './RhsPanel.svelte'
  import LogsContent from './LogsContent.svelte'
  import { clearLogs } from '../lib/logger.svelte'
  import { resetModuleFilters } from '../lib/log-filter-state.svelte'

  interface Props {
    onToggle?: () => void
  }

  let { onToggle }: Props = $props()

  function handleClearLogs() {
    clearLogs()
    resetModuleFilters()
  }

  const menuItems = [{ label: 'Clear logs', onClick: handleClearLogs }]
</script>

<RhsPanel title="Logs" {menuItems} onClose={() => onToggle?.()}>
  <LogsContent />
</RhsPanel>
