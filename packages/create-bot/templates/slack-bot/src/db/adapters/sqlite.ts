import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq, and, like, or, sql } from 'drizzle-orm'
import { join, resolve, dirname } from 'path'
import { mkdir } from 'fs/promises'
import type { Memory } from '../types'
import { memoriesSqlite } from '../schema'
import { settings } from '../../settings'
import { BaseAdapter, type MemoryRow } from './base'

export class SQLiteAdapter extends BaseAdapter {
  private db!: ReturnType<typeof drizzle>
  private sqlite!: Database
  private isMemoryDb: boolean
  private dbPath: string

  constructor(dbPath?: string) {
    super()
    this.isMemoryDb = dbPath === ':memory:'

    if (this.isMemoryDb) {
      this.dbPath = ':memory:'
    } else {
      const dataDir = process.env.DATA_DIR || settings.DATA_DIR
      this.dbPath = dbPath || resolve(join(dataDir, 'bot.sqlite'))
    }
  }

  async initialize(): Promise<void> {
    if (!this.isMemoryDb) {
      const dbDir = dirname(this.dbPath)
      await mkdir(dbDir, { recursive: true })
    }

    this.sqlite = new Database(this.dbPath, { create: true, strict: true })
    this.db = drizzle(this.sqlite)

    this.sqlite.run('PRAGMA journal_mode = WAL')

    this.sqlite.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        source TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(category, key)
      )
    `)

    this.sqlite.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)'
    )
  }

  async store(
    memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const now = new Date().toISOString()
    const tags = memory.tags ? JSON.stringify(memory.tags) : null
    const source = memory.source ? JSON.stringify(memory.source) : null

    await this.db
      .insert(memoriesSqlite)
      .values({
        category: memory.category,
        key: memory.key,
        content: memory.content,
        tags,
        source,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [memoriesSqlite.category, memoriesSqlite.key],
        set: {
          content: memory.content,
          tags,
          source,
          updatedAt: now,
        },
      })
  }

  async close(): Promise<void> {
    this.sqlite.close()
  }

  protected async queryByCategoryAndKey(
    category: string,
    key: string
  ): Promise<MemoryRow[]> {
    const results = await this.db
      .select()
      .from(memoriesSqlite)
      .where(
        and(eq(memoriesSqlite.category, category), eq(memoriesSqlite.key, key))
      )
      .limit(1)

    return results as MemoryRow[]
  }

  protected async queryTextSearch(
    query: string,
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]> {
    const conditions = []

    const queryLower = `%${query.toLowerCase()}%`
    conditions.push(
      or(
        like(sql`lower(${memoriesSqlite.key})`, queryLower),
        like(sql`lower(${memoriesSqlite.content})`, queryLower)
      )
    )

    if (category) {
      conditions.push(eq(memoriesSqlite.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`json_extract(${memoriesSqlite.source}, '$.channelId') = ${channelId}`,
          sql`${memoriesSqlite.source} IS NULL`,
          sql`EXISTS(SELECT 1 FROM json_each(${memoriesSqlite.tags}) WHERE value = 'global')`
        )
      )
    }

    const results = await this.db
      .select()
      .from(memoriesSqlite)
      .where(and(...conditions))

    return results as MemoryRow[]
  }

  protected async queryAll(
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]> {
    const conditions = []

    if (category) {
      conditions.push(eq(memoriesSqlite.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`json_extract(${memoriesSqlite.source}, '$.channelId') = ${channelId}`,
          sql`${memoriesSqlite.source} IS NULL`,
          sql`EXISTS(SELECT 1 FROM json_each(${memoriesSqlite.tags}) WHERE value = 'global')`
        )
      )
    }

    const results =
      conditions.length > 0
        ? await this.db
            .select()
            .from(memoriesSqlite)
            .where(and(...conditions))
        : await this.db.select().from(memoriesSqlite)

    return results as MemoryRow[]
  }

  protected async executeDelete(
    category: string,
    key: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(memoriesSqlite)
      .where(
        and(eq(memoriesSqlite.category, category), eq(memoriesSqlite.key, key))
      )

    return (result as unknown as { changes: number }).changes > 0
  }
}
