# Slack Features Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to implement all remaining Slack features in the Botarium simulator, along with testing strategies to ensure reliability.

---

## Part 1: Current Implementation Analysis

### What's Already Working

#### Events API
| Event | Status | Notes |
|-------|--------|-------|
| `message` | ✅ Complete | Messages in channels and DMs |
| `app_mention` | ✅ Complete | Bot mention detection |
| `file_shared` | ✅ Complete | File upload notifications |
| `reaction_added` / `reaction_removed` | ✅ Complete | Via SSE events |

#### Web API Methods (24 methods)
| Method | Status | Notes |
|--------|--------|-------|
| `auth.test` | ✅ Complete | Bot identity verification |
| `chat.postMessage` | ✅ Complete | Send messages |
| `chat.update` | ✅ Complete | Edit messages |
| `reactions.add` / `reactions.remove` | ✅ Complete | Add/remove reactions |
| `conversations.history` | ✅ Complete | Fetch channel messages |
| `conversations.replies` | ✅ Complete | Fetch thread replies |
| `users.info` | ✅ Complete | Get user details |
| `apps.connections.open` | ✅ Complete | Socket Mode connection |
| `views.open` / `views.update` / `views.push` | ✅ Complete | Modal management |
| `files.uploadV2` | ✅ Complete | File upload |
| `files.getUploadURLExternal` | ✅ Complete | Two-stage upload |
| `files.completeUploadExternal` | ✅ Complete | Complete upload |
| `files.info` | ✅ Complete | File metadata |

#### BlockKit Components
**Blocks Implemented:**
- `section` - Text with optional accessory
- `input` - Form inputs with labels
- `actions` - Interactive elements row
- `divider` - Horizontal rule
- `context` - Small contextual text/images
- `image` - Full-width image
- `header` - Large text header

**Elements Implemented:**
- `button` - Clickable button with styles
- `static_select` - Dropdown menu
- `plain_text_input` - Text field (single/multiline)
- `file_input` - File upload control
- `checkboxes` - Multiple selection boxes
- `image` - Image element

#### Interactive Components
- `view_submission` - Modal form submission
- `view_closed` - Modal close notification
- `block_actions` - Button/select interactions
- `slash_commands` - Slash command execution
- `shortcut` (message) - Message context menu actions

---

## Part 2: Missing Features & Implementation Plan

### Priority 1: Core Interactions (High Impact)

#### 1.1 Message Actions (Inline Block Actions)
**Why:** Essential for interactive messages with buttons in the channel.

**Current Gap:** Buttons in messages only work in modals, not in channel messages.

**Implementation:**
```
packages/slack/src/server/
├── web-api.ts         # Add blocks support to chat.postMessage
└── socket-mode.ts     # Add message_action event dispatch

apps/ui/src/
├── components/Message.svelte           # Render blocks in messages
└── components/blockkit/MessageBlocks.svelte  # New: Message-specific renderer
```

**API Changes:**
- `chat.postMessage` - Accept `blocks` parameter
- `POST /api/simulator/message-action` - New endpoint for message button clicks

**Test Scenarios:**
1. Bot posts message with buttons → User clicks button → Bot receives action
2. Bot posts message with select menu → User selects option → Bot receives action
3. Message actions update the original message

---

#### 1.2 Home Tab (App Home)
**Why:** Many bots use the Home tab as their primary interface.

**Current Gap:** No Home tab surface or `views.publish` support.

**Implementation:**
```
packages/slack/src/server/
├── web-api.ts         # Add views.publish handler
├── state.ts           # Add home view storage per user
└── types.ts           # Add home-related types

apps/ui/src/
├── components/AppHome.svelte      # New: Home tab view
├── components/Sidebar.svelte      # Add Home tab navigation
└── lib/dispatcher.svelte.ts       # Add home view loading
```

**API Changes:**
- `views.publish` - Publish home tab view
- `app_home_opened` event - When user opens Home tab

**Test Scenarios:**
1. User opens Home tab → Bot receives `app_home_opened` → Bot publishes view
2. Bot updates home view → UI reflects changes
3. Interactive elements in home view work correctly

---

#### 1.3 Ephemeral Messages
**Why:** Important for user feedback without cluttering the channel.

**Current Gap:** No support for user-specific temporary messages.

**Implementation:**
```
packages/slack/src/server/
├── web-api.ts         # Add chat.postEphemeral handler
├── state.ts           # Add ephemeral message storage

apps/ui/src/
├── components/Message.svelte      # Ephemeral message styling
├── lib/state.svelte.ts           # Ephemeral message state
```

**API Changes:**
- `chat.postEphemeral` - Post ephemeral message

**Test Scenarios:**
1. Bot posts ephemeral → Only target user sees it
2. Ephemeral message has visual distinction
3. Ephemeral messages don't persist on refresh

---

### Priority 2: Additional Input Elements

#### 2.1 Date/Time Pickers
**Why:** Common for scheduling features.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
├── DatePicker.svelte        # New
├── TimePicker.svelte        # New
└── DatetimePicker.svelte    # New

apps/ui/src/lib/types.ts     # Add element types
```

**Test Scenarios:**
1. Date picker shows calendar UI
2. Selected date formats correctly in submission
3. Initial values work correctly

---

#### 2.2 Radio Buttons
**Why:** Single-selection alternative to checkboxes.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
└── RadioButtons.svelte      # New
```

**Test Scenarios:**
1. Only one option selectable
2. Initial selection works
3. Submission includes correct value

---

#### 2.3 Multi-Select Elements
**Why:** Selecting multiple users, channels, or options.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
├── MultiStaticSelect.svelte           # New
├── UsersSelect.svelte                 # New
├── MultiUsersSelect.svelte            # New
├── ConversationsSelect.svelte         # New
├── MultiConversationsSelect.svelte    # New
├── ChannelsSelect.svelte              # New
├── MultiChannelsSelect.svelte         # New
└── ExternalSelect.svelte              # New (with options loading)
```

**Test Scenarios:**
1. Multi-select allows multiple selections
2. Users/conversations selects show simulated data
3. External select makes options request to bot

---

#### 2.4 Overflow Menu
**Why:** Compact menu for secondary actions.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
└── OverflowMenu.svelte      # New
```

**Test Scenarios:**
1. Menu opens on click
2. Options displayed correctly
3. Selection triggers action

---

#### 2.5 Number/Email/URL Inputs
**Why:** Specialized text inputs with validation.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
├── NumberInput.svelte       # New
├── EmailInput.svelte        # New
└── UrlInput.svelte          # New
```

**Test Scenarios:**
1. Appropriate keyboard/validation on mobile
2. Validation feedback for invalid inputs
3. Correct value types in submission

---

### Priority 3: Rich Text & Formatting

#### 3.1 Rich Text Block
**Why:** Complex formatted text content.

**Implementation:**
```
apps/ui/src/components/blockkit/blocks/
└── RichTextBlock.svelte     # New

apps/ui/src/components/blockkit/richtext/
├── RichTextSection.svelte   # New
├── RichTextList.svelte      # New
├── RichTextQuote.svelte     # New
└── RichTextPreformatted.svelte  # New
```

**Test Scenarios:**
1. Bold, italic, strikethrough render correctly
2. Lists (ordered/unordered) render correctly
3. Quotes and code blocks render correctly

---

#### 3.2 Rich Text Input
**Why:** WYSIWYG text editing in modals.

**Implementation:**
```
apps/ui/src/components/blockkit/elements/
└── RichTextInput.svelte     # New (could use Tiptap/ProseMirror)
```

**Test Scenarios:**
1. Basic formatting toolbar
2. Output matches Slack rich text format
3. Initial value renders correctly

---

#### 3.3 Enhanced Mrkdwn Rendering
**Why:** Full Slack markdown support.

**Current Gap:** Basic mrkdwn support exists but incomplete.

**Implementation:**
```
apps/ui/src/components/blockkit/
└── context.ts               # Enhance renderMrkdwn function
```

**Features to Add:**
- User mentions: `<@U123>` → clickable name
- Channel mentions: `<#C123>` → clickable channel link
- Links: `<url|text>` → proper links
- Special mentions: `<!here>`, `<!channel>`, `<!everyone>`
- Emoji: `:emoji_name:` → actual emoji
- Inline code and code blocks

**Test Scenarios:**
1. User mentions show display names
2. Channel links navigate correctly
3. All markdown formats render

---

### Priority 4: Advanced Web API Methods

#### 4.1 Message Operations
```typescript
// chat.delete - Delete a message
// chat.scheduleMessage - Schedule for future delivery
// chat.meMessage - /me style messages
```

#### 4.2 Conversation Operations
```typescript
// conversations.create - Create a channel
// conversations.list - List channels
// conversations.info - Get channel details
// conversations.members - List channel members
// conversations.open - Open/create DM
// conversations.join / conversations.leave
```

#### 4.3 User Operations
```typescript
// users.list - List workspace users
// users.conversations - List user's conversations
// users.setPresence - Set online/away status
```

#### 4.4 File Operations
```typescript
// files.delete - Delete a file
// files.list - List files
// files.sharedPublicURL - Create public link
```

#### 4.5 Search Operations
```typescript
// search.messages - Search messages
// search.files - Search files
```

---

### Priority 5: Events API Expansion

#### 5.1 Channel Events
```typescript
// member_joined_channel - User joins channel
// member_left_channel - User leaves channel
// channel_created - New channel created
// channel_deleted - Channel deleted
// channel_rename - Channel renamed
// channel_archive / channel_unarchive
```

#### 5.2 Message Events
```typescript
// message_changed - Message edited
// message_deleted - Message deleted
// pin_added / pin_removed - Pin events
```

#### 5.3 Team Events
```typescript
// team_join - New user joined workspace
// user_change - User profile updated
// emoji_changed - Custom emoji added/removed
```

---

### Priority 6: Special Features

#### 6.1 Global Shortcuts
**Why:** Shortcuts accessible from anywhere in Slack.

**Implementation:**
- Add global shortcut UI trigger (maybe keyboard shortcut or menu)
- Dispatch `shortcut` event with `type: 'shortcut'`

---

#### 6.2 Link Unfurling
**Why:** Preview links shared in messages.

**Implementation:**
- Detect URLs in messages
- Send `link_shared` event to bot
- Bot responds with `chat.unfurl`
- Render unfurl attachment

---

#### 6.3 Pins and Bookmarks
**Why:** Mark important messages.

**Implementation:**
```typescript
// pins.add / pins.remove / pins.list
// Pin indicator on messages
// Pinned messages panel
```

---

#### 6.4 Reminders
**Why:** Set reminders about messages.

**Implementation:**
```typescript
// reminders.add / reminders.complete / reminders.delete
// reminders.info / reminders.list
// Reminder notification UI
```

---

## Part 3: Testing Strategy

### Test Categories

#### 1. Unit Tests (Per Component)
Location: `apps/ui/src/**/*.test.ts`, `packages/slack/src/**/*.test.ts`

**BlockKit Elements:**
```typescript
// Example: Button.test.ts
import { render, fireEvent } from '@testing-library/svelte'
import Button from './Button.svelte'

describe('Button', () => {
  it('renders button text correctly', () => {
    const { getByText } = render(Button, {
      props: {
        element: {
          type: 'button',
          action_id: 'test',
          text: { type: 'plain_text', text: 'Click me' }
        }
      }
    })
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick with action_id and value', async () => {
    const onClick = vi.fn()
    const { getByRole } = render(Button, {
      props: {
        element: { ... },
        onClick
      }
    })
    await fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('test', 'button_value')
  })

  it('applies primary style correctly', () => {
    // Test style="primary" renders with correct classes
  })
})
```

**Web API Handlers:**
```typescript
// Example: web-api.test.ts
describe('chat.postMessage', () => {
  it('rejects missing channel', async () => {
    const response = await api.chatPostMessage({ text: 'hello' })
    expect(response.ok).toBe(false)
    expect(response.error).toBe('missing_argument')
  })

  it('stores message in state', async () => {
    const response = await api.chatPostMessage({
      channel: 'C_GENERAL',
      text: 'hello'
    })
    expect(response.ok).toBe(true)
    expect(state.getMessage('C_GENERAL', response.ts)).toBeDefined()
  })
})
```

---

#### 2. Integration Tests (API Flow)
Location: `packages/slack/src/__tests__/integration/`

**Test Complete Flows:**
```typescript
describe('Modal Flow', () => {
  it('complete slash command → modal → submission flow', async () => {
    // 1. Connect bot via WebSocket
    const ws = await connectBot()

    // 2. Register slash command
    await api.registerCommands([{ command: '/test', description: 'Test' }])

    // 3. Execute slash command
    await api.executeSlashCommand('/test', '')

    // 4. Verify bot receives slash_command event
    const event = await ws.waitForEvent('slash_commands')
    expect(event.payload.command).toBe('/test')

    // 5. Bot opens modal
    await api.viewsOpen({ trigger_id: event.trigger_id, view: testModal })

    // 6. Verify modal appears
    expect(state.getView(viewId)).toBeDefined()

    // 7. Submit modal
    await api.submitView(viewId, { block1: { action1: { value: 'test' } } })

    // 8. Verify bot receives view_submission
    const submission = await ws.waitForEvent('view_submission')
    expect(submission.view.state.values).toBeDefined()
  })
})
```

---

#### 3. E2E Tests (Full Stack)
Location: `tests/e2e/`
Framework: Playwright

**Test User Journeys:**
```typescript
// Example: e2e/message-flow.spec.ts
import { test, expect } from '@playwright/test'

test('user sends message and receives bot response', async ({ page }) => {
  // Start with fresh simulator
  await page.goto('http://localhost:5173')

  // Wait for bot to connect
  await expect(page.locator('[data-testid="bot-status"]')).toHaveText('Connected')

  // Type message in input
  await page.fill('[data-testid="message-input"]', 'Hello @bot')
  await page.press('[data-testid="message-input"]', 'Enter')

  // Verify user message appears
  await expect(page.locator('.message').last()).toContainText('Hello @bot')

  // Wait for bot response
  await expect(page.locator('.message.from-bot')).toBeVisible({ timeout: 5000 })
})

test('slash command opens modal', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Type slash command
  await page.fill('[data-testid="message-input"]', '/generate')
  await page.click('[data-testid="command-autocomplete-item"]')
  await page.press('[data-testid="message-input"]', 'Enter')

  // Verify modal opens
  await expect(page.locator('[role="dialog"]')).toBeVisible()
  await expect(page.locator('#modal-title')).toHaveText('Generate Image')
})
```

---

#### 4. Visual Regression Tests
Location: `tests/visual/`
Framework: Playwright + Percy/Chromatic

**Test BlockKit Rendering:**
```typescript
// Example: visual/blockkit.spec.ts
import { test } from '@playwright/test'

const blockKitExamples = [
  { name: 'section-with-button', blocks: [...] },
  { name: 'input-form', blocks: [...] },
  { name: 'complex-modal', blocks: [...] },
]

for (const example of blockKitExamples) {
  test(`BlockKit: ${example.name}`, async ({ page }) => {
    await page.goto(`/test/blockkit?blocks=${encodeURIComponent(JSON.stringify(example.blocks))}`)
    await expect(page).toHaveScreenshot(`${example.name}.png`)
  })
}
```

---

#### 5. API Conformance Tests
Location: `packages/slack/src/__tests__/conformance/`

**Test Against Slack API Spec:**
```typescript
// Verify our responses match Slack's documented format
describe('API Conformance', () => {
  it('auth.test returns correct shape', async () => {
    const response = await api.authTest()

    // Must have these fields per Slack docs
    expect(response).toMatchObject({
      ok: true,
      url: expect.any(String),
      team: expect.any(String),
      user: expect.any(String),
      team_id: expect.stringMatching(/^T/),
      user_id: expect.stringMatching(/^U/),
      bot_id: expect.stringMatching(/^B/),
    })
  })

  it('chat.postMessage returns correct shape', async () => {
    const response = await api.chatPostMessage({
      channel: 'C_GENERAL',
      text: 'test'
    })

    expect(response).toMatchObject({
      ok: true,
      channel: 'C_GENERAL',
      ts: expect.stringMatching(/^\d+\.\d+$/),
      message: {
        type: 'message',
        text: 'test',
        user: expect.any(String),
        ts: expect.any(String),
      }
    })
  })
})
```

---

### Test Infrastructure Setup

#### Test Runner Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.d.ts', '**/types.ts']
    }
  }
})
```

#### Test Fixtures
```typescript
// tests/fixtures/blocks.ts
export const sectionBlock = {
  type: 'section',
  text: { type: 'mrkdwn', text: 'Test section' }
}

export const inputBlock = {
  type: 'input',
  label: { type: 'plain_text', text: 'Name' },
  element: {
    type: 'plain_text_input',
    action_id: 'name_input'
  }
}

export const testModal = {
  type: 'modal',
  title: { type: 'plain_text', text: 'Test Modal' },
  submit: { type: 'plain_text', text: 'Submit' },
  blocks: [sectionBlock, inputBlock]
}
```

#### Mock Bot for Testing
```typescript
// tests/helpers/mock-bot.ts
export class MockBot {
  private ws: WebSocket
  private events: any[] = []

  async connect(): Promise<void> {
    // Connect to emulator's Socket Mode
    const { url } = await fetch('/api/apps.connections.open').then(r => r.json())
    this.ws = new WebSocket(url)

    this.ws.onmessage = (msg) => {
      this.events.push(JSON.parse(msg.data))
    }
  }

  async waitForEvent(type: string, timeout = 5000): Promise<any> {
    // Wait for specific event type
  }

  async ack(envelope_id: string, payload?: any): Promise<void> {
    this.ws.send(JSON.stringify({ envelope_id, payload }))
  }
}
```

---

## Part 4: Implementation Order

### Phase 1: Core Interactions (Weeks 1-2)
1. **Message blocks and actions** - Enable interactive messages
2. **Home tab** - `views.publish` and App Home surface
3. **Ephemeral messages** - `chat.postEphemeral`

### Phase 2: Input Elements (Weeks 3-4)
4. **Date/time pickers** - DatePicker, TimePicker, DatetimePicker
5. **Radio buttons** - RadioButtons element
6. **Multi-select elements** - All multi-select variants
7. **Overflow menu** - OverflowMenu element
8. **Specialized inputs** - Number, Email, URL inputs

### Phase 3: Rich Content (Weeks 5-6)
9. **Rich text block** - RichTextBlock with all sections
10. **Rich text input** - WYSIWYG editor
11. **Enhanced mrkdwn** - Full markdown support with mentions

### Phase 4: API Expansion (Weeks 7-8)
12. **Message operations** - delete, schedule, meMessage
13. **Conversation operations** - create, list, info, members
14. **User operations** - list, conversations, presence

### Phase 5: Events & Advanced (Weeks 9-10)
15. **Channel events** - join, leave, create, delete
16. **Message events** - changed, deleted, pinned
17. **Global shortcuts** - Accessible from anywhere
18. **Link unfurling** - URL preview support

### Phase 6: Polish & Special (Weeks 11-12)
19. **Pins and bookmarks** - Pin messages
20. **Reminders** - Set reminders
21. **Search** - Message and file search
22. **File operations** - delete, list, public URL

---

## Part 5: Test Coverage Goals

| Category | Target Coverage | Priority |
|----------|----------------|----------|
| BlockKit Elements | 95% | High |
| Web API Methods | 90% | High |
| Socket Mode Events | 90% | High |
| State Management | 85% | Medium |
| UI Components | 80% | Medium |
| Integration Flows | 100% (all paths) | High |
| E2E User Journeys | 20 critical paths | High |
| Visual Regression | All BlockKit combos | Medium |

---

## Part 6: Interaction Matrix

### Complete Feature Interaction Coverage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SLACK FEATURE INTERACTION MATRIX                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRIGGER              ACTION               RESULT                           │
│  ───────              ──────               ──────                           │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ User Message │───▶│ app_mention  │───▶│ Bot Response │                  │
│  └──────────────┘    │    event     │    │   (message)  │                  │
│                      └──────────────┘    └──────────────┘                  │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Slash Cmd    │───▶│slash_command │───▶│ Modal / Msg  │                  │
│  └──────────────┘    │    event     │    └──────────────┘                  │
│                      └──────────────┘           │                          │
│                                                 ▼                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Modal Submit │───▶│view_submissn │───▶│ Update/Close │                  │
│  └──────────────┘    │    event     │    └──────────────┘                  │
│                      └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Msg Shortcut │───▶│  shortcut    │───▶│ Modal / Msg  │                  │
│  └──────────────┘    │    event     │    └──────────────┘                  │
│                      └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Button Click │───▶│block_actions │───▶│ Update View  │                  │
│  │ (in modal)   │    │    event     │    │  / Message   │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Button Click │───▶│block_actions │───▶│ Update Msg   │  [NOT IMPL]     │
│  │ (in message) │    │    event     │    │  / Modal     │                  │
│  └──────────────┘    └──────────────┘    └──────────────┘                  │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Open Home    │───▶│app_home_open │───▶│ Publish Home │  [NOT IMPL]     │
│  └──────────────┘    │    event     │    └──────────────┘                  │
│                      └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Global Short │───▶│  shortcut    │───▶│ Modal / Msg  │  [NOT IMPL]     │
│  └──────────────┘    │   (global)   │    └──────────────┘                  │
│                      └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Select Menu  │───▶│block_suggest │───▶│ Return Opts  │  [NOT IMPL]     │
│  │  (external)  │    │    event     │    └──────────────┘                  │
│  └──────────────┘    └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │
│  │ Share Link   │───▶│ link_shared  │───▶│  Unfurl URL  │  [NOT IMPL]     │
│  └──────────────┘    │    event     │    └──────────────┘                  │
│                      └──────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BlockKit Element Support Matrix

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     BLOCKKIT ELEMENT SUPPORT MATRIX                        │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ELEMENT              MODAL    MESSAGE    HOME    IMPLEMENTED             │
│  ───────              ─────    ───────    ────    ───────────             │
│                                                                           │
│  button                 ✓        ✓         ✓        ✅                    │
│  static_select          ✓        ✓         ✓        ✅                    │
│  plain_text_input       ✓        ✗         ✓        ✅                    │
│  checkboxes             ✓        ✓         ✓        ✅                    │
│  file_input             ✓        ✗         ✗        ✅                    │
│  image                  ✓        ✓         ✓        ✅                    │
│                                                                           │
│  multi_static_select    ✓        ✓         ✓        ❌                    │
│  external_select        ✓        ✓         ✓        ❌                    │
│  multi_external_select  ✓        ✓         ✓        ❌                    │
│  users_select           ✓        ✓         ✓        ❌                    │
│  multi_users_select     ✓        ✓         ✓        ❌                    │
│  conversations_select   ✓        ✓         ✓        ❌                    │
│  multi_conversations    ✓        ✓         ✓        ❌                    │
│  channels_select        ✓        ✓         ✓        ❌                    │
│  multi_channels_select  ✓        ✓         ✓        ❌                    │
│  datepicker             ✓        ✓         ✓        ❌                    │
│  timepicker             ✓        ✓         ✓        ❌                    │
│  datetimepicker         ✓        ✗         ✓        ❌                    │
│  radio_buttons          ✓        ✓         ✓        ❌                    │
│  overflow               ✓        ✓         ✓        ❌ (type only)        │
│  number_input           ✓        ✗         ✓        ❌                    │
│  email_input            ✓        ✗         ✓        ❌                    │
│  url_input              ✓        ✗         ✓        ❌                    │
│  rich_text_input        ✓        ✗         ✓        ❌                    │
│                                                                           │
│  ✓ = Supported in surface  ✗ = Not supported in surface                  │
│  ✅ = Implemented  ❌ = Not implemented                                   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### Event Flow Sequence Diagrams

```
Message with Buttons Flow (NOT YET IMPLEMENTED):
═══════════════════════════════════════════════

     User                Simulator               Bot
       │                     │                     │
       │ ──── message ────▶  │                     │
       │                     │ ── message event ─▶ │
       │                     │                     │
       │                     │ ◀─ chat.postMessage │
       │                     │    (with blocks)    │
       │ ◀── message with ── │                     │
       │     buttons         │                     │
       │                     │                     │
       │ ── click button ──▶ │                     │
       │                     │ ─ block_actions ──▶ │
       │                     │                     │
       │                     │ ◀── chat.update ─── │
       │ ◀── updated msg ─── │                     │


Home Tab Flow (NOT YET IMPLEMENTED):
════════════════════════════════════

     User                Simulator               Bot
       │                     │                     │
       │ ── open Home tab ─▶ │                     │
       │                     │ ─ app_home_opened ▶ │
       │                     │                     │
       │                     │ ◀─ views.publish ── │
       │ ◀── render home ─── │                     │
       │                     │                     │
       │ ─ click button ───▶ │                     │
       │                     │ ─ block_actions ──▶ │
       │                     │                     │
       │                     │ ◀─ views.publish ── │
       │ ◀── update home ─── │     (updated)       │


External Select Options Flow (NOT YET IMPLEMENTED):
═══════════════════════════════════════════════════

     User                Simulator               Bot
       │                     │                     │
       │ ── type in select ▶ │                     │
       │                     │ ─ block_suggestion▶ │
       │                     │                     │
       │                     │ ◀─── options ────── │
       │ ◀── show options ── │                     │
       │                     │                     │
       │ ── select option ─▶ │                     │
       │                     │ (no event until     │
       │                     │  form submission)   │


Link Unfurling Flow (NOT YET IMPLEMENTED):
═══════════════════════════════════════════

     User                Simulator               Bot
       │                     │                     │
       │ ── send message ──▶ │                     │
       │    with URL         │                     │
       │                     │ ── link_shared ───▶ │
       │                     │                     │
       │                     │ ◀── chat.unfurl ─── │
       │ ◀── show unfurl ─── │                     │
```

---

## Appendix A: File Structure for New Features

```
packages/slack/src/
├── server/
│   ├── web-api.ts              # Add: views.publish, chat.postEphemeral, etc.
│   ├── socket-mode.ts          # Add: new event dispatchers
│   ├── state.ts                # Add: home views, ephemeral storage
│   └── types.ts                # Add: new types for all features
└── __tests__/
    ├── unit/
    │   ├── web-api.test.ts
    │   └── socket-mode.test.ts
    ├── integration/
    │   ├── modal-flow.test.ts
    │   ├── home-tab-flow.test.ts
    │   └── message-actions-flow.test.ts
    └── conformance/
        └── api-conformance.test.ts

apps/ui/src/
├── components/
│   ├── blockkit/
│   │   ├── blocks/
│   │   │   ├── RichTextBlock.svelte     # New
│   │   │   └── VideoBlock.svelte        # New
│   │   ├── elements/
│   │   │   ├── DatePicker.svelte        # New
│   │   │   ├── TimePicker.svelte        # New
│   │   │   ├── RadioButtons.svelte      # New
│   │   │   ├── OverflowMenu.svelte      # New
│   │   │   ├── MultiStaticSelect.svelte # New
│   │   │   ├── UsersSelect.svelte       # New
│   │   │   ├── NumberInput.svelte       # New
│   │   │   └── RichTextInput.svelte     # New
│   │   └── richtext/                    # New directory
│   │       ├── RichTextSection.svelte
│   │       ├── RichTextList.svelte
│   │       └── RichTextQuote.svelte
│   ├── AppHome.svelte                   # New
│   └── MessageBlocks.svelte             # New
├── lib/
│   └── types.ts                         # Add new element types
└── __tests__/
    └── components/
        └── blockkit/
            └── *.test.ts

tests/
├── e2e/
│   ├── message-flow.spec.ts
│   ├── modal-flow.spec.ts
│   ├── home-tab.spec.ts
│   └── slash-commands.spec.ts
├── visual/
│   └── blockkit.spec.ts
└── fixtures/
    ├── blocks.ts
    ├── modals.ts
    └── mock-bot.ts
```

---

## Appendix B: API Reference for Missing Methods

### chat.postEphemeral
```typescript
interface ChatPostEphemeralRequest {
  channel: string
  user: string
  text?: string
  blocks?: Block[]
  attachments?: Attachment[]
  as_user?: boolean
}

interface ChatPostEphemeralResponse {
  ok: boolean
  message_ts: string  // Note: ephemeral messages have ts but aren't stored
}
```

### views.publish
```typescript
interface ViewsPublishRequest {
  user_id: string
  view: HomeView
  hash?: string  // For optimistic locking
}

interface HomeView {
  type: 'home'
  blocks: Block[]
  private_metadata?: string
  callback_id?: string
  external_id?: string
}
```

### External Select Options Request
```typescript
// Bot receives this when user types in external_select
interface BlockSuggestionPayload {
  type: 'block_suggestion'
  action_id: string
  block_id: string
  value: string  // What user typed
  container: {
    type: 'view' | 'message'
    view_id?: string
    message_ts?: string
    channel_id?: string
  }
}

// Bot responds with options
interface OptionsResponse {
  options: Option[]
}
```

---

This plan provides a comprehensive roadmap for implementing all Slack features in the Botarium simulator with a robust testing strategy to ensure reliability and conformance with Slack's API behavior.
