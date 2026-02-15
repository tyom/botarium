import { describe, expect, it } from 'bun:test'
import { markdownToMrkdwn } from './markdown-to-mrkdwn'

describe('markdownToMrkdwn', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToMrkdwn('')).toBe('')
  })

  it('converts bold', () => {
    expect(markdownToMrkdwn('**hello**')).toBe('*hello*')
  })

  it('converts italic', () => {
    expect(markdownToMrkdwn('*hello*')).toBe('_hello_')
  })

  it('converts strikethrough', () => {
    expect(markdownToMrkdwn('~~hello~~')).toBe('~hello~')
  })

  it('converts link', () => {
    expect(markdownToMrkdwn('[Example](https://example.com)')).toBe(
      '<https://example.com|Example>',
    )
  })

  it('converts heading to bold', () => {
    expect(markdownToMrkdwn('# Title')).toBe('*Title*')
  })

  it('converts h2 heading to bold', () => {
    expect(markdownToMrkdwn('## Subtitle')).toBe('*Subtitle*')
  })

  it('preserves code block', () => {
    const result = markdownToMrkdwn('```\ncode here\n```')
    expect(result).toContain('```')
    expect(result).toContain('code here')
  })

  it('preserves inline code', () => {
    expect(markdownToMrkdwn('use `npm install`')).toBe('use `npm install`')
  })

  it('converts combined bold and italic', () => {
    expect(markdownToMrkdwn('**bold** and *italic*')).toBe(
      '*bold* and _italic_',
    )
  })

  it('converts unordered list', () => {
    const result = markdownToMrkdwn('- item1\n- item2')
    expect(result).toContain('- item1')
    expect(result).toContain('- item2')
  })

  it('converts ordered list', () => {
    const result = markdownToMrkdwn('1. first\n2. second')
    expect(result).toContain('1. first')
    expect(result).toContain('2. second')
  })

  it('converts blockquote', () => {
    const result = markdownToMrkdwn('> quoted text')
    expect(result).toContain('> quoted text')
  })

  it('converts image to link', () => {
    expect(markdownToMrkdwn('![alt text](https://example.com/img.png)')).toBe(
      '<https://example.com/img.png|alt text>',
    )
  })
})
