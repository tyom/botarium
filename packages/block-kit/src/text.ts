import type { PlainTextObject, MrkdwnObject, TextObject } from './types.ts'

export function plainText(text: string): PlainTextObject {
  return { type: 'plain_text', text, emoji: true }
}

export function mrkdwn(text: string): MrkdwnObject {
  return { type: 'mrkdwn', text }
}

/** Resolve string to plain_text, or pass through existing text object */
export function resolvePlainText(
  text: string | PlainTextObject
): PlainTextObject {
  return typeof text === 'string' ? plainText(text) : text
}

/** Resolve string to mrkdwn, or pass through existing text object */
export function resolveMrkdwn(text: string | TextObject): TextObject {
  return typeof text === 'string' ? mrkdwn(text) : text
}
