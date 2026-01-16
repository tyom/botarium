import type {
  SlackViewTextObject,
  SlackOption,
  UploadedFile,
} from '../../lib/types'

/**
 * Shared utilities and types for BlockKit components
 */

/**
 * Render plain text from a Slack text object
 */
export function renderText(textObj: SlackViewTextObject | undefined): string {
  if (!textObj) return ''
  return textObj.text
}

/**
 * Render text with mrkdwn formatting support.
 * Returns HTML string that should be rendered with {@html}.
 */
export function renderMrkdwn(textObj: SlackViewTextObject | undefined): string {
  if (!textObj) return ''
  let text = textObj.text
  // Escape HTML entities first to prevent XSS
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Parse mrkdwn bold (*text*) if type is mrkdwn
  if (textObj.type === 'mrkdwn') {
    text = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
  }
  return text
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
