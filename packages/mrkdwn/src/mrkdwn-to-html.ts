/**
 * Slack mrkdwn to HTML converter.
 *
 * Custom parser that handles Slack's mrkdwn syntax including bold, italic,
 * strikethrough, code, links, mentions, blockquotes, lists, and emoji.
 * Processes block-level elements line-by-line, then applies inline formatting.
 *
 * Depends on ./emoji (EMOJI_MAP, renderEmoji) and ./utils (escapeHtml).
 */

import { renderEmoji } from './emoji'
import { escapeHtml } from './utils'

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
    /&lt;((?:https?|mailto):.*?)\|(.*?)&gt;/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
  )
  text = text.replace(
    /&lt;((?:https?|mailto):.*?)&gt;/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
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
    return renderEmoji(name) ?? `:${name}:`
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

  // Line-break span used instead of <br> for CSS-controllable spacing
  const BR = '<span class="c-mrkdwn__br"></span>'

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
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push(formatInline((lines[i] ?? '').replace(/^>\s?/, '')))
        i++
      }
      output.push(`<blockquote>${quoteLines.join(BR)}</blockquote>`)
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

  const BR_RE = new RegExp(BR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')

  // Phase 3: Join lines with line-break spans, then clean up block-level margins
  let html = output.join(BR)

  // Collapse consecutive line-break spans (from empty lines) into one
  html = html.replace(new RegExp(`(${BR_RE.source}){2,}`, 'g'), BR)

  // Remove line-break spans adjacent to block elements
  html = html.replace(
    new RegExp(`(${BR_RE.source})+(<(?:ul|ol|blockquote|pre)>)`, 'g'),
    '$2'
  )
  html = html.replace(
    new RegExp(`(<\\/(?:ul|ol|blockquote|pre)>)(${BR_RE.source})+`, 'g'),
    '$1'
  )
  // Also clean up code block placeholders adjacent to line-break spans
  html = html.replace(
    new RegExp(`(${BR_RE.source})+(\uE000CB\\d+\uE000)`, 'g'),
    '$2'
  )
  html = html.replace(
    new RegExp(`(\uE000CB\\d+\uE000)(${BR_RE.source})+`, 'g'),
    '$1'
  )

  // Phase 4: Restore code block placeholders
  html = html.replace(/\uE000CB(\d+)\uE000/g, (_match, idx: string) => {
    return codeBlockPh[parseInt(idx, 10)] ?? ''
  })

  // Final cleanup: remove line-break spans adjacent to restored block elements
  html = html.replace(new RegExp(`(${BR_RE.source})+(<pre>)`, 'g'), '$2')
  html = html.replace(new RegExp(`(<\\/pre>)(${BR_RE.source})+`, 'g'), '$1')

  return html
}
