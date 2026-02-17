/**
 * In-memory state management for the Slack emulator
 * Stores workspace data: channels, users, messages, reactions
 * Optionally persists to SQLite via EmulatorPersistence
 */

import type {
  SlackChannel,
  SlackMessage,
  SlackUser,
  WorkspaceConfig,
  SimulatorEvent,
  SlashCommandDefinition,
  SlackAppConfig,
  SlackView,
  ViewState,
  SlackFile,
  ConnectedBot,
} from './types'
import { DEFAULT_WORKSPACE_CONFIG } from './types'
import { EmulatorPersistence } from './persistence'
import { stateLogger } from '../lib/logger'
import { getEmulatorUrl } from '../lib/config'

export type EventCallback = (event: SimulatorEvent) => void

export interface TriggerContext {
  userId: string
  channelId: string
  userName?: string
  channelName?: string
}

export class EmulatorState {
  private config: WorkspaceConfig
  private users: Map<string, SlackUser> = new Map()
  private channels: Map<string, SlackChannel> = new Map()
  private messages: Map<string, SlackMessage[]> = new Map() // channel_id -> messages
  private eventCallbacks: Set<EventCallback> = new Set()
  private persistence: EmulatorPersistence | null = null

  // Slash commands, views, and app config
  private commands: Map<string, SlashCommandDefinition> = new Map()
  private appConfig: SlackAppConfig | null = null
  private views: Map<string, ViewState> = new Map()

  // Multi-bot registry
  private connectedBots: Map<string, ConnectedBot> = new Map()
  private connectionToBotId: Map<string, string> = new Map() // connectionId -> botId
  private triggerContexts: Map<string, TriggerContext> = new Map()
  private files: Map<string, SlackFile> = new Map()
  private fileData: Map<string, Buffer> = new Map() // Store raw file content
  private pendingUploads: Map<
    string,
    { filename: string; length: number; data?: Buffer }
  > = new Map()

  // Global simulator settings (pushed from Electron, provided to connecting bots)
  private simulatorSettings: Record<string, unknown> = {}

  constructor(config: WorkspaceConfig = DEFAULT_WORKSPACE_CONFIG) {
    this.config = config
    this.initializeWorkspace()
  }

  /**
   * Enable persistence - call this after construction to enable SQLite storage
   */
  async enablePersistence(dataDir: string): Promise<void> {
    this.persistence = new EmulatorPersistence(dataDir)
    await this.persistence.initialize()
    // Load files first so they're available when attaching to messages
    await this.loadPersistedFiles()
    await this.loadPersistedMessages()
  }

  /**
   * Load messages from persistence into memory
   */
  private async loadPersistedMessages(): Promise<void> {
    if (!this.persistence) return

    const records = await this.persistence.loadAllMessages()
    for (const record of records) {
      const message: SlackMessage = {
        type: 'message',
        channel: record.channel,
        user: record.user,
        text: record.text,
        ts: record.ts,
        thread_ts: record.threadTs,
        blocks: record.blocks,
        reactions: record.reactions?.map((reaction) => ({
          name: reaction.name,
          users: reaction.users ?? [],
          count: reaction.count ?? reaction.users?.length ?? 0,
        })),
      }
      // Attach file if this message has one
      if (record.fileId) {
        const file = this.files.get(record.fileId)
        if (file) {
          message.file = file
        }
      }
      // Load without emitting events or persisting again
      this.loadMessageToMemory(message)
    }
    stateLogger.info(`Loaded ${records.length} messages from persistence`)
  }

  /**
   * Load files from persistence into memory
   */
  private async loadPersistedFiles(): Promise<void> {
    if (!this.persistence) return

    const baseUrl = getEmulatorUrl()
    const records = await this.persistence.loadAllFiles()
    for (const record of records) {
      const fileUrl = `${baseUrl}/api/simulator/files/${record.id}`
      const file: SlackFile = {
        id: record.id,
        name: record.name,
        title: record.title || record.name,
        mimetype: record.mimetype,
        size: record.size,
        filetype: record.mimetype.split('/')[1] || 'binary',
        url_private: fileUrl,
        url_private_download: fileUrl,
        channels: record.channel ? [record.channel] : [],
        user: record.user,
        isExpanded: record.is_expanded,
      }
      // Load metadata only - file data is lazy-loaded from disk
      this.files.set(file.id, file)
    }
    stateLogger.info(`Loaded ${records.length} files from persistence`)
  }

  /**
   * Load a message into memory without emitting events
   */
  private loadMessageToMemory(message: SlackMessage): void {
    const channelMessages = this.messages.get(message.channel)
    if (!channelMessages) {
      this.messages.set(message.channel, [message])
    } else {
      channelMessages.push(message)
    }
  }

  /**
   * Clear only DM messages from memory (keep channel messages)
   * Used when switching between bots with different app_ids
   */
  private clearDmMessagesFromMemory(): void {
    for (const [channelId, _] of this.messages.entries()) {
      if (this.isDirectMessage(channelId) || channelId.startsWith('D_')) {
        this.messages.set(channelId, [])
      }
    }
    // Also clear DM files from memory
    for (const [fileId, file] of this.files.entries()) {
      const channel = file.channels?.[0]
      if (channel && channel.startsWith('D_')) {
        this.files.delete(fileId)
        this.fileData.delete(fileId)
      }
    }
  }

  /**
   * Load only DM messages from persistence for the current app
   * Used when switching between bots with different app_ids
   */
  private async loadPersistedDmMessages(): Promise<void> {
    if (!this.persistence) return

    const records = await this.persistence.loadAllMessages()
    for (const record of records) {
      // Only load DM messages (channel messages are already in memory)
      if (!record.channel.startsWith('D_')) continue

      const message: SlackMessage = {
        type: 'message',
        channel: record.channel,
        user: record.user,
        text: record.text,
        ts: record.ts,
        thread_ts: record.threadTs,
        blocks: record.blocks,
        reactions: record.reactions?.map((reaction) => ({
          name: reaction.name,
          users: reaction.users ?? [],
          count: reaction.count ?? reaction.users?.length ?? 0,
        })),
      }
      if (record.fileId) {
        const file = this.files.get(record.fileId)
        if (file) {
          message.file = file
        }
      }
      this.loadMessageToMemory(message)
    }
  }

  /**
   * Load only DM files from persistence for the current app
   * Used when switching between bots with different app_ids
   */
  private async loadPersistedDmFiles(): Promise<void> {
    if (!this.persistence) return

    const baseUrl = getEmulatorUrl()
    const records = await this.persistence.loadAllFiles()
    for (const record of records) {
      // Only load DM files (channel files are already in memory)
      if (!record.channel || !record.channel.startsWith('D_')) continue

      const fileUrl = `${baseUrl}/api/simulator/files/${record.id}`
      const file: SlackFile = {
        id: record.id,
        name: record.name,
        title: record.title || record.name,
        mimetype: record.mimetype,
        size: record.size,
        filetype: record.mimetype.split('/')[1] || 'binary',
        url_private: fileUrl,
        url_private_download: fileUrl,
        channels: record.channel ? [record.channel] : [],
        user: record.user,
        isExpanded: record.is_expanded,
      }
      this.files.set(file.id, file)
    }
  }

  private initializeWorkspace(): void {
    // Add bot user
    const botUser: SlackUser = {
      id: this.config.bot.id,
      name: this.config.bot.name,
      real_name: this.config.bot.display_name,
      is_bot: true,
      profile: { display_name: this.config.bot.display_name },
    }
    this.users.set(botUser.id, botUser)

    // Add configured users
    for (const user of this.config.users) {
      this.users.set(user.id, user)
    }

    // Add configured channels
    for (const channel of this.config.channels) {
      this.channels.set(channel.id, channel)
      this.messages.set(channel.id, [])
    }
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  emitEvent(event: SimulatorEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (err) {
        stateLogger.error({ err }, 'Error in event callback')
      }
    }
  }

  // ==========================================================================
  // Workspace Info
  // ==========================================================================

  getTeamId(): string {
    return this.config.team_id
  }

  getTeamName(): string {
    return this.config.team_name
  }

  getBotInfo(): { id: string; name: string; display_name: string } {
    return this.config.bot
  }

  /**
   * Get bot info for a specific registered bot by its app ID.
   * Returns a Slack-compatible bot identity with user_id derived from the app ID.
   */
  getBotInfoById(
    botId: string
  ): { id: string; name: string; display_name: string } | undefined {
    const bot = this.connectedBots.get(botId)
    if (!bot) return undefined

    const appConfig = bot.appConfig
    return {
      // Generate a consistent user ID from the app ID (e.g., "my-bot" -> "U_my-bot")
      // Fall back to botId for legacy bots that may not have appConfig.app.id
      id: `U_${appConfig.app.id || botId}`,
      name: appConfig.app.name,
      display_name: appConfig.app.name,
    }
  }

  // ==========================================================================
  // User Operations
  // ==========================================================================

  getUser(userId: string): SlackUser | undefined {
    return this.users.get(userId)
  }

  getAllUsers(): SlackUser[] {
    return Array.from(this.users.values())
  }

  // ==========================================================================
  // Channel Operations
  // ==========================================================================

  getChannel(channelId: string): SlackChannel | undefined {
    return this.channels.get(channelId)
  }

  getAllChannels(): SlackChannel[] {
    return Array.from(this.channels.values())
  }

  isDirectMessage(channelId: string): boolean {
    // Dynamic DM channels follow pattern D_{botId}
    if (channelId.startsWith('D_')) {
      return true
    }
    const channel = this.channels.get(channelId)
    return channel?.is_im ?? false
  }

  // ==========================================================================
  // Message Operations
  // ==========================================================================

  addMessage(message: SlackMessage): void {
    const channelMessages = this.messages.get(message.channel)
    if (!channelMessages) {
      stateLogger.warn(`Unknown channel: ${message.channel}`)
      this.messages.set(message.channel, [message])
    } else {
      channelMessages.push(message)
    }

    // Persist to SQLite
    if (this.persistence) {
      this.persistence.saveMessage(message).catch((err) => {
        stateLogger.error({ err }, 'Failed to persist message')
      })
    }

    this.emitEvent({ type: 'message', message })
  }

  getMessage(channel: string, ts: string): SlackMessage | undefined {
    const channelMessages = this.messages.get(channel)
    return channelMessages?.find((m) => m.ts === ts)
  }

  /** Re-persist a message that was modified in-place (e.g., chat.update) */
  persistMessage(message: SlackMessage): void {
    if (this.persistence) {
      this.persistence.saveMessage(message).catch((err) => {
        stateLogger.error({ err }, 'Failed to persist message')
      })
    }
  }

  /**
   * Store a message without emitting an event
   * Used when we want to emit a different event type (e.g., file_shared)
   */
  storeMessageSilently(message: SlackMessage): void {
    const channelMessages = this.messages.get(message.channel)
    if (!channelMessages) {
      stateLogger.warn(`Unknown channel: ${message.channel}`)
      this.messages.set(message.channel, [message])
    } else {
      channelMessages.push(message)
    }

    // Persist to SQLite
    if (this.persistence) {
      this.persistence.saveMessage(message).catch((err) => {
        stateLogger.error({ err }, 'Failed to persist message')
      })
    }
  }

  getChannelMessages(channel: string, limit?: number): SlackMessage[] {
    const messages = this.messages.get(channel) ?? []
    if (limit) {
      return messages.slice(-limit)
    }
    return [...messages]
  }

  getThreadMessages(channel: string, threadTs: string): SlackMessage[] {
    const messages = this.messages.get(channel) ?? []
    return messages.filter((m) => m.ts === threadTs || m.thread_ts === threadTs)
  }

  getAllMessages(): SlackMessage[] {
    const allMessages: SlackMessage[] = []
    for (const channelMessages of this.messages.values()) {
      allMessages.push(...channelMessages)
    }
    // Sort by timestamp
    return allMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts))
  }

  deleteMessage(ts: string): boolean {
    // Find and remove from memory
    for (const [_channel, channelMessages] of this.messages.entries()) {
      const index = channelMessages.findIndex((m) => m.ts === ts)
      if (index !== -1) {
        channelMessages.splice(index, 1)
        // Persist deletion
        if (this.persistence) {
          this.persistence.deleteMessage(ts).catch((err) => {
            stateLogger.error(
              { err },
              'Failed to delete message from persistence'
            )
          })
        }
        return true
      }
    }
    return false
  }

  /**
   * Delete a message by channel and timestamp (for chat.delete API)
   */
  deleteMessageByChannelAndTs(channel: string, ts: string): boolean {
    const channelMessages = this.messages.get(channel)
    if (!channelMessages) return false

    const messageIndex = channelMessages.findIndex(msg => msg.ts === ts)
    if (messageIndex === -1) return false

    channelMessages.splice(messageIndex, 1)

    // Persist deletion
    if (this.persistence) {
      this.persistence.deleteMessage(ts).catch((err) => {
        stateLogger.error(
          { err },
          'Failed to delete message from persistence'
        )
      })
    }

    stateLogger.info({ channel, ts }, 'Message deleted by channel and ts')
    return true
  }

  // ==========================================================================
  // Reaction Operations
  // ==========================================================================

  addReaction(
    channel: string,
    ts: string,
    userId: string,
    reactionName: string
  ): boolean {
    const message = this.getMessage(channel, ts)
    if (!message) {
      return false
    }

    if (!message.reactions) {
      message.reactions = []
    }

    let reaction = message.reactions.find((r) => r.name === reactionName)
    if (!reaction) {
      reaction = { name: reactionName, users: [], count: 0 }
      message.reactions.push(reaction)
    }

    if (!reaction.users.includes(userId)) {
      reaction.users.push(userId)
      reaction.count = reaction.users.length

      // Persist reaction change
      if (this.persistence && message.reactions) {
        this.persistence.updateReactions(ts, message.reactions).catch((err) => {
          stateLogger.error({ err }, 'Failed to persist reaction')
        })
      }

      this.emitEvent({
        type: 'reaction_added',
        channel,
        item_ts: ts,
        user: userId,
        reaction: reactionName,
      })
    }

    return true
  }

  removeReaction(
    channel: string,
    ts: string,
    userId: string,
    reactionName: string
  ): boolean {
    const message = this.getMessage(channel, ts)
    if (!message?.reactions) {
      return false
    }

    const reaction = message.reactions.find((r) => r.name === reactionName)
    if (!reaction) {
      return false
    }

    const userIndex = reaction.users.indexOf(userId)
    if (userIndex === -1) {
      return false
    }

    reaction.users.splice(userIndex, 1)
    reaction.count = reaction.users.length

    if (reaction.count === 0) {
      message.reactions = message.reactions.filter(
        (r) => r.name !== reactionName
      )
    }

    // Persist reaction change
    if (this.persistence) {
      this.persistence
        .updateReactions(ts, message.reactions || [])
        .catch((err) => {
          stateLogger.error({ err }, 'Failed to persist reaction removal')
        })
    }

    this.emitEvent({
      type: 'reaction_removed',
      channel,
      item_ts: ts,
      user: userId,
      reaction: reactionName,
    })

    return true
  }

  // ==========================================================================
  // Slash Command Operations
  // ==========================================================================

  registerCommand(command: SlashCommandDefinition): void {
    this.commands.set(command.command, command)
    stateLogger.info(`Registered command: ${command.command}`)
  }

  registerCommands(commands: SlashCommandDefinition[]): void {
    for (const command of commands) {
      this.registerCommand(command)
    }
  }

  getCommand(command: string): SlashCommandDefinition | undefined {
    return this.commands.get(command)
  }

  getCommands(): SlashCommandDefinition[] {
    return Array.from(this.commands.values())
  }

  clearCommands(): void {
    this.commands.clear()
  }

  // ==========================================================================
  // App Config Operations
  // ==========================================================================

  registerAppConfig(config: SlackAppConfig): void {
    this.appConfig = config
    stateLogger.info(`Registered app config: ${config.app.name}`)
  }

  getAppConfig(): SlackAppConfig | null {
    return this.appConfig
  }

  // ==========================================================================
  // Multi-Bot Registry Operations
  // ==========================================================================

  /**
   * Register a bot when it connects and sends its config.
   * If a disconnected bot with the same app name exists, reuse it.
   * Returns the bot ID.
   */
  async registerBot(
    connectionId: string,
    appConfig: SlackAppConfig
  ): Promise<string> {
    // Switch bot id for filtering DM messages
    const appId = appConfig.app?.id
    if (appId && this.persistence) {
      const currentAppId = this.persistence.getAppId()
      if (currentAppId !== appId) {
        stateLogger.info({ appId, currentAppId }, 'Switching to bot id')
        this.persistence.setAppId(appId)
        // Clear only DM messages from memory (keep channel messages)
        this.clearDmMessagesFromMemory()
        // Reload DM messages and files for the new app
        await this.loadPersistedDmFiles()
        await this.loadPersistedDmMessages()
      }
    }

    // Check for existing disconnected/connecting bot with the same id (preferred) or name (fallback)
    // Using id is more reliable since names may not be unique
    const newBotId = appConfig.app?.id
    const existingBot = Array.from(this.connectedBots.values()).find((bot) => {
      if (bot.status !== 'disconnected' && bot.status !== 'connecting')
        return false

      // Prefer matching by id if both have one
      if (newBotId && bot.appConfig.app?.id) {
        return bot.appConfig.app.id === newBotId
      }

      // Fall back to name matching for backward compatibility
      return bot.appConfig.app.name === appConfig.app.name
    })

    let bot: ConnectedBot
    let botId: string

    if (existingBot) {
      // Reuse existing bot entry
      botId = existingBot.id
      existingBot.connectionId = connectionId
      existingBot.appConfig = appConfig
      existingBot.connectedAt = new Date()
      existingBot.status = 'connected'
      bot = existingBot
      stateLogger.info(
        `Bot reconnected: ${appConfig.app.name} (${botId}) via connection ${connectionId}`
      )
    } else {
      // Create new bot entry
      // Use the app.id from config if available, otherwise generate a UUID
      botId = newBotId || crypto.randomUUID()
      bot = {
        id: botId,
        connectionId,
        appConfig,
        connectedAt: new Date(),
        status: 'connected',
      }
      this.connectedBots.set(botId, bot)
      stateLogger.info(
        `Bot registered: ${appConfig.app.name} (${botId}) via connection ${connectionId}`
      )
    }

    this.connectionToBotId.set(connectionId, botId)

    // Also register commands from this bot
    if (appConfig.commands) {
      this.registerCommands(appConfig.commands)
    }

    // Keep appConfig for backward compatibility
    this.appConfig = appConfig

    // Emit bot_connected event
    this.emitEvent({ type: 'bot_connected', bot })

    return botId
  }

  /**
   * Mark a bot as disconnected when its WebSocket connection closes.
   * Bot stays in the list so users can still browse historical conversations.
   */
  unregisterBot(connectionId: string): ConnectedBot | undefined {
    const botId = this.connectionToBotId.get(connectionId)
    if (!botId) return undefined

    const bot = this.connectedBots.get(botId)
    if (bot) {
      bot.status = 'disconnected'
      // Keep bot in connectedBots but clear the connection mapping
      this.connectionToBotId.delete(connectionId)

      stateLogger.info(`Bot disconnected: ${bot.appConfig.app.name} (${botId})`)

      // Emit bot_disconnected event (frontend updates status indicator)
      this.emitEvent({ type: 'bot_disconnected', botId, bot })
    }

    return bot
  }

  /**
   * Get a bot by its ID
   */
  getBot(botId: string): ConnectedBot | undefined {
    return this.connectedBots.get(botId)
  }

  /**
   * Get a bot by its connection ID
   */
  getBotByConnectionId(connectionId: string): ConnectedBot | undefined {
    const botId = this.connectionToBotId.get(connectionId)
    return botId ? this.connectedBots.get(botId) : undefined
  }

  /**
   * Find a connected bot by its token
   */
  getBotByToken(token: string): ConnectedBot | undefined {
    return Array.from(this.connectedBots.values()).find(
      (bot) => `xoxb-${bot.id}` === token
    )
  }

  /**
   * Get all connected bots
   */
  getBots(): ConnectedBot[] {
    return Array.from(this.connectedBots.values())
  }

  /**
   * Get bots that are connected but don't have an active WebSocket connection.
   * These are bots registered via the synthetic connection path.
   */
  getOrphanedBots(activeConnectionIds: Set<string>): ConnectedBot[] {
    return Array.from(this.connectedBots.values()).filter(
      (bot) =>
        bot.status === 'connected' && !activeConnectionIds.has(bot.connectionId)
    )
  }

  /**
   * Mark a specific bot as disconnected by ID
   */
  markBotDisconnected(botId: string): void {
    const bot = this.connectedBots.get(botId)
    if (bot && bot.status === 'connected') {
      bot.status = 'disconnected'
      stateLogger.info(
        `Bot marked disconnected: ${bot.appConfig.app.name} (${botId})`
      )
      this.emitEvent({ type: 'bot_disconnected', botId, bot })
    }
  }

  /**
   * Try to auto-reconnect a disconnected bot when a new WebSocket connects.
   * This handles hot-reload case where bot reconnects while simulator is running.
   * Returns the reconnected bot if successful, undefined otherwise.
   */
  tryReconnectBot(_connectionId: string): ConnectedBot | undefined {
    // Find disconnected bots in memory
    const disconnectedBots = Array.from(this.connectedBots.values()).filter(
      (bot) => bot.status === 'disconnected'
    )

    // If there's exactly one disconnected bot, mark it as reconnecting
    // Don't fully associate the connection yet - let registration do that
    // This allows getUnassociatedConnectionId() to find the connection for registration
    if (disconnectedBots.length === 1) {
      const bot = disconnectedBots[0]
      if (bot) {
        // Mark as 'connecting' - will become 'connected' after registration
        // This prevents UI from fetching config with stale configPort
        bot.status = 'connecting'
        bot.connectedAt = new Date()
        // Don't set connectionToBotId here - let registration handle it
        // so getUnassociatedConnectionId() can find this connection

        stateLogger.info(
          `Bot auto-reconnecting: ${bot.appConfig.app.name} (${bot.id}) - waiting for registration`
        )
        // Don't emit bot_connected here - wait for registration to update appConfig
        // with new configPort before notifying UI
        return bot
      }
    }

    return undefined
  }

  /**
   * Get all commands aggregated from all connected bots
   */
  getAllBotCommands(): SlashCommandDefinition[] {
    const allCommands: SlashCommandDefinition[] = []
    for (const bot of this.connectedBots.values()) {
      if (bot.appConfig.commands) {
        allCommands.push(...bot.appConfig.commands)
      }
    }
    return allCommands
  }

  /**
   * Find the connected bot that registered a given command
   */
  getBotForCommand(command: string): ConnectedBot | undefined {
    for (const bot of this.connectedBots.values()) {
      if (bot.status !== 'connected') continue
      if (bot.appConfig.commands?.some((c) => c.command === command)) {
        return bot
      }
    }
    return undefined
  }

  // ==========================================================================
  // View / Modal Operations
  // ==========================================================================

  storeView(viewState: ViewState): void {
    this.views.set(viewState.id, viewState)
    this.emitEvent({
      type: 'view_open',
      viewId: viewState.id,
      view: viewState.view,
    })
  }

  getView(viewId: string): ViewState | undefined {
    return this.views.get(viewId)
  }

  updateView(viewId: string, view: SlackView): boolean {
    const existing = this.views.get(viewId)
    if (!existing) {
      return false
    }
    existing.view = view
    this.emitEvent({
      type: 'view_update',
      viewId,
      view,
    })
    return true
  }

  closeView(viewId: string): boolean {
    const existing = this.views.get(viewId)
    if (!existing) {
      return false
    }
    this.views.delete(viewId)
    this.emitEvent({
      type: 'view_close',
      viewId,
    })
    return true
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  storeFile(file: SlackFile): void {
    this.files.set(file.id, file)
  }

  getFile(fileId: string): SlackFile | undefined {
    return this.files.get(fileId)
  }

  /**
   * Update file expanded state in memory and persist to database
   */
  async updateFileExpanded(
    fileId: string,
    isExpanded: boolean
  ): Promise<boolean> {
    const file = this.files.get(fileId)
    if (!file) return false

    file.isExpanded = isExpanded

    if (this.persistence) {
      await this.persistence.updateFileExpanded(fileId, isExpanded)
    }

    return true
  }

  /**
   * Store file data and persist to disk if persistence is enabled
   */
  storeFileData(fileId: string, data: Buffer): void {
    // Keep in memory for immediate access
    this.fileData.set(fileId, data)

    // Persist to disk if enabled
    if (this.persistence) {
      const file = this.files.get(fileId)
      if (file) {
        this.persistence.saveFile(file, data).catch((err) => {
          stateLogger.error({ err }, 'Failed to persist file')
        })
      }
    }
  }

  /**
   * Get file data - loads from disk if not in memory
   */
  async getFileDataAsync(fileId: string): Promise<Buffer | undefined> {
    // Check memory first
    const memoryData = this.fileData.get(fileId)
    if (memoryData) return memoryData

    // Try loading from disk if persistence is enabled
    if (this.persistence) {
      const diskData = await this.persistence.loadFileData(fileId)
      if (diskData) {
        // Cache in memory for subsequent requests
        this.fileData.set(fileId, diskData)
        return diskData
      }
    }

    return undefined
  }

  /**
   * @deprecated Use getFileDataAsync instead for persisted files
   */
  getFileData(fileId: string): Buffer | undefined {
    return this.fileData.get(fileId)
  }

  // ==========================================================================
  // Pending Upload Operations
  // ==========================================================================

  createPendingUpload(fileId: string, filename: string, length: number): void {
    this.pendingUploads.set(fileId, { filename, length })
    // Auto-expire after 5 minutes
    setTimeout(() => {
      this.pendingUploads.delete(fileId)
    }, 300000)
  }

  getPendingUpload(
    fileId: string
  ): { filename: string; length: number; data?: Buffer } | undefined {
    return this.pendingUploads.get(fileId)
  }

  setPendingUploadData(fileId: string, data: Buffer): boolean {
    const upload = this.pendingUploads.get(fileId)
    if (!upload) return false
    upload.data = data
    return true
  }

  completePendingUpload(fileId: string): Buffer | undefined {
    const upload = this.pendingUploads.get(fileId)
    if (!upload?.data) return undefined
    const data = upload.data
    this.pendingUploads.delete(fileId)
    return data
  }

  // ==========================================================================
  // Trigger Context Operations
  // ==========================================================================

  storeTriggerContext(triggerId: string, context: TriggerContext): void {
    this.triggerContexts.set(triggerId, context)
    // Auto-expire after 30 seconds (Slack's trigger_id timeout is ~3s, using longer for safety margin)
    setTimeout(() => {
      this.triggerContexts.delete(triggerId)
    }, 30000)
  }

  getTriggerContext(triggerId: string): TriggerContext | undefined {
    return this.triggerContexts.get(triggerId)
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  generateTriggerId(): string {
    return `${Date.now()}.${Math.floor(Math.random() * 1000000)}.${crypto.randomUUID().slice(0, 8)}`
  }

  generateViewId(): string {
    return `V${Date.now()}${Math.floor(Math.random() * 10000)}`
  }

  generateTimestamp(): string {
    // Slack uses Unix timestamp with microseconds: "1234567890.123456"
    const now = Date.now()
    const seconds = Math.floor(now / 1000)
    const microseconds = (now % 1000) * 1000 + Math.floor(Math.random() * 1000)
    return `${seconds}.${String(microseconds).padStart(6, '0')}`
  }

  generateEventId(): string {
    return `Ev${Date.now()}${Math.floor(Math.random() * 10000)}`
  }

  generateEnvelopeId(): string {
    return crypto.randomUUID()
  }

  // ==========================================================================
  // Persistence Helpers (for integration with SQLite store)
  // ==========================================================================

  clearChannel(channelId: string): void {
    this.messages.set(channelId, [])
    if (this.persistence) {
      this.persistence.clearChannel(channelId).catch((err) => {
        stateLogger.error({ err }, 'Failed to clear channel from persistence')
      })
    }
  }

  clearAll(): void {
    for (const channelId of this.messages.keys()) {
      this.messages.set(channelId, [])
    }
    if (this.persistence) {
      this.persistence.clearAll().catch((err) => {
        stateLogger.error({ err }, 'Failed to clear all from persistence')
      })
    }
  }

  loadMessages(messages: SlackMessage[]): void {
    for (const message of messages) {
      const channelMessages = this.messages.get(message.channel)
      if (channelMessages) {
        channelMessages.push(message)
      } else {
        this.messages.set(message.channel, [message])
      }
    }
  }

  // ==========================================================================
  // Simulator Settings (pushed from Electron, provided to connecting bots)
  // ==========================================================================

  setSimulatorSettings(settings: Record<string, unknown>): void {
    this.simulatorSettings = settings
    stateLogger.debug(
      { keys: Object.keys(settings) },
      'Simulator settings updated'
    )
  }

  getSimulatorSettings(): Record<string, unknown> {
    return this.simulatorSettings
  }

  /**
   * Get settings merged with bot-specific overrides
   * Bot-specific settings from _app_settings[botId] take precedence
   */
  getSettingsForBot(botId: string): Record<string, unknown> {
    // Fields that should never be inherited from global settings
    // These are bot-specific and should only come from the bot's own config
    const NON_INHERITABLE_FIELDS = new Set([
      'BOT_NAME',
      'BOT_PERSONALITY',
      'bot_name',
      'bot_personality',
    ])

    const appSettings = this.simulatorSettings._app_settings as
      | Record<string, Record<string, unknown>>
      | undefined

    stateLogger.debug(
      { botId, availableKeys: appSettings ? Object.keys(appSettings) : [] },
      'Looking up bot-specific settings'
    )

    const botSettings = appSettings?.[botId]

    // Filter out non-inheritable fields from global settings
    const { _app_settings, ...rawGlobalSettings } = this.simulatorSettings
    const globalSettings: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rawGlobalSettings)) {
      if (!NON_INHERITABLE_FIELDS.has(key)) {
        globalSettings[key] = value
      }
    }

    if (!botSettings) {
      stateLogger.debug(
        { botId },
        'No bot-specific settings found, using global'
      )
      return globalSettings
    }

    // Merge: global settings + bot-specific overrides (converted to uppercase)
    const mergedSettings = { ...globalSettings }

    // Bot settings are stored in snake_case, convert to UPPER_SNAKE_CASE
    for (const [key, value] of Object.entries(botSettings)) {
      if (key.startsWith('_')) continue
      if (value === undefined || value === null || value === '') continue
      const envKey = key.toUpperCase()
      mergedSettings[envKey] = value
    }

    // After merging bot settings, validate MODEL_DEFAULT against AI_PROVIDER
    // This handles the case where provider changed but bot-specific model wasn't updated
    const provider = mergedSettings.AI_PROVIDER as string | undefined
    if (provider) {
      const isModelCompatibleWithProvider = (
        modelId: string,
        prov: string
      ): boolean => {
        const hasSlash = modelId.includes('/')
        // OpenRouter models contain "/", other providers don't
        return prov === 'openrouter' ? hasSlash : !hasSlash
      }

      const DEFAULT_MODELS: Record<string, string> = {
        openai: 'gpt-4o',
        anthropic: 'claude-sonnet-4-5',
        google: 'gemini-2.0-flash',
        openrouter: 'anthropic/claude-sonnet-4',
      }

      const modelDefault = mergedSettings.MODEL_DEFAULT as string | undefined
      if (modelDefault && DEFAULT_MODELS[provider]) {
        if (!isModelCompatibleWithProvider(modelDefault, provider)) {
          mergedSettings.MODEL_DEFAULT = DEFAULT_MODELS[provider]
        }
      } else if (!modelDefault && DEFAULT_MODELS[provider]) {
        mergedSettings.MODEL_DEFAULT = DEFAULT_MODELS[provider]
      }

      // Apply same logic to MODEL_FAST and MODEL_THINKING
      const modelFast = mergedSettings.MODEL_FAST as string | undefined
      if (modelFast && !isModelCompatibleWithProvider(modelFast, provider)) {
        delete mergedSettings.MODEL_FAST
      }
      const modelThinking = mergedSettings.MODEL_THINKING as string | undefined
      if (
        modelThinking &&
        !isModelCompatibleWithProvider(modelThinking, provider)
      ) {
        delete mergedSettings.MODEL_THINKING
      }
    }

    stateLogger.debug(
      { botId, overrideKeys: Object.keys(botSettings) },
      'Merged bot-specific settings'
    )
    return mergedSettings
  }

  close(): void {
    this.persistence?.close()
  }
}

// Singleton instance
let instance: EmulatorState | null = null

export function getEmulatorState(config?: WorkspaceConfig): EmulatorState {
  if (!instance) {
    instance = new EmulatorState(config)
  }
  return instance
}

export function resetEmulatorState(config?: WorkspaceConfig): EmulatorState {
  instance?.close()
  instance = new EmulatorState(config)
  return instance
}
