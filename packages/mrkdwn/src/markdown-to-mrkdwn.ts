/**
 * Standard Markdown to Slack mrkdwn converter.
 *
 * Uses `marked` to parse Markdown into tokens, then walks the token tree
 * rendering Slack mrkdwn syntax.
 */

import { Lexer, type Token, type Tokens } from 'marked'

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
      return `<${t.href}|${t.text || 'image'}>`
    }
    case 'text': {
      const t = token as Tokens.Text
      // Text tokens may have nested tokens (e.g., from inline parsing)
      if ('tokens' in t && t.tokens) {
        return renderTokens(t.tokens)
      }
      return t.text
    }
    case 'br':
      return '\n'
    case 'escape': {
      const t = token as Tokens.Escape
      return t.text
    }
    case 'html': {
      const t = token as Tokens.HTML
      // Pass through HTML tags stripped
      return t.text.replace(/<[^>]+>/g, '')
    }
    default:
      return 'raw' in token ? String(token.raw) : ''
  }
}

/** Render a list of tokens to mrkdwn */
function renderTokens(tokens: Token[]): string {
  return tokens.map(renderInlineToken).join('')
}

/** Render a block-level token to mrkdwn */
function renderBlockToken(token: Token): string {
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
      const t = token as Tokens.List
      return (
        t.items
          .map((item, idx) => {
            const content = renderBlockTokens(item.tokens ?? []).trim()
            const prefix = t.ordered ? `${idx + 1}. ` : '- '
            return `${prefix}${content}`
          })
          .join('\n') + '\n'
      )
    }
    case 'space':
      return '\n'
    case 'hr':
      return '---\n'
    default:
      return renderInlineToken(token)
  }
}

/** Render a list of block tokens to mrkdwn */
function renderBlockTokens(tokens: Token[]): string {
  return tokens.map(renderBlockToken).join('')
}

/**
 * Convert standard Markdown text to Slack mrkdwn format.
 *
 * Handles bold, italic, strike, code, links, headings, lists, blockquotes,
 * and images. Uses `marked` for parsing and a custom renderer for output.
 */
export function markdownToMrkdwn(text: string): string {
  if (!text) return ''

  const lexer = new Lexer()
  const tokens = lexer.lex(text)

  return renderBlockTokens(tokens).trimEnd()
}
