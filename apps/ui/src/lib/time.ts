const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

/**
 * Format a Slack timestamp (seconds since epoch) to a localized time string
 */
export function formatTimestamp(ts: string): string {
  const seconds = parseFloat(ts)
  const date = new Date(seconds * 1000)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Extract a date key (YYYY-MM-DD) from a Slack timestamp for day grouping
 */
export function getDateKey(ts: string): string {
  const seconds = parseFloat(ts)
  const date = new Date(seconds * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Format a date label for day separators (e.g., "Today", "Yesterday", "Wednesday, February 18")
 */
export function formatDateLabel(ts: string): string {
  const seconds = parseFloat(ts)
  const date = new Date(seconds * 1000)
  const now = new Date()

  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / MS_PER_DAY
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a full date string for tooltips (e.g., "Wednesday, February 18, 2026")
 */
export function formatFullDate(ts: string): string {
  const seconds = parseFloat(ts)
  const date = new Date(seconds * 1000)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a Slack timestamp to a relative time string (e.g., "5 min ago")
 */
export function formatRelativeTime(ts: string): string {
  const seconds = parseFloat(ts)
  const date = new Date(seconds * 1000)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE)
  const diffHours = Math.floor(diffMs / MS_PER_HOUR)
  const diffDays = Math.floor(diffMs / MS_PER_DAY)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}
