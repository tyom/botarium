# create-botarium

CLI scaffolding tool for new Botarium Slack bots.

## Usage

```sh
bun run cli create
# or directly
bunx create-botarium
```

Prompts for bot name, template, AI provider, and database adapter, then generates a ready-to-run bot project.

## Options

- **Templates:** `slack-bot` (Slack Bolt SDK, Pino logging, Zod validation)
- **AI providers:** OpenAI, Anthropic, Google, OpenRouter (via AI SDK)
- **Database adapters:** None, SQLite, Postgres (via Drizzle ORM)

Generated bots include optional AI memory features for persistent conversation context.
