import type {
  RichTextBlock,
  RawTextElement,
  TableBlock,
  TableColumnSettings,
  RichTextStyle,
} from './types.ts'

export function cell(text: string, style?: RichTextStyle): RichTextBlock {
  return {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text,
            ...(style && { style }),
          },
        ],
      },
    ],
  }
}

export function rawCell(text: string): RawTextElement {
  return { type: 'raw_text', text }
}

export function table(
  rows: (RichTextBlock | RawTextElement)[][],
  opts?: { column_settings?: TableColumnSettings[]; block_id?: string }
): TableBlock {
  return {
    type: 'table',
    rows,
    ...opts,
  }
}

export function simpleTable(
  rows: string[][],
  opts?: { column_settings?: TableColumnSettings[]; block_id?: string }
): TableBlock {
  return table(
    rows.map((row, i) =>
      row.map((text) => (i === 0 ? cell(text, { bold: true }) : cell(text)))
    ),
    opts
  )
}
