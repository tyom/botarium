import type {
  SectionBlock,
  HeaderBlock,
  DividerBlock,
  ActionsBlock,
  ContextBlock,
  InputBlock,
  ImageBlock,
  TextObject,
  PlainTextObject,
  BlockElement,
  InputElement,
  ImageElement,
} from './types.ts'
import { resolveMrkdwn, resolvePlainText, mrkdwn } from './text.ts'

export function section(
  text: string | TextObject,
  opts?: { accessory?: BlockElement; block_id?: string }
): SectionBlock {
  return {
    type: 'section',
    text: resolveMrkdwn(text),
    ...opts,
  }
}

export function sectionFields(
  fields: (string | TextObject)[],
  opts?: { accessory?: BlockElement; block_id?: string }
): SectionBlock {
  return {
    type: 'section',
    fields: fields.map((f) => resolveMrkdwn(f)),
    ...opts,
  }
}

export function header(
  text: string | PlainTextObject,
  opts?: { block_id?: string }
): HeaderBlock {
  return {
    type: 'header',
    text: resolvePlainText(text),
    ...opts,
  }
}

export function divider(opts?: { block_id?: string }): DividerBlock {
  return {
    type: 'divider',
    ...opts,
  }
}

export function actions(
  elements: BlockElement[],
  opts?: { block_id?: string }
): ActionsBlock {
  return {
    type: 'actions',
    elements,
    ...opts,
  }
}

export function context(
  elements: (string | TextObject | ImageElement)[],
  opts?: { block_id?: string }
): ContextBlock {
  return {
    type: 'context',
    elements: elements.map((el) => (typeof el === 'string' ? mrkdwn(el) : el)),
    ...opts,
  }
}

export function input(
  label: string | PlainTextObject,
  element: InputElement,
  opts?: {
    hint?: string | PlainTextObject
    optional?: boolean
    block_id?: string
    dispatch_action?: boolean
  }
): InputBlock {
  const { hint, ...rest } = opts ?? {}
  return {
    type: 'input',
    label: resolvePlainText(label),
    element,
    ...rest,
    ...(hint !== undefined && { hint: resolvePlainText(hint) }),
  }
}

export function imageBlock(
  url: string,
  altText: string,
  opts?: { title?: string | PlainTextObject; block_id?: string }
): ImageBlock {
  const { title, ...rest } = opts ?? {}
  return {
    type: 'image',
    image_url: url,
    alt_text: altText,
    ...rest,
    ...(title !== undefined && { title: resolvePlainText(title) }),
  }
}
