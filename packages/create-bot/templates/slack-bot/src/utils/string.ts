/**
 * Truncate a string to a maximum length, adding ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
}

/**
 * Convert Markdown formatting to Slack mrkdwn format.
 */
export function toSlackFormat(text: string): string {
  return (
    text
      // Convert markdown headings (# ## ### etc.) to bold text
      .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
      // Convert **bold** to *bold* (must come before single *)
      .replace(/\*\*([^*]+)\*\*/g, '*$1*')
      // Convert __bold__ to *bold*
      .replace(/__([^_]+)__/g, '*$1*')
      // Convert [text](url) to <url|text>
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>')
  )
}
