// Text objects
export interface PlainTextObject {
  type: 'plain_text'
  text: string
  emoji?: boolean
}

export interface MrkdwnObject {
  type: 'mrkdwn'
  text: string
}

export type TextObject = PlainTextObject | MrkdwnObject

// Confirm dialog
export interface ConfirmDialog {
  title: PlainTextObject
  text: TextObject
  confirm: PlainTextObject
  deny: PlainTextObject
  style?: 'primary' | 'danger'
}

// Options
export interface Option {
  text: PlainTextObject
  value: string
  description?: PlainTextObject
}

export interface OverflowOption {
  text: PlainTextObject
  value: string
  description?: PlainTextObject
  url?: string
}

// Interactive elements

export interface ButtonElement {
  type: 'button'
  action_id: string
  text: PlainTextObject
  value?: string
  style?: 'primary' | 'danger'
  url?: string
  confirm?: ConfirmDialog
}

export interface ImageElement {
  type: 'image'
  image_url: string
  alt_text: string
}

export interface StaticSelectElement {
  type: 'static_select'
  action_id: string
  placeholder?: PlainTextObject
  options: Option[]
  initial_option?: Option
  confirm?: ConfirmDialog
}

export interface MultiStaticSelectElement {
  type: 'multi_static_select'
  action_id: string
  placeholder?: PlainTextObject
  options: Option[]
  initial_options?: Option[]
  max_selected_items?: number
}

export interface OverflowElement {
  type: 'overflow'
  action_id: string
  options: OverflowOption[]
  confirm?: ConfirmDialog
}

export interface RadioButtonsElement {
  type: 'radio_buttons'
  action_id: string
  options: Option[]
  initial_option?: Option
  confirm?: ConfirmDialog
  focus_on_load?: boolean
}

export interface CheckboxesElement {
  type: 'checkboxes'
  action_id: string
  options: Option[]
  initial_options?: Option[]
  confirm?: ConfirmDialog
}

export interface DatePickerElement {
  type: 'datepicker'
  action_id: string
  initial_date?: string
  placeholder?: PlainTextObject
  confirm?: ConfirmDialog
  focus_on_load?: boolean
}

export interface TimePickerElement {
  type: 'timepicker'
  action_id: string
  initial_time?: string
  placeholder?: PlainTextObject
  confirm?: ConfirmDialog
  focus_on_load?: boolean
  timezone?: string
}

export interface DateTimePickerElement {
  type: 'datetimepicker'
  action_id: string
  initial_date_time?: number
  confirm?: ConfirmDialog
  focus_on_load?: boolean
}

// Input elements

export interface PlainTextInputElement {
  type: 'plain_text_input'
  action_id: string
  placeholder?: PlainTextObject
  initial_value?: string
  multiline?: boolean
  min_length?: number
  max_length?: number
}

export interface NumberInputElement {
  type: 'number_input'
  action_id: string
  is_decimal_allowed: boolean
  initial_value?: string
  min_value?: string
  max_value?: string
  placeholder?: PlainTextObject
  focus_on_load?: boolean
}

export interface EmailInputElement {
  type: 'email_text_input'
  action_id: string
  initial_value?: string
  placeholder?: PlainTextObject
  focus_on_load?: boolean
}

export interface UrlInputElement {
  type: 'url_text_input'
  action_id: string
  initial_value?: string
  placeholder?: PlainTextObject
  focus_on_load?: boolean
}

export interface FileInputElement {
  type: 'file_input'
  action_id: string
  filetypes?: string[]
  max_files?: number
}

// Workspace select elements

export interface UsersSelectElement {
  type: 'users_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_user?: string
}

export interface ConversationsSelectElement {
  type: 'conversations_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_conversation?: string
}

export interface ChannelsSelectElement {
  type: 'channels_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_channel?: string
}

export interface ExternalSelectElement {
  type: 'external_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_option?: Option
  min_query_length?: number
}

export interface MultiUsersSelectElement {
  type: 'multi_users_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_users?: string[]
  max_selected_items?: number
}

export interface MultiConversationsSelectElement {
  type: 'multi_conversations_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_conversations?: string[]
  max_selected_items?: number
}

export interface MultiChannelsSelectElement {
  type: 'multi_channels_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_channels?: string[]
  max_selected_items?: number
}

export interface MultiExternalSelectElement {
  type: 'multi_external_select'
  action_id: string
  placeholder?: PlainTextObject
  initial_options?: Option[]
  min_query_length?: number
  max_selected_items?: number
}

// Union types

export type BlockElement =
  | ButtonElement
  | ImageElement
  | StaticSelectElement
  | OverflowElement
  | RadioButtonsElement
  | CheckboxesElement
  | DatePickerElement
  | TimePickerElement
  | DateTimePickerElement
  | UsersSelectElement
  | ConversationsSelectElement
  | ChannelsSelectElement
  | ExternalSelectElement
  | MultiUsersSelectElement
  | MultiConversationsSelectElement
  | MultiChannelsSelectElement
  | MultiExternalSelectElement

export type InputElement =
  | PlainTextInputElement
  | StaticSelectElement
  | MultiStaticSelectElement
  | FileInputElement
  | CheckboxesElement
  | RadioButtonsElement
  | NumberInputElement
  | EmailInputElement
  | UrlInputElement
  | DatePickerElement
  | TimePickerElement
  | DateTimePickerElement
  | UsersSelectElement
  | ConversationsSelectElement
  | ChannelsSelectElement
  | ExternalSelectElement
  | MultiUsersSelectElement
  | MultiConversationsSelectElement
  | MultiChannelsSelectElement
  | MultiExternalSelectElement

// Rich text types

export interface RichTextStyle {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  underline?: boolean
}

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

export interface RichTextBroadcastElement {
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
  | RichTextBroadcastElement

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

// Block types

export interface SectionBlock {
  type: 'section'
  block_id?: string
  text?: TextObject
  fields?: TextObject[]
  accessory?: BlockElement
}

export interface InputBlock {
  type: 'input'
  block_id?: string
  label: PlainTextObject
  element: InputElement
  hint?: PlainTextObject
  optional?: boolean
  dispatch_action?: boolean
}

export interface ActionsBlock {
  type: 'actions'
  block_id?: string
  elements: BlockElement[]
}

export interface DividerBlock {
  type: 'divider'
  block_id?: string
}

export interface ContextBlock {
  type: 'context'
  block_id?: string
  elements: Array<TextObject | ImageElement>
}

export interface ImageBlock {
  type: 'image'
  block_id?: string
  image_url: string
  alt_text: string
  title?: PlainTextObject
}

export interface HeaderBlock {
  type: 'header'
  block_id?: string
  text: PlainTextObject
}

export interface RichTextBlock {
  type: 'rich_text'
  block_id?: string
  elements: RichTextBlockElement[]
}

// Raw text (for table cells)
export interface RawTextElement {
  type: 'raw_text'
  text: string
}

// Table types
export interface TableColumnSettings {
  align?: 'left' | 'center' | 'right'
  is_wrapped?: boolean
}

export interface TableBlock {
  type: 'table'
  block_id?: string
  rows: (RichTextBlock | RawTextElement)[][]
  column_settings?: TableColumnSettings[]
}

// All blocks
export type Block =
  | SectionBlock
  | InputBlock
  | ActionsBlock
  | DividerBlock
  | ContextBlock
  | ImageBlock
  | HeaderBlock
  | RichTextBlock
  | TableBlock

// View (modal / home tab)
export interface View {
  type: 'modal' | 'home'
  title?: PlainTextObject
  submit?: PlainTextObject
  close?: PlainTextObject
  blocks: Block[]
  private_metadata?: string
  callback_id?: string
  clear_on_close?: boolean
  notify_on_close?: boolean
  external_id?: string
}
