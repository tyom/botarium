import { describe, expect, test } from 'bun:test'
import { option, options, confirmDialog } from './composition.ts'
import { plainText } from './text.ts'

describe('option', () => {
  test('creates option with string text', () => {
    expect(option('Low', 'low')).toEqual({
      text: { type: 'plain_text', text: 'Low', emoji: true },
      value: 'low',
    })
  })

  test('creates option with description', () => {
    const result = option('Low', 'low', { description: 'Low priority' })
    expect(result.description).toEqual({
      type: 'plain_text',
      text: 'Low priority',
      emoji: true,
    })
  })

  test('accepts pre-formed text object', () => {
    const result = option(plainText('Custom'), 'val')
    expect(result.text).toEqual({
      type: 'plain_text',
      text: 'Custom',
      emoji: true,
    })
  })
})

describe('options', () => {
  test('creates options from tuples', () => {
    const result = options([
      ['A', 'a'],
      ['B', 'b'],
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      text: { type: 'plain_text', text: 'A', emoji: true },
      value: 'a',
    })
    expect(result[1]).toEqual({
      text: { type: 'plain_text', text: 'B', emoji: true },
      value: 'b',
    })
  })
})

describe('confirmDialog', () => {
  test('creates confirm dialog with strings', () => {
    const result = confirmDialog({
      title: 'Are you sure?',
      text: 'This cannot be undone',
      confirm: 'Yes',
      deny: 'No',
    })
    expect(result).toEqual({
      title: { type: 'plain_text', text: 'Are you sure?', emoji: true },
      text: { type: 'mrkdwn', text: 'This cannot be undone' },
      confirm: { type: 'plain_text', text: 'Yes', emoji: true },
      deny: { type: 'plain_text', text: 'No', emoji: true },
    })
  })

  test('includes style when provided', () => {
    const result = confirmDialog({
      title: 'Delete?',
      text: 'Gone forever',
      confirm: 'Delete',
      deny: 'Cancel',
      style: 'danger',
    })
    expect(result.style).toBe('danger')
  })

  test('accepts pre-formed text object for text field', () => {
    const result = confirmDialog({
      title: 'Title',
      text: plainText('Plain text body'),
      confirm: 'OK',
      deny: 'Cancel',
    })
    expect(result.text).toEqual({
      type: 'plain_text',
      text: 'Plain text body',
      emoji: true,
    })
  })
})
