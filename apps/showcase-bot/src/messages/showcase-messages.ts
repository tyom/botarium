import type { KnownBlock } from '@slack/types'

export interface ShowcaseMessage {
  fallbackText: string
  blocks: KnownBlock[]
}

/**
 * Category 1: Text & Layout Blocks
 */
const textAndLayoutBlocks: ShowcaseMessage = {
  fallbackText: 'Text & Layout Blocks',
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Block Kit Showcase', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Bold text*, _italic text_, ~strikethrough~, `inline code`, <https://slack.com|a link>, and a blockquote:\n> This is a blockquote with *formatting*',
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Field 1*\nLeft column value' },
        { type: 'mrkdwn', text: '_Field 2_\nRight column value' },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url: 'https://placecats.com/32/32',
          alt_text: 'cat avatar',
        },
        {
          type: 'mrkdwn',
          text: 'Posted by *Showcase Bot* | Context block with image and text',
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'image',
      image_url: 'https://placecats.com/300/200',
      alt_text: 'A placeholder cat image',
      title: { type: 'plain_text', text: 'Image Block', emoji: true },
    },
  ],
}

/**
 * Category 2: Button Variations
 */
const buttonVariations: ShowcaseMessage = {
  fallbackText: 'Button Variations',
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Buttons', emoji: true },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Primary', emoji: true },
          style: 'primary',
          action_id: 'showcase_button_primary',
          value: 'primary_clicked',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Danger', emoji: true },
          style: 'danger',
          action_id: 'showcase_button_danger',
          value: 'danger_clicked',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Default', emoji: true },
          action_id: 'showcase_button_default',
          value: 'default_clicked',
        },
      ],
    },
  ],
}

/**
 * Category 3: Selection Elements
 */
const selectionElements: ShowcaseMessage = {
  fallbackText: 'Selection Elements',
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Selection Elements', emoji: true },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Choose an option',
            emoji: true,
          },
          action_id: 'showcase_static_select',
          options: [
            {
              text: { type: 'plain_text', text: 'Option A', emoji: true },
              value: 'option_a',
            },
            {
              text: { type: 'plain_text', text: 'Option B', emoji: true },
              value: 'option_b',
            },
            {
              text: { type: 'plain_text', text: 'Option C', emoji: true },
              value: 'option_c',
            },
          ],
        },
        {
          type: 'overflow',
          action_id: 'showcase_overflow',
          options: [
            {
              text: { type: 'plain_text', text: 'Edit', emoji: true },
              value: 'edit',
            },
            {
              text: { type: 'plain_text', text: 'Archive', emoji: true },
              value: 'archive',
            },
            {
              text: { type: 'plain_text', text: 'Delete', emoji: true },
              value: 'delete',
            },
          ],
        },
      ],
    },
  ],
}

/**
 * Category 4: Radio Buttons & Checkboxes
 */
const radioAndCheckboxes: ShowcaseMessage = {
  fallbackText: 'Radio Buttons & Checkboxes',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Radio Buttons & Checkboxes',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Size Selection* (radio buttons accessory)' },
      accessory: {
        type: 'radio_buttons',
        action_id: 'showcase_radio_size',
        options: [
          {
            text: { type: 'plain_text', text: 'Small', emoji: true },
            description: { type: 'plain_text', text: 'Compact layout' },
            value: 'small',
          },
          {
            text: { type: 'plain_text', text: 'Medium', emoji: true },
            description: { type: 'plain_text', text: 'Standard layout' },
            value: 'medium',
          },
          {
            text: { type: 'plain_text', text: 'Large', emoji: true },
            description: { type: 'plain_text', text: 'Expanded layout' },
            value: 'large',
          },
        ],
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Notification Preferences* (checkboxes accessory)',
      },
      accessory: {
        type: 'checkboxes',
        action_id: 'showcase_checkbox_notifications',
        options: [
          {
            text: { type: 'plain_text', text: 'Email', emoji: true },
            description: { type: 'plain_text', text: 'Daily digest' },
            value: 'email',
          },
          {
            text: { type: 'plain_text', text: 'SMS', emoji: true },
            description: { type: 'plain_text', text: 'Urgent only' },
            value: 'sms',
          },
          {
            text: { type: 'plain_text', text: 'Push', emoji: true },
            description: { type: 'plain_text', text: 'Real-time alerts' },
            value: 'push',
          },
        ],
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'radio_buttons',
          action_id: 'showcase_radio_priority',
          options: [
            {
              text: { type: 'plain_text', text: 'Low', emoji: true },
              value: 'low',
            },
            {
              text: { type: 'plain_text', text: 'Medium', emoji: true },
              value: 'medium',
            },
            {
              text: { type: 'plain_text', text: 'High', emoji: true },
              value: 'high',
            },
          ],
        },
        {
          type: 'checkboxes',
          action_id: 'showcase_checkbox_features',
          options: [
            {
              text: { type: 'plain_text', text: 'Dark mode', emoji: true },
              value: 'dark_mode',
            },
            {
              text: { type: 'plain_text', text: 'Notifications', emoji: true },
              value: 'notifications',
            },
            {
              text: { type: 'plain_text', text: 'Auto-save', emoji: true },
              value: 'auto_save',
            },
          ],
        },
      ],
    },
  ],
}

/**
 * Category 5: Date & Time Pickers
 */
function getDateTimePickers(): ShowcaseMessage {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const initialDate = `${yyyy}-${mm}-${dd}`

  // UNIX timestamp for today at noon (UTC)
  const noonToday = new Date(`${initialDate}T12:00:00Z`)
  const initialDateTime = Math.floor(noonToday.getTime() / 1000)

  return {
    fallbackText: 'Date & Time Pickers',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Date & Time Pickers',
          emoji: true,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'datepicker',
            action_id: 'showcase_datepicker',
            initial_date: initialDate,
            placeholder: {
              type: 'plain_text',
              text: 'Select a date',
              emoji: true,
            },
          },
          {
            type: 'timepicker',
            action_id: 'showcase_timepicker',
            initial_time: '09:00',
            placeholder: {
              type: 'plain_text',
              text: 'Select a time',
              emoji: true,
            },
          },
          {
            type: 'datetimepicker' as const,
            action_id: 'showcase_datetimepicker',
            initial_date_time: initialDateTime,
          },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Delivery Date* (datepicker accessory)' },
        accessory: {
          type: 'datepicker',
          action_id: 'showcase_datepicker_accessory',
          initial_date: initialDate,
          placeholder: {
            type: 'plain_text',
            text: 'Select a delivery date',
            emoji: true,
          },
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Meeting Time* (timepicker accessory)',
        },
        accessory: {
          type: 'timepicker',
          action_id: 'showcase_timepicker_accessory',
          initial_time: '14:30',
          placeholder: {
            type: 'plain_text',
            text: 'Choose a meeting time',
            emoji: true,
          },
        },
      },
    ],
  }
}

/**
 * Category 6: Section Accessories
 */
const sectionAccessories: ShowcaseMessage = {
  fallbackText: 'Section Accessories',
  blocks: [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Section Accessories', emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Click the action button' },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Action', emoji: true },
        action_id: 'showcase_section_button',
        value: 'section_button_clicked',
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Choose a priority' },
      accessory: {
        type: 'static_select',
        action_id: 'showcase_section_select',
        placeholder: {
          type: 'plain_text',
          text: 'Select priority',
          emoji: true,
        },
        options: [
          {
            text: { type: 'plain_text', text: 'Low', emoji: true },
            value: 'low',
          },
          {
            text: { type: 'plain_text', text: 'Medium', emoji: true },
            value: 'medium',
          },
          {
            text: { type: 'plain_text', text: 'High', emoji: true },
            value: 'high',
          },
          {
            text: { type: 'plain_text', text: 'Critical', emoji: true },
            value: 'critical',
          },
        ],
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'More options available' },
      accessory: {
        type: 'overflow',
        action_id: 'showcase_section_overflow',
        options: [
          {
            text: { type: 'plain_text', text: 'Settings', emoji: true },
            value: 'settings',
          },
          {
            text: { type: 'plain_text', text: 'Help', emoji: true },
            value: 'help',
          },
          {
            text: { type: 'plain_text', text: 'About', emoji: true },
            value: 'about',
          },
        ],
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Section with an image accessory' },
      accessory: {
        type: 'image',
        image_url: 'https://placecats.com/128/128',
        alt_text: 'A cute cat',
      },
    },
  ],
}

/**
 * Category 7: Combined Actions Block
 */
function getCombinedActions(): ShowcaseMessage {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const initialDate = `${yyyy}-${mm}-${dd}`

  return {
    fallbackText: 'Combined Actions',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Combined Actions', emoji: true },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Submit', emoji: true },
            style: 'primary',
            action_id: 'showcase_combined_button',
            value: 'submit',
          },
          {
            type: 'static_select',
            action_id: 'showcase_combined_select',
            placeholder: {
              type: 'plain_text',
              text: 'Pick one',
              emoji: true,
            },
            options: [
              {
                text: { type: 'plain_text', text: 'Alpha', emoji: true },
                value: 'alpha',
              },
              {
                text: { type: 'plain_text', text: 'Beta', emoji: true },
                value: 'beta',
              },
              {
                text: { type: 'plain_text', text: 'Gamma', emoji: true },
                value: 'gamma',
              },
            ],
          },
          {
            type: 'datepicker',
            action_id: 'showcase_combined_datepicker',
            initial_date: initialDate,
            placeholder: {
              type: 'plain_text',
              text: 'Pick a date',
              emoji: true,
            },
          },
          {
            type: 'overflow',
            action_id: 'showcase_combined_overflow',
            options: [
              {
                text: { type: 'plain_text', text: 'Export', emoji: true },
                value: 'export',
              },
              {
                text: { type: 'plain_text', text: 'Print', emoji: true },
                value: 'print',
              },
              {
                text: { type: 'plain_text', text: 'Share', emoji: true },
                value: 'share',
              },
            ],
          },
        ],
      },
    ],
  }
}

/**
 * All showcase messages in display order.
 */
export const showcaseMessages: ShowcaseMessage[] = [
  textAndLayoutBlocks,
  buttonVariations,
  selectionElements,
  radioAndCheckboxes,
  getDateTimePickers(),
  sectionAccessories,
  getCombinedActions(),
]
