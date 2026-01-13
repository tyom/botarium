import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import {
  pgTable,
  serial,
  text as pgText,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core'

// SQLite schema
export const memoriesSqlite = sqliteTable('memories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  key: text('key').notNull(),
  content: text('content').notNull(),
  tags: text('tags'),
  source: text('source'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// PostgreSQL schema
export const memoriesPostgres = pgTable('memories', {
  id: serial('id').primaryKey(),
  category: pgText('category').notNull(),
  key: pgText('key').notNull(),
  content: pgText('content').notNull(),
  tags: jsonb('tags').$type<string[]>(),
  source: jsonb('source').$type<{
    channelId: string
    userId: string
    threadTs?: string
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type MemorySqlite = typeof memoriesSqlite.$inferSelect
export type MemoryPostgres = typeof memoriesPostgres.$inferSelect
