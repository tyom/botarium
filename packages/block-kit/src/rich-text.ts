import type {
  RichTextTextElement,
  RichTextLinkElement,
  RichTextEmojiElement,
  RichTextUserMentionElement,
  RichTextChannelMentionElement,
  RichTextBroadcastElement,
  RichTextInlineElement,
  RichTextSectionElement,
  RichTextPreformattedElement,
  RichTextQuoteElement,
  RichTextListElement,
  RichTextBlock,
  RichTextBlockElement,
  RichTextStyle,
} from './types.ts'

// Inline elements

export function richText(
  text: string,
  style?: RichTextStyle
): RichTextTextElement {
  return {
    type: 'text',
    text,
    ...(style && { style }),
  }
}

export function richLink(
  url: string,
  text?: string,
  style?: RichTextStyle
): RichTextLinkElement {
  return {
    type: 'link',
    url,
    ...(text !== undefined && { text }),
    ...(style && { style }),
  }
}

export function richEmoji(
  name: string,
  opts?: { unicode?: string; style?: RichTextStyle }
): RichTextEmojiElement {
  return {
    type: 'emoji',
    name,
    ...(opts?.unicode !== undefined && { unicode: opts.unicode }),
    ...(opts?.style && { style: opts.style }),
  }
}

export function richUserMention(
  userId: string,
  style?: RichTextStyle
): RichTextUserMentionElement {
  return {
    type: 'user',
    user_id: userId,
    ...(style && { style }),
  }
}

export function richChannelMention(
  channelId: string,
  style?: RichTextStyle
): RichTextChannelMentionElement {
  return {
    type: 'channel',
    channel_id: channelId,
    ...(style && { style }),
  }
}

export function richBroadcast(
  range: 'here' | 'channel' | 'everyone',
  style?: RichTextStyle
): RichTextBroadcastElement {
  return {
    type: 'broadcast',
    range,
    ...(style && { style }),
  }
}

function resolveInline(
  el: string | RichTextInlineElement
): RichTextInlineElement {
  return typeof el === 'string' ? richText(el) : el
}

// Block-level elements

export function richSection(
  elements: (string | RichTextInlineElement)[]
): RichTextSectionElement {
  return {
    type: 'rich_text_section',
    elements: elements.map(resolveInline),
  }
}

export function richPreformatted(
  elements: (string | RichTextInlineElement)[],
  opts?: { border?: 0 | 1 }
): RichTextPreformattedElement {
  return {
    type: 'rich_text_preformatted',
    elements: elements.map(resolveInline),
    ...opts,
  }
}

export function richQuote(
  elements: (string | RichTextInlineElement)[],
  opts?: { border?: 0 | 1 }
): RichTextQuoteElement {
  return {
    type: 'rich_text_quote',
    elements: elements.map(resolveInline),
    ...opts,
  }
}

export function richList(
  style: 'bullet' | 'ordered',
  items: RichTextSectionElement[],
  opts?: { indent?: number; border?: 0 | 1 }
): RichTextListElement {
  return {
    type: 'rich_text_list',
    style,
    elements: items,
    ...opts,
  }
}

// Top-level block

export function richTextBlock(
  elements: RichTextBlockElement[],
  opts?: { block_id?: string }
): RichTextBlock {
  return {
    type: 'rich_text',
    elements,
    ...opts,
  }
}
