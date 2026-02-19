import { describe, expect, it } from 'bun:test'
import { mrkdwnToHtml } from './mrkdwn-to-html'

describe('mrkdwnToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(mrkdwnToHtml('')).toBe('')
  })

  it('renders bold', () => {
    expect(mrkdwnToHtml('*hello*')).toBe('<strong>hello</strong>')
  })

  it('renders italic', () => {
    expect(mrkdwnToHtml('_hello_')).toBe('<em>hello</em>')
  })

  it('renders strikethrough', () => {
    expect(mrkdwnToHtml('~hello~')).toBe('<del>hello</del>')
  })

  it('renders inline code', () => {
    expect(mrkdwnToHtml('`code`')).toBe('<code>code</code>')
  })

  it('renders code block', () => {
    expect(mrkdwnToHtml('```\ncode\n```')).toBe('<pre><code>code</code></pre>')
  })

  it('renders code block without leading newline', () => {
    expect(mrkdwnToHtml('```code```')).toBe('<pre><code>code</code></pre>')
  })

  it('renders link with label', () => {
    expect(mrkdwnToHtml('<https://example.com|Example>')).toBe(
      '<a href="https://example.com" target="_blank">Example</a>'
    )
  })

  it('renders link without label', () => {
    expect(mrkdwnToHtml('<https://example.com>')).toBe(
      '<a href="https://example.com" target="_blank">https://example.com</a>'
    )
  })

  it('renders mailto link', () => {
    expect(mrkdwnToHtml('<mailto:test@example.com|Email>')).toBe(
      '<a href="mailto:test@example.com" target="_blank">Email</a>'
    )
  })

  it('renders user mention', () => {
    expect(mrkdwnToHtml('<@U123>')).toBe('<span class="s-mention">@U123</span>')
  })

  it('renders channel mention', () => {
    expect(mrkdwnToHtml('<#C123|general>')).toBe(
      '<span class="s-mention">#general</span>'
    )
  })

  it('renders special commands', () => {
    expect(mrkdwnToHtml('<!here>')).toBe('<span class="s-mention">@here</span>')
    expect(mrkdwnToHtml('<!channel>')).toBe(
      '<span class="s-mention">@channel</span>'
    )
    expect(mrkdwnToHtml('<!everyone>')).toBe(
      '<span class="s-mention">@everyone</span>'
    )
  })

  it('renders blockquote', () => {
    expect(mrkdwnToHtml('> quoted text')).toBe(
      '<blockquote>quoted text</blockquote>'
    )
  })

  it('renders multi-line blockquote', () => {
    expect(mrkdwnToHtml('> line 1\n> line 2')).toBe(
      '<blockquote>line 1<br>line 2</blockquote>'
    )
  })

  it('renders bullet list with bullet char', () => {
    expect(mrkdwnToHtml('\u2022 item1\n\u2022 item2')).toBe(
      '<ul><li>item1</li><li>item2</li></ul>'
    )
  })

  it('renders bullet list with dash', () => {
    expect(mrkdwnToHtml('- item1\n- item2')).toBe(
      '<ul><li>item1</li><li>item2</li></ul>'
    )
  })

  it('renders bullet list with asterisk', () => {
    expect(mrkdwnToHtml('* item1\n* item2')).toBe(
      '<ul><li>item1</li><li>item2</li></ul>'
    )
  })

  it('renders numbered list', () => {
    expect(mrkdwnToHtml('1. first\n2. second')).toBe(
      '<ol><li>first</li><li>second</li></ol>'
    )
  })

  it('renders mixed formatting', () => {
    expect(mrkdwnToHtml('*bold* and _italic_')).toBe(
      '<strong>bold</strong> and <em>italic</em>'
    )
  })

  it('renders nested bold and italic', () => {
    const result = mrkdwnToHtml('*bold _and italic_*')
    expect(result).toContain('<strong>')
    expect(result).toContain('<em>')
  })

  it('does not italicize underscored variable names', () => {
    expect(mrkdwnToHtml('some_variable_name')).toBe('some_variable_name')
  })

  it('does not format inside code blocks', () => {
    expect(mrkdwnToHtml('```\n*not bold*\n```')).toBe(
      '<pre><code>*not bold*</code></pre>'
    )
  })

  it('does not format inside inline code', () => {
    expect(mrkdwnToHtml('`*not bold*`')).toBe('<code>*not bold*</code>')
  })

  it('escapes HTML entities', () => {
    expect(mrkdwnToHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('renders line breaks', () => {
    expect(mrkdwnToHtml('line1\nline2')).toBe('line1<br>line2')
  })

  it('removes br adjacent to block elements', () => {
    const result = mrkdwnToHtml('text\n- item1\n- item2\nmore')
    expect(result).not.toMatch(/<br><ul>/)
    expect(result).not.toMatch(/<\/ul><br>/)
  })

  it('renders emoji shortcodes', () => {
    expect(mrkdwnToHtml(':thinking_face:')).toBe('\u{1F914}')
    expect(mrkdwnToHtml(':white_check_mark:')).toBe('\u2705')
    expect(mrkdwnToHtml(':rocket:')).toBe('\u{1F680}')
  })

  it('preserves unknown emoji shortcodes', () => {
    expect(mrkdwnToHtml(':custom_emoji:')).toBe(':custom_emoji:')
  })

  it('handles code block with surrounding text', () => {
    const result = mrkdwnToHtml('before\n```\ncode\n```\nafter')
    expect(result).toBe('before<pre><code>code</code></pre>after')
  })

  it('handles inline formatting within list items', () => {
    expect(mrkdwnToHtml('- *bold item*\n- _italic item_')).toBe(
      '<ul><li><strong>bold item</strong></li><li><em>italic item</em></li></ul>'
    )
  })

  it('renders task list checkboxes with line breaks', () => {
    expect(mrkdwnToHtml('☑ Done\n☐ Not done\n☐ Also not done')).toBe(
      '☑ Done<br>☐ Not done<br>☐ Also not done'
    )
  })
})
