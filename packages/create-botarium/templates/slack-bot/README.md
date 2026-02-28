# {{botName}} Slack Bot

A Slack bot{{#if isAi}} powered by AI{{/if}}{{#if isDb}} with memory and preference support{{/if}}.

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
{{~#if isOpenai}}
- `OPENAI_API_KEY` - OpenAI API key
{{~/if}}
{{~#if isAnthropic}}
- `ANTHROPIC_API_KEY` - Anthropic API key
{{~/if}}
{{~#if isGoogle}}
- `GOOGLE_API_KEY` - Google AI API key
{{~/if}}
{{~#if isPostgres}}
- `DATABASE_URL` - PostgreSQL connection string
{{~/if}}

### Optional Configuration

- `BOT_NAME` - Display name for the bot (default: {{botName}})
- `BOT_PERSONALITY` - Bot personality description
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `PORT` - Server port (default: 3000)
{{~#if isSqlite}}
- `DATA_DIR` - Directory for SQLite database (default: ./data)
{{~/if}}
{{~#if isAi}}

## Features

- **AI Conversations** - Natural language chat powered by {{aiProvider}}
{{~/if}}
{{~#if isDb}}
- **Memory** - Stores facts, preferences, and context across conversations
- **Preferences** - Per-user response style, language, and timezone settings
{{~/if}}
- **Thread Tracking** - Automatically continues conversations in threads
{{~#if isAi}}

## Extending the Bot

### Adding New Tools

Create a new file in `src/ai/tools/`:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const myTools = {
  myTool: tool({
    description: 'What this tool does',
    inputSchema: z.object({
      // Define input schema
    }),
    execute: async (input) => {
      // Implementation
    },
  }),
}
```

Then add the tools to the general agent in `src/ai/agents/general.ts`:

```typescript
import { myTools } from '../tools/my-tools'

export const generalAgent = createAgent({
  name: 'General',
  tools: { ...memoryTools, ...myTools },
  // ...
})
```

### Adding New Agents

Create specialized agents in `src/ai/agents/`:

```typescript
import { createAgent, buildBaseGuidelines } from './base'

export const myAgent = createAgent({
  name: 'MyAgent',
  tools: { ...myTools },
  systemPromptBuilder: (context, preferences) => {
    return `${buildBaseGuidelines(context, preferences)}
- Specialized instructions here`
  },
})
```
{{~/if}}
{{~#if isDb}}

## Database
{{~#if isSqlite}}

This bot uses SQLite for data storage. The database is automatically created in the `DATA_DIR` directory.
{{~/if}}
{{~#if isPostgres}}

This bot uses PostgreSQL for data storage. Make sure to set the `DATABASE_URL` environment variable.
{{~/if}}

### Migrations

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio
```
{{~/if}}

## Development

```bash
# Run in development mode (with hot reload)
bun run dev

# Type check
bun run typecheck
```
