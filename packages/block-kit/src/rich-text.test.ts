import { describe, expect, test } from 'bun:test'
import {
  richText,
  richLink,
  richEmoji,
  richUserMention,
  richChannelMention,
  richBroadcast,
  richSection,
  richPreformatted,
  richQuote,
  richList,
  richTextBlock,
} from './rich-text.ts'

describe('richText', () => {
  test('creates text element', () => {
    expect(richText('hello')).toEqual({ type: 'text', text: 'hello' })
  })

  test('with style', () => {
    expect(richText('bold', { bold: true })).toEqual({
      type: 'text',
      text: 'bold',
      style: { bold: true },
    })
  })
})

describe('richLink', () => {
  test('creates link element', () => {
    expect(richLink('https://example.com')).toEqual({
      type: 'link',
      url: 'https://example.com',
    })
  })

  test('with text and style', () => {
    expect(
      richLink('https://example.com', 'Example', { italic: true })
    ).toEqual({
      type: 'link',
      url: 'https://example.com',
      text: 'Example',
      style: { italic: true },
    })
  })
})

describe('richEmoji', () => {
  test('creates emoji element', () => {
    expect(richEmoji('wave')).toEqual({ type: 'emoji', name: 'wave' })
  })

  test('with unicode', () => {
    expect(richEmoji('wave', { unicode: '1f44b' })).toEqual({
      type: 'emoji',
      name: 'wave',
      unicode: '1f44b',
    })
  })
})

describe('richUserMention', () => {
  test('creates user mention', () => {
    expect(richUserMention('U123')).toEqual({
      type: 'user',
      user_id: 'U123',
    })
  })
})

describe('richChannelMention', () => {
  test('creates channel mention', () => {
    expect(richChannelMention('C123')).toEqual({
      type: 'channel',
      channel_id: 'C123',
    })
  })
})

describe('richBroadcast', () => {
  test('creates broadcast mention', () => {
    expect(richBroadcast('here')).toEqual({
      type: 'broadcast',
      range: 'here',
    })
  })
})

describe('richSection', () => {
  test('auto-wraps strings', () => {
    const result = richSection(['Hello ', richText('world', { bold: true })])
    expect(result).toEqual({
      type: 'rich_text_section',
      elements: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world', style: { bold: true } },
      ],
    })
  })
})

describe('richPreformatted', () => {
  test('creates preformatted block', () => {
    const result = richPreformatted(['code here'])
    expect(result.type).toBe('rich_text_preformatted')
    expect(result.elements).toEqual([{ type: 'text', text: 'code here' }])
  })
})

describe('richQuote', () => {
  test('creates quote block', () => {
    const result = richQuote(['quoted text'])
    expect(result.type).toBe('rich_text_quote')
  })
})

describe('richList', () => {
  test('creates list', () => {
    const items = [richSection(['Item 1']), richSection(['Item 2'])]
    const result = richList('bullet', items)
    expect(result.type).toBe('rich_text_list')
    expect(result.style).toBe('bullet')
    expect(result.elements).toHaveLength(2)
  })
})

describe('richTextBlock', () => {
  test('creates rich_text block', () => {
    const sec = richSection(['Hello'])
    const result = richTextBlock([sec])
    expect(result).toEqual({
      type: 'rich_text',
      elements: [sec],
    })
  })

  test('with block_id', () => {
    const result = richTextBlock([richSection(['text'])], {
      block_id: 'rt_1',
    })
    expect(result.block_id).toBe('rt_1')
  })
})
