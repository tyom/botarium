import { describe, expect, test } from 'bun:test'
import {
  section,
  sectionFields,
  header,
  divider,
  actions,
  context,
  input,
  imageBlock,
} from './blocks.ts'
import { button, image } from './elements.ts'
import { textInput } from './inputs.ts'
import { plainText } from './text.ts'

describe('section', () => {
  test('wraps string as mrkdwn', () => {
    expect(section('*bold*')).toEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '*bold*' },
    })
  })

  test('accepts pre-formed text object', () => {
    const result = section(plainText('plain'))
    expect(result.text).toEqual({
      type: 'plain_text',
      text: 'plain',
      emoji: true,
    })
  })

  test('with accessory', () => {
    const btn = button('Click', 'btn')
    const result = section('Text', { accessory: btn })
    expect(result.accessory).toEqual(btn)
  })

  test('with block_id', () => {
    const result = section('Text', { block_id: 'sec_1' })
    expect(result.block_id).toBe('sec_1')
  })
})

describe('sectionFields', () => {
  test('wraps strings as mrkdwn', () => {
    const result = sectionFields(['*A*', '*B*'])
    expect(result.fields).toEqual([
      { type: 'mrkdwn', text: '*A*' },
      { type: 'mrkdwn', text: '*B*' },
    ])
  })
})

describe('header', () => {
  test('wraps string as plain_text', () => {
    expect(header('Title')).toEqual({
      type: 'header',
      text: { type: 'plain_text', text: 'Title', emoji: true },
    })
  })
})

describe('divider', () => {
  test('creates divider', () => {
    expect(divider()).toEqual({ type: 'divider' })
  })

  test('with block_id', () => {
    expect(divider({ block_id: 'div_1' })).toEqual({
      type: 'divider',
      block_id: 'div_1',
    })
  })
})

describe('actions', () => {
  test('creates actions block', () => {
    const btn = button('Click', 'btn')
    const result = actions([btn])
    expect(result.type).toBe('actions')
    expect(result.elements).toEqual([btn])
  })
})

describe('context', () => {
  test('wraps strings as mrkdwn', () => {
    const result = context(['Hello', '*world*'])
    expect(result.elements).toEqual([
      { type: 'mrkdwn', text: 'Hello' },
      { type: 'mrkdwn', text: '*world*' },
    ])
  })

  test('passes through image elements', () => {
    const img = image('https://img.png', 'alt')
    const result = context([img, 'text'])
    expect(result.elements[0]).toEqual(img)
  })
})

describe('input', () => {
  test('creates input block', () => {
    const result = input('Name', textInput('name'))
    expect(result).toEqual({
      type: 'input',
      label: { type: 'plain_text', text: 'Name', emoji: true },
      element: { type: 'plain_text_input', action_id: 'name' },
    })
  })

  test('with hint and optional', () => {
    const result = input('Name', textInput('name'), {
      hint: 'Enter your name',
      optional: true,
    })
    expect(result.hint).toEqual({
      type: 'plain_text',
      text: 'Enter your name',
      emoji: true,
    })
    expect(result.optional).toBe(true)
  })
})

describe('imageBlock', () => {
  test('creates image block', () => {
    expect(imageBlock('https://img.png', 'Photo')).toEqual({
      type: 'image',
      image_url: 'https://img.png',
      alt_text: 'Photo',
    })
  })

  test('with title', () => {
    const result = imageBlock('https://img.png', 'Photo', {
      title: 'My photo',
    })
    expect(result.title).toEqual({
      type: 'plain_text',
      text: 'My photo',
      emoji: true,
    })
  })
})
