import { mrkdwnToHtml } from '@botarium/mrkdwn'
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

  // mrkdwn type: parse with @botarium/mrkdwn, sanitize output
  const html = mrkdwnToHtml(textObj.text)

  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
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
