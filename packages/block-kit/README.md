# @botarium/block-kit

Lightweight factory functions for building Slack Block Kit JSON. Eliminates the verbosity of raw block objects while producing identical output.

## Usage

```ts
import { section, header, button, actions, options } from '@botarium/block-kit'
```

### Before (raw JSON)

```ts
{
  type: 'header',
  text: { type: 'plain_text', text: 'Status Update', emoji: true },
}
```

### After (block-kit)

```ts
header('Status Update')
```

## API

### Text Objects

```ts
plainText('Hello') // { type: 'plain_text', text: 'Hello', emoji: true }
mrkdwn('*bold*') // { type: 'mrkdwn', text: '*bold*' }
```

### Blocks

```ts
header('Title')
section('*Bold* mrkdwn text')
section('With accessory', { accessory: button('Click', 'action_id') })
sectionFields(['*Field 1*\nValue', '*Field 2*\nValue'])
divider()
actions([button('Go', 'go'), datePicker('pick_date')])
context(['Posted by *Bot*', image('https://...', 'avatar')])
input('Label', textInput('action_id'), { hint: 'Help text', optional: true })
imageBlock('https://...', 'alt text', { title: 'Caption' })
```

### Elements

```ts
button('Click Me', 'action_id', { style: 'primary', value: 'v1' })
image('https://...', 'alt text')
overflow(
  'action_id',
  options([
    ['Edit', 'edit'],
    ['Delete', 'delete'],
  ])
)
radioButtons(
  'action_id',
  options([
    ['Low', 'low'],
    ['High', 'high'],
  ])
)
checkboxes(
  'action_id',
  options([
    ['A', 'a'],
    ['B', 'b'],
  ])
)
datePicker('action_id', { initial_date: '2025-01-01' })
timePicker('action_id', { initial_time: '09:00' })
dateTimePicker('action_id')
```

### Input Elements

```ts
textInput('action_id', { placeholder: 'Type here...', multiline: true })
emailInput('action_id', { placeholder: 'name@example.com' })
urlInput('action_id', { placeholder: 'https://...' })
numberInput('action_id', { min_value: '1', max_value: '100' })
fileInput('action_id', { max_files: 3 })
```

### Select Menus

```ts
staticSelect(
  'action_id',
  options([
    ['A', 'a'],
    ['B', 'b'],
  ]),
  { placeholder: 'Pick one' }
)
multiStaticSelect(
  'action_id',
  options([
    ['A', 'a'],
    ['B', 'b'],
  ])
)
usersSelect('action_id')
multiUsersSelect('action_id')
conversationsSelect('action_id')
multiConversationsSelect('action_id')
channelsSelect('action_id')
multiChannelsSelect('action_id')
externalSelect('action_id')
multiExternalSelect('action_id')
```

### Composition

```ts
option('Label', 'value')
option('Label', 'value', { description: 'Extra info' })
options([
  ['Label A', 'a'],
  ['Label B', 'b'],
]) // shorthand for multiple options
confirmDialog({
  title: 'Sure?',
  text: 'This cannot be undone',
  confirm: 'Yes',
  deny: 'No',
})
```

### Rich Text

```ts
richTextBlock([
  richSection(['Hello, ', richText('world!', { bold: true })]),
  richPreformatted(['const x = 1']),
  richQuote(['Something wise']),
  richList('bullet', [richSection(['Item one']), richSection(['Item two'])]),
])

// Inline elements
richText('styled', { bold: true, italic: true })
richLink('https://example.com', 'click here')
richEmoji('wave')
richUserMention('U123')
richChannelMention('C123')
richBroadcast('here')
```

### Tables

```ts
// Simple table (first row auto-bolded as header)
simpleTable([
  ['Name', 'Role'],
  ['Alice', 'Engineer'],
  ['Bob', 'Designer'],
])

// Table with explicit cell styles and column settings
table(
  [
    [cell('Feature', { bold: true }), cell('Status', { bold: true })],
    [cell('Auth'), cell('Done', { italic: true })],
  ],
  { column_settings: [{ align: 'left' }, { align: 'center' }] }
)
```

### Surfaces (Modals & Home Tabs)

```ts
modal({
  title: 'My Modal',
  submit: 'Save',
  close: 'Cancel',
  callback_id: 'my_modal',
  blocks: [
    input('Name', textInput('name_input')),
    input(
      'Priority',
      staticSelect(
        'priority',
        options([
          ['Low', 'low'],
          ['High', 'high'],
        ])
      )
    ),
  ],
})

homeTab({
  blocks: [section('Welcome!')],
  callback_id: 'home',
})
```

## Design Principles

- **Zero dependencies** — pure TypeScript, no runtime deps
- **Structural compatibility** — output is plain JSON, works with `@slack/bolt`, `@slack/web-api`, or any HTTP client
- **String-first API** — pass strings where Slack expects text objects; they're auto-wrapped as `mrkdwn` (blocks) or `plain_text` (labels, buttons, placeholders)
- **Opt-in detail** — every function accepts an optional `opts` object for less common properties (`confirm`, `style`, `block_id`, etc.)
