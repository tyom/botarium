import { describe, expect, test } from 'bun:test'
import { cell, rawCell, table, simpleTable } from './tables.ts'

describe('cell', () => {
  test('creates rich_text cell from string', () => {
    expect(cell('Hello')).toEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'text', text: 'Hello' }],
        },
      ],
    })
  })

  test('with style', () => {
    const result = cell('Bold', { bold: true })
    expect(result.elements[0]!.elements[0]).toEqual({
      type: 'text',
      text: 'Bold',
      style: { bold: true },
    })
  })
})

describe('rawCell', () => {
  test('creates raw_text cell', () => {
    expect(rawCell('raw')).toEqual({ type: 'raw_text', text: 'raw' })
  })
})

describe('table', () => {
  test('creates table block', () => {
    const result = table([[cell('A'), cell('B')]])
    expect(result.type).toBe('table')
    expect(result.rows).toHaveLength(1)
  })

  test('with column settings', () => {
    const result = table([[cell('A')]], {
      column_settings: [{ align: 'center' }],
    })
    expect(result.column_settings).toEqual([{ align: 'center' }])
  })
})

describe('simpleTable', () => {
  test('auto-bolds first row', () => {
    const result = simpleTable([
      ['Name', 'Age'],
      ['Alice', '30'],
    ])
    expect(result.rows).toHaveLength(2)
    // First row should be bold
    const headerCell = result.rows[0]![0]!
    expect(headerCell.type).toBe('rich_text')
    if (headerCell.type === 'rich_text') {
      expect(headerCell.elements[0]!.elements[0]).toEqual({
        type: 'text',
        text: 'Name',
        style: { bold: true },
      })
    }
    // Second row should not be bold
    const dataCell = result.rows[1]![0]!
    if (dataCell.type === 'rich_text') {
      expect(dataCell.elements[0]!.elements[0]).toEqual({
        type: 'text',
        text: 'Alice',
      })
    }
  })
})
