/**
 * Slack-compatible type definitions for the API emulator
 * These types mirror Slack's actual API structures for compatibility
 */

// =============================================================================
// Core Slack Types
// =============================================================================

export interface SlackUser {
  id: string
  name: string
  real_name: string
  is_bot: boolean
  profile: {
    display_name: string
    email?: string
    image_48?: string
  }
}

export interface SlackChannel {
  id: string
  name: string
  is_channel: boolean
  is_im: boolean
  is_member: boolean
}

export interface SlackReaction {
  name: string
  users: string[]
  count: number
}

export interface SlackMessage {
  type: 'message'
  subtype?: string
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
  reactions?: SlackReaction[]
  file?: SlackFile
}

// =============================================================================
// Slash Command Types
// =============================================================================

export interface SlashCommandDefinition {
  command: string // e.g., '/my-command'
  description: string // e.g., 'Generate images and more'
  usage_hint?: string // e.g., '[image <prompt>]'
}

export interface ShortcutDefinition {
  callback_id: string // e.g., 'my_message_shortcut'
  name: string // e.g., 'Action with this message'
  description: string // e.g., 'Do something with this message'
  type: 'message' | 'global'
}

export interface SlackAppConfig {
  app: {
    name: string
    id?: string // App ID for message isolation (from config.yaml app_id)
  }
  commands: SlashCommandDefinition[]
  shortcuts: ShortcutDefinition[]
  actions: Record<string, string>
  modals: Record<string, string>
}

export interface SlashCommandPayload {
  command: string
  text: string
  trigger_id: string
  user_id: string
  user_name: string
  channel_id: string
  channel_name: string
  team_id: string
  team_domain: string
  response_url: string
  api_app_id: string
}

export interface MessageShortcutPayload {
  type: 'shortcut'
  callback_id: string
  trigger_id: string
  message: {
    ts: string
    text: string
    files?: Array<{
      mimetype?: string
      url_private?: string
    }>
  }
  channel: { id: string }
  user: { id: string; username: string }
}

// =============================================================================
// View / Modal Types
// =============================================================================

export interface SlackViewTextObject {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

export interface SlackView {
  type: 'modal' | 'home'
  title?: SlackViewTextObject
  submit?: SlackViewTextObject
  close?: SlackViewTextObject
  blocks: unknown[]
  private_metadata?: string
  callback_id?: string
  clear_on_close?: boolean
  notify_on_close?: boolean
  external_id?: string
}

export interface ViewState {
  id: string
  view: SlackView
  triggerId: string
  userId: string
  channelId?: string
}

export interface ViewsOpenRequest {
  trigger_id: string
  view: SlackView
}

export interface ViewsOpenResponse {
  ok: boolean
  view?: SlackView & { id: string }
  error?: string
}

export interface ViewsUpdateRequest {
  view_id: string
  view: SlackView
  hash?: string
}

export interface ViewsUpdateResponse {
  ok: boolean
  view?: SlackView & { id: string }
  error?: string
}

// =============================================================================
// Socket Mode Types
// =============================================================================

export interface SocketModeHello {
  type: 'hello'
  connection_info: {
    app_id: string
  }
  num_connections: number
  debug_info: {
    host: string
    started: string
    approximate_connection_time: number
  }
}

export interface SocketModeEnvelope {
  envelope_id: string
  type: 'events_api' | 'interactive' | 'slash_commands'
  payload: EventPayload
  accepts_response_payload: boolean
}

export interface EventPayload {
  token: string
  team_id: string
  api_app_id: string
  event: SlackEvent
  type: 'event_callback'
  event_id: string
  event_time: number
}

export interface SlackEvent {
  type: 'message' | 'app_mention'
  user: string
  text: string
  channel: string
  ts: string
  thread_ts?: string
  channel_type?: 'channel' | 'im' | 'group'
}

export interface SocketModeAck {
  envelope_id: string
  payload?: unknown
}

// =============================================================================
// Web API Request/Response Types
// =============================================================================

// auth.test
export interface AuthTestResponse {
  ok: boolean
  url?: string
  team?: string
  user?: string
  team_id?: string
  user_id?: string
  bot_id?: string
  error?: string
}

// chat.postMessage
export interface ChatPostMessageRequest {
  channel: string
  text?: string
  thread_ts?: string
  blocks?: unknown[]
  attachments?: unknown[]
}

export interface ChatPostMessageResponse {
  ok: boolean
  channel?: string
  ts?: string
  message?: {
    type: string
    text: string
    user: string
    ts: string
  }
  error?: string
}

// reactions.add / reactions.remove
export interface ReactionsRequest {
  channel: string
  timestamp: string
  name: string
}

export interface ReactionsResponse {
  ok: boolean
  error?: string
}

// conversations.replies
export interface ConversationsRepliesResponse {
  ok: boolean
  messages?: Array<{
    type: string
    user: string
    text: string
    ts: string
    thread_ts?: string
  }>
  has_more?: boolean
  error?: string
}

// conversations.history
export interface ConversationsHistoryResponse {
  ok: boolean
  messages?: Array<{
    type: string
    user: string
    text: string
    ts: string
    thread_ts?: string
  }>
  has_more?: boolean
  error?: string
}

// users.info
export interface UsersInfoResponse {
  ok: boolean
  user?: SlackUser
  error?: string
}

// apps.connections.open
export interface AppsConnectionsOpenResponse {
  ok: boolean
  url?: string
  error?: string
}

// files.uploadV2
export interface FilesUploadV2Request {
  channel_id: string
  file: Blob | Buffer
  filename?: string
  title?: string
  initial_comment?: string
}

export interface SlackFile {
  id: string
  name: string
  title: string
  mimetype: string
  size?: number
  filetype?: string
  url_private: string
  url_private_download?: string
  thumb_360?: string
  thumb_480?: string
  timestamp?: number
  channels?: string[]
  user?: string
  isExpanded?: boolean
}

export interface FilesUploadV2Response {
  ok: boolean
  files?: SlackFile[]
  error?: string
}

// =============================================================================
// Connected Bot Types (for multi-bot registry)
// =============================================================================

export interface ConnectedBot {
  id: string // UUID generated on registration
  connectionId: string // WebSocket connection ID
  appConfig: SlackAppConfig // Bot's configuration
  connectedAt: Date
  status: 'connecting' | 'connected' | 'disconnected'
}

// =============================================================================
// Simulator-specific Types (for frontend communication)
// =============================================================================

export interface SimulatorUserMessageRequest {
  text: string
  channel: string
  thread_ts?: string
  user: string
  user_name?: string
}

export interface SimulatorUserMessageResponse {
  ok: boolean
  ts?: string
  error?: string
}

// SSE event for frontend real-time updates
export interface SimulatorEvent {
  type:
    | 'message'
    | 'reaction_added'
    | 'reaction_removed'
    | 'typing'
    | 'view_open'
    | 'view_update'
    | 'view_close'
    | 'file_shared'
    | 'bot_connecting' // WebSocket connected, waiting for config registration
    | 'bot_connected'
    | 'bot_disconnected'
  message?: SlackMessage
  channel?: string
  user?: string
  reaction?: string
  item_ts?: string
  // View-related fields
  viewId?: string
  view?: SlackView
  // File-related fields
  file?: SlackFile
  // Bot-related fields
  bot?: ConnectedBot
  botId?: string
  connectionId?: string // For bot_connecting events before bot is registered
}

// =============================================================================
// Workspace Configuration
// =============================================================================

export interface WorkspaceConfig {
  team_id: string
  team_name: string
  bot: {
    id: string
    name: string
    display_name: string
  }
  users: SlackUser[]
  channels: SlackChannel[]
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  team_id: 'T_SIMULATOR',
  team_name: 'Simulator Workspace',
  bot: {
    id: 'U_BOT',
    name: 'bot',
    display_name: 'Bot',
  },
  users: [
    {
      id: 'U_USER',
      name: 'simulator_user',
      real_name: 'Simulator User',
      is_bot: false,
      profile: { display_name: 'You' },
    },
  ],
  channels: [
    {
      id: 'C_GENERAL',
      name: 'general',
      is_channel: true,
      is_im: false,
      is_member: true,
    },
    {
      id: 'C_RANDOM',
      name: 'random',
      is_channel: true,
      is_im: false,
      is_member: true,
    },
    {
      id: 'D_USER',
      name: 'direct_message',
      is_channel: false,
      is_im: true,
      is_member: true,
    },
  ],
}
