import type { App } from '@slack/bolt'
import { showcaseMessages } from '../../messages/showcase-messages'
import { slackLogger } from '../../utils/logger'

const SHOWCASE_CHANNEL = 'C_SHOWCASE'

export function register(app: App) {
  app.command('/showcase', async ({ command, ack, client }) => {
    await ack()

    const arg = command.text.trim().toLowerCase()

    // Handle /showcase clear -- clear channel then re-populate
    if (arg === 'clear') {
      try {
        const history = await client.conversations.history({
          channel: SHOWCASE_CHANNEL,
          limit: 200,
        })
        if (history.messages) {
          for (const msg of history.messages) {
            if (msg.ts) {
              await client.chat.delete({
                channel: SHOWCASE_CHANNEL,
                ts: msg.ts,
              })
            }
          }
        }
        slackLogger.info('Cleared showcase channel')
      } catch (err) {
        slackLogger.warn({ err }, 'Failed to clear showcase channel')
      }
    }

    // Handle /showcase modal -- open a modal with all input-context elements
    if (arg === 'modal') {
      try {
        await client.views.open({
          trigger_id: command.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'showcase_modal',
            title: { type: 'plain_text', text: 'Input Showcase' },
            submit: { type: 'plain_text', text: 'Submit' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Your Name' },
                hint: {
                  type: 'plain_text',
                  text: 'Enter your full name',
                },
                element: {
                  type: 'plain_text_input',
                  action_id: 'showcase_modal_name',
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Email Address' },
                element: {
                  type: 'email_text_input',
                  action_id: 'showcase_modal_email',
                  placeholder: {
                    type: 'plain_text',
                    text: 'name@example.com',
                  },
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Website' },
                element: {
                  type: 'url_text_input',
                  action_id: 'showcase_modal_url',
                  placeholder: {
                    type: 'plain_text',
                    text: 'https://example.com',
                  },
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Quantity' },
                hint: {
                  type: 'plain_text',
                  text: 'Enter a number between 1 and 100',
                },
                element: {
                  type: 'number_input',
                  action_id: 'showcase_modal_quantity',
                  is_decimal_allowed: false,
                  min_value: '1',
                  max_value: '100',
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Start Date' },
                element: {
                  type: 'datepicker',
                  action_id: 'showcase_modal_start_date',
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Start Time' },
                element: {
                  type: 'timepicker',
                  action_id: 'showcase_modal_start_time',
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Event DateTime' },
                element: {
                  type: 'datetimepicker',
                  action_id: 'showcase_modal_event_datetime',
                },
              },
              {
                type: 'input',
                label: { type: 'plain_text', text: 'Priority Level' },
                element: {
                  type: 'radio_buttons',
                  action_id: 'showcase_modal_priority',
                  options: [
                    {
                      text: { type: 'plain_text', text: 'Low' },
                      value: 'low',
                    },
                    {
                      text: { type: 'plain_text', text: 'Medium' },
                      value: 'medium',
                    },
                    {
                      text: { type: 'plain_text', text: 'High' },
                      value: 'high',
                    },
                  ],
                },
              },
              {
                type: 'input',
                label: {
                  type: 'plain_text',
                  text: 'Notification Preferences',
                },
                element: {
                  type: 'checkboxes',
                  action_id: 'showcase_modal_notifications',
                  options: [
                    {
                      text: { type: 'plain_text', text: 'Email' },
                      value: 'email',
                    },
                    {
                      text: { type: 'plain_text', text: 'SMS' },
                      value: 'sms',
                    },
                    {
                      text: { type: 'plain_text', text: 'Push' },
                      value: 'push',
                    },
                  ],
                },
              },
            ],
          },
        })
        slackLogger.info('Opened showcase modal')
      } catch (err) {
        slackLogger.error({ err }, 'Failed to open showcase modal')
      }
      return
    }

    // Send all showcase messages to #showcase channel
    for (const message of showcaseMessages) {
      try {
        await client.chat.postMessage({
          channel: SHOWCASE_CHANNEL,
          text: message.fallbackText,
          blocks: message.blocks,
        })
      } catch (err) {
        slackLogger.error(
          { err, fallbackText: message.fallbackText },
          'Failed to send showcase message'
        )
      }
    }

    slackLogger.info(
      { messageCount: showcaseMessages.length },
      'Sent showcase messages'
    )
  })
}
