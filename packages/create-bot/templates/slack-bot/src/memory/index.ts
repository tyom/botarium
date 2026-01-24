import { eq, and, desc } from 'drizzle-orm'
import { generateText } from 'ai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { db, schema } from '../db'

export interface MemoryContext {
  userId: string
  teamId: string
}

export interface SaveMemoryOptions extends MemoryContext {
  content: string
  type: 'fact' | 'preference'
  category?: string
  sourceChannel?: string
  sourceThread?: string
}

export interface GetMemoryOptions {
  type?: 'fact' | 'preference'
  category?: string
  limit?: number
}

export async function saveMemory(options: SaveMemoryOptions): Promise<void> {
  await db.insert(schema.memory).values({
    teamId: options.teamId,
    userId: options.userId,
    content: options.content,
    type: options.type,
    category: options.category,
    sourceChannel: options.sourceChannel,
    sourceThread: options.sourceThread,
  })
}

export async function getMemory(
  context: MemoryContext,
  options: GetMemoryOptions = {}
): Promise<schema.Memory[]> {
  const { type, category, limit = 50 } = options

  const conditions = [
    eq(schema.memory.teamId, context.teamId),
    eq(schema.memory.userId, context.userId),
  ]

  if (type) {
    conditions.push(eq(schema.memory.type, type))
  }
  if (category) {
    conditions.push(eq(schema.memory.category, category))
  }

  return db
    .select()
    .from(schema.memory)
    .where(and(...conditions))
    .orderBy(desc(schema.memory.createdAt))
    .limit(limit)
}

export async function buildMemoryContext(context: MemoryContext): Promise<string> {
  const [facts, preferences] = await Promise.all([
    getMemory(context, { type: 'fact', limit: 20 }),
    getMemory(context, { type: 'preference', limit: 20 }),
  ])

  const sections: string[] = []

  if (facts.length > 0) {
    const factsList = facts.map((f) => `- ${f.content}`).join('\n')
    sections.push(`## User Facts\n${factsList}`)
  }

  if (preferences.length > 0) {
    const prefsList = preferences.map((p) => `- ${p.content}`).join('\n')
    sections.push(`## User Preferences\n${prefsList}`)
  }

  return sections.join('\n\n')
}

export interface ExtractMemoryOptions extends MemoryContext {
  model: LanguageModelV3
  message: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  sourceChannel?: string
  sourceThread?: string
}

const EXTRACTION_PROMPT = `Analyze the conversation for facts or preferences the user wants remembered.

Extract when:
- User shares personal info: name, job, location, pets, hobbies, family, etc.
- User states preferences: "I like X", "I prefer Y", "my favorite is Z"
- User explicitly asks to remember something: "remember that", "don't forget", "keep in mind"
- For "remember that" type requests, look at recent conversation to find what they're referring to

Do NOT extract:
- Temporary task-related info
- Questions or requests
- General conversation

Return JSON array with "content" and "type" (fact or preference):
[{"content": "User's name is Alex", "type": "fact"}, {"content": "Likes blue color", "type": "preference"}]

Return [] if nothing to extract.`

export async function extractAndSaveMemory(options: ExtractMemoryOptions): Promise<void> {
  const { model, message, userId, teamId, history = [], sourceChannel, sourceThread } = options

  // Skip very short messages unless it's a "remember" request
  const isRememberRequest = /remember|don't forget|keep in mind/i.test(message)
  if (message.length < 10 && !isRememberRequest) return

  try {
    // Include recent history for context (last 4 messages)
    const recentHistory = history.slice(-4)
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...recentHistory,
      { role: 'user', content: message },
    ]

    const { text } = await generateText({
      model,
      system: EXTRACTION_PROMPT,
      messages,
    })

    // Parse the JSON response
    const cleaned = text.trim().replace(/^```json\n?|\n?```$/g, '')
    const items = JSON.parse(cleaned) as Array<{ content: string; type: string }>

    if (!Array.isArray(items) || items.length === 0) return

    // Save each extracted memory
    for (const item of items) {
      if (item.content && (item.type === 'fact' || item.type === 'preference')) {
        await saveMemory({
          userId,
          teamId,
          content: item.content,
          type: item.type,
          sourceChannel,
          sourceThread,
        })
      }
    }
  } catch {
    // Silently fail - memory extraction is best-effort
  }
}
