import { describe, expect, test } from 'bun:test'
import {
  textInput,
  emailInput,
  urlInput,
  numberInput,
  fileInput,
} from './inputs.ts'

describe('textInput', () => {
  test('creates plain text input', () => {
    expect(textInput('msg')).toEqual({
      type: 'plain_text_input',
      action_id: 'msg',
    })
  })

  test('with all options', () => {
    const result = textInput('msg', {
      placeholder: 'Type here...',
      initial_value: 'hello',
      multiline: true,
      min_length: 1,
      max_length: 100,
    })
    expect(result.multiline).toBe(true)
    expect(result.initial_value).toBe('hello')
    expect(result.placeholder).toEqual({
      type: 'plain_text',
      text: 'Type here...',
      emoji: true,
    })
  })
})

describe('emailInput', () => {
  test('creates email input', () => {
    expect(emailInput('email')).toEqual({
      type: 'email_text_input',
      action_id: 'email',
    })
  })
})

describe('urlInput', () => {
  test('creates url input', () => {
    expect(urlInput('url')).toEqual({
      type: 'url_text_input',
      action_id: 'url',
    })
  })
})

describe('numberInput', () => {
  test('creates number input with default decimal not allowed', () => {
    const result = numberInput('num')
    expect(result.type).toBe('number_input')
    expect(result.is_decimal_allowed).toBe(false)
  })

  test('allows decimal', () => {
    const result = numberInput('num', { is_decimal_allowed: true })
    expect(result.is_decimal_allowed).toBe(true)
  })
})

describe('fileInput', () => {
  test('creates file input', () => {
    expect(fileInput('file')).toEqual({
      type: 'file_input',
      action_id: 'file',
    })
  })

  test('with filetypes', () => {
    const result = fileInput('file', {
      filetypes: ['png', 'jpg'],
      max_files: 3,
    })
    expect(result.filetypes).toEqual(['png', 'jpg'])
    expect(result.max_files).toBe(3)
  })
})
