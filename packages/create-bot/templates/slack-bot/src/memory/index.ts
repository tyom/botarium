import { eq, and, desc } from 'drizzle-orm'
import { db, schema } from '../db'

export interface MemoryContext {
  userId: string
  teamId: string
}

export interface SaveFactOptions extends MemoryContext {
  fact: string
  category?: string
  sourceChannel?: string
  sourceThread?: string
}

export interface GetFactsOptions {
  category?: string
  limit?: number
}

/**
 * Save a fact to memory
 */
export async function saveFact(options: SaveFactOptions): Promise<void> {
  await db.insert(schema.memoryFacts).values({
    teamId: options.teamId,
    userId: options.userId,
    fact: options.fact,
    category: options.category,
    sourceChannel: options.sourceChannel,
    sourceThread: options.sourceThread,
  })
}

/**
 * Get facts from memory
 */
export async function getFacts(
  context: MemoryContext,
  options: GetFactsOptions = {}
): Promise<schema.MemoryFact[]> {
  const { category, limit = 50 } = options

  const conditions = [
    eq(schema.memoryFacts.teamId, context.teamId),
    eq(schema.memoryFacts.userId, context.userId),
  ]

  if (category) {
    conditions.push(eq(schema.memoryFacts.category, category))
  }

  return db
    .select()
    .from(schema.memoryFacts)
    .where(and(...conditions))
    .orderBy(desc(schema.memoryFacts.createdAt))
    .limit(limit)
}

/**
 * Build a memory context section for the system prompt
 */
export async function buildMemoryContext(context: MemoryContext): Promise<string> {
  const facts = await getFacts(context, { limit: 20 })

  if (facts.length === 0) {
    return ''
  }

  const factsList = facts.map((f) => `- ${f.fact}`).join('\n')

  return `## User Memory
The following facts are known about this user:
${factsList}`
}
