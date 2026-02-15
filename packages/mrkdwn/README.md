# @botarium/mrkdwn

Text conversion utilities for Slack bots. Handles two directions:

- **Slack mrkdwn → HTML** — render mrkdwn in the Botarium UI
- **Markdown → Slack mrkdwn** — convert LLM output before sending to Slack

## Usage

```ts
import { mrkdwnToHtml, markdownToMrkdwn } from '@botarium/mrkdwn'
```

### mrkdwnToHtml

Converts Slack mrkdwn text to HTML. Handles bold, italic, strikethrough, code (inline and blocks), links, user/channel mentions, blockquotes, lists, and emoji shortcodes.

```ts
mrkdwnToHtml('*bold* and _italic_')
// → '<strong>bold</strong> and <em>italic</em>'

mrkdwnToHtml('<https://example.com|Click here>')
// → '<a href="https://example.com" target="_blank">Click here</a>'

mrkdwnToHtml('<@U123>')
// → '<span class="s-mention">@U123</span>'
```

Used internally by the Botarium UI to render message text and Block Kit text objects.

### markdownToMrkdwn

Converts standard Markdown (as output by LLMs) to Slack mrkdwn format. Uses `marked` for parsing.

```ts
markdownToMrkdwn('**bold** and *italic*')
// → '*bold* and _italic_'

markdownToMrkdwn('[Click here](https://example.com)')
// → '<https://example.com|Click here>'

markdownToMrkdwn('# Heading')
// → '*Heading*'
```

Supports: headings (→ bold), lists (nested, ordered, task lists), code blocks (language tags stripped), tables (→ code block), blockquotes, links, images (→ link), horizontal rules.

Use this in bot code to convert LLM responses before sending to Slack:

```ts
import { markdownToMrkdwn } from '@botarium/mrkdwn'

app.message(async ({ say }) => {
  const llmResponse = await generateResponse(prompt)
  await say(markdownToMrkdwn(llmResponse))
})
```
