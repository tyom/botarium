# @botarium/cli

Interactive CLI for scaffolding new Botarium bot projects.

## Installation

```bash
bun add @botarium/cli
```

## Usage

```sh
# Interactive mode — prompts for all options
npx botarium create my-bot

# With flags
npx botarium create my-bot -t slack --provider anthropic --observability --resilience
```

### Commands

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `create <name>`     | Scaffold a new bot project interactively |
| `--platform <name>` | Start a platform emulator (e.g. `slack`) |
| `package`           | Bundle bot into a distributable app      |

### Create Options

| Flag              | Description                                    |
| ----------------- | ---------------------------------------------- |
| `--template, -t`  | Bot template (`slack`)                         |
| `--provider`      | AI provider: `openai`, `anthropic`, `google`   |
| `--database`      | Database adapter: `none`, `sqlite`, `postgres` |
| `--observability` | Enable tracing, metrics, and health endpoint   |
| `--resilience`    | Enable circuit breakers and error boundaries   |
| `--port`          | Port to run emulator on                        |

## API

The CLI can also be used programmatically:

```typescript
import { createBot } from '@botarium/cli'

await createBot({
  name: 'my-bot',
  template: 'slack',
  useAi: true,
  database: 'sqlite',
  useObservability: true,
  useResilience: false,
  skipInstall: true,
})
```

### Interactive Prompts

When options are not provided via flags, `createBot()` prompts for:

1. Bot name
2. Template (Slack)
3. Production features (observability, resilience)
4. AI enablement and memory (SQLite or none)
5. Directory overwrite confirmation (if target exists)
