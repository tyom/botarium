/**
 * Thread participation tracker for bot call detection.
 * Tracks threads where the bot has participated to enable
 * auto-responding without explicit mentions.
 */

export interface ThreadTrackerConfig {
  /** TTL for thread entries in milliseconds (default: 24 hours) */
  ttlMs?: number
  /** Cleanup interval in milliseconds (default: 1 hour) */
  cleanupIntervalMs?: number
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000

export class ThreadTracker {
  private threads = new Map<string, number>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private readonly ttlMs: number
  private readonly cleanupIntervalMs: number

  constructor(config: ThreadTrackerConfig = {}) {
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS
    this.cleanupIntervalMs =
      config.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS
  }

  private getKey(channel: string, threadTs: string): string {
    return `${channel}:${threadTs}`
  }

  mark(channel: string, threadTs: string): void {
    const key = this.getKey(channel, threadTs)
    this.threads.set(key, Date.now())
  }

  isParticipating(channel: string, threadTs: string): boolean {
    const key = this.getKey(channel, threadTs)
    const lastActivity = this.threads.get(key)

    if (lastActivity === undefined) {
      return false
    }

    if (Date.now() - lastActivity > this.ttlMs) {
      this.threads.delete(key)
      return false
    }

    return true
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, lastActivity] of this.threads) {
      if (now - lastActivity > this.ttlMs) {
        this.threads.delete(key)
      }
    }
  }

  get count(): number {
    return this.threads.size
  }

  startCleanup(): void {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        this.cleanupIntervalMs
      )
    }
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

export const threadTracker = new ThreadTracker()
