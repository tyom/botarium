<script lang="ts">
  import DOMPurify from 'dompurify'
  import type {
    SlackRichTextBlock,
    RichTextBlockElement,
    RichTextInlineElement,
    RichTextStyle,
  } from '../../../lib/types'

  interface Props {
    block: SlackRichTextBlock
  }

  let { block }: Props = $props()

  const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
      'a',
      'b',
      'blockquote',
      'br',
      'code',
      'del',
      'em',
      'i',
      'li',
      'ol',
      'pre',
      'span',
      'strong',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style'],
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function applyStyles(html: string, style?: RichTextStyle): string {
    if (!style) return html
    let result = html
    if (style.code) {
      result = `<code class="s-code">${result}</code>`
    }
    if (style.bold) result = `<strong>${result}</strong>`
    if (style.italic) result = `<em>${result}</em>`
    if (style.strike) result = `<del>${result}</del>`
    if (style.underline) result = `<u>${result}</u>`
    return result
  }

  function renderInlineElement(el: RichTextInlineElement): string {
    switch (el.type) {
      case 'text': {
        const escaped = escapeHtml(el.text)
        return applyStyles(escaped, el.style)
      }
      case 'link': {
        const linkText = escapeHtml(el.text || el.url)
        const inner = `<a href="${escapeHtml(el.url)}" target="_blank" class="s-link">${linkText}</a>`
        return applyStyles(inner, el.style)
      }
      case 'emoji': {
        return applyStyles(`:${escapeHtml(el.name)}:`, el.style)
      }
      case 'user': {
        const inner = `<span class="s-mention">@${escapeHtml(el.user_id)}</span>`
        return applyStyles(inner, el.style)
      }
      case 'channel': {
        const inner = `<span class="s-mention">#${escapeHtml(el.channel_id)}</span>`
        return applyStyles(inner, el.style)
      }
      case 'broadcast': {
        const inner = `<span class="s-mention">@${escapeHtml(el.range)}</span>`
        return applyStyles(inner, el.style)
      }
      default:
        return ''
    }
  }

  function renderInlineElements(elements: RichTextInlineElement[]): string {
    return elements.map(renderInlineElement).join('')
  }

  function renderBlockElement(el: RichTextBlockElement): string {
    switch (el.type) {
      case 'rich_text_section': {
        const content = renderInlineElements(el.elements)
        return `<span class="rt-section">${content}</span>`
      }
      case 'rich_text_preformatted': {
        const content = renderInlineElements(el.elements)
        return `<pre class="rt-pre">${content}</pre>`
      }
      case 'rich_text_quote': {
        const content = renderInlineElements(el.elements)
        return `<blockquote class="rt-quote">${content}</blockquote>`
      }
      case 'rich_text_list': {
        const tag = el.style === 'ordered' ? 'ol' : 'ul'
        const indentStyle = el.indent ? ` style="padding-left: ${el.indent * 24}px"` : ''
        const items = el.elements
          .map((item) => `<li>${renderInlineElements(item.elements)}</li>`)
          .join('')
        return `<${tag} class="rt-list"${indentStyle}>${items}</${tag}>`
      }
      default:
        return ''
    }
  }

  function renderBlock(block: SlackRichTextBlock): string {
    const html = block.elements.map(renderBlockElement).join('')
    return DOMPurify.sanitize(html, SANITIZE_CONFIG)
  }
</script>

<div class="rich-text text-slack-text">
  {@html renderBlock(block)}
</div>

<style>
  .rich-text :global(.rt-section) {
    white-space: pre-wrap;
  }

  .rich-text :global(.rt-pre) {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    margin: 4px 0;
  }

  .rich-text :global(.rt-quote) {
    border-left: 4px solid #ddd;
    padding-left: 12px;
    color: var(--text-secondary);
    margin: 4px 0;
    white-space: pre-wrap;
  }

  .rich-text :global(.rt-list) {
    padding-left: 24px;
    margin: 4px 0;
  }

  .rich-text :global(ul.rt-list) {
    list-style-type: disc;
  }

  .rich-text :global(ol.rt-list) {
    list-style-type: decimal;
  }

  .rich-text :global(.rt-list li) {
    margin: 2px 0;
  }

  .rich-text :global(.s-code) {
    background: #8881;
    border: 1px solid #8883;
    border-radius: 3px;
    padding: 2px 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: #e6902c;
  }

  .rich-text :global(.s-link) {
    color: #1d9bd1;
    text-decoration: none;
  }

  .rich-text :global(.s-link:hover) {
    text-decoration: underline;
  }

  .rich-text :global(.s-mention) {
    background: rgba(232, 171, 76, 0.2);
    color: #e8ab4c;
    padding: 0 2px;
    border-radius: 3px;
  }
</style>
