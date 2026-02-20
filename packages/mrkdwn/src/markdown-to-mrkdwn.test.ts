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
      '<https://example.com|Example>'
    )
  })

  it('converts heading to bold', () => {
    expect(markdownToMrkdwn('# Title')).toBe('*Title*')
  })

  it('converts h2 heading to bold', () => {
    expect(markdownToMrkdwn('## Subtitle')).toBe('*Subtitle*')
  })

  it('preserves code block and strips language tag', () => {
    const result = markdownToMrkdwn('```python\ncode here\n```')
    expect(result).toBe('```\ncode here\n```')
  })

  it('preserves inline code', () => {
    expect(markdownToMrkdwn('use `npm install`')).toBe('use `npm install`')
  })

  it('converts combined bold and italic', () => {
    expect(markdownToMrkdwn('**bold** and *italic*')).toBe(
      '*bold* and _italic_'
    )
  })

  it('converts unordered list with bullet character', () => {
    const result = markdownToMrkdwn('- item1\n- item2')
    expect(result).toBe('• item1\n• item2')
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
      '<https://example.com/img.png|alt text>'
    )
  })

  it('sanitises image alt text containing | and >', () => {
    expect(markdownToMrkdwn('![a|b>c](https://example.com/img.png)')).toBe(
      '<https://example.com/img.png|abc>'
    )
  })

  it('falls back to "image" when alt text is only special characters', () => {
    expect(markdownToMrkdwn('![|>](https://example.com/img.png)')).toBe(
      '<https://example.com/img.png|image>'
    )
  })

  it('handles nested unordered lists with indentation', () => {
    const result = markdownToMrkdwn('- Parent\n  - Child\n  - Child 2\n- Next')
    expect(result).toContain('• Parent')
    expect(result).toContain('    • Child')
    expect(result).toContain('    • Child 2')
    expect(result).toContain('• Next')
  })

  it('handles nested ordered lists with indentation', () => {
    const result = markdownToMrkdwn(
      '1. First\n2. Second\n   1. Sub A\n   2. Sub B\n3. Third'
    )
    expect(result).toContain('1. First')
    expect(result).toContain('    1. Sub A')
    expect(result).toContain('    2. Sub B')
    expect(result).toContain('3. Third')
  })

  it('converts task list with checkboxes', () => {
    const result = markdownToMrkdwn(
      '- [x] Done\n- [ ] Not done\n- [ ] Also not done'
    )
    expect(result).toContain('☑ Done')
    expect(result).toContain('☐ Not done')
    expect(result).toContain('☐ Also not done')
  })

  it('converts table to code block with aligned columns', () => {
    const result = markdownToMrkdwn(
      '| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |'
    )
    expect(result).toStartWith('```\n')
    expect(result).toEndWith('\n```')
    expect(result).toContain('│')
    expect(result).toContain('─')
    expect(result).toContain('Alice')
  })

  it('converts horizontal rule to line', () => {
    expect(markdownToMrkdwn('---')).toBe('───')
  })
})
