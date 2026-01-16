export interface MemorySource {
  channelId: string
  userId: string
  threadTs?: string
}

export interface Memory {
  id?: number
  category: 'user' | 'project' | 'fact' | 'preference'
  key: string
  content: string
  tags?: string[]
  source?: MemorySource
  createdAt: string
  updatedAt: string
}

export interface SearchParams {
  query: string
  category?: Memory['category']
  tags?: string[]
  channelId?: string
}
