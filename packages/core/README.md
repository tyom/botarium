# botarium

Core runtime, plugin system, and CLI for Botarium.

## Plugin System

Exports `createPluginRegistry()` and types for building platform plugins:

```ts
import { createPluginRegistry } from 'botarium'
import type { BotariumPlugin, Emulator } from 'botarium'
```

Each plugin provides an emulator factory (`createSlackEmulator`, etc.) that the core orchestrates.

## CLI

The `botarium` CLI (`bin/cli.ts`) provides three commands:

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `create`            | Scaffold a new bot (delegates to `create-botarium`) |
| `--platform <name>` | Start a platform emulator (e.g. `slack`)            |
| `package`           | Bundle bots into a distributable app                |

```sh
# From monorepo root
bun run cli create
bun run cli --platform slack
```
