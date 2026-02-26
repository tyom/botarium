# @botarium/slack-emulator

Slack API emulator for Botarium. Emulates the Slack API locally so bots can be developed and tested without a real Slack workspace.

## What It Emulates

- Slack Web API endpoints (chat.postMessage, views.open, etc.)
- Socket Mode WebSocket connections
- SSE streams for real-time events and logs
- Message persistence with optional database backing
- Modal interactions, slash commands, file uploads

## Usage

```sh
bun run apps/slack-emulator/src/server/index.ts
```

Starts an HTTP + WebSocket server on the default port (7557).
