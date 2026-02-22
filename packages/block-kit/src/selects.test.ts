import { describe, expect, test } from 'bun:test'
import {
  staticSelect,
  multiStaticSelect,
  usersSelect,
  multiUsersSelect,
  conversationsSelect,
  multiConversationsSelect,
  channelsSelect,
  multiChannelsSelect,
  externalSelect,
  multiExternalSelect,
} from './selects.ts'
import { options } from './composition.ts'

describe('staticSelect', () => {
  test('creates static select', () => {
    const opts = options([
      ['A', 'a'],
      ['B', 'b'],
    ])
    const result = staticSelect('sel', opts)
    expect(result.type).toBe('static_select')
    expect(result.action_id).toBe('sel')
    expect(result.options).toHaveLength(2)
  })

  test('with placeholder', () => {
    const opts = options([['A', 'a']])
    const result = staticSelect('sel', opts, { placeholder: 'Choose...' })
    expect(result.placeholder).toEqual({
      type: 'plain_text',
      text: 'Choose...',
      emoji: true,
    })
  })
})

describe('multiStaticSelect', () => {
  test('creates multi static select', () => {
    const opts = options([['A', 'a']])
    const result = multiStaticSelect('sel', opts)
    expect(result.type).toBe('multi_static_select')
  })
})

describe('usersSelect', () => {
  test('creates users select', () => {
    expect(usersSelect('user')).toEqual({
      type: 'users_select',
      action_id: 'user',
    })
  })
})

describe('multiUsersSelect', () => {
  test('creates multi users select', () => {
    expect(multiUsersSelect('users')).toEqual({
      type: 'multi_users_select',
      action_id: 'users',
    })
  })
})

describe('conversationsSelect', () => {
  test('creates conversations select', () => {
    expect(conversationsSelect('conv')).toEqual({
      type: 'conversations_select',
      action_id: 'conv',
    })
  })
})

describe('multiConversationsSelect', () => {
  test('creates multi conversations select', () => {
    expect(multiConversationsSelect('convs')).toEqual({
      type: 'multi_conversations_select',
      action_id: 'convs',
    })
  })
})

describe('channelsSelect', () => {
  test('creates channels select', () => {
    expect(channelsSelect('chan')).toEqual({
      type: 'channels_select',
      action_id: 'chan',
    })
  })
})

describe('multiChannelsSelect', () => {
  test('creates multi channels select', () => {
    expect(multiChannelsSelect('chans')).toEqual({
      type: 'multi_channels_select',
      action_id: 'chans',
    })
  })
})

describe('externalSelect', () => {
  test('creates external select', () => {
    expect(externalSelect('ext')).toEqual({
      type: 'external_select',
      action_id: 'ext',
    })
  })
})

describe('multiExternalSelect', () => {
  test('creates multi external select', () => {
    expect(multiExternalSelect('exts')).toEqual({
      type: 'multi_external_select',
      action_id: 'exts',
    })
  })
})
