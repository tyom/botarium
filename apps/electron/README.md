# Botarium Electron App

Desktop application that bundles the Slack emulator and optionally pre-compiled bots.

## Bot Configuration

Bots are configured in `bots.json`:

```json
{
  "bots": [
    "../../bot1",
    "../../bot2",
    { "source": "../../custom-bot", "name": "renamed", "entry": "src/main.ts" }
  ]
}
```

### Entry formats

**Simple** - just the path to bot directory:

```json
"../../my-bot"
```

The bot name is read from the bot's `config.yaml` (`simulator.id` field).

**Advanced** - object with overrides:

```json
{
  "source": "../../my-bot",
  "name": "custom-name", // optional - overrides simulator.id
  "entry": "src/custom.ts" // optional - defaults to src/app.ts
}
```

## Build Process

### Scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `bun run dev`     | Development mode with Vite hot reload   |
| `bun run build`   | Build everything (preload + bots + UI)  |
| `bun run package` | Build and package with electron-builder |

### How bot compilation works

1. `scripts/compile-bots.ts` reads `bots.json`
2. For each entry, resolves the bot name from `config.yaml` (or uses override)
3. Compiles each bot to a standalone binary in `dist/bots/{name}`
4. Generates `dist/bots/manifest.json` listing compiled bots

```
dist/bots/
├── manifest.json    # Generated manifest
├── my-bot           # Compiled binary
└── simple           # Compiled binary
```

### Manifest format

```json
{
  "bots": [{ "name": "bot1" }, { "name": "bot2" }]
}
```

## Runtime Modes

### Bundled bots (recommended for distribution)

When `dist/bots/manifest.json` exists, the app launches pre-compiled bot binaries. This is the mode used for packaged releases.

```
bun run build    # Compiles bots and generates manifest
bun run package  # Creates distributable app
```

### Discovery mode (development without bundled bots)

When no manifest exists, the app runs in discovery mode - it starts only the emulator and waits for external bots to connect. Useful for development when running bots separately.

```
# Terminal 1: Run Electron (no bots)
bun run dev

# Terminal 2: Run bot separately
cd ../my-bot && bun run dev
```

## Packaging

The packaged app includes:

- Electron runtime
- Preload script (`dist/preload.cjs`)
- UI (`dist/` from @botarium/ui)
- Slack emulator binary (`dist/slack-emulator`)
- Compiled bots and manifest (`dist/bots/`)

Configured in `package.json` under the `build` key (electron-builder config).
