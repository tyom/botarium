import { describe, expect, test } from 'bun:test'
import { modal, homeTab } from './surfaces.ts'
import { section, divider } from './blocks.ts'

describe('modal', () => {
  test('creates modal view', () => {
    const result = modal({
      title: 'My Modal',
      blocks: [section('Hello'), divider()],
      submit: 'Submit',
      close: 'Cancel',
    })
    expect(result).toEqual({
      type: 'modal',
      title: { type: 'plain_text', text: 'My Modal', emoji: true },
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: 'Hello' } },
        { type: 'divider' },
      ],
      submit: { type: 'plain_text', text: 'Submit', emoji: true },
      close: { type: 'plain_text', text: 'Cancel', emoji: true },
    })
  })

  test('with callback_id and metadata', () => {
    const result = modal({
      title: 'Form',
      blocks: [],
      callback_id: 'form_submit',
      private_metadata: '{"key":"value"}',
    })
    expect(result.callback_id).toBe('form_submit')
    expect(result.private_metadata).toBe('{"key":"value"}')
  })

  test('without submit/close', () => {
    const result = modal({
      title: 'Info',
      blocks: [],
    })
    expect(result.submit).toBeUndefined()
    expect(result.close).toBeUndefined()
  })
})

describe('homeTab', () => {
  test('creates home tab view', () => {
    const result = homeTab({
      blocks: [section('Welcome')],
    })
    expect(result).toEqual({
      type: 'home',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Welcome' } }],
    })
  })

  test('with callback_id', () => {
    const result = homeTab({
      blocks: [],
      callback_id: 'home_tab',
    })
    expect(result.callback_id).toBe('home_tab')
  })
})
