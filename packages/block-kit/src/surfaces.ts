import type { ModalView, HomeTabView, Block, PlainTextObject } from './types.ts'
import { resolvePlainText } from './text.ts'

export function modal(config: {
  title: string | PlainTextObject
  blocks: Block[]
  submit?: string | PlainTextObject
  close?: string | PlainTextObject
  callback_id?: string
  private_metadata?: string
  clear_on_close?: boolean
  notify_on_close?: boolean
  external_id?: string
}): ModalView {
  const { title, blocks, submit, close, ...rest } = config
  return {
    type: 'modal',
    title: resolvePlainText(title),
    blocks,
    ...(submit !== undefined && { submit: resolvePlainText(submit) }),
    ...(close !== undefined && { close: resolvePlainText(close) }),
    ...rest,
  }
}

export function homeTab(config: {
  blocks: Block[]
  callback_id?: string
  private_metadata?: string
  external_id?: string
}): HomeTabView {
  const { blocks, ...rest } = config
  return {
    type: 'home',
    blocks,
    ...rest,
  }
}
