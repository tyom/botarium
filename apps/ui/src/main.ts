/**
 * Main entry point for the Botarium web app
 * Connects to the emulator server
 */

import { mount } from 'svelte'
import App from './components/App.svelte'
import { setupLogCapture } from './lib/logger.svelte'
import { createMockApp, type MockApp } from './lib/dispatcher.svelte'
import { initFromHash, parseHash, simulatorState } from './lib/state.svelte'
import { appLogger } from './lib/logger'
import { EMULATOR_API_URL } from './lib/emulator-config'

// Setup log capture before anything else
setupLogCapture()

function initializeSimulator(): MockApp {
  const app = createMockApp()
  appLogger.info(`Botarium initialized (connecting to ${EMULATOR_API_URL})`)
  return app
}

async function main() {
  try {
    const mockApp = initializeSimulator()

    // Initialize channel and thread from URL hash before mounting
    initFromHash()

    mount(App, {
      target: document.getElementById('app')!,
      props: { mockApp },
    })

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1)
      const { channelId, threadTs } = parseHash(hash)
      if (channelId) {
        simulatorState.currentChannel = channelId
        simulatorState.isDM = channelId.startsWith('D')
        simulatorState.currentThreadTs = threadTs
      }
    })

    appLogger.info('Botarium ready. Use Ctrl+L to toggle logs.')
  } catch (error) {
    appLogger.error('Failed to initialize:', error)
  }
}

main()
