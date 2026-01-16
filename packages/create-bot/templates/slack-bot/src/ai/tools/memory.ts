import { tool } from 'ai'
import { z } from 'zod'
import { memoryStore } from '../../memory/store'
import { saveUserPreferences, normalizeResponseStyle, normalizeTimezone } from '../../preferences'
import { type ToolResult, success, failure, withToolLogging } from '../../utils/tools'

const categorySchema = z
  .enum(['user', 'project', 'fact', 'preference'])
  .describe('Category: user, project, fact (schedules/times/events), or preference')

interface StoreMemoryInput {
  category: 'user' | 'project' | 'fact' | 'preference'
  key: string
  content: string
  tags?: string[]
  channelId?: string
  userId?: string
}

interface RetrieveMemoryInput {
  category: 'user' | 'project' | 'fact' | 'preference'
  key: string
  userId?: string
  channelId?: string
}

interface SearchMemoriesInput {
  query: string
  category?: 'user' | 'project' | 'fact' | 'preference'
  tags?: string[]
  channelId?: string
  userId?: string
}

interface SetPreferenceInput {
  userId: string
  preference: 'responseStyle' | 'language' | 'timezone'
  value: string
}

interface DeleteMemoryInput {
  category: 'user' | 'project' | 'fact' | 'preference'
  key: string
  userId?: string
}

async function storeMemoryExecute(
  input: StoreMemoryInput
): Promise<ToolResult<{ message: string }>> {
  const { category, key, content, tags, channelId, userId } = input
  const source = channelId && userId ? { channelId, userId } : undefined
  await memoryStore.store({ category, key, content, tags, source })
  return success({ message: `Memory stored: ${category}/${key}` })
}

async function retrieveMemoryExecute(
  input: RetrieveMemoryInput
): Promise<ToolResult<{ memory: unknown }>> {
  const { category, key, userId } = input

  if (category === 'user' || category === 'preference') {
    if (!userId) {
      return failure('userId required to retrieve user/preference memories')
    }
    const isOwnMemory =
      category === 'user'
        ? key === userId
        : key.startsWith(`${userId}:`) || key === userId
    if (!isOwnMemory) {
      return failure('You can only retrieve your own user/preference memories')
    }
  }

  const memory = await memoryStore.retrieve(category, key)
  if (!memory) {
    return failure('Memory not found')
  }

  return success({ memory })
}

async function searchMemoriesExecute(
  input: SearchMemoriesInput
): Promise<ToolResult<{ results: unknown[] }>> {
  const { query, category, tags, channelId, userId } = input

  const results = await memoryStore.search({
    query,
    category,
    tags,
    channelId,
  })

  const filteredResults = results.filter((memory) => {
    if (memory.category === 'user' || memory.category === 'preference') {
      if (!userId) return false
      const isOwnMemory =
        memory.category === 'user'
          ? memory.key === userId
          : memory.key.startsWith(`${userId}:`) || memory.key === userId
      return isOwnMemory
    }
    return true
  })

  return success({ results: filteredResults })
}

async function setUserPreferenceExecute(
  input: SetPreferenceInput
): Promise<ToolResult<{ message: string }>> {
  const { userId, preference, value } = input

  let normalizedValue: string = value

  if (preference === 'responseStyle') {
    const normalized = normalizeResponseStyle(value)
    if (!normalized) {
      return failure(
        `Invalid response style "${value}". Use: concise, detailed, or balanced`
      )
    }
    normalizedValue = normalized
  } else if (preference === 'timezone') {
    const normalized = normalizeTimezone(value)
    if (!normalized) {
      return failure(
        `Invalid timezone "${value}". Use a valid IANA timezone like "America/New_York" or "UTC".`
      )
    }
    normalizedValue = normalized
  }

  await saveUserPreferences(userId, { [preference]: normalizedValue })
  return success({
    message: `Preference updated: ${preference} = ${normalizedValue}`,
  })
}

async function deleteMemoryExecute(
  input: DeleteMemoryInput
): Promise<ToolResult<{ message: string }>> {
  const { category, key, userId } = input

  if (category === 'user' || category === 'preference') {
    if (!userId) {
      return failure('userId required to delete user/preference memories')
    }
    const isOwnMemory =
      category === 'user'
        ? key === userId
        : key.startsWith(`${userId}:`) || key === userId
    if (!isOwnMemory) {
      return failure('You can only delete your own user/preference memories')
    }
  }

  const deleted = await memoryStore.delete(category, key)
  if (deleted) {
    return success({ message: `Memory deleted: ${category}/${key}` })
  }
  return failure('Memory not found')
}

export const memoryTools = {
  storeMemory: tool({
    description:
      'Store important information for later recall. Always include channelId and userId from the current context.',
    inputSchema: z.object({
      category: categorySchema,
      key: z.string().describe('Unique identifier for this memory'),
      content: z.string().describe('The information to remember'),
      tags: z.array(z.string()).optional().describe('Optional tags for easier retrieval'),
      channelId: z.string().optional().describe('Channel where this was learned'),
      userId: z.string().optional().describe('User who provided the info'),
    }),
    execute: withToolLogging(
      'storeMemory',
      (input: StoreMemoryInput) => `Storing ${input.category}/${input.key}`,
      storeMemoryExecute
    ),
  }),

  retrieveMemory: tool({
    description: 'Retrieve a specific memory by exact category and key.',
    inputSchema: z.object({
      category: categorySchema,
      key: z.string().describe('The key used when storing'),
      userId: z.string().optional().describe('Current user ID'),
      channelId: z.string().optional().describe('Current channel ID'),
    }),
    execute: withToolLogging(
      'retrieveMemory',
      (input: RetrieveMemoryInput) => `Retrieving ${input.category}/${input.key}`,
      retrieveMemoryExecute
    ),
  }),

  searchMemories: tool({
    description: 'Search memories by query text or tags.',
    inputSchema: z.object({
      query: z.string().describe('Text to search for in memories'),
      category: categorySchema.optional().describe('Optional category filter'),
      tags: z.array(z.string()).optional().describe('Optional tags to filter by'),
      channelId: z.string().optional().describe('Channel to search in'),
      userId: z.string().optional().describe('Current user ID'),
    }),
    execute: withToolLogging(
      'searchMemories',
      (input: SearchMemoriesInput) => `Query: "${input.query}"`,
      searchMemoriesExecute
    ),
  }),

  setUserPreference: tool({
    description:
      'Update a user preference. Use when the user expresses a preference like "I prefer concise answers".',
    inputSchema: z.object({
      userId: z.string().describe('The user ID to set preference for'),
      preference: z
        .enum(['responseStyle', 'language', 'timezone'])
        .describe('Which preference to set'),
      value: z.string().describe('The value to set'),
    }),
    execute: withToolLogging(
      'setUserPreference',
      (input: SetPreferenceInput) =>
        `Setting ${input.preference}=${input.value} for user ${input.userId}`,
      setUserPreferenceExecute
    ),
  }),

  deleteMemory: tool({
    description: 'Delete a stored memory by category and key.',
    inputSchema: z.object({
      category: categorySchema,
      key: z.string().describe('The exact key of the memory to delete'),
      userId: z.string().optional().describe('Current user ID'),
    }),
    execute: withToolLogging(
      'deleteMemory',
      (input: DeleteMemoryInput) => `Deleting ${input.category}/${input.key}`,
      deleteMemoryExecute
    ),
  }),
}
