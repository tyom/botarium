import type { Memory, SearchParams } from './types'

export interface MemoryRepository {
  initialize(): Promise<void>
  store(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>
  retrieve(category: string, key: string): Promise<Memory | null>
  search(params: SearchParams): Promise<Memory[]>
  delete(category: string, key: string): Promise<boolean>
  list(category?: string): Promise<Memory[]>
  close(): Promise<void>
}
