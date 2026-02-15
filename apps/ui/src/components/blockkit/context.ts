import { toHTML } from 'slack-markdown'
import DOMPurify from 'dompurify'
import type {
  SlackViewTextObject,
  SlackOption,
  UploadedFile,
} from '../../lib/types'

/**
 * Shared utilities and types for BlockKit components
 */

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'i',
    'li',
    'ol',
    'pre',
    'span',
    'strong',
    'ul',
  ],
  ALLOWED_ATTR: ['href', 'target', 'class'],
}

/**
 * Render plain text from a Slack text object
 */
export function renderText(textObj: SlackViewTextObject | undefined): string {
  if (!textObj) return ''
  return textObj.text
}

/**
 * Render text with mrkdwn formatting support.
 * Returns sanitized HTML string that should be rendered with {@html}.
 * Respects the text object type: plain_text is escaped, mrkdwn is parsed.
 */
export function renderMrkdwn(textObj: SlackViewTextObject | undefined): string {
  if (!textObj) return ''

  // Plain text: escape HTML entities, no mrkdwn parsing
  if (textObj.type === 'plain_text') {
    return textObj.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  // mrkdwn type: parse with slack-markdown, sanitize output
  let html = toHTML(textObj.text, {
    escapeHTML: true,
    hrefTarget: '_blank',
  })

  // Strip leading newline inside code blocks (slack-markdown captures \n after opening ```)
  html = html.replace(/<code>\n/g, '<code>')

  // Convert list items to proper HTML lists
  html = convertLists(html)

  // Collapse <br> tags adjacent to block elements (they have their own margins)
  html = html.replace(/(<br>)+(<(?:ul|ol|blockquote|pre)>)/g, '$2')
  html = html.replace(/(<\/(?:ul|ol|blockquote|pre)>)(<br>)+/g, '$1')

  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

/**
 * Convert bullet (•) and numbered (1. 2. 3.) text lines to <ul>/<ol> HTML lists.
 * slack-markdown doesn't parse lists, so we post-process the HTML.
 */
function convertLists(html: string): string {
  const lines = html.split('<br>')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Check for unordered list sequence (• item)
    if (/^•\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^•\s/.test(lines[i] ?? '')) {
        items.push(`<li>${(lines[i] ?? '').replace(/^•\s/, '')}</li>`)
        i++
      }
      result.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Check for ordered list sequence (N. item)
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i] ?? '')) {
        items.push(`<li>${(lines[i] ?? '').replace(/^\d+\.\s/, '')}</li>`)
        i++
      }
      result.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    result.push(line)
    i++
  }

  return result.join('<br>')
}

/**
 * Callback types for BlockKit components
 */
export interface BlockKitCallbacks {
  onAction?: (actionId: string, value: string) => void
  onInputChange?: (blockId: string, actionId: string, value: string) => void
  onFileChange?: (
    blockId: string,
    actionId: string,
    files: UploadedFile[]
  ) => void
  onCheckboxChange?: (
    blockId: string,
    actionId: string,
    selectedOptions: SlackOption[]
  ) => void
}

/**
 * Form values structure for input blocks
 */
export type FormValues = Record<
  string,
  Record<
    string,
    {
      value?: string
      selected_option?: SlackOption
      selected_options?: SlackOption[]
    }
  >
>

/**
 * File values structure for file input blocks
 */
export type FileValues = Record<string, Record<string, UploadedFile[]>>
