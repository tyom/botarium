<script lang="ts">
  import DOMPurify from 'dompurify'
  import { resolveEmoji, renderEmoji } from '@botarium/mrkdwn'
  import type {
    RichTextBlockElement,
    RichTextInlineElement,
    RichTextStyle,
    SlackRichTextBlock,
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
      'div',
      'em',
      'i',
      'li',
      'ol',
      'pre',
      's',
      'span',
      'strong',
      'u',
      'ul',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'class',
      'style',
      'rel',
      'type',
      'data-stringify-type',
      'data-stringify-emoji',
      'data-indent',
      'aria-label',
      'aria-hidden',
    ],
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
    if (style.bold) result = `<b>${result}</b>`
    if (style.italic) result = `<em>${result}</em>`
    if (style.strike) result = `<s>${result}</s>`
    if (style.underline) result = `<u>${result}</u>`
    return result
  }

  function isEmojiOnly(elements: RichTextInlineElement[]): boolean {
    return (
      elements.some((e) => e.type === 'emoji') &&
      elements.every(
        (e) => e.type === 'emoji' || (e.type === 'text' && /^\s*$/.test(e.text))
      )
    )
  }

  function renderInlineElement(
    el: RichTextInlineElement,
    large?: boolean
  ): string {
    switch (el.type) {
      case 'text': {
        const escaped = escapeHtml(el.text)
        return applyStyles(escaped, el.style)
      }
      case 'link': {
        const linkText = escapeHtml(el.text || el.url)
        const inner = `<a href="${escapeHtml(el.url)}" target="_blank" rel="noopener noreferrer" class="s-link">${linkText}</a>`
        return applyStyles(inner, el.style)
      }
      case 'emoji': {
        const rendered = renderEmoji(el.name, { large })
        if (rendered) return applyStyles(rendered, el.style)
        const unicode = el.unicode
          ? String.fromCodePoint(
              ...el.unicode.split('-').map((s) => parseInt(s, 16))
            )
          : undefined
        const emoji = resolveEmoji(el.name) ?? unicode
        const display = emoji ?? `:${escapeHtml(el.name)}:`
        return applyStyles(display, el.style)
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

  function renderInlineElements(
    elements: RichTextInlineElement[],
    large?: boolean
  ): string {
    return elements.map((el) => renderInlineElement(el, large)).join('')
  }

  const MRKDWN_BR =
    '<span class="c-mrkdwn__br" aria-label="&nbsp;" data-stringify-type="paragraph-break"></span>'

  function newlinesToBreaks(html: string): string {
    return html.replace(/\n+/g, MRKDWN_BR)
  }

  function renderBlockElement(el: RichTextBlockElement): string {
    switch (el.type) {
      case 'rich_text_section': {
        const isWhitespaceOnly = el.elements.every(
          (e) => e.type === 'text' && /^\s*$/.test(e.text)
        )
        if (isWhitespaceOnly) return ''
        const large = isEmojiOnly(el.elements)
        const content = newlinesToBreaks(
          renderInlineElements(el.elements, large)
        )
        return `<div class="p-rich_text_section">${content}</div>`
      }
      case 'rich_text_preformatted': {
        const content = renderInlineElements(el.elements)
        return `<pre class="c-mrkdwn__pre" data-stringify-type="pre"><div class="p-rich_text_block--no-overflow">${content}</div></pre>`
      }
      case 'rich_text_quote': {
        const content = newlinesToBreaks(renderInlineElements(el.elements))
        return `<blockquote type="cite" class="c-mrkdwn__quote">${content}</blockquote>`
      }
      case 'rich_text_list': {
        const tag = el.style === 'ordered' ? 'ol' : 'ul'
        const listClass =
          el.style === 'ordered'
            ? 'p-rich_text_list p-rich_text_list__ordered'
            : 'p-rich_text_list p-rich_text_list__bullet'
        const items = el.elements
          .map((item) => {
            const indentAttr = el.indent ? ` data-indent="${el.indent}"` : ''
            return `<li${indentAttr}>${newlinesToBreaks(renderInlineElements(item.elements))}</li>`
          })
          .join('')
        return `<${tag} class="${listClass}">${items}</${tag}>`
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

<div class="p-rich_text_block text-slack-text" dir="auto">
  {@html renderBlock(block)}
</div>

<style>
  .p-rich_text_block :global(.c-mrkdwn__br) {
    display: block;
    height: 8px;
  }

  .p-rich_text_block :global(.c-mrkdwn__pre) {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    margin: 4px 0;
  }

  .p-rich_text_block :global(.p-rich_text_block--no-overflow) {
    overflow-x: auto;
  }

  .p-rich_text_block :global(.c-mrkdwn__quote) {
    border-left: 4px solid rgba(255, 255, 255, 0.25);
    padding-left: 12px;
    color: var(--text-secondary);
    margin: 4px 0;
  }

  .p-rich_text_block :global(.p-rich_text_list) {
    margin-top: 0;
    margin-bottom: 0;
    margin-inline-start: 0;
    padding-inline-start: 0;
  }

  .p-rich_text_block :global(ul.p-rich_text_list__bullet) {
    list-style-type: none;
  }

  .p-rich_text_block :global(ol.p-rich_text_list__ordered) {
    list-style-type: decimal;
  }

  .p-rich_text_block :global(.p-rich_text_list li) {
    margin-inline-start: 28px;
    margin-bottom: 0;
  }

  .p-rich_text_block :global(.p-rich_text_list li::before) {
    text-align: center;
    width: 22px;
    margin-inline: -28px 6px;
    display: inline-block;
    white-space: nowrap;
    font-size: 15px;
    font-style: normal;
    font-weight: 400;
    line-height: 1;
    vertical-align: middle;
  }

  .p-rich_text_block :global(.p-rich_text_list__bullet li::before) {
    content: '\25CF';
    font-size: 9px;
  }

  .p-rich_text_block
    :global(.p-rich_text_list__bullet li[data-indent='1']::before) {
    content: '\25CB';
    font-size: 9px;
  }

  .p-rich_text_block
    :global(.p-rich_text_list__bullet li[data-indent='2']::before) {
    content: '\25A0';
    font-size: 7px;
  }

  .p-rich_text_block :global(.p-rich_text_list li[data-indent='1']) {
    padding-left: 24px;
  }

  .p-rich_text_block :global(.p-rich_text_list li[data-indent='2']) {
    padding-left: 48px;
  }

  .p-rich_text_block :global(.p-rich_text_list li[data-indent='3']) {
    padding-left: 72px;
  }

  .p-rich_text_block :global(.s-code) {
    background: #8881;
    border: 1px solid #8883;
    border-radius: 3px;
    padding: 2px 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: #e6902c;
  }

  .p-rich_text_block :global(.s-link) {
    color: #1d9bd1;
    text-decoration: none;
  }

  .p-rich_text_block :global(.s-link:hover) {
    text-decoration: underline;
  }

  .p-rich_text_block :global(.s-mention) {
    background: rgba(232, 171, 76, 0.2);
    color: #e8ab4c;
    padding: 0 2px;
    border-radius: 3px;
  }

  .p-rich_text_block :global(.c-emoji) {
    position: relative;
    cursor: default;
    font-size: 22px;
    line-height: 22px;
    vertical-align: text-bottom;
  }

  .p-rich_text_block :global(.c-emoji__large) {
    font-size: 32px;
    line-height: 32px;
  }

  .p-rich_text_block :global(.c-emoji__tooltip) {
    display: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1d1c1d;
    border-radius: 6px;
    padding: 4px 8px;
    white-space: nowrap;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    z-index: 10;
    pointer-events: none;
  }

  .p-rich_text_block :global(.c-emoji:hover .c-emoji__tooltip) {
    display: flex;
  }

  .p-rich_text_block :global(.c-emoji__tooltip-big) {
    font-size: 64px;
    line-height: 1.2;
  }

  .p-rich_text_block :global(.c-emoji__tooltip-code) {
    font-size: 11px;
    color: #ababad;
  }
</style>
