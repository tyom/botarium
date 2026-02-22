import type {
  PlainTextInputElement,
  EmailInputElement,
  UrlInputElement,
  NumberInputElement,
  FileInputElement,
  PlainTextObject,
} from './types.ts'
import { resolvePlainText } from './text.ts'

export function textInput(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_value?: string
    multiline?: boolean
    min_length?: number
    max_length?: number
  }
): PlainTextInputElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'plain_text_input',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function emailInput(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_value?: string
    focus_on_load?: boolean
  }
): EmailInputElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'email_text_input',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function urlInput(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_value?: string
    focus_on_load?: boolean
  }
): UrlInputElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'url_text_input',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function numberInput(
  actionId: string,
  opts?: {
    is_decimal_allowed?: boolean
    placeholder?: string | PlainTextObject
    initial_value?: string
    min_value?: string
    max_value?: string
    focus_on_load?: boolean
  }
): NumberInputElement {
  const { placeholder, is_decimal_allowed, ...rest } = opts ?? {}
  return {
    type: 'number_input',
    action_id: actionId,
    is_decimal_allowed: is_decimal_allowed ?? false,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function fileInput(
  actionId: string,
  opts?: {
    filetypes?: string[]
    max_files?: number
  }
): FileInputElement {
  return {
    type: 'file_input',
    action_id: actionId,
    ...opts,
  }
}
