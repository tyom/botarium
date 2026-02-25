import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const memory = sqliteTable('memory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: text('team_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull(), // 'fact', 'preference', etc.
  category: text('category'),
  sourceChannel: text('source_channel'),
  sourceThread: text('source_thread'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type Memory = typeof memory.$inferSelect
export type NewMemory = typeof memory.$inferInsert
