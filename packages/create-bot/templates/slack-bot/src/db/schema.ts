import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const userPreferences = sqliteTable('user_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: text('team_id').notNull(),
  userId: text('user_id').notNull(),
  responseStyle: text('response_style'),
  language: text('language'),
  timezone: text('timezone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const memoryFacts = sqliteTable('memory_facts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: text('team_id').notNull(),
  userId: text('user_id').notNull(),
  fact: text('fact').notNull(),
  category: text('category'),
  sourceChannel: text('source_channel'),
  sourceThread: text('source_thread'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type UserPreferences = typeof userPreferences.$inferSelect
export type NewUserPreferences = typeof userPreferences.$inferInsert
export type MemoryFact = typeof memoryFacts.$inferSelect
export type NewMemoryFact = typeof memoryFacts.$inferInsert
