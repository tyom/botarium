# Showcase Bot

A Slack bot that populates a channel with [Block Kit](https://api.slack.com/block-kit) examples and echoes back interactive element payloads. Built with [@slack/bolt](https://slack.dev/bolt-js/) and [Bun](https://bun.sh).

## How it works

On startup (in simulator mode), the bot automatically posts a series of Block Kit messages to the `#showcase` channel. These messages demonstrate various block types and interactive elements. When a user interacts with any element, the bot responds with the raw action payload so you can inspect exactly what Slack sends.

### Block Kit samples

Message definitions live in `src/messages/blocks/` as numbered JSON files, loaded and posted in order:

| #   | File                         | What it shows                                            |
| --- | ---------------------------- | -------------------------------------------------------- |
| 01  | `text-and-layout.json`       | Headers, sections, dividers, context, images             |
| 02  | `button-variations.json`     | Primary, danger, and default buttons                     |
| 03  | `selection-elements.json`    | Static selects, multi-selects, overflow menus            |
| 04  | `radio-and-checkboxes.json`  | Radio buttons and checkbox groups                        |
| 05  | `date-and-time-pickers.json` | Date pickers, time pickers, datetime pickers             |
| 06  | `section-accessories.json`   | Buttons, selects, and overflows as section accessories   |
| 07  | `combined-actions.json`      | Multiple interactive elements in a single actions block  |
| 08  | `rich-text.json`             | Rich text with formatting, lists, quotes, code blocks    |
| 09  | `template-newsletter.json`   | A realistic newsletter-style message template            |
| 10  | `kitchen-sink.json`          | Mixed rich text, actions, selects, and feedback elements |

JSON files support template variables (`{{TODAY_DATE}}`, `{{TODAY_NOON_UNIX}}`) that are resolved at load time.

You can try pasting examples from Slack's [Block Kit Builder](https://app.slack.com/block-kit-builder) to show them in the emulator.

### Action responses

All interactive elements use action IDs prefixed with `showcase_`. A single catch-all handler matches this prefix:

```js
app.action(/^showcase_/, ...)
```

When triggered, the handler acknowledges the action and posts a reply containing the action type, action ID, and the full JSON payload. This makes it easy to see exactly what data each interactive element produces.

Modal submissions (callback ID `showcase_modal`) are handled the same way -- the bot posts the `view.state.values` back to the channel.

### Slash command

The bot registers a `/showcase` command with the following subcommands:

| Subcommand | Description                                              |
| ---------- | -------------------------------------------------------- |
| `generate` | Clear and re-populate `#showcase` with all block samples |
| `clear`    | Remove all messages from `#showcase`                     |
| `modal`    | Open a modal with various input elements                 |
| `help`     | Show available subcommands                               |

## Running

```sh
# With the Botarium simulator
bun run dev:local

# With real Slack credentials
SLACK_BOT_TOKEN=xoxb-... SLACK_APP_TOKEN=xapp-... bun run dev
```

### Environment variables

| Variable               | Required         | Description                                                     |
| ---------------------- | ---------------- | --------------------------------------------------------------- |
| `SLACK_BOT_TOKEN`      | Yes (production) | Bot user OAuth token                                            |
| `SLACK_APP_TOKEN`      | Yes (production) | App-level token for Socket Mode                                 |
| `SLACK_SIGNING_SECRET` | Yes (production) | Signing secret for request verification                         |
| `SLACK_API_URL`        | No               | Set automatically in simulator mode                             |
| `BOT_NAME`             | No               | Display name (default: `Showcase Bot`)                          |
| `PORT`                 | No               | Server port (default: `3000`)                                   |
| `LOG_LEVEL`            | No               | `silent`, `debug`, `info`, `warn`, or `error` (default: `info`) |

In simulator mode, token and secret values are generated automatically.

## Project structure

```text
src/
  app.ts                          # Entry point, Bolt app setup, startup sequence
  settings.ts                     # Environment variable validation (zod)
  config/
    loader.ts                     # Bot configuration loader
    http-server.ts                # Config server for simulator registration
  listeners/
    index.ts                      # Registers commands and actions
    commands/showcase.ts          # /showcase command and message posting
    actions/showcase-actions.ts   # block_actions and view_submission handlers
  messages/
    showcase-messages.ts          # Loads and templates block JSON files
    blocks/*.json                 # Block Kit message definitions
  utils/
    logger.ts                     # Pino logger setup
```
