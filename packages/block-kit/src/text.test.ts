import { describe, expect, test } from 'bun:test'
import { plainText, mrkdwn } from './text.ts'

describe('plainText', () => {
  test('creates plain_text object with emoji', () => {
    expect(plainText('Hello')).toEqual({
      type: 'plain_text',
      text: 'Hello',
      emoji: true,
    })
  })
})

describe('mrkdwn', () => {
  test('creates mrkdwn object', () => {
    expect(mrkdwn('*bold*')).toEqual({
      type: 'mrkdwn',
      text: '*bold*',
    })
  })
})
