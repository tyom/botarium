import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, and, ilike, or, sql } from 'drizzle-orm'
import type { Memory, SearchParams } from '../types'
import { memoriesPostgres } from '../schema'
import { settings } from '../../settings'
import { BaseAdapter, type MemoryRow } from './base'

export class PostgresAdapter extends BaseAdapter {
  private db: ReturnType<typeof drizzle>
  private client: ReturnType<typeof postgres>

  constructor(connectionString?: string) {
    super()
    const url =
      connectionString || (settings as { DATABASE_URL?: string }).DATABASE_URL
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is required for Postgres'
      )
    }
    this.client = postgres(url)
    this.db = drizzle(this.client)
  }

  async initialize(): Promise<void> {
    await this.client`
      CREATE TABLE IF NOT EXISTS memories (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        content TEXT NOT NULL,
        tags JSONB,
        source JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(category, key)
      )
    `

    await this.client`
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)
    `
    await this.client`
      CREATE INDEX IF NOT EXISTS idx_memories_channel_id ON memories((source->>'channelId'))
    `
    await this.client`
      CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags)
    `
  }

  async store(
    memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    await this.db
      .insert(memoriesPostgres)
      .values({
        category: memory.category,
        key: memory.key,
        content: memory.content,
        tags: memory.tags ?? null,
        source: memory.source ?? null,
      })
      .onConflictDoUpdate({
        target: [memoriesPostgres.category, memoriesPostgres.key],
        set: {
          content: memory.content,
          tags: memory.tags ?? null,
          source: memory.source ?? null,
          updatedAt: sql`NOW()`,
        },
      })
  }

  async close(): Promise<void> {
    await this.client.end()
  }

  protected async queryByCategoryAndKey(
    category: string,
    key: string
  ): Promise<MemoryRow[]> {
    const results = await this.db
      .select()
      .from(memoriesPostgres)
      .where(
        and(
          eq(memoriesPostgres.category, category),
          eq(memoriesPostgres.key, key)
        )
      )
      .limit(1)

    return results as MemoryRow[]
  }

  private escapeLikePattern(query: string): string {
    return query.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
  }

  protected async queryTextSearch(
    query: string,
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]> {
    const conditions = []

    const queryPattern = `%${this.escapeLikePattern(query)}%`
    conditions.push(
      or(
        ilike(memoriesPostgres.key, queryPattern),
        ilike(memoriesPostgres.content, queryPattern)
      )
    )

    if (category) {
      conditions.push(eq(memoriesPostgres.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`${memoriesPostgres.source}->>'channelId' = ${channelId}`,
          sql`${memoriesPostgres.source} IS NULL`,
          sql`${memoriesPostgres.tags} ? 'global'`
        )
      )
    }

    const results = await this.db
      .select()
      .from(memoriesPostgres)
      .where(and(...conditions))

    return results as MemoryRow[]
  }

  protected async queryAll(
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]> {
    const conditions = []

    if (category) {
      conditions.push(eq(memoriesPostgres.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`${memoriesPostgres.source}->>'channelId' = ${channelId}`,
          sql`${memoriesPostgres.source} IS NULL`,
          sql`${memoriesPostgres.tags} ? 'global'`
        )
      )
    }

    const results =
      conditions.length > 0
        ? await this.db
            .select()
            .from(memoriesPostgres)
            .where(and(...conditions))
        : await this.db.select().from(memoriesPostgres)

    return results as MemoryRow[]
  }

  protected async executeDelete(
    category: string,
    key: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(memoriesPostgres)
      .where(
        and(
          eq(memoriesPostgres.category, category),
          eq(memoriesPostgres.key, key)
        )
      )

    return (result as unknown as { rowCount: number }).rowCount > 0
  }

  override async search(params: SearchParams): Promise<Memory[]> {
    const { query, category, tags, channelId } = params

    if (query.trim()) {
      const rows = await this.queryTextSearchWithTags(
        query,
        category,
        channelId,
        tags
      )
      if (rows.length > 0) {
        return rows.map((row) => this.rowToMemory(row))
      }
    }

    const rows = await this.queryAllWithTags(category, channelId, tags)
    return rows.map((row) => this.rowToMemory(row))
  }

  private async queryTextSearchWithTags(
    query: string,
    category?: string,
    channelId?: string,
    tags?: string[]
  ): Promise<MemoryRow[]> {
    const conditions = []

    const queryPattern = `%${this.escapeLikePattern(query)}%`
    conditions.push(
      or(
        ilike(memoriesPostgres.key, queryPattern),
        ilike(memoriesPostgres.content, queryPattern)
      )
    )

    if (category) {
      conditions.push(eq(memoriesPostgres.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`${memoriesPostgres.source}->>'channelId' = ${channelId}`,
          sql`${memoriesPostgres.source} IS NULL`,
          sql`${memoriesPostgres.tags} ? 'global'`
        )
      )
    }

    if (tags && tags.length > 0) {
      conditions.push(sql`${memoriesPostgres.tags} ?| ${tags}`)
    }

    const results = await this.db
      .select()
      .from(memoriesPostgres)
      .where(and(...conditions))

    return results as MemoryRow[]
  }

  private async queryAllWithTags(
    category?: string,
    channelId?: string,
    tags?: string[]
  ): Promise<MemoryRow[]> {
    const conditions = []

    if (category) {
      conditions.push(eq(memoriesPostgres.category, category))
    }

    if (channelId) {
      conditions.push(
        or(
          sql`${memoriesPostgres.source}->>'channelId' = ${channelId}`,
          sql`${memoriesPostgres.source} IS NULL`,
          sql`${memoriesPostgres.tags} ? 'global'`
        )
      )
    }

    if (tags && tags.length > 0) {
      conditions.push(sql`${memoriesPostgres.tags} ?| ${tags}`)
    }

    const results =
      conditions.length > 0
        ? await this.db
            .select()
            .from(memoriesPostgres)
            .where(and(...conditions))
        : await this.db.select().from(memoriesPostgres)

    return results as MemoryRow[]
  }
}
