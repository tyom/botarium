import { getRepository } from '../db'
import type { Memory, MemorySource, SearchParams } from '../db'
import { memoryLogger } from '../utils/logger'

export type { Memory, MemorySource }

export interface StoreSearchParams {
  query: string
  category?: Memory['category']
  tags?: string[]
  channelId?: string
}

type MemoryInput = Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>

export class MemoryStore {
  private formatKey(category: string, key: string): string {
    return `${category}/${key}`
  }

  async store(memory: MemoryInput): Promise<void> {
    const keyStr = this.formatKey(memory.category, memory.key)
    memoryLogger.debug(`Storing: ${keyStr}`)

    const repo = await getRepository()
    await repo.store(memory)

    memoryLogger.debug(`Stored successfully: ${keyStr}`)
  }

  async retrieve(
    category: Memory['category'],
    key: string
  ): Promise<Memory | null> {
    const keyStr = this.formatKey(category, key)
    memoryLogger.debug(`Retrieving: ${keyStr}`)

    const repo = await getRepository()
    const memory = await repo.retrieve(category, key)

    memoryLogger.debug(`Retrieved: ${memory ? 'found' : 'not found'}`)
    return memory
  }

  async search(params: StoreSearchParams): Promise<Memory[]> {
    memoryLogger.debug(
      `Searching: query="${params.query}", category=${params.category ?? 'any'}`
    )

    const repo = await getRepository()
    const searchParams: SearchParams = {
      query: params.query,
      category: params.category,
      tags: params.tags,
      channelId: params.channelId,
    }
    const results = await repo.search(searchParams)

    memoryLogger.debug(`Search found ${results.length} results`)
    return results
  }

  async delete(category: Memory['category'], key: string): Promise<boolean> {
    const keyStr = this.formatKey(category, key)
    memoryLogger.debug(`Deleting: ${keyStr}`)

    const repo = await getRepository()
    const deleted = await repo.delete(category, key)

    memoryLogger.debug(
      `${deleted ? 'Deleted' : 'Not found for deletion'}: ${keyStr}`
    )
    return deleted
  }

  async list(category?: Memory['category']): Promise<Memory[]> {
    memoryLogger.debug(`Listing: category=${category ?? 'all'}`)

    const repo = await getRepository()
    const results = await repo.list(category)

    memoryLogger.debug(`Listed ${results.length} memories`)
    return results
  }
}

export const memoryStore = new MemoryStore()
