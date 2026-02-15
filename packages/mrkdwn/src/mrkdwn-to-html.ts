/**
 * Slack mrkdwn to HTML converter.
 *
 * Custom parser that handles Slack's mrkdwn syntax including bold, italic,
 * strikethrough, code, links, mentions, blockquotes, lists, and emoji.
 * Processes block-level elements line-by-line, then applies inline formatting.
 */

const EMOJI_MAP: Record<string, string> = {
  '+1': '\u{1F44D}',
  '-1': '\u{1F44E}',
  thumbsup: '\u{1F44D}',
  thumbsdown: '\u{1F44E}',
  heart: '\u2764\uFE0F',
  smile: '\u{1F604}',
  laughing: '\u{1F606}',
  blush: '\u{1F60A}',
  grinning: '\u{1F600}',
  wink: '\u{1F609}',
  joy: '\u{1F602}',
  sob: '\u{1F62D}',
  cry: '\u{1F622}',
  thinking_face: '\u{1F914}',
  white_check_mark: '\u2705',
  heavy_check_mark: '\u2714\uFE0F',
  x: '\u274C',
  warning: '\u26A0\uFE0F',
  fire: '\u{1F525}',
  rocket: '\u{1F680}',
  tada: '\u{1F389}',
  party_popper: '\u{1F389}',
  eyes: '\u{1F440}',
  wave: '\u{1F44B}',
  pray: '\u{1F64F}',
  clap: '\u{1F44F}',
  muscle: '\u{1F4AA}',
  star: '\u2B50',
  sparkles: '\u2728',
  bulb: '\u{1F4A1}',
  memo: '\u{1F4DD}',
  point_right: '\u{1F449}',
  point_left: '\u{1F448}',
  raised_hands: '\u{1F64C}',
  ok_hand: '\u{1F44C}',
  100: '\u{1F4AF}',
  rotating_light: '\u{1F6A8}',
  zap: '\u26A1',
  boom: '\u{1F4A5}',
  bug: '\u{1F41B}',
  gear: '\u2699\uFE0F',
  lock: '\u{1F512}',
  key: '\u{1F511}',
  calendar: '\u{1F4C5}',
  link: '\u{1F517}',
  speech_balloon: '\u{1F4AC}',
}

/** Escape HTML entities in text content */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Apply inline mrkdwn formatting (bold, italic, strike, links, mentions, emoji) */
function formatInline(text: string): string {
  // Placeholders for inline code to protect their contents
  const inlineCodePh: string[] = []
  text = text.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const idx = inlineCodePh.length
    inlineCodePh.push(`<code>${escapeHtml(code)}</code>`)
    return `\uE001IC${idx}\uE001`
  })

  // HTML-escape remaining text
  text = escapeHtml(text)

  // Links: <url|label> and <url>
  text = text.replace(
    /&lt;((?:https?|mailto):[^|&]+)\|([^&]+)&gt;/g,
    '<a href="$1" target="_blank">$2</a>'
  )
  text = text.replace(
    /&lt;((?:https?|mailto):[^&]+)&gt;/g,
    '<a href="$1" target="_blank">$1</a>'
  )

  // User mentions: <@U123>
  text = text.replace(
    /&lt;@([A-Z0-9]+)&gt;/g,
    '<span class="s-mention">@$1</span>'
  )

  // Channel mentions: <#C123|name>
  text = text.replace(
    /&lt;#[A-Z0-9]+\|([^&]+)&gt;/g,
    '<span class="s-mention">#$1</span>'
  )

  // Special commands: <!here>, <!channel>, <!everyone>
  text = text.replace(
    /&lt;!(here|channel|everyone)&gt;/g,
    '<span class="s-mention">@$1</span>'
  )

  // Bold: *text* (not inside words, not at URL boundaries)
  text = text.replace(
    /(^|(?<=\s|[^\\a-zA-Z0-9]))\*(\S(?:[^*]*\S)?)\*((?=\s|[^a-zA-Z0-9])|$)/g,
    '$1<strong>$2</strong>'
  )

  // Italic: _text_ (not inside words like some_variable_name)
  text = text.replace(
    /(^|(?<=\s|[^\\a-zA-Z0-9]))_(\S(?:[^_]*\S)?)_((?=\s|[^a-zA-Z0-9])|$)/g,
    '$1<em>$2</em>'
  )

  // Strikethrough: ~text~
  text = text.replace(
    /(^|(?<=\s|[^\\a-zA-Z0-9]))~(\S(?:[^~]*\S)?)~((?=\s|[^a-zA-Z0-9])|$)/g,
    '$1<del>$2</del>'
  )

  // Emoji: :name:
  text = text.replace(/:([a-z0-9_+-]+):/g, (_match, name: string) => {
    const emoji = EMOJI_MAP[name]
    return emoji ?? `:${name}:`
  })

  // Restore inline code placeholders
  text = text.replace(/\uE001IC(\d+)\uE001/g, (_match, idx: string) => {
    return inlineCodePh[parseInt(idx, 10)] ?? ''
  })

  return text
}

/**
 * Convert Slack mrkdwn text to sanitized HTML.
 *
 * Processes block-level elements (code blocks, blockquotes, lists) line-by-line,
 * then applies inline formatting within each block.
 */
export function mrkdwnToHtml(text: string): string {
  if (!text) return ''

  // Phase 1: Extract code blocks (``` ... ```) and replace with placeholders
  const codeBlockPh: string[] = []
  text = text.replace(/```(?:\n)?([\s\S]*?)```/g, (_match, code: string) => {
    const idx = codeBlockPh.length
    codeBlockPh.push(
      `<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`
    )
    return `\uE000CB${idx}\uE000`
  })

  // Phase 2: Process line-by-line for block-level elements
  const lines = text.split('\n')
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Code block placeholder - pass through
    if (/^\uE000CB\d+\uE000$/.test(line)) {
      output.push(line)
      i++
      continue
    }

    // Blockquote: lines starting with >
    if (/^&gt;\s?/.test(escapeHtml(line)) || /^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push(formatInline((lines[i] ?? '').replace(/^>\s?/, '')))
        i++
      }
      output.push(`<blockquote>${quoteLines.join('<br>')}</blockquote>`)
      continue
    }

    // Unordered list: lines starting with - , * , or bullet
    if (/^(?:[-*\u2022])\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^(?:[-*\u2022])\s/.test(lines[i] ?? '')) {
        items.push(
          `<li>${formatInline((lines[i] ?? '').replace(/^(?:[-*\u2022])\s/, ''))}</li>`
        )
        i++
      }
      output.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Ordered list: lines starting with N.
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i] ?? '')) {
        items.push(
          `<li>${formatInline((lines[i] ?? '').replace(/^\d+\.\s/, ''))}</li>`
        )
        i++
      }
      output.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // Regular line: apply inline formatting
    output.push(formatInline(line))
    i++
  }

  // Phase 3: Join lines with <br>, then clean up block-level margins
  let html = output.join('<br>')

  // Remove <br> adjacent to block elements
  html = html.replace(/(<br>)+(<(?:ul|ol|blockquote|pre)>)/g, '$2')
  html = html.replace(/(<\/(?:ul|ol|blockquote|pre)>)(<br>)+/g, '$1')
  // Also clean up code block placeholders adjacent to <br>
  html = html.replace(/(<br>)+(\uE000CB\d+\uE000)/g, '$2')
  html = html.replace(/(\uE000CB\d+\uE000)(<br>)+/g, '$1')

  // Phase 4: Restore code block placeholders
  html = html.replace(/\uE000CB(\d+)\uE000/g, (_match, idx: string) => {
    return codeBlockPh[parseInt(idx, 10)] ?? ''
  })

  // Final cleanup: remove <br> adjacent to restored block elements
  html = html.replace(/(<br>)+(<pre>)/g, '$2')
  html = html.replace(/(<\/pre>)(<br>)+/g, '$1')

  return html
}
