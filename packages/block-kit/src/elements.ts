import type {
  ButtonElement,
  ImageElement,
  OverflowElement,
  RadioButtonsElement,
  CheckboxesElement,
  DatePickerElement,
  TimePickerElement,
  DateTimePickerElement,
  Option,
  OverflowOption,
  ConfirmDialog,
  PlainTextObject,
} from './types.ts'
import { resolvePlainText } from './text.ts'

export function button(
  text: string | PlainTextObject,
  actionId: string,
  opts?: {
    value?: string
    style?: 'primary' | 'danger'
    url?: string
    confirm?: ConfirmDialog
  }
): ButtonElement {
  return {
    type: 'button',
    action_id: actionId,
    text: resolvePlainText(text),
    ...opts,
  }
}

export function image(url: string, altText: string): ImageElement {
  return { type: 'image', image_url: url, alt_text: altText }
}

export function overflow(
  actionId: string,
  options: OverflowOption[],
  opts?: { confirm?: ConfirmDialog }
): OverflowElement {
  return {
    type: 'overflow',
    action_id: actionId,
    options,
    ...opts,
  }
}

export function radioButtons(
  actionId: string,
  options: Option[],
  opts?: {
    initial_option?: Option
    confirm?: ConfirmDialog
    focus_on_load?: boolean
  }
): RadioButtonsElement {
  return {
    type: 'radio_buttons',
    action_id: actionId,
    options,
    ...opts,
  }
}

export function checkboxes(
  actionId: string,
  options: Option[],
  opts?: {
    initial_options?: Option[]
    confirm?: ConfirmDialog
  }
): CheckboxesElement {
  return {
    type: 'checkboxes',
    action_id: actionId,
    options,
    ...opts,
  }
}

export function datePicker(
  actionId: string,
  opts?: {
    initial_date?: string
    placeholder?: string | PlainTextObject
    confirm?: ConfirmDialog
    focus_on_load?: boolean
  }
): DatePickerElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'datepicker',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function timePicker(
  actionId: string,
  opts?: {
    initial_time?: string
    placeholder?: string | PlainTextObject
    confirm?: ConfirmDialog
    focus_on_load?: boolean
    timezone?: string
  }
): TimePickerElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'timepicker',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function dateTimePicker(
  actionId: string,
  opts?: {
    initial_date_time?: number
    confirm?: ConfirmDialog
    focus_on_load?: boolean
  }
): DateTimePickerElement {
  return {
    type: 'datetimepicker',
    action_id: actionId,
    ...opts,
  }
}
