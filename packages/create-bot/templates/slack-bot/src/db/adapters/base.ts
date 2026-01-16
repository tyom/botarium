import type { Memory, SearchParams } from '../types'
import type { MemoryRepository } from '../repository'

export interface MemoryRow {
  id: number
  category: string
  key: string
  content: string
  tags: string | string[] | null
  source:
    | string
    | { channelId: string; userId: string; threadTs?: string }
    | null
  createdAt: string | Date
  updatedAt: string | Date
}

export abstract class BaseAdapter implements MemoryRepository {
  abstract initialize(): Promise<void>
  abstract store(
    memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void>
  abstract close(): Promise<void>

  protected abstract queryByCategoryAndKey(
    category: string,
    key: string
  ): Promise<MemoryRow[]>

  protected abstract queryTextSearch(
    pattern: string,
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]>

  protected abstract queryAll(
    category?: string,
    channelId?: string
  ): Promise<MemoryRow[]>

  protected abstract executeDelete(
    category: string,
    key: string
  ): Promise<boolean>

  async retrieve(category: string, key: string): Promise<Memory | null> {
    const rows = await this.queryByCategoryAndKey(category, key)
    return rows[0] ? this.rowToMemory(rows[0]) : null
  }

  async search(params: SearchParams): Promise<Memory[]> {
    const { query, category, tags, channelId } = params

    if (query.trim()) {
      const rows = await this.queryTextSearch(query, category, channelId)
      if (rows.length > 0) {
        const memories = rows.map((row) => this.rowToMemory(row))
        return this.filterByTags(memories, tags)
      }
    }

    const rows = await this.queryAll(category, channelId)
    const memories = rows.map((row) => this.rowToMemory(row))
    return this.filterByTags(memories, tags)
  }

  async delete(category: string, key: string): Promise<boolean> {
    return this.executeDelete(category, key)
  }

  async list(category?: string): Promise<Memory[]> {
    const rows = await this.queryAll(category)
    return rows.map((row) => this.rowToMemory(row))
  }

  protected filterByTags(memories: Memory[], tags?: string[]): Memory[] {
    if (!tags || tags.length === 0) {
      return memories
    }
    return memories.filter((memory) => {
      const memoryTags = memory.tags || []
      return tags.some((tag) => memoryTags.includes(tag))
    })
  }

  protected rowToMemory(row: MemoryRow): Memory {
    return {
      id: row.id,
      category: row.category as Memory['category'],
      key: row.key,
      content: row.content,
      tags: this.parseTags(row.tags),
      source: this.parseSource(row.source),
      createdAt: this.parseTimestamp(row.createdAt),
      updatedAt: this.parseTimestamp(row.updatedAt),
    }
  }

  private parseTags(tags: MemoryRow['tags']): string[] | undefined {
    if (!tags) return undefined
    if (Array.isArray(tags)) return tags
    try {
      return JSON.parse(tags)
    } catch {
      return undefined
    }
  }

  private parseSource(source: MemoryRow['source']): Memory['source'] {
    if (!source) return undefined
    if (typeof source === 'object') return source
    try {
      return JSON.parse(source)
    } catch {
      return undefined
    }
  }

  private parseTimestamp(timestamp: string | Date): string {
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }
    return timestamp
  }
}
