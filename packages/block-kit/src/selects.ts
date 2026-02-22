import type {
  StaticSelectElement,
  MultiStaticSelectElement,
  UsersSelectElement,
  MultiUsersSelectElement,
  ConversationsSelectElement,
  MultiConversationsSelectElement,
  ChannelsSelectElement,
  MultiChannelsSelectElement,
  ExternalSelectElement,
  MultiExternalSelectElement,
  Option,
  ConfirmDialog,
  PlainTextObject,
} from './types.ts'
import { resolvePlainText } from './text.ts'

export function staticSelect(
  actionId: string,
  options: Option[],
  opts?: {
    placeholder?: string | PlainTextObject
    initial_option?: Option
    confirm?: ConfirmDialog
  }
): StaticSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'static_select',
    action_id: actionId,
    options,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function multiStaticSelect(
  actionId: string,
  options: Option[],
  opts?: {
    placeholder?: string | PlainTextObject
    initial_options?: Option[]
    max_selected_items?: number
  }
): MultiStaticSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'multi_static_select',
    action_id: actionId,
    options,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function usersSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_user?: string
  }
): UsersSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'users_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function multiUsersSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_users?: string[]
    max_selected_items?: number
  }
): MultiUsersSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'multi_users_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function conversationsSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_conversation?: string
  }
): ConversationsSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'conversations_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function multiConversationsSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_conversations?: string[]
    max_selected_items?: number
  }
): MultiConversationsSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'multi_conversations_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function channelsSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_channel?: string
  }
): ChannelsSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'channels_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function multiChannelsSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_channels?: string[]
    max_selected_items?: number
  }
): MultiChannelsSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'multi_channels_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function externalSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_option?: Option
    min_query_length?: number
  }
): ExternalSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'external_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}

export function multiExternalSelect(
  actionId: string,
  opts?: {
    placeholder?: string | PlainTextObject
    initial_options?: Option[]
    min_query_length?: number
    max_selected_items?: number
  }
): MultiExternalSelectElement {
  const { placeholder, ...rest } = opts ?? {}
  return {
    type: 'multi_external_select',
    action_id: actionId,
    ...rest,
    ...(placeholder !== undefined && {
      placeholder: resolvePlainText(placeholder),
    }),
  }
}
