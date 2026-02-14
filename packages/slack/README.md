# @botarium/slack

Slack platform plugin for Botarium. Emulates the Slack API locally so bots can be developed and tested without a real Slack workspace.

## What It Emulates

- Slack Web API endpoints (chat.postMessage, views.open, etc.)
- Socket Mode WebSocket connections
- SSE streams for real-time events and logs
- Message persistence with optional database backing
- Modal interactions, slash commands, file uploads

## Usage

```ts
import { slackPlugin } from '@botarium/slack'
```

The plugin exports `createSlackEmulator()` which starts an HTTP + WebSocket server (default port 7557).

## Standalone

```sh
bun run emulator
```
