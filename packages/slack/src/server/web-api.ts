/**
 * Slack Web API endpoint handlers for the emulator
 * Implements the REST API that bots call to send messages, add reactions, etc.
 */

import type {
  AuthTestResponse,
  ChatPostMessageRequest,
  ChatPostMessageResponse,
  ReactionsRequest,
  ReactionsResponse,
  ConversationsRepliesResponse,
  ConversationsHistoryResponse,
  UsersInfoResponse,
  AppsConnectionsOpenResponse,
  SlackMessage,
  SimulatorUserMessageRequest,
  SimulatorUserMessageResponse,
  SlashCommandDefinition,
  SlackAppConfig,
  ViewsOpenRequest,
  ViewsOpenResponse,
  ViewsUpdateRequest,
  ViewsUpdateResponse,
  SlashCommandPayload,
  FilesUploadV2Response,
  SlackFile,
  SlackView,
} from './types'
import type { EmulatorState, EventCallback } from './state'
import type { SocketModeServer } from './socket-mode'
import { webApiLogger } from '../lib/logger'
import { getEmulatorWsUrl, getEmulatorUrl } from '../lib/config'

export class SlackWebAPI {
  private state: EmulatorState
  private socketMode: SocketModeServer
  private frontendCallbacks: Set<EventCallback> = new Set()
  private wsUrl: string

  constructor(
    state: EmulatorState,
    socketMode: SocketModeServer,
    wsUrl: string = getEmulatorWsUrl()
  ) {
    this.state = state
    this.socketMode = socketMode
    this.wsUrl = wsUrl

    // Forward state events to frontend callbacks
    this.state.onEvent((event) => {
      for (const callback of this.frontendCallbacks) {
        callback(event)
      }
    })
  }

  /**
   * Extract bot ID from authentication token.
   * Tokens are formatted as xoxb-{botId} (e.g., "xoxb-simple" -> "simple")
   */
  private extractBotIdFromToken(token: string | null): string | undefined {
    if (!token) return undefined
    // Handle tokens like "xoxb-simple" or "xoxb-my-bot"
    if (token.startsWith('xoxb-')) {
      return token.slice(5) // Remove "xoxb-" prefix
    }
    return undefined
  }

  /**
   * Get bot info from token, falling back to global bot info if not found.
   */
  private getBotInfoFromToken(token: string | null): {
    id: string
    name: string
    display_name: string
  } {
    const botId = this.extractBotIdFromToken(token)
    if (botId) {
      const botInfo = this.state.getBotInfoById(botId)
      if (botInfo) return botInfo
    }
    // Fallback to global bot info for backward compatibility
    return this.state.getBotInfo()
  }

  /**
   * Parse request body - handles both JSON and form-urlencoded formats
   * Slack's Web API can send requests in either format
   */
  private async parseBody<T>(req: Request): Promise<T> {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      const params = new URLSearchParams(text)
      const result: Record<string, unknown> = {}
      for (const [key, value] of params) {
        // Slack clients send JSON-encoded fields (blocks, attachments, etc.)
        // in form data — parse them back into objects/arrays
        if (
          (value.startsWith('[') && value.endsWith(']')) ||
          (value.startsWith('{') && value.endsWith('}'))
        ) {
          try {
            result[key] = JSON.parse(value)
          } catch {
            result[key] = value
          }
        } else {
          result[key] = value
        }
      }
      return result as T
    }

    // Default to JSON parsing
    return req.json() as Promise<T>
  }

  /**
   * Get params from either URL query string or request body
   * Slack's Web API methods can use either GET with query params or POST with body
   */
  private async getParams(req: Request): Promise<URLSearchParams> {
    const url = new URL(req.url)

    // First check URL query params
    if (url.searchParams.toString()) {
      return url.searchParams
    }

    // Otherwise parse from body (form-urlencoded or JSON)
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text()
      return new URLSearchParams(text)
    }

    // Handle JSON body - convert to URLSearchParams format
    try {
      const body = await req.json()
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value))
        }
      }
      return params
    } catch {
      return new URLSearchParams()
    }
  }

  // ==========================================================================
  // Frontend Event Subscription (for SSE)
  // ==========================================================================

  onFrontendEvent(callback: EventCallback): () => void {
    this.frontendCallbacks.add(callback)
    return () => this.frontendCallbacks.delete(callback)
  }

  // ==========================================================================
  // Request Handler
  // ==========================================================================

  async handleRequest(req: Request, path: string): Promise<Response> {
    console.log(`[Emulator] API request: ${req.method} ${path}`)

    // Validate authorization for Slack API routes
    const token =
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? null

    // Accept any token starting with xoxb- or xoxp-
    // Also whitelist internal simulator endpoints
    const isValidToken =
      token?.startsWith('xoxb-') ||
      token?.startsWith('xoxp-') ||
      !path.startsWith('/api/') ||
      path === '/api/apps.connections.open' ||
      path === '/api/config/register' ||
      path === '/api/commands/register'

    if (!isValidToken && path.startsWith('/api/')) {
      return Response.json(
        { ok: false, error: 'invalid_auth' },
        { status: 401, headers: corsHeaders() }
      )
    }

    try {
      switch (path) {
        // Slack Web API endpoints
        case '/api/auth.test':
          return this.authTest(token)

        case '/api/chat.postMessage':
          return this.chatPostMessage(await this.parseBody(req), token)

        case '/api/chat.update':
          return this.chatUpdate(await this.parseBody(req), token)

        case '/api/chat.postEphemeral':
          return this.chatPostEphemeral(await this.parseBody(req), token)

        case '/api/chat.delete':
          return this.chatDelete(await this.parseBody(req), token)

        case '/api/reactions.add':
          return this.reactionsAdd(await this.parseBody(req), token)

        case '/api/reactions.remove':
          return this.reactionsRemove(await this.parseBody(req), token)

        case '/api/conversations.replies':
          return this.conversationsReplies(await this.getParams(req))

        case '/api/conversations.history':
          return this.conversationsHistory(await this.getParams(req))

        case '/api/users.info':
          return this.usersInfo(await this.getParams(req))

        case '/api/apps.connections.open':
          return this.appsConnectionsOpen()

        // Views API endpoints
        case '/api/views.open':
          return this.viewsOpen(await this.parseBody(req), token)

        case '/api/views.update':
          return this.viewsUpdate(await this.parseBody(req))

        case '/api/views.push':
          return this.viewsPush(await this.parseBody(req), token)

        case '/api/files.uploadV2':
          return this.filesUploadV2(req, token)

        case '/api/files.getUploadURLExternal':
          return this.filesGetUploadURLExternal(await this.parseBody(req))

        case '/api/files.completeUploadExternal': {
          const body = (await this.parseBody(req)) as {
            files?: Array<{ id: string; title?: string }> | string
            channel_id?: string
            channels?: string
            channel?: string
            initial_comment?: string
          }
          console.log(
            '[Emulator] files.completeUploadExternal raw body:',
            JSON.stringify(body, null, 2)
          )
          return this.filesCompleteUploadExternal(body, token)
        }

        case '/api/files.info':
          return this.filesInfo(await this.getParams(req))

        default:
          console.log('[Emulator] Unknown API method called:', path)
          return Response.json(
            { ok: false, error: 'unknown_method' },
            { status: 404, headers: corsHeaders() }
          )
      }
    } catch (err) {
      webApiLogger.error({ err, path }, 'Error handling request')
      return Response.json(
        { ok: false, error: 'internal_error' },
        { status: 500, headers: corsHeaders() }
      )
    }
  }

  // ==========================================================================
  // Slack Web API Endpoints
  // ==========================================================================

  private authTest(token: string | null): Response {
    const botInfo = this.getBotInfoFromToken(token)
    const response: AuthTestResponse = {
      ok: true,
      url: `${getEmulatorUrl()}/`,
      team: this.state.getTeamName(),
      user: botInfo.name,
      team_id: this.state.getTeamId(),
      user_id: botInfo.id,
      bot_id: `B${botInfo.id.slice(1)}`, // B_BOT from U_BOT
    }
    return Response.json(response, { headers: corsHeaders() })
  }

  private async chatPostMessage(
    body: ChatPostMessageRequest,
    token: string | null
  ): Promise<Response> {
    const { channel, text, thread_ts, blocks } = body

    webApiLogger.debug({ body, channel, text }, 'chat.postMessage request')

    // Slack allows either text or blocks (or both)
    if (!channel || (!text && !blocks)) {
      webApiLogger.error(
        { channel, text, hasChannel: !!channel, hasText: !!text, hasBlocks: !!blocks },
        'chat.postMessage missing required argument'
      )
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const botInfo = this.getBotInfoFromToken(token)
    const ts = this.state.generateTimestamp()
    const messageText = text || ''

    // Auto-generate block_id for blocks missing one
    const processedBlocks = blocks
      ? (blocks as Array<Record<string, unknown>>).map((block, index) => {
          if (!block.block_id) {
            return { ...block, block_id: `block_${index}` }
          }
          return block
        })
      : undefined

    const message: SlackMessage = {
      type: 'message',
      channel,
      user: botInfo.id,
      text: messageText,
      ts,
      thread_ts,
      blocks: processedBlocks,
    }

    // Store the message
    this.state.addMessage(message)

    const response: ChatPostMessageResponse = {
      ok: true,
      channel,
      ts,
      message: {
        type: 'message',
        text: messageText,
        user: botInfo.id,
        ts,
      },
    }

    webApiLogger.debug(`chat.postMessage: ${messageText.substring(0, 50)}...`)
    return Response.json(response, { headers: corsHeaders() })
  }

  private async chatPostEphemeral(
    body: { channel: string; user: string; text?: string; blocks?: unknown[] },
    token: string | null
  ): Promise<Response> {
    const { channel, text, user, blocks } = body

    if (!channel || !user || (!text && !blocks)) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const botInfo = this.getBotInfoFromToken(token)
    const ts = this.state.generateTimestamp()
    const messageText = text || ''

    const message: SlackMessage = {
      type: 'message',
      subtype: 'ephemeral',
      channel,
      user: botInfo.id,
      text: messageText,
      ts,
      blocks: blocks as Array<Record<string, unknown>> | undefined,
    }

    this.state.addMessage(message)

    webApiLogger.debug(`chat.postEphemeral: ${messageText.substring(0, 50)}...`)
    return Response.json(
      { ok: true, channel, ts, message_ts: ts },
      { headers: corsHeaders() }
    )
  }

  private async chatUpdate(
    body: ChatPostMessageRequest & { ts: string },
    _token: string | null
  ): Promise<Response> {
    const { channel, text, ts, blocks } = body

    if (!channel || !ts) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const message = this.state.getMessage(channel, ts)
    if (!message) {
      return Response.json(
        { ok: false, error: 'message_not_found' },
        { headers: corsHeaders() }
      )
    }

    // Update the message text
    if (text) {
      message.text = text
    }

    // Update blocks if provided
    if (blocks !== undefined) {
      if (blocks) {
        // Auto-generate block_id for blocks missing one
        message.blocks = (blocks as Array<Record<string, unknown>>).map(
          (block, index) => {
            if (!block.block_id) {
              return { ...block, block_id: `block_${index}` }
            }
            return block
          }
        )
      } else {
        delete message.blocks
      }
    }

    // Persist updated message (includes blocks changes)
    this.state.persistMessage(message)

    // Emit message_update event so the UI can re-render
    this.state.emitEvent({ type: 'message_update', message, channel })

    return Response.json(
      { ok: true, channel, ts, text: message.text },
      { headers: corsHeaders() }
    )
  }

  private async chatDelete(
    body: { channel: string; ts: string },
    _token: string | null
  ): Promise<Response> {
    const { channel, ts } = body

    if (!channel || !ts) {
      return Response.json(
        { ok: false, error: 'missing_required_field' },
        { headers: corsHeaders() }
      )
    }

    const deleted = this.state.deleteMessage(ts)
    if (!deleted) {
      return Response.json(
        { ok: false, error: 'message_not_found' },
        { headers: corsHeaders() }
      )
    }

    // Emit SSE event so the frontend removes the message
    this.state.emitEvent({ type: 'message_delete', ts, channel })

    webApiLogger.debug(`chat.delete: ${channel} ${ts}`)
    return Response.json(
      { ok: true, channel, ts },
      { headers: corsHeaders() }
    )
  }

  private async reactionsAdd(
    body: ReactionsRequest,
    token: string | null
  ): Promise<Response> {
    const { channel, timestamp, name } = body

    if (!channel || !timestamp || !name) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const botInfo = this.getBotInfoFromToken(token)
    const success = this.state.addReaction(channel, timestamp, botInfo.id, name)

    if (!success) {
      return Response.json(
        { ok: false, error: 'message_not_found' },
        { headers: corsHeaders() }
      )
    }

    const response: ReactionsResponse = { ok: true }
    webApiLogger.debug(`reactions.add: ${name} on ${timestamp}`)
    return Response.json(response, { headers: corsHeaders() })
  }

  private async reactionsRemove(
    body: ReactionsRequest,
    token: string | null
  ): Promise<Response> {
    const { channel, timestamp, name } = body

    if (!channel || !timestamp || !name) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const botInfo = this.getBotInfoFromToken(token)
    const success = this.state.removeReaction(
      channel,
      timestamp,
      botInfo.id,
      name
    )

    if (!success) {
      return Response.json(
        { ok: false, error: 'no_reaction' },
        { headers: corsHeaders() }
      )
    }

    const response: ReactionsResponse = { ok: true }
    webApiLogger.debug(`reactions.remove: ${name} on ${timestamp}`)
    return Response.json(response, { headers: corsHeaders() })
  }

  private conversationsReplies(params: URLSearchParams): Response {
    const channel = params.get('channel')
    const ts = params.get('ts')
    const limit = parseInt(params.get('limit') ?? '100', 10)

    if (!channel || !ts) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const messages = this.state.getThreadMessages(channel, ts).slice(-limit)

    const response: ConversationsRepliesResponse = {
      ok: true,
      messages: messages.map((m) => ({
        type: m.type,
        user: m.user,
        text: m.text,
        ts: m.ts,
        thread_ts: m.thread_ts,
        ...(m.blocks ? { blocks: m.blocks } : {}),
      })),
      has_more: false,
    }

    return Response.json(response, { headers: corsHeaders() })
  }

  private conversationsHistory(params: URLSearchParams): Response {
    const channel = params.get('channel')
    const limit = parseInt(params.get('limit') ?? '100', 10)

    if (!channel) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const messages = this.state.getChannelMessages(channel, limit)

    const response: ConversationsHistoryResponse = {
      ok: true,
      messages: messages.map((m) => ({
        type: m.type,
        user: m.user,
        text: m.text,
        ts: m.ts,
        thread_ts: m.thread_ts,
        ...(m.blocks ? { blocks: m.blocks } : {}),
      })),
      has_more: false,
    }

    return Response.json(response, { headers: corsHeaders() })
  }

  private usersInfo(params: URLSearchParams): Response {
    const userId = params.get('user')

    if (!userId) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const user = this.state.getUser(userId)
    if (!user) {
      return Response.json(
        { ok: false, error: 'user_not_found' },
        { headers: corsHeaders() }
      )
    }

    const response: UsersInfoResponse = { ok: true, user }
    return Response.json(response, { headers: corsHeaders() })
  }

  private appsConnectionsOpen(): Response {
    // Return WebSocket URL with a ticket
    const ticket = crypto.randomUUID()
    const url = `${this.wsUrl}?ticket=${ticket}`

    const response: AppsConnectionsOpenResponse = { ok: true, url }
    webApiLogger.debug(`apps.connections.open: ${url}`)
    return Response.json(response, { headers: corsHeaders() })
  }

  // ==========================================================================
  // Views API Endpoints
  // ==========================================================================

  /**
   * Parse view if it's a JSON string (happens with form-urlencoded requests)
   */
  private parseViewIfString(view: SlackView | string): SlackView {
    if (typeof view === 'string') {
      return JSON.parse(view) as SlackView
    }
    return view
  }

  private viewsOpen(
    body: ViewsOpenRequest,
    token: string | null
  ): Response {
    const { trigger_id, view: rawView } = body
    webApiLogger.info({ trigger_id, hasView: !!rawView }, 'views.open called')
    const view = this.parseViewIfString(rawView as SlackView | string)

    if (!trigger_id || !view) {
      webApiLogger.warn('views.open missing argument')
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    // Get context from trigger_id
    const context = this.state.getTriggerContext(trigger_id)
    if (!context) {
      webApiLogger.warn({ trigger_id }, 'views.open: expired trigger_id')
      return Response.json(
        { ok: false, error: 'expired_trigger_id' },
        { headers: corsHeaders() }
      )
    }

    const viewId = this.state.generateViewId()
    webApiLogger.info({ viewId, title: view.title?.text }, 'Creating view')

    // Extract bot ID from token for targeted dispatch
    const botId = this.extractBotIdFromToken(token)

    // Store the view (this emits view_open event via SSE)
    this.state.storeView({
      id: viewId,
      view,
      triggerId: trigger_id,
      userId: context.userId,
      channelId: context.channelId,
      botId,
    })
    webApiLogger.info({ viewId, botId }, 'View stored and event emitted')

    const response: ViewsOpenResponse = {
      ok: true,
      view: { ...view, id: viewId },
    }
    return Response.json(response, { headers: corsHeaders() })
  }

  private viewsUpdate(body: ViewsUpdateRequest): Response {
    const { view_id, view: rawView } = body
    const view = this.parseViewIfString(rawView as SlackView | string)

    if (!view_id || !view) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const success = this.state.updateView(view_id, view)
    if (!success) {
      return Response.json(
        { ok: false, error: 'view_not_found' },
        { headers: corsHeaders() }
      )
    }

    const response: ViewsUpdateResponse = {
      ok: true,
      view: { ...view, id: view_id },
    }
    webApiLogger.debug(`views.update: ${view_id}`)
    return Response.json(response, { headers: corsHeaders() })
  }

  private viewsPush(
    body: ViewsOpenRequest,
    token: string | null
  ): Response {
    // views.push is similar to views.open but pushes onto a stack
    // For now, implement same as views.open
    return this.viewsOpen(body, token)
  }

  private async filesUploadV2(
    req: Request,
    token: string | null
  ): Promise<Response> {
    try {
      const formData = await req.formData()
      const channelId = formData.get('channel_id') as string
      const file = formData.get('file') as Blob | null
      const filename = (formData.get('filename') as string) || 'file'
      const title = (formData.get('title') as string) || filename
      const initialComment = formData.get('initial_comment') as string | null

      if (!channelId || !file) {
        return Response.json(
          { ok: false, error: 'missing_argument' },
          { headers: corsHeaders() }
        )
      }

      // Generate file ID and timestamp
      const fileId = `F${Date.now()}`
      const ts = this.state.generateTimestamp()

      // Convert file blob to base64 data URL for storage
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mimeType = file.type || 'image/png'
      const dataUrl = `data:${mimeType};base64,${base64}`

      // Create file object
      const slackFile: SlackFile = {
        id: fileId,
        name: filename,
        title,
        mimetype: mimeType,
        url_private: dataUrl,
        thumb_360: dataUrl,
        thumb_480: dataUrl,
        timestamp: Math.floor(Date.now() / 1000),
      }

      // Store file in state
      this.state.storeFile(slackFile)

      // Create message with file attachment
      const botInfo = this.getBotInfoFromToken(token)
      const messageText = initialComment || `Shared a file: ${title}`

      const message: SlackMessage = {
        type: 'message',
        channel: channelId,
        user: botInfo.id,
        text: messageText,
        ts,
      }

      // Store the message
      this.state.addMessage(message)

      // Emit event to frontend with file info
      this.state.emitEvent({
        type: 'file_shared',
        message,
        channel: channelId,
        file: slackFile,
      })

      const response: FilesUploadV2Response = {
        ok: true,
        files: [slackFile],
      }

      webApiLogger.debug(`files.uploadV2: ${filename} -> ${channelId}`)
      return Response.json(response, { headers: corsHeaders() })
    } catch (err) {
      webApiLogger.error({ err }, 'Failed to handle files.uploadV2')
      return Response.json(
        { ok: false, error: 'internal_error' },
        { status: 500, headers: corsHeaders() }
      )
    }
  }

  private filesGetUploadURLExternal(body: {
    filename?: string
    length?: number
  }): Response {
    console.log('[Emulator] files.getUploadURLExternal called:', body)
    const filename = body.filename || 'file'
    const length = body.length || 0

    // Generate a file ID
    const fileId = `F${Date.now()}${Math.floor(Math.random() * 10000)}`

    // Store pending upload info
    this.state.createPendingUpload(fileId, filename, length)

    // Return upload URL pointing to our server
    const uploadUrl = `${getEmulatorUrl()}/api/simulator/file-upload/${fileId}`

    console.log('[Emulator] Returning upload URL:', uploadUrl)
    webApiLogger.info(`files.getUploadURLExternal: ${fileId} -> ${uploadUrl}`)

    return Response.json(
      {
        ok: true,
        upload_url: uploadUrl,
        file_id: fileId,
      },
      { headers: corsHeaders() }
    )
  }

  private async filesCompleteUploadExternal(
    body: {
      files?: Array<{ id: string; title?: string }> | string
      channel_id?: string
      channels?: string // SDK might use 'channels' instead of 'channel_id'
      channel?: string // SDK might also use 'channel'
      initial_comment?: string
    },
    token: string | null
  ): Promise<Response> {
    webApiLogger.info({ body }, 'filesCompleteUploadExternal called')

    // files may be a JSON string if sent as form-urlencoded
    let fileRefs = body.files
    if (typeof fileRefs === 'string') {
      try {
        fileRefs = JSON.parse(fileRefs) as Array<{ id: string; title?: string }>
      } catch {
        webApiLogger.warn({ fileRefs }, 'Failed to parse files as JSON')
        fileRefs = []
      }
    }

    // SDK might send 'channels', 'channel', or 'channel_id'
    const channel_id = body.channel_id || body.channels || body.channel
    const { initial_comment } = body

    webApiLogger.info(
      { channel_id, fileCount: Array.isArray(fileRefs) ? fileRefs.length : 0 },
      'Processing file upload completion'
    )

    if (!Array.isArray(fileRefs) || fileRefs.length === 0) {
      webApiLogger.warn('No valid files array in request')
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const completedFiles: SlackFile[] = []

    for (const fileRef of fileRefs as Array<{ id: string; title?: string }>) {
      const fileId = fileRef.id
      const pendingUpload = this.state.getPendingUpload(fileId)

      if (!pendingUpload) {
        webApiLogger.warn(`Pending upload not found: ${fileId}`)
        continue
      }

      // Get the uploaded data
      const data = this.state.completePendingUpload(fileId)
      if (!data) {
        webApiLogger.warn(`No data for pending upload: ${fileId}`)
        continue
      }

      // Validate PNG magic bytes for debugging
      const isPNG =
        data[0] === 0x89 &&
        data[1] === 0x50 &&
        data[2] === 0x4e &&
        data[3] === 0x47
      webApiLogger.info(
        {
          fileId,
          size: data.length,
          isPNG,
          first8Bytes: data.slice(0, 8).toString('hex'),
        },
        'filesCompleteUploadExternal - retrieved data'
      )

      // Store raw buffer and generate HTTP URL (instead of data URL)
      const mimeType = this.getMimeType(pendingUpload.filename)
      const fileUrl = `${getEmulatorUrl()}/api/simulator/files/${fileId}`

      // Create file object with HTTP URL
      const botInfo = this.getBotInfoFromToken(token)
      const slackFile: SlackFile = {
        id: fileId,
        name: pendingUpload.filename,
        title: fileRef.title || pendingUpload.filename,
        mimetype: mimeType,
        size: data.length,
        url_private: fileUrl,
        thumb_360: fileUrl,
        thumb_480: fileUrl,
        timestamp: Math.floor(Date.now() / 1000),
        channels: channel_id ? [channel_id] : [],
        user: botInfo.id,
      }

      // Store file metadata first, then data (so persistence can find the file)
      this.state.storeFile(slackFile)
      this.state.storeFileData(fileId, data)

      webApiLogger.info(
        {
          filename: pendingUpload.filename,
          dataSize: data.length,
          mimeType,
          fileUrl,
          isPNG,
        },
        'Stored file for HTTP serving'
      )
      completedFiles.push(slackFile)

      // If channel specified, post message with file
      webApiLogger.info(
        { channel_id, hasChannel: !!channel_id },
        'Checking if should post to channel'
      )
      if (channel_id) {
        webApiLogger.info(`Creating message for channel ${channel_id}`)
        const ts = this.state.generateTimestamp()
        const messageText =
          initial_comment || `Shared a file: ${slackFile.title}`

        const message: SlackMessage = {
          type: 'message',
          channel: channel_id,
          user: botInfo.id,
          text: messageText,
          ts,
          file: slackFile, // Attach file for persistence
        }

        // Store message in state without emitting 'message' event
        // We'll emit 'file_shared' instead which includes the file
        this.state.storeMessageSilently(message)

        // Emit file_shared event to frontend (only one event, not two)
        this.state.emitEvent({
          type: 'file_shared',
          message,
          channel: channel_id,
          file: slackFile,
        })
        webApiLogger.info(
          `Emitted file_shared event for ${slackFile.id} to channel ${channel_id}`
        )
      } else {
        webApiLogger.warn(
          'No channel_id provided, skipping message creation and SSE event'
        )
      }
    }

    webApiLogger.info(
      `files.completeUploadExternal: ${completedFiles.length} file(s) completed to channel ${channel_id}`
    )

    return Response.json(
      {
        ok: true,
        files: completedFiles,
      },
      { headers: corsHeaders() }
    )
  }

  private filesInfo(params: URLSearchParams): Response {
    const fileId = params.get('file')

    if (!fileId) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const file = this.state.getFile(fileId)
    if (!file) {
      webApiLogger.warn(`files.info: File not found: ${fileId}`)
      return Response.json(
        { ok: false, error: 'file_not_found' },
        { headers: corsHeaders() }
      )
    }

    // Return file info with url_private_download for the bot to fetch
    webApiLogger.info(
      { fileId, name: file.name },
      'files.info returning file info'
    )
    return Response.json(
      {
        ok: true,
        file: {
          ...file,
          url_private_download: file.url_private,
        },
      },
      { headers: corsHeaders() }
    )
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  /**
   * Handle file upload from Slack SDK (called at the upload_url returned by getUploadURLExternal)
   */
  async handleFileUpload(req: Request, fileId: string): Promise<Response> {
    const pendingUpload = this.state.getPendingUpload(fileId)
    if (!pendingUpload) {
      webApiLogger.warn(`File upload: pending upload not found: ${fileId}`)
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders(),
      })
    }

    try {
      const contentType = req.headers.get('content-type') || ''
      webApiLogger.info(
        { contentType, method: req.method },
        'File upload request received'
      )
      let data: Buffer

      if (contentType.includes('multipart/form-data')) {
        // Slack SDK sends file as multipart/form-data - extract the file
        const formData = await req.formData()

        // Log all form data keys to find the file field name
        const keys = Array.from(formData.keys())
        webApiLogger.info({ formDataKeys: keys }, 'Form data keys received')

        // Try common field names for file uploads
        let file = formData.get('file') as Blob | null
        if (!file) file = formData.get('content') as Blob | null
        if (!file) file = formData.get('data') as Blob | null

        // If still no file, try to find any Blob/File in the form data
        if (!file) {
          for (const key of keys) {
            const value = formData.get(key)
            if (value instanceof Blob) {
              file = value
              webApiLogger.info({ foundFileInKey: key }, 'Found file blob')
              break
            }
          }
        }

        if (!file) {
          // Log all values and their types for debugging
          for (const key of keys) {
            const value = formData.get(key)
            webApiLogger.info(
              {
                key,
                type: typeof value,
                isBlob: value instanceof Blob,
                valuePreview:
                  typeof value === 'string'
                    ? value.substring(0, 100)
                    : 'not a string',
              },
              'Form data value'
            )
          }
          webApiLogger.warn(
            { keys },
            'No file blob found in multipart form data'
          )
          return new Response('No file provided', {
            status: 400,
            headers: corsHeaders(),
          })
        }

        const arrayBuffer = await file.arrayBuffer()
        data = Buffer.from(arrayBuffer)
        webApiLogger.info(
          { contentType: 'multipart/form-data', fileSize: data.length },
          'Extracted file from form data'
        )
      } else {
        // Raw binary upload
        const arrayBuffer = await req.arrayBuffer()
        data = Buffer.from(arrayBuffer)
        webApiLogger.info(
          { contentType, fileSize: data.length },
          'Raw binary upload'
        )
      }

      // Validate PNG magic bytes for debugging
      const isPNG =
        data[0] === 0x89 &&
        data[1] === 0x50 &&
        data[2] === 0x4e &&
        data[3] === 0x47
      webApiLogger.info(
        {
          fileId,
          size: data.length,
          isPNG,
          first8Bytes: data.slice(0, 8).toString('hex'),
        },
        'File upload received - validating PNG'
      )

      // Store the data
      this.state.setPendingUploadData(fileId, data)

      webApiLogger.info(`File upload stored: ${fileId} (${data.length} bytes)`)

      // Return success (Slack expects 200 OK with no specific body)
      return new Response('OK', {
        status: 200,
        headers: corsHeaders(),
      })
    } catch (err) {
      webApiLogger.error({ err }, 'Failed to handle file upload')
      return new Response('Internal Server Error', {
        status: 500,
        headers: corsHeaders(),
      })
    }
  }

  /**
   * Serve a file via HTTP (called at /api/simulator/files/{fileId})
   */
  async handleGetFile(fileId: string): Promise<Response> {
    const file = this.state.getFile(fileId)
    const data = await this.state.getFileDataAsync(fileId)

    if (!file || !data) {
      webApiLogger.warn(`File not found: ${fileId}`)
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders(),
      })
    }

    // Validate PNG magic bytes for debugging
    const isPNG =
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    webApiLogger.info(
      {
        fileId,
        size: data.length,
        isPNG,
        first8Bytes: data.slice(0, 8).toString('hex'),
        mimetype: file.mimetype,
      },
      'handleGetFile - serving file'
    )

    // Convert Buffer to Uint8Array for Response body
    const body = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': file.mimetype,
        'Content-Length': String(data.length),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // ==========================================================================
  // Simulator-specific Endpoints (for frontend)
  // ==========================================================================

  async handleSimulatorUserMessage(
    body: SimulatorUserMessageRequest
  ): Promise<Response> {
    const { text, channel, thread_ts, user } = body

    webApiLogger.info(
      { text, channel, user, thread_ts },
      'Received user message'
    )

    if (!text || !channel || !user) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const ts = this.state.generateTimestamp()

    // Create and store user message
    const message: SlackMessage = {
      type: 'message',
      channel,
      user,
      text,
      ts,
      thread_ts,
    }
    this.state.addMessage(message)

    // Dispatch message event to all connected bots
    // The bot decides whether to respond based on its own logic
    await this.socketMode.dispatchMessageEvent(
      channel,
      user,
      text,
      ts,
      thread_ts
    )

    // Check if the message contains a mention of any connected bot
    // If so, dispatch an app_mention event (like real Slack does)
    const isIM = this.state.isDirectMessage(channel)
    if (!isIM) {
      const lowerText = text.toLowerCase()
      const connectedBots = this.state.getBots()

      for (const bot of connectedBots) {
        if (bot.status !== 'connected') continue

        const botName = bot.appConfig.app?.name?.toLowerCase()
        const botId = bot.appConfig.app?.id?.toLowerCase()

        // Check for @mention or plain mention of either bot name or id
        const isMentioned =
          (botName &&
            (lowerText.includes(`@${botName}`) ||
              lowerText.includes(botName))) ||
          (botId &&
            (lowerText.includes(`@${botId}`) || lowerText.includes(botId)))

        if (isMentioned) {
          await this.socketMode.dispatchAppMentionEvent(
            channel,
            user,
            text,
            ts,
            thread_ts,
            bot.id
          )
          break // Only dispatch once even if multiple bots are mentioned
        }
      }
    }

    const response: SimulatorUserMessageResponse = { ok: true, ts }
    return Response.json(response, { headers: corsHeaders() })
  }

  // ==========================================================================
  // Command Registration & Execution
  // ==========================================================================

  handleCommandRegister(body: {
    commands: SlashCommandDefinition[]
  }): Response {
    if (!body.commands || !Array.isArray(body.commands)) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    this.state.registerCommands(body.commands)
    webApiLogger.info(`Registered ${body.commands.length} command(s)`)

    return Response.json({ ok: true }, { headers: corsHeaders() })
  }

  getSimulatorCommands(): Response {
    const commands = this.state.getCommands()
    return Response.json({ ok: true, commands }, { headers: corsHeaders() })
  }

  async handleConfigRegister(config: SlackAppConfig): Promise<Response> {
    if (!config || !config.app) {
      return Response.json(
        { ok: false, error: 'invalid_config' },
        { headers: corsHeaders() }
      )
    }

    // Try to find a WebSocket connection to associate with this bot
    const connectionId = this.socketMode.getUnassociatedConnectionId()

    // Require WebSocket connection before registration
    // This prevents bots from being marked as "connected" without an active socket
    if (!connectionId) {
      webApiLogger.warn(
        `Bot ${config.app.name} attempted to register without WebSocket connection`
      )
      return Response.json(
        {
          ok: false,
          error: 'no_websocket_connection',
          message:
            'WebSocket connection required before registration. Please retry.',
        },
        { status: 503, headers: corsHeaders() }
      )
    }

    try {
      const botId = await this.state.registerBot(connectionId, config)

      // Confirm the connection claim after successful registration
      this.socketMode.confirmConnectionClaim(connectionId)

      webApiLogger.info(
        `Registered bot: ${config.app.name} (${botId}) via connection ${connectionId}`
      )

      // Include bot-specific merged settings in response so external bots can apply them
      // Use app.id first (matches how settings are stored), fallback to name
      const botSettings = this.state.getSettingsForBot(
        config.app.id || config.app.name
      )

      return Response.json(
        { ok: true, bot_id: botId, settings: botSettings },
        { headers: corsHeaders() }
      )
    } catch (err) {
      // Release the connection claim if registration fails
      this.socketMode.releaseConnectionClaim(connectionId)
      webApiLogger.error({ err }, `Failed to register bot: ${config.app.name}`)
      return Response.json(
        { ok: false, error: 'registration_failed' },
        { status: 500, headers: corsHeaders() }
      )
    }
  }

  getSimulatorConfig(): Response {
    const config = this.state.getAppConfig()
    return Response.json({ ok: true, config }, { headers: corsHeaders() })
  }

  getConnectedBots(): Response {
    const bots = this.state.getBots().map((bot) => ({
      id: bot.id,
      name: bot.appConfig.app.name,
      connectedAt: bot.connectedAt.toISOString(),
      status: bot.status,
      commands: bot.appConfig.commands?.length ?? 0,
      shortcuts: bot.appConfig.shortcuts?.length ?? 0,
      configPort: bot.appConfig.app.configPort,
    }))
    return Response.json({ ok: true, bots }, { headers: corsHeaders() })
  }

  async handleSimulatorSlashCommand(body: {
    command: string
    text: string
    channel: string
    user: string
    user_name?: string
  }): Promise<Response> {
    const { command, text, channel, user, user_name } = body
    webApiLogger.info(
      { command, text, channel, user },
      'Received slash command from frontend'
    )

    if (!command || !channel || !user) {
      webApiLogger.warn('Missing argument in slash command')
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    // Generate trigger_id and store context for views.open
    const triggerId = this.state.generateTriggerId()
    const channelInfo = this.state.getChannel(channel)

    this.state.storeTriggerContext(triggerId, {
      userId: user,
      channelId: channel,
      userName: user_name,
      channelName: channelInfo?.name,
    })
    webApiLogger.info({ triggerId }, 'Stored trigger context')

    // Build response URL (for deferred responses)
    const responseUrl = `${getEmulatorUrl()}/api/simulator/response/${triggerId}`

    // Create slash command payload
    const payload: SlashCommandPayload = {
      command,
      text: text || '',
      trigger_id: triggerId,
      user_id: user,
      user_name: user_name || 'simulator_user',
      channel_id: channel,
      channel_name: channelInfo?.name || channel,
      team_id: this.state.getTeamId(),
      team_domain: 'simulator',
      response_url: responseUrl,
      api_app_id: 'A_SIMULATOR',
    }

    // Dispatch to the bot that owns this command (or broadcast as fallback)
    const targetBot = this.state.getBotForCommand(command)
    webApiLogger.info(
      { connectedBots: this.socketMode.getConnectionCount(), targetBot: targetBot?.id },
      'Dispatching slash command'
    )
    await this.socketMode.dispatchSlashCommand(payload, targetBot?.id)
    webApiLogger.info('Slash command dispatched successfully')

    return Response.json(
      { ok: true, trigger_id: triggerId },
      { headers: corsHeaders() }
    )
  }

  async handleSimulatorViewSubmit(body: {
    view_id: string
    values: Record<string, Record<string, unknown>>
  }): Promise<Response> {
    const { view_id, values } = body

    if (!view_id) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const viewState = this.state.getView(view_id)
    if (!viewState) {
      return Response.json(
        { ok: false, error: 'view_not_found' },
        { headers: corsHeaders() }
      )
    }

    // Process uploaded files from form values
    // Convert files with dataUrl to stored files with IDs
    const processedValues = await this.processFileUploadsInValues(values)

    // Add type discriminators to state.values based on element types in the view's blocks
    const viewBlocks = viewState.view.blocks || []
    const typedValues = this.addTypeDiscriminators(processedValues, viewBlocks)

    // Dispatch view_submission to the bot that opened this view
    await this.socketMode.dispatchInteractive(
      {
        type: 'view_submission',
        view: {
          ...viewState.view,
          id: view_id,
          state: { values: typedValues },
          private_metadata: viewState.view.private_metadata,
          callback_id: viewState.view.callback_id,
        },
        user: {
          id: viewState.userId,
          username: 'simulator_user',
        },
      },
      viewState.botId
    )

    // Note: Don't close the view here - bot may need to update it
    // (e.g., show "generating" status, then result)
    // View will be closed when user clicks close or bot explicitly closes it

    return Response.json({ ok: true }, { headers: corsHeaders() })
  }

  /**
   * Process form values to store uploaded files and convert to Slack format
   * Files with dataUrl are stored in state and converted to { id } format
   */
  private async processFileUploadsInValues(
    values: Record<string, Record<string, unknown>>
  ): Promise<Record<string, Record<string, unknown>>> {
    const processed: Record<string, Record<string, unknown>> = {}

    for (const [blockId, actionValues] of Object.entries(values)) {
      processed[blockId] = {}

      for (const [actionId, value] of Object.entries(actionValues)) {
        // Check if this is a file input value with files array
        if (
          value &&
          typeof value === 'object' &&
          'files' in value &&
          Array.isArray((value as { files: unknown[] }).files)
        ) {
          const filesWithDataUrl = (
            value as {
              files: Array<{
                id?: string
                name: string
                dataUrl: string
                mimetype: string
              }>
            }
          ).files

          // Store each file and get file IDs
          const fileRefs: Array<{ id: string }> = []

          for (const file of filesWithDataUrl) {
            if (file.dataUrl) {
              // Generate file ID
              const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

              // Extract base64 data from dataUrl
              const base64Match = file.dataUrl.match(
                /^data:([^;]+);base64,(.+)$/
              )
              if (base64Match) {
                const mimetype = base64Match[1]
                const base64Data = base64Match[2]
                const buffer = Buffer.from(base64Data!, 'base64')

                // Create file object
                const fileUrl = `${getEmulatorUrl()}/api/simulator/files/${fileId}`
                const slackFile: SlackFile = {
                  id: fileId,
                  name: file.name,
                  title: file.name,
                  mimetype: mimetype!,
                  size: buffer.length,
                  url_private: fileUrl,
                  thumb_360: fileUrl,
                  thumb_480: fileUrl,
                  timestamp: Math.floor(Date.now() / 1000),
                }

                // Store file metadata and data
                this.state.storeFile(slackFile)
                this.state.storeFileData(fileId, buffer)

                webApiLogger.info(
                  { fileId, name: file.name, size: buffer.length },
                  'Stored uploaded file from modal'
                )

                fileRefs.push({ id: fileId })
              }
            } else if (file.id) {
              // Already has an ID, just pass through
              fileRefs.push({ id: file.id })
            }
          }

          processed[blockId][actionId] = { files: fileRefs }
        } else {
          // Pass through non-file values
          processed[blockId][actionId] = value
        }
      }
    }

    return processed
  }

  /**
   * Add type discriminators to state.values based on the element types in the view's blocks.
   * Slack includes a `type` field in each value object matching the element type
   * (e.g., "plain_text_input", "static_select", "checkboxes", "file_input").
   */
  private addTypeDiscriminators(
    values: Record<string, Record<string, unknown>>,
    blocks: unknown[]
  ): Record<string, Record<string, unknown>> {
    // Build a lookup of block_id -> element info from the view's blocks
    const elementInfoMap = new Map<
      string,
      Map<string, { type: string; options?: Array<Record<string, unknown>> }>
    >()

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i] as Record<string, unknown>
      if (block.type !== 'input') continue

      const blockId = (block.block_id as string) || `block-${i}`
      const element = block.element as Record<string, unknown> | undefined
      if (!element?.type) continue

      const actionId = (element.action_id as string) || ''
      if (!elementInfoMap.has(blockId)) {
        elementInfoMap.set(blockId, new Map())
      }
      elementInfoMap.get(blockId)!.set(actionId, {
        type: element.type as string,
        options: element.options as
          | Array<Record<string, unknown>>
          | undefined,
      })
    }

    // Add type discriminator and restructure values to match Slack's format
    const result: Record<string, Record<string, unknown>> = {}
    for (const [blockId, actionValues] of Object.entries(values)) {
      result[blockId] = {}
      for (const [actionId, value] of Object.entries(actionValues)) {
        if (value && typeof value === 'object') {
          const elementInfo = elementInfoMap.get(blockId)?.get(actionId)
          if (elementInfo) {
            const val = value as Record<string, unknown>
            // Restructure static_select: { value: "x" } -> { selected_option: {...}, type }
            if (
              elementInfo.type === 'static_select' &&
              'value' in val &&
              !('selected_option' in val)
            ) {
              const selectedValue = val.value as string
              const option = elementInfo.options?.find(
                (o) => o.value === selectedValue
              )
              result[blockId][actionId] = {
                selected_option: option || {
                  text: { type: 'plain_text', text: selectedValue },
                  value: selectedValue,
                },
                type: elementInfo.type,
              }
            } else if (
              elementInfo.type === 'radio_buttons' &&
              'value' in val &&
              !('selected_option' in val)
            ) {
              // Restructure radio_buttons: { value: "x" } -> { selected_option: {...}, type }
              const selectedValue = val.value as string
              const option = elementInfo.options?.find(
                (o) => o.value === selectedValue
              )
              result[blockId][actionId] = {
                selected_option: option || {
                  text: { type: 'plain_text', text: selectedValue },
                  value: selectedValue,
                },
                type: elementInfo.type,
              }
            } else if (elementInfo.type === 'datepicker' && 'value' in val) {
              result[blockId][actionId] = {
                selected_date: (val.value as string) || null,
                type: elementInfo.type,
              }
            } else if (elementInfo.type === 'timepicker' && 'value' in val) {
              result[blockId][actionId] = {
                selected_time: (val.value as string) || null,
                type: elementInfo.type,
              }
            } else if (elementInfo.type === 'datetimepicker' && 'value' in val) {
              result[blockId][actionId] = {
                selected_date_time: val.value ? Number(val.value) : null,
                type: elementInfo.type,
              }
            } else {
              result[blockId][actionId] = {
                ...val,
                type: elementInfo.type,
              }
            }
          } else {
            result[blockId][actionId] = value
          }
        } else {
          result[blockId][actionId] = value
        }
      }
    }

    return result
  }

  handleSimulatorViewClose(body: { view_id: string }): Response {
    const { view_id } = body

    if (!view_id) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    const success = this.state.closeView(view_id)
    if (!success) {
      return Response.json(
        { ok: false, error: 'view_not_found' },
        { headers: corsHeaders() }
      )
    }

    return Response.json({ ok: true }, { headers: corsHeaders() })
  }

  async handleSimulatorBlockAction(body: {
    // Modal context (existing)
    view_id?: string
    // Message context (new)
    message_ts?: string
    channel_id?: string
    // Action fields
    action_id: string
    block_id?: string
    element_type?: string // "button", "static_select", "checkboxes", etc.
    // Element-specific values (UI sends the one that matches element_type)
    value?: string
    selected_option?: { text: { type: string; text: string }; value: string }
    selected_options?: Array<{
      text: { type: string; text: string }
      value: string
    }>
    // Picker-specific values
    selected_date?: string
    selected_time?: string
    selected_date_time?: number
    user: string
  }): Promise<Response> {
    const { action_id, user } = body

    if (!action_id) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    // Generate a new trigger_id for the action (bot may need it to update view)
    const triggerId = this.state.generateTriggerId()

    // Build element-specific action object
    const elementType = body.element_type || 'button'
    const action: Record<string, unknown> = {
      type: elementType,
      action_id,
      block_id: body.block_id || 'command_block',
      action_ts: String(Date.now() / 1000),
    }

    // Include element-specific value fields
    if (elementType === 'button') {
      action.value = body.value
    } else if (elementType === 'static_select') {
      action.selected_option = body.selected_option
    } else if (elementType === 'overflow') {
      action.selected_option = body.selected_option
    } else if (elementType === 'radio_buttons') {
      action.selected_option = body.selected_option
    } else if (elementType === 'checkboxes') {
      action.selected_options = body.selected_options
    } else if (elementType === 'datepicker') {
      action.selected_date = body.selected_date
    } else if (elementType === 'timepicker') {
      action.selected_time = body.selected_time
    } else if (elementType === 'datetimepicker') {
      action.selected_date_time = body.selected_date_time
    } else {
      // For other types, include whichever value fields are present
      if (body.value !== undefined) action.value = body.value
      if (body.selected_option !== undefined)
        action.selected_option = body.selected_option
      if (body.selected_options !== undefined)
        action.selected_options = body.selected_options
    }

    if (body.view_id) {
      // Modal context path
      const viewState = this.state.getView(body.view_id)
      if (!viewState) {
        return Response.json(
          { ok: false, error: 'view_not_found' },
          { headers: corsHeaders() }
        )
      }

      this.state.storeTriggerContext(triggerId, {
        userId: user,
        channelId: viewState.channelId ?? '',
      })

      // Dispatch block_actions to the bot that opened this view
      await this.socketMode.dispatchInteractive(
        {
          type: 'block_actions',
          container: { type: 'view', view_id: body.view_id },
          view: {
            ...viewState.view,
            id: body.view_id,
            private_metadata: viewState.view.private_metadata,
          },
          user: {
            id: user,
            username: 'simulator_user',
          },
          actions: [action],
          trigger_id: triggerId,
        },
        viewState.botId
      )
    } else if (body.message_ts && body.channel_id) {
      // Message context path
      const msg = this.state.getMessage(body.channel_id, body.message_ts)
      if (!msg) {
        return Response.json(
          { ok: false, error: 'message_not_found' },
          { headers: corsHeaders() }
        )
      }

      const channelInfo = this.state.getChannel(body.channel_id)
      const channelName = channelInfo?.name || body.channel_id

      this.state.storeTriggerContext(triggerId, {
        userId: user,
        channelId: body.channel_id,
      })

      // Extract bot ID from message user (U_{botId} -> botId)
      const messageBotId =
        msg.user?.startsWith('U_') ? msg.user.slice(2) : undefined

      // Dispatch block_actions to the bot that sent this message
      await this.socketMode.dispatchInteractive(
        {
          type: 'block_actions',
          container: {
            type: 'message',
            message_ts: body.message_ts,
            channel_id: body.channel_id,
            is_ephemeral: false,
          },
          channel: { id: body.channel_id, name: channelName },
          message: {
            type: 'message',
            text: msg.text,
            user: msg.user,
            ts: msg.ts,
            blocks: msg.blocks,
          },
          user: {
            id: user,
            username: 'simulator_user',
          },
          actions: [action],
          trigger_id: triggerId,
        },
        messageBotId
      )
    } else {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    return Response.json({ ok: true }, { headers: corsHeaders() })
  }

  async handleSimulatorShortcut(body: {
    callback_id: string
    message: {
      ts: string
      text: string
      files?: Array<{
        mimetype?: string
        url_private?: string
      }>
    }
    channel: string
    user: string
    user_name?: string
  }): Promise<Response> {
    const { callback_id, message, channel, user, user_name } = body

    if (!callback_id || !message || !channel || !user) {
      return Response.json(
        { ok: false, error: 'missing_argument' },
        { headers: corsHeaders() }
      )
    }

    // Generate trigger_id and store context for views.open
    const triggerId = this.state.generateTriggerId()
    this.state.storeTriggerContext(triggerId, {
      userId: user,
      channelId: channel,
      userName: user_name,
    })

    webApiLogger.info(
      { callback_id, triggerId, channel },
      'Dispatching message shortcut'
    )

    // Dispatch shortcut to connected bots
    await this.socketMode.dispatchShortcut({
      type: 'shortcut',
      callback_id,
      trigger_id: triggerId,
      message: {
        ts: message.ts,
        text: message.text,
        files: message.files,
      },
      channel: { id: channel },
      user: { id: user, username: user_name || 'simulator_user' },
    })

    return Response.json(
      { ok: true, trigger_id: triggerId },
      { headers: corsHeaders() }
    )
  }

  // Status endpoint
  getStatus(): Response {
    return Response.json(
      {
        ok: true,
        connected_bots: this.socketMode.getConnectionCount(),
        connections: this.socketMode.getConnections(),
      },
      { headers: corsHeaders() }
    )
  }
}

// ==========================================================================
// CORS Headers Helper
// ==========================================================================

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
