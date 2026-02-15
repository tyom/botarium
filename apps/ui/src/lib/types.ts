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
}

export const CHANNELS: Channel[] = [
  { id: 'C_GENERAL', name: 'general', type: 'channel' },
  { id: 'C_RANDOM', name: 'random', type: 'channel' },
]

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

// Block elements
export type SlackBlockElement =
  | SlackButtonElement
  | SlackImageElement
  | SlackStaticSelectElement
  | SlackOverflowElement

export interface SlackButtonElement {
  type: 'button'
  action_id: string
  text: SlackViewTextObject
  value?: string
  style?: 'primary' | 'danger'
  url?: string
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
}

export interface SlackOverflowElement {
  type: 'overflow'
  action_id: string
  options: SlackOption[]
}

export interface SlackOption {
  text: SlackViewTextObject
  value: string
  description?: SlackViewTextObject
}

// Input elements
export type SlackInputElement =
  | SlackPlainTextInputElement
  | SlackStaticSelectElement
  | SlackMultiStaticSelectElement
  | SlackFileInputElement
  | SlackCheckboxesElement

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
}

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
