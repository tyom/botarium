import { describe, expect, test } from 'bun:test'
import {
  button,
  image,
  overflow,
  radioButtons,
  checkboxes,
  datePicker,
  timePicker,
  dateTimePicker,
} from './elements.ts'
import { options } from './composition.ts'

describe('button', () => {
  test('creates button with string text', () => {
    expect(button('Click', 'btn_click')).toEqual({
      type: 'button',
      action_id: 'btn_click',
      text: { type: 'plain_text', text: 'Click', emoji: true },
    })
  })

  test('creates button with style and value', () => {
    const result = button('Delete', 'btn_del', {
      style: 'danger',
      value: '123',
    })
    expect(result.style).toBe('danger')
    expect(result.value).toBe('123')
  })

  test('creates button with url', () => {
    const result = button('Link', 'btn_link', {
      url: 'https://example.com',
    })
    expect(result.url).toBe('https://example.com')
  })
})

describe('image', () => {
  test('creates image element', () => {
    expect(image('https://img.png', 'An image')).toEqual({
      type: 'image',
      image_url: 'https://img.png',
      alt_text: 'An image',
    })
  })
})

describe('overflow', () => {
  test('creates overflow menu', () => {
    const opts = options([
      ['Edit', 'edit'],
      ['Delete', 'delete'],
    ])
    const result = overflow('more_actions', opts)
    expect(result.type).toBe('overflow')
    expect(result.action_id).toBe('more_actions')
    expect(result.options).toHaveLength(2)
  })
})

describe('radioButtons', () => {
  test('creates radio buttons', () => {
    const opts = options([
      ['A', 'a'],
      ['B', 'b'],
    ])
    const result = radioButtons('radio_choice', opts)
    expect(result.type).toBe('radio_buttons')
    expect(result.options).toHaveLength(2)
  })

  test('supports initial_option', () => {
    const opts = options([
      ['A', 'a'],
      ['B', 'b'],
    ])
    const result = radioButtons('radio', opts, { initial_option: opts[0]! })
    expect(result.initial_option).toEqual(opts[0])
  })
})

describe('checkboxes', () => {
  test('creates checkboxes', () => {
    const opts = options([
      ['X', 'x'],
      ['Y', 'y'],
    ])
    const result = checkboxes('check', opts)
    expect(result.type).toBe('checkboxes')
    expect(result.options).toHaveLength(2)
  })
})

describe('datePicker', () => {
  test('creates date picker', () => {
    const result = datePicker('pick_date')
    expect(result).toEqual({ type: 'datepicker', action_id: 'pick_date' })
  })

  test('with initial date and placeholder', () => {
    const result = datePicker('pick_date', {
      initial_date: '2024-01-01',
      placeholder: 'Choose date',
    })
    expect(result.initial_date).toBe('2024-01-01')
    expect(result.placeholder).toEqual({
      type: 'plain_text',
      text: 'Choose date',
      emoji: true,
    })
  })
})

describe('timePicker', () => {
  test('creates time picker', () => {
    const result = timePicker('pick_time')
    expect(result.type).toBe('timepicker')
  })
})

describe('dateTimePicker', () => {
  test('creates datetime picker', () => {
    const result = dateTimePicker('pick_dt', { initial_date_time: 1700000000 })
    expect(result.type).toBe('datetimepicker')
    expect(result.initial_date_time).toBe(1700000000)
  })
})
