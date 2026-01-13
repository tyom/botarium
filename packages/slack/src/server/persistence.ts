/**
 * SQLite-based message persistence for the Slack API emulator
 * Uses the same database format as the bot's simulator message store
 */

import { Database } from 'bun:sqlite'
import { basename, join, resolve } from 'path'
import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import type { SlackMessage, SlackFile } from './types'
import { persistenceLogger } from '../lib/logger'

export interface ReactionRecord {
  name: string
  users: string[]
  count: number
}

export interface MessageRecord {
  ts: string
  channel: string
  user: string
  text: string
  threadTs?: string
  reactions?: ReactionRecord[]
  fileId?: string
}

export interface FileRecord {
  id: string
  name: string
  title?: string
  mimetype: string
  size: number
  channel?: string
  user?: string
  created_at: string
  is_expanded?: boolean
}

export class EmulatorPersistence {
  private db: Database | null = null
  private dataDir: string
  private uploadsDir: string
  private appId: string

  constructor(dataDir: string, appId: string = 'default') {
    this.dataDir = resolve(dataDir)
    this.uploadsDir = join(this.dataDir, 'uploads')
    this.appId = appId
  }

  /** Update the app ID for filtering DM messages */
  setAppId(appId: string): void {
    this.appId = appId
    // No database switching needed - queries use app_id filter
  }

  /** Check if a channel is a direct message (DM) */
  private isDirectMessage(channelId: string): boolean {
    return channelId.startsWith('D_')
  }

  getAppId(): string {
    return this.appId
  }

  async initialize(): Promise<void> {
    if (this.db) return

    await mkdir(this.dataDir, { recursive: true })
    await mkdir(this.uploadsDir, { recursive: true })

    // Single database file for all apps - app_id column handles scoping
    const dbPath = resolve(join(this.dataDir, 'simulator.sqlite'))
    persistenceLogger.info({ dbPath, appId: this.appId }, 'Initializing database')
    this.db = new Database(dbPath, { create: true, strict: true })

    // Enable WAL mode for better concurrent access
    this.db.run('PRAGMA journal_mode = WAL')

    // Create messages table with app_id for scoping (NULL = global, value = DM)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS simulator_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL UNIQUE,
        channel TEXT NOT NULL,
        user TEXT NOT NULL,
        text TEXT NOT NULL,
        thread_ts TEXT,
        reactions TEXT,
        file_id TEXT,
        app_id TEXT,
        created_at TEXT NOT NULL
      )
    `)

    // Migration: add file_id column if it doesn't exist (for existing databases)
    try {
      this.db.run(`ALTER TABLE simulator_messages ADD COLUMN file_id TEXT`)
    } catch {
      // Column already exists, ignore
    }

    // Migration: add app_id column for message scoping (NULL = global, value = DM)
    try {
      this.db.run(`ALTER TABLE simulator_messages ADD COLUMN app_id TEXT`)
    } catch {
      // Column already exists, ignore
    }

    // Create files table with app_id for scoping
    this.db.run(`
      CREATE TABLE IF NOT EXISTS simulator_files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        channel TEXT,
        user TEXT,
        app_id TEXT,
        created_at TEXT NOT NULL
      )
    `)

    // Migration: add title column if it doesn't exist (for existing databases)
    try {
      this.db.run(`ALTER TABLE simulator_files ADD COLUMN title TEXT`)
    } catch {
      // Column already exists, ignore
    }

    // Migration: add is_expanded column if it doesn't exist (for existing databases)
    try {
      this.db.run(
        `ALTER TABLE simulator_files ADD COLUMN is_expanded INTEGER DEFAULT 1`
      )
    } catch {
      // Column already exists, ignore
    }

    // Migration: add app_id column for file scoping (NULL = global, value = DM)
    try {
      this.db.run(`ALTER TABLE simulator_files ADD COLUMN app_id TEXT`)
    } catch {
      // Column already exists, ignore
    }

    // Create indexes
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_sim_messages_channel ON simulator_messages(channel)'
    )
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_sim_messages_thread ON simulator_messages(thread_ts)'
    )
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_sim_messages_app_id ON simulator_messages(app_id)'
    )
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_sim_files_app_id ON simulator_files(app_id)'
    )

    persistenceLogger.info(`Initialized at ${dbPath}`)
  }

  async saveMessage(message: SlackMessage): Promise<void> {
    if (!this.db) return

    const now = new Date().toISOString()
    const reactions = message.reactions?.map((r) => ({
      name: r.name,
      users: r.users,
      count: r.count,
    }))
    const reactionsJson = reactions ? JSON.stringify(reactions) : null
    const fileId = message.file?.id ?? null
    // DM messages are scoped to app_id, channel messages are global (NULL)
    const appIdValue = this.isDirectMessage(message.channel) ? this.appId : null

    this.db.run(
      `INSERT INTO simulator_messages (ts, channel, user, text, thread_ts, reactions, file_id, app_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(ts) DO UPDATE SET text = excluded.text, reactions = excluded.reactions, file_id = excluded.file_id`,
      [
        message.ts,
        message.channel,
        message.user,
        message.text,
        message.thread_ts ?? null,
        reactionsJson,
        fileId,
        appIdValue,
        now,
      ]
    )
  }

  async updateReactions(
    ts: string,
    reactions: Array<{ name: string; users: string[]; count: number }>
  ): Promise<void> {
    if (!this.db) return

    const reactionRecords = reactions.map((r) => ({
      name: r.name,
      users: r.users,
      count: r.count,
    }))
    const reactionsJson = JSON.stringify(reactionRecords)

    this.db.run(`UPDATE simulator_messages SET reactions = ? WHERE ts = ?`, [
      reactionsJson,
      ts,
    ])
  }

  async loadAllMessages(): Promise<MessageRecord[]> {
    if (!this.db) return []

    // Load channel messages (always) + DM messages only for current app
    const results = this.db
      .query(
        `SELECT ts, channel, user, text, thread_ts as threadTs, reactions, file_id as fileId
         FROM simulator_messages
         WHERE channel NOT LIKE 'D_%'
            OR app_id = ?
         ORDER BY ts ASC`
      )
      .all(this.appId) as Array<{
      ts: string
      channel: string
      user: string
      text: string
      threadTs: string | null
      reactions: string | null
      fileId: string | null
    }>

    return results.map((row) => ({
      ts: row.ts,
      channel: row.channel,
      user: row.user,
      text: row.text,
      threadTs: row.threadTs ?? undefined,
      reactions: row.reactions ? JSON.parse(row.reactions) : undefined,
      fileId: row.fileId ?? undefined,
    }))
  }

  async deleteMessage(ts: string): Promise<boolean> {
    if (!this.db) return false

    const result = this.db.run(`DELETE FROM simulator_messages WHERE ts = ?`, [
      ts,
    ])
    return result.changes > 0
  }

  async clearChannel(channel: string): Promise<void> {
    if (!this.db) return

    if (this.isDirectMessage(channel)) {
      // For DM channels, only clear messages for the current app
      this.db.run(
        `DELETE FROM simulator_messages WHERE channel = ? AND app_id = ?`,
        [channel, this.appId]
      )
    } else {
      // For regular channels, clear all messages (they're global)
      this.db.run(`DELETE FROM simulator_messages WHERE channel = ?`, [channel])
    }
  }

  async clearAll(): Promise<void> {
    if (!this.db) return

    this.db.run(`DELETE FROM simulator_messages`)
  }

  /**
   * Clear only DM messages for the current app (used when switching bots)
   */
  async clearAppDmMessages(): Promise<void> {
    if (!this.db) return

    this.db.run(`DELETE FROM simulator_messages WHERE app_id = ?`, [this.appId])
  }

  // ==========================================================================
  // File Persistence
  // ==========================================================================

  /**
   * Sanitize fileId to prevent path traversal attacks.
   * Returns null if the fileId is invalid (contains path separators).
   */
  private sanitizeFileId(fileId: string): string | null {
    const sanitizedId = basename(fileId)
    if (sanitizedId !== fileId || !fileId) {
      persistenceLogger.warn(`Invalid file ID rejected: ${fileId}`)
      return null
    }
    return sanitizedId
  }

  /**
   * Save file metadata to database and binary data to disk
   */
  async saveFile(file: SlackFile, data: Buffer): Promise<void> {
    if (!this.db) return

    // Validate file ID first to prevent orphaned database records
    const sanitizedId = this.sanitizeFileId(file.id)
    if (!sanitizedId) return

    const now = new Date().toISOString()
    const channel = file.channels?.[0] ?? null
    // Files in DM channels are scoped to app_id, channel files are global (NULL)
    const appIdValue = channel && this.isDirectMessage(channel) ? this.appId : null

    // Save binary data to disk
    const filePath = join(this.uploadsDir, sanitizedId)
    await writeFile(filePath, data)

    // Save metadata to SQLite only after successful file write
    this.db.run(
      `INSERT INTO simulator_files (id, name, title, mimetype, size, channel, user, app_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, title = excluded.title, mimetype = excluded.mimetype, size = excluded.size`,
      [
        file.id,
        file.name,
        file.title ?? null,
        file.mimetype,
        file.size ?? 0,
        channel,
        file.user ?? null,
        appIdValue,
        now,
      ]
    )

    persistenceLogger.info(`Saved file ${file.id} (${file.name})`)
  }

  /**
   * Load all file records from database
   */
  async loadAllFiles(): Promise<FileRecord[]> {
    if (!this.db) return []

    // Load channel files (always) + DM files only for current app
    const results = this.db
      .query(
        `SELECT id, name, title, mimetype, size, channel, user, created_at, is_expanded
         FROM simulator_files
         WHERE channel IS NULL OR channel NOT LIKE 'D_%'
            OR app_id = ?
         ORDER BY created_at ASC`
      )
      .all(this.appId) as Array<{
      id: string
      name: string
      title: string | null
      mimetype: string
      size: number
      channel: string | null
      user: string | null
      created_at: string
      is_expanded: number | null
    }>

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title ?? undefined,
      mimetype: row.mimetype,
      size: row.size,
      channel: row.channel ?? undefined,
      user: row.user ?? undefined,
      created_at: row.created_at,
      is_expanded: row.is_expanded !== 0, // Default to true if null or 1
    }))
  }

  /**
   * Load file binary data from disk
   */
  async loadFileData(fileId: string): Promise<Buffer | null> {
    const sanitizedId = this.sanitizeFileId(fileId)
    if (!sanitizedId) return null

    const filePath = join(this.uploadsDir, sanitizedId)
    try {
      return await readFile(filePath)
    } catch {
      persistenceLogger.warn(`File data not found: ${fileId}`)
      return null
    }
  }

  /**
   * Update file expanded state
   */
  async updateFileExpanded(fileId: string, isExpanded: boolean): Promise<void> {
    if (!this.db) return

    this.db.run(`UPDATE simulator_files SET is_expanded = ? WHERE id = ?`, [
      isExpanded ? 1 : 0,
      fileId,
    ])
    persistenceLogger.info(
      `Updated file ${fileId} expanded state: ${isExpanded}`
    )
  }

  /**
   * Delete file from database and disk
   */
  async deleteFile(fileId: string): Promise<boolean> {
    if (!this.db) return false

    const sanitizedId = this.sanitizeFileId(fileId)
    if (!sanitizedId) return false

    const result = this.db.run(`DELETE FROM simulator_files WHERE id = ?`, [
      fileId,
    ])

    // Delete from disk
    const filePath = join(this.uploadsDir, sanitizedId)
    try {
      await unlink(filePath)
    } catch {
      // File might not exist on disk
    }

    return result.changes > 0
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
