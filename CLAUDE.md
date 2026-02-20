# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Botarium

Botarium is a local Slack bot development simulator. Build, test, and debug Slack bots entirely on your machine without deploying to real Slack.

- Emulator app that runs in the browser or as a native desktop app (Electron)
- CLI tools to scaffold bots from scratch
- Development tools: persistence layer, Slack mrkdwn converter, and AI integration

## Commands

```sh
bun run dev              # Start web UI dev server (Vite, port 5173)
bun run dev:electron     # Start desktop app (Electron + Vite + emulator)
bun run build            # Build all packages and apps
bun run test             # Run all tests (bun test)
bun test <file>          # Run a single test file
bun run check            # typecheck + format:check + lint (CI runs this)
bun run typecheck        # TypeScript check across all workspaces
bun run lint             # ESLint
bun run format           # Prettier (write)
bun run cli create       # Scaffold a new bot interactively
```

Run the emulator standalone: `bun run packages/slack/src/server/index.ts`

## Architecture

Bun monorepo with workspaces in `apps/` and `packages/`.

### Packages

- **`packages/core`** — Plugin system and CLI entry point. Defines the `BotariumPlugin` interface that platform plugins implement (`createEmulator`, `defaultPort`, `envVarName`). Currently, only Slack is implemented, but the design supports adding other platforms.
- **`packages/slack`** — Slack API emulator. A Bun HTTP + WebSocket server that implements Slack Web API endpoints, Socket Mode protocol, SSE event broadcasting to the frontend, and optional SQLite persistence. Key files: `server/state.ts` (in-memory state), `server/web-api.ts` (API handlers), `server/socket-mode.ts` (WebSocket protocol), `server/persistence.ts` (SQLite).
- **`packages/mrkdwn`** — Bidirectional converters: Slack mrkdwn to HTML (for rendering in UI) and Markdown to mrkdwn (for AI responses). Uses `marked` for Markdown parsing.
- **`packages/create-bot`** — CLI tool (`create-botarium`) that scaffolds new bots via Handlebars templates in `templates/`.

### Apps

- **`apps/ui`** — Svelte 5 + Tailwind CSS 4 chat interface. Uses Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactivity. Key state files: `lib/state.svelte.ts` (reactive UI state), `lib/dispatcher.svelte.ts` (SSE connection to emulator, API calls), `lib/backend-state.svelte.ts` (Electron IPC bridge). Uses `$lib` path alias for `src/lib/`.
- **`apps/electron`** — Desktop wrapper. Manages emulator and bot child processes, provides IPC for settings (encrypted via OS keychain), and bundles everything into a native app.

### Data Flow

1. User types in UI → HTTP POST to emulator `/api/simulator/user-message`
2. Emulator creates Slack event → sends via WebSocket (Socket Mode) to connected bot
3. Bot processes event → calls Slack Web API endpoints (e.g., `chat.postMessage`) on the emulator
4. Emulator broadcasts SSE event → UI updates reactively

## Code Style

- No semicolons, single quotes, trailing commas (es5) — enforced by Prettier
- `{@html}` is intentionally used in Svelte for mrkdwn rendering (ESLint rule disabled)
- Prefix unused variables with `_`
- Svelte components use runes (`$state`, `$derived`, `$effect`), not legacy stores
- TypeScript strict mode with `noUncheckedIndexedAccess`

## Testing

Tests use Bun's built-in test runner (`bun:test`). Test files are colocated with source as `*.test.ts`. Main test areas:

- `packages/mrkdwn/src/` — mrkdwn/HTML conversion tests
- `packages/create-bot/src/` — scaffold and template utility tests
- `apps/ui/src/lib/` — UI state tests
