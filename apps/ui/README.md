# @botarium/ui

Svelte 5 web interface for the Botarium chat simulator.

## What It Does

- Chat interface with message input, command autocomplete, and thread support
- Real-time log panel with filtering by module and level
- Slack Block Kit renderer for modals and rich messages
- Resizable panel layout (Paneforge)
- Bot-specific settings UI
- Centralized state management for messages, bots, settings, and UI

## Stack

Svelte 5, Vite, Tailwind CSS, Bits UI, Paneforge

## Development

```sh
# Standalone (opens in browser)
bun run dev

# As part of the Electron app (from monorepo root)
bun run dev:electron
```
