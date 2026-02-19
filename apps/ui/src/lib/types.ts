/**
 * Shared type definitions for the simulator
 */

export interface SlackFile {
  id: string
  name: string
  title: string
  mimetype: string
  url_private: string
  thumb_360?: string
  thumb_480?: string
  isExpanded?: boolean
}

export interface SimulatorMessage {
  ts: string
  user: string
  text: string
  subtype?: string
  thread_ts?: string
  channel: string
  reactions: Map<string, number>
  file?: SlackFile
  blocks?: SlackBlock[]
}

export interface Channel {
  id: string
  name: string
  type: 'channel' | 'dm'
  isPreset?: boolean
}

export const PRESET_CHANNELS: Channel[] = [
  { id: 'C_GENERAL', name: 'general', type: 'channel', isPreset: true },
  { id: 'C_SHOWCASE', name: 'showcase', type: 'channel', isPreset: true },
]

/** @deprecated Use simulatorState.channels instead */
export const CHANNELS = PRESET_CHANNELS

export const BOT_USER_ID = 'U_BOT'
export const BOT_NAME = 'Bot' // Default, overridden by app config

// Slash command definition (matches backend SlashCommandDefinition)
export interface SlashCommand {
  command: string
  description: string
  usage_hint?: string
}

// Shortcut definition (matches backend ShortcutDefinition)
export interface Shortcut {
  callback_id: string
  name: string
  description: string
  type: 'message' | 'global'
}

// Slack app config (matches backend SlackAppConfig)
export interface SlackAppConfig {
  app: {
    name: string
  }
  commands: SlashCommand[]
  shortcuts: Shortcut[]
  actions: Record<string, string>
  modals: Record<string, string>
}

// Slack view text object
export interface SlackViewTextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

// Confirm dialog composition object
export interface SlackConfirmDialog {
  title: SlackViewTextObject
  text: SlackViewTextObject
  confirm: SlackViewTextObject
  deny: SlackViewTextObject
  style?: 'primary' | 'danger'
}

// Slack view / modal structure
export interface SlackView {
  type: 'modal' | 'home'
  title?: SlackViewTextObject
  submit?: SlackViewTextObject
  close?: SlackViewTextObject
  blocks: SlackBlock[]
  private_metadata?: string
  callback_id?: string
  clear_on_close?: boolean
  notify_on_close?: boolean
  external_id?: string
}

// Block Kit block types
export type SlackBlock =
  | SlackSectionBlock
  | SlackInputBlock
  | SlackActionsBlock
  | SlackDividerBlock
  | SlackContextBlock
  | SlackImageBlock
  | SlackHeaderBlock
  | SlackRichTextBlock
  | SlackTableBlock

export interface SlackSectionBlock {
  type: 'section'
  block_id?: string
  text?: SlackViewTextObject
  fields?: SlackViewTextObject[]
  accessory?: SlackBlockElement
}

export interface SlackInputBlock {
  type: 'input'
  block_id?: string
  label: SlackViewTextObject
  element: SlackInputElement
  hint?: SlackViewTextObject
  optional?: boolean
  dispatch_action?: boolean
}

export interface SlackActionsBlock {
  type: 'actions'
  block_id?: string
  elements: SlackBlockElement[]
}

export interface SlackDividerBlock {
  type: 'divider'
  block_id?: string
}

export interface SlackContextBlock {
  type: 'context'
  block_id?: string
  elements: Array<SlackViewTextObject | SlackImageElement>
}

export interface SlackImageBlock {
  type: 'image'
  block_id?: string
  image_url: string
  alt_text: string
  title?: SlackViewTextObject
}

export interface SlackHeaderBlock {
  type: 'header'
  block_id?: string
  text: SlackViewTextObject
}

// Rich text style applied to inline elements
export interface RichTextStyle {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  underline?: boolean
}

// Rich text inline elements (leaf nodes)
export interface RichTextTextElement {
  type: 'text'
  text: string
  style?: RichTextStyle
}

export interface RichTextLinkElement {
  type: 'link'
  url: string
  text?: string
  style?: RichTextStyle
}

export interface RichTextEmojiElement {
  type: 'emoji'
  name: string
  unicode?: string
  style?: RichTextStyle
}

export interface RichTextUserMentionElement {
  type: 'user'
  user_id: string
  style?: RichTextStyle
}

export interface RichTextChannelMentionElement {
  type: 'channel'
  channel_id: string
  style?: RichTextStyle
}

export interface RichTextBroadcastMentionElement {
  type: 'broadcast'
  range: 'here' | 'channel' | 'everyone'
  style?: RichTextStyle
}

export type RichTextInlineElement =
  | RichTextTextElement
  | RichTextLinkElement
  | RichTextEmojiElement
  | RichTextUserMentionElement
  | RichTextChannelMentionElement
  | RichTextBroadcastMentionElement

// Rich text block-level elements
export interface RichTextSectionElement {
  type: 'rich_text_section'
  elements: RichTextInlineElement[]
}

export interface RichTextPreformattedElement {
  type: 'rich_text_preformatted'
  elements: RichTextInlineElement[]
  border?: 0 | 1
}

export interface RichTextQuoteElement {
  type: 'rich_text_quote'
  elements: RichTextInlineElement[]
  border?: 0 | 1
}

export interface RichTextListElement {
  type: 'rich_text_list'
  style: 'bullet' | 'ordered'
  elements: RichTextSectionElement[]
  indent?: number
  border?: 0 | 1
}

export type RichTextBlockElement =
  | RichTextSectionElement
  | RichTextPreformattedElement
  | RichTextQuoteElement
  | RichTextListElement

export interface SlackRichTextBlock {
  type: 'rich_text'
  block_id?: string
  elements: RichTextBlockElement[]
}

// Raw text element (used in table cells)
export interface SlackRawTextElement {
  type: 'raw_text'
  text: string
}

// Table block types
export interface SlackTableColumnSettings {
  align?: 'left' | 'center' | 'right'
  is_wrapped?: boolean
}

export interface SlackTableBlock {
  type: 'table'
  block_id?: string
  rows: (SlackRichTextBlock | SlackRawTextElement)[][]
  column_settings?: SlackTableColumnSettings[]
}

// Block elements
export type SlackBlockElement =
  | SlackButtonElement
  | SlackImageElement
  | SlackStaticSelectElement
  | SlackOverflowElement
  | SlackRadioButtonsElement
  | SlackCheckboxesElement
  | SlackDatePickerElement
  | SlackTimePickerElement
  | SlackDateTimePickerElement
  | SlackUsersSelectElement
  | SlackConversationsSelectElement
  | SlackChannelsSelectElement
  | SlackExternalSelectElement
  | SlackMultiUsersSelectElement
  | SlackMultiConversationsSelectElement
  | SlackMultiChannelsSelectElement
  | SlackMultiExternalSelectElement

export interface SlackButtonElement {
  type: 'button'
  action_id: string
  text: SlackViewTextObject
  value?: string
  style?: 'primary' | 'danger'
  url?: string
  confirm?: SlackConfirmDialog
}

export interface SlackImageElement {
  type: 'image'
  image_url: string
  alt_text: string
}

export interface SlackStaticSelectElement {
  type: 'static_select'
  action_id: string
  placeholder?: SlackViewTextObject
  options: SlackOption[]
  initial_option?: SlackOption
  confirm?: SlackConfirmDialog
}

export interface SlackOverflowElement {
  type: 'overflow'
  action_id: string
  options: SlackOverflowOption[]
  confirm?: SlackConfirmDialog
}

export interface SlackOption {
  text: SlackViewTextObject
  value: string
  description?: SlackViewTextObject
}

export interface SlackOverflowOption {
  text: SlackViewTextObject
  value: string
  description?: SlackViewTextObject
  url?: string
}

// Input elements
export type SlackInputElement =
  | SlackPlainTextInputElement
  | SlackStaticSelectElement
  | SlackMultiStaticSelectElement
  | SlackFileInputElement
  | SlackCheckboxesElement
  | SlackRadioButtonsElement
  | SlackNumberInputElement
  | SlackEmailInputElement
  | SlackUrlInputElement
  | SlackDatePickerElement
  | SlackTimePickerElement
  | SlackDateTimePickerElement
  | SlackUsersSelectElement
  | SlackConversationsSelectElement
  | SlackChannelsSelectElement
  | SlackExternalSelectElement
  | SlackMultiUsersSelectElement
  | SlackMultiConversationsSelectElement
  | SlackMultiChannelsSelectElement
  | SlackMultiExternalSelectElement

export interface SlackPlainTextInputElement {
  type: 'plain_text_input'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_value?: string
  multiline?: boolean
  min_length?: number
  max_length?: number
}

export interface SlackMultiStaticSelectElement {
  type: 'multi_static_select'
  action_id: string
  placeholder?: SlackViewTextObject
  options: SlackOption[]
  initial_options?: SlackOption[]
  max_selected_items?: number
}

export interface SlackFileInputElement {
  type: 'file_input'
  action_id: string
  filetypes?: string[]
  max_files?: number
}

export interface SlackCheckboxesElement {
  type: 'checkboxes'
  action_id: string
  options: SlackOption[]
  initial_options?: SlackOption[]
  confirm?: SlackConfirmDialog
}

export interface SlackRadioButtonsElement {
  type: 'radio_buttons'
  action_id: string
  options: SlackOption[]
  initial_option?: SlackOption
  confirm?: SlackConfirmDialog
  focus_on_load?: boolean
}

export interface SlackNumberInputElement {
  type: 'number_input'
  action_id: string
  is_decimal_allowed: boolean
  initial_value?: string
  min_value?: string
  max_value?: string
  placeholder?: SlackViewTextObject
  focus_on_load?: boolean
}

export interface SlackEmailInputElement {
  type: 'email_text_input'
  action_id: string
  initial_value?: string
  placeholder?: SlackViewTextObject
  focus_on_load?: boolean
}

export interface SlackUrlInputElement {
  type: 'url_text_input'
  action_id: string
  initial_value?: string
  placeholder?: SlackViewTextObject
  focus_on_load?: boolean
}

export interface SlackDatePickerElement {
  type: 'datepicker'
  action_id: string
  initial_date?: string // YYYY-MM-DD
  placeholder?: SlackViewTextObject
  confirm?: SlackConfirmDialog
  focus_on_load?: boolean
}

export interface SlackTimePickerElement {
  type: 'timepicker'
  action_id: string
  initial_time?: string // HH:mm (24-hour)
  placeholder?: SlackViewTextObject
  confirm?: SlackConfirmDialog
  focus_on_load?: boolean
  timezone?: string
}

export interface SlackDateTimePickerElement {
  type: 'datetimepicker'
  action_id: string
  initial_date_time?: number // UNIX timestamp in seconds
  confirm?: SlackConfirmDialog
  focus_on_load?: boolean
}

// Workspace select elements (non-interactive placeholders)
export interface SlackUsersSelectElement {
  type: 'users_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_user?: string
}

export interface SlackConversationsSelectElement {
  type: 'conversations_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_conversation?: string
}

export interface SlackChannelsSelectElement {
  type: 'channels_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_channel?: string
}

export interface SlackExternalSelectElement {
  type: 'external_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_option?: SlackOption
  min_query_length?: number
}

export interface SlackMultiUsersSelectElement {
  type: 'multi_users_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_users?: string[]
  max_selected_items?: number
}

export interface SlackMultiConversationsSelectElement {
  type: 'multi_conversations_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_conversations?: string[]
  max_selected_items?: number
}

export interface SlackMultiChannelsSelectElement {
  type: 'multi_channels_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_channels?: string[]
  max_selected_items?: number
}

export interface SlackMultiExternalSelectElement {
  type: 'multi_external_select'
  action_id: string
  placeholder?: SlackViewTextObject
  initial_options?: SlackOption[]
  min_query_length?: number
  max_selected_items?: number
}

export type SlackWorkspaceSelectElement =
  | SlackUsersSelectElement
  | SlackConversationsSelectElement
  | SlackChannelsSelectElement
  | SlackExternalSelectElement
  | SlackMultiUsersSelectElement
  | SlackMultiConversationsSelectElement
  | SlackMultiChannelsSelectElement
  | SlackMultiExternalSelectElement

// Uploaded file representation for form values
export interface UploadedFile {
  id: string
  name: string
  dataUrl: string
  mimetype: string
}

// Connected bot info (from emulator API)
export interface ConnectedBotInfo {
  id: string
  name: string
  connectedAt: string
  status: 'connecting' | 'connected' | 'disconnected'
  commands: number
  shortcuts: number
}
