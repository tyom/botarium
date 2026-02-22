import type {
  Option,
  ConfirmDialog,
  PlainTextObject,
  TextObject,
} from './types.ts'
import { resolvePlainText, mrkdwn } from './text.ts'

export function option(
  text: string | PlainTextObject,
  value: string,
  opts?: { description?: string | PlainTextObject }
): Option {
  return {
    text: resolvePlainText(text),
    value,
    ...(opts?.description !== undefined && {
      description: resolvePlainText(opts.description),
    }),
  }
}

export function options(tuples: [string, string][]): Option[] {
  return tuples.map(([text, value]) => option(text, value))
}

export function confirmDialog(config: {
  title: string | PlainTextObject
  text: string | TextObject
  confirm: string | PlainTextObject
  deny: string | PlainTextObject
  style?: 'primary' | 'danger'
}): ConfirmDialog {
  return {
    title: resolvePlainText(config.title),
    text: typeof config.text === 'string' ? mrkdwn(config.text) : config.text,
    confirm: resolvePlainText(config.confirm),
    deny: resolvePlainText(config.deny),
    ...(config.style && { style: config.style }),
  }
}
