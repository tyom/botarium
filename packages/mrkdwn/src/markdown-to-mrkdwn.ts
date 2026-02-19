/**
 * Standard Markdown to Slack mrkdwn converter.
 *
 * Uses `marked` to parse Markdown into tokens, then walks the token tree
 * rendering Slack mrkdwn syntax.
 */

import { Lexer, type Token, type Tokens } from 'marked'

/** Escape characters that have special meaning in Slack mrkdwn */
function escapeMrkdwn(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Render a single inline token to mrkdwn */
function renderInlineToken(token: Token): string {
  switch (token.type) {
    case 'strong': {
      const t = token as Tokens.Strong
      return `*${renderTokens(t.tokens ?? [])}*`
    }
    case 'em': {
      const t = token as Tokens.Em
      return `_${renderTokens(t.tokens ?? [])}_`
    }
    case 'del': {
      const t = token as Tokens.Del
      return `~${renderTokens(t.tokens ?? [])}~`
    }
    case 'codespan': {
      const t = token as Tokens.Codespan
      return `\`${t.text}\``
    }
    case 'link': {
      const t = token as Tokens.Link
      const text = renderTokens(t.tokens ?? [])
      return `<${t.href}|${text}>`
    }
    case 'image': {
      const t = token as Tokens.Image
      const alt = (t.text || 'image').replace(/[|>]/g, '')
      return `<${t.href}|${alt || 'image'}>`
    }
    case 'text': {
      const t = token as Tokens.Text
      if ('tokens' in t && t.tokens) {
        return renderTokens(t.tokens)
      }
      return escapeMrkdwn(t.text)
    }
    case 'br':
      return '\n'
    case 'escape': {
      const t = token as Tokens.Escape
      return escapeMrkdwn(t.text)
    }
    case 'html': {
      const t = token as Tokens.HTML
      return escapeMrkdwn(t.text.replace(/<[^>]+>/g, ''))
    }
    default:
      return 'raw' in token ? String(token.raw) : ''
  }
}

/** Render a list of tokens to mrkdwn */
function renderTokens(tokens: Token[]): string {
  return tokens.map(renderInlineToken).join('')
}

/** Render list items with proper nesting via indentation */
function renderList(token: Tokens.List, depth: number): string {
  const indent = '    '.repeat(depth)
  const lines: string[] = []

  token.items.forEach((item, idx) => {
    // Task list checkbox
    let prefix: string
    if (item.task) {
      prefix = `${indent}${item.checked ? '☑' : '☐'} `
    } else {
      prefix = token.ordered ? `${indent}${idx + 1}. ` : `${indent}• `
    }

    // Separate text content from nested block content (sub-lists)
    const textParts: string[] = []
    const blockParts: string[] = []

    for (const child of item.tokens ?? []) {
      if (child.type === 'list') {
        blockParts.push(renderList(child as Tokens.List, depth + 1))
      } else if (child.type === 'text') {
        const t = child as Tokens.Text
        if ('tokens' in t && t.tokens) {
          textParts.push(renderTokens(t.tokens))
        } else {
          textParts.push(escapeMrkdwn(t.text))
        }
      } else {
        textParts.push(renderBlockToken(child, depth).trim())
      }
    }

    lines.push(`${prefix}${textParts.join('')}`)
    if (blockParts.length > 0) {
      lines.push(...blockParts.flatMap((b) => b.split('\n').filter(Boolean)))
    }
  })

  return lines.join('\n') + '\n'
}

/** Render a table as a code block with aligned columns */
function renderTable(token: Tokens.Table): string {
  const headers = token.header.map((cell) => renderTokens(cell.tokens))
  const rows = token.rows.map((row) =>
    row.map((cell) => renderTokens(cell.tokens))
  )

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  )

  const pad = (text: string, width: number) => text.padEnd(width)
  const separator = colWidths.map((w) => '─'.repeat(w)).join('─┼─')
  const headerLine = headers.map((h, i) => pad(h, colWidths[i]!)).join(' │ ')
  const rowLines = rows.map((row) =>
    row.map((cell, i) => pad(cell, colWidths[i]!)).join(' │ ')
  )

  const table = [headerLine, separator, ...rowLines].join('\n')
  return `\`\`\`\n${table}\n\`\`\`\n`
}

/** Render a block-level token to mrkdwn */
function renderBlockToken(token: Token, depth = 0): string {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading
      return `*${renderTokens(t.tokens ?? [])}*\n`
    }
    case 'paragraph': {
      const t = token as Tokens.Paragraph
      return `${renderTokens(t.tokens ?? [])}\n`
    }
    case 'code': {
      const t = token as Tokens.Code
      return `\`\`\`\n${t.text}\n\`\`\`\n`
    }
    case 'blockquote': {
      const t = token as Tokens.Blockquote
      const inner = renderBlockTokens(t.tokens ?? []).trim()
      return (
        inner
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n'
      )
    }
    case 'list': {
      return renderList(token as Tokens.List, depth)
    }
    case 'table': {
      return renderTable(token as Tokens.Table)
    }
    case 'hr':
      return '───\n'
    case 'space':
      return '\n'
    default:
      return renderInlineToken(token)
  }
}

/** Render a list of block tokens to mrkdwn */
function renderBlockTokens(tokens: Token[]): string {
  return tokens.map((t) => renderBlockToken(t)).join('')
}

/**
 * Convert standard Markdown text to Slack mrkdwn format.
 *
 * Handles bold, italic, strike, code, links, headings, lists, blockquotes,
 * tables, task lists, and images. Uses `marked` for parsing and a custom
 * renderer for output.
 */
export function markdownToMrkdwn(text: string): string {
  if (!text) return ''

  const lexer = new Lexer()
  const tokens = lexer.lex(text)

  return renderBlockTokens(tokens).trimEnd()
}
