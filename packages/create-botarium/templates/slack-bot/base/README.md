# {{ botName }} Slack Bot

A Slack bot.

## Quick Start

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure environment:

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. Run the bot:
   ```bash
   bun run dev
   ```

## Configuration

### Required Environment Variables

- `SLACK_BOT_TOKEN` - Bot token (xoxb-...)
- `SLACK_APP_TOKEN` - App token (xapp-...)
- `SLACK_SIGNING_SECRET` - Signing secret from Slack app settings

### Optional Configuration

- `BOT_NAME` - Display name for the bot (default: {{ botName }})
- `BOT_PERSONALITY` - Bot personality description
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `PORT` - Server port (default: 3000)
- **Thread Tracking** - Automatically continues conversations in threads

## Development

```bash
# Run in development mode (with hot reload)
bun run dev

# Type check
bun run typecheck
```
