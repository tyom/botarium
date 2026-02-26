/**
 * Package-owned Logger interface.
 * Internally backed by pino, but consumers code against this type — never import pino types.
 */
export type LogMethod = {
  (msg: string): void
  (obj: Record<string, unknown>, msg: string): void
}

export interface Logger {
  info: LogMethod
  warn: LogMethod
  error: LogMethod
  fatal: LogMethod
  debug: LogMethod
  child(bindings: { module: string }): Logger
}

export interface BotariumLoggerOptions {
  /** Log level. Default: 'info' */
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'
  /** Optional mixin callback — called on every log entry to inject extra fields (e.g., traceId).
   *  Set once at creation time, immutable after that. */
  mixin?: () => Record<string, unknown>
  /** Optional URL for log forwarding (e.g., 'http://localhost:7557/api').
   *  Replaces Slack-specific auto-detection — consumer provides URL explicitly. */
  forwardUrl?: string
  /** Optional writable stream override. When provided, bypasses auto-detection of pretty/JSON. */
  stream?: { write(chunk: string): void }
}
