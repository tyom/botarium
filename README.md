# Botarium

A local Slack bot development simulator. Build, test, and debug Slack bots without deploying to production.

Botarium provides a Slack API emulator, a desktop chat UI, and scaffolding tools so you can develop bots entirely on your machine.

## Architecture

This is a Bun monorepo with two apps and three packages:

```
apps/
  electron/   - Desktop app (Electron) — bundles the emulator, bots, and UI
  ui/         - Chat interface (Svelte 5, Tailwind CSS)

packages/
  core/       - Runtime, plugin system, and CLI entry point
  slack/      - Slack API emulator (HTTP + WebSocket server)
  create-bot/ - Bot scaffolding CLI (create-botarium)
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0

### Setup

```sh
# Install dependencies
bun install

# Start the dev environment (UI + Electron)
bun run dev:electron
```

### Create a Bot

```sh
bun run cli create
```

This walks you through setting up a new bot with options for AI provider (OpenAI, Anthropic, Google, OpenRouter), database adapter (SQLite, Postgres), and template.

### Scripts

| Command                | Description               |
| ---------------------- | ------------------------- |
| `bun run dev`          | Start the web UI          |
| `bun run dev:electron` | Start the desktop app     |
| `bun run cli create`   | Scaffold a new bot        |
| `bun run build`        | Build all packages        |
| `bun run package`      | Package the Electron app  |
| `bun run test`         | Run tests                 |
| `bun run check`        | Typecheck + format + lint |

## Configuration

Copy `.env.example` to `.env` and adjust values. See `.env.example` for all available options including data directory, logging, emulator port, and Electron settings.

## License

MIT
