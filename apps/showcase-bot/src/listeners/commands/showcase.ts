import type { App } from '@slack/bolt'
import type { Block } from '@slack/types'
import {
  modal,
  input,
  textInput,
  emailInput,
  urlInput,
  numberInput,
  datePicker,
  timePicker,
  dateTimePicker,
  radioButtons,
  checkboxes,
  staticSelect,
  multiStaticSelect,
  fileInput,
  options,
} from '@botarium/block-kit'
import { blockKitMessages } from '../../messages/block-kit-messages'
import { showcaseMessages } from '../../messages/showcase-messages'
import { slackLogger } from '../../utils/logger'

const SHOWCASE_CHANNEL = 'C_SHOWCASE'

/**
 * Clear all messages from the #showcase channel.
 */
export async function clearShowcaseChannel(client: App['client']) {
  try {
    const history = await client.conversations.history({
      channel: SHOWCASE_CHANNEL,
      limit: 200,
    })
    if (history.messages) {
      for (const msg of history.messages) {
        if (msg.ts) {
          await client.chat.delete({ channel: SHOWCASE_CHANNEL, ts: msg.ts })
        }
      }
    }
  } catch {
    // Channel may be empty or not yet available — safe to ignore
  }
}

async function postMessages(
  client: App['client'],
  messages: { text?: string; blocks: Block[] }[],
  label: string
) {
  await clearShowcaseChannel(client)

  for (const message of messages) {
    try {
      await client.chat.postMessage({
        channel: SHOWCASE_CHANNEL,
        text: message.text,
        blocks: message.blocks,
      })
    } catch (err) {
      slackLogger.error(
        { err, text: message.text },
        `Failed to send ${label} message`
      )
    }
  }
  slackLogger.info({ messageCount: messages.length }, `Sent ${label} messages`)
}

/**
 * Send all showcase messages to the #showcase channel.
 * Clears existing messages first to prevent duplicates across restarts.
 * Reusable: called both on startup (auto-populate) and via /showcase command.
 */
export async function sendShowcaseMessages(client: App['client']) {
  await postMessages(client, showcaseMessages, 'showcase')
}

/**
 * Send all block-kit messages to the #showcase channel.
 * Clears existing messages first to prevent duplicates across restarts.
 */
export async function sendBlockKitMessages(client: App['client']) {
  await postMessages(client, blockKitMessages, 'block-kit')
}

export const HELP_TEXT = [
  '*/showcase* commands:',
  '- `/showcase generate` -- Populate #showcase with Block Kit examples (JSON)',
  '- `/showcase block-kit` -- Populate #showcase with Block Kit examples (block-kit functions)',
  '- `/showcase clear` -- Clear all messages from #showcase',
  '- `/showcase modal` -- Open a modal with input elements',
  '- `/showcase help` -- Show this help message',
].join('\n')

async function postHelpMessage(
  client: App['client'],
  channel: string,
  user: string,
  prefix?: string
) {
  const text = prefix ? `${prefix}\n\n${HELP_TEXT}` : HELP_TEXT
  await client.chat.postEphemeral({
    channel,
    user,
    text,
  })
}

export function register(app: App) {
  app.command('/showcase', async ({ command, ack, client }) => {
    await ack()

    const subcommand = command.text.trim().toLowerCase().split(/\s+/)[0] || ''

    switch (subcommand) {
      case 'generate':
        await sendShowcaseMessages(client)
        break

      case 'block-kit':
        await sendBlockKitMessages(client)
        break

      case 'clear':
        await clearShowcaseChannel(client)
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: 'Cleared all messages from #showcase.',
        })
        break

      case 'modal':
        try {
          await client.views.open({
            trigger_id: command.trigger_id,
            view: modal({
              title: 'Input Showcase',
              submit: 'Submit',
              close: 'Cancel',
              callback_id: 'showcase_modal',
              blocks: [
                input('Your Name', textInput('showcase_modal_name'), {
                  hint: 'Enter your full name',
                }),
                input(
                  'Email Address',
                  emailInput('showcase_modal_email', {
                    placeholder: 'name@example.com',
                  })
                ),
                input(
                  'Website',
                  urlInput('showcase_modal_url', {
                    placeholder: 'https://example.com',
                  })
                ),
                input(
                  'Quantity',
                  numberInput('showcase_modal_quantity', {
                    min_value: '1',
                    max_value: '100',
                  }),
                  { hint: 'Enter a number between 1 and 100' }
                ),
                input('Start Date', datePicker('showcase_modal_start_date')),
                input('Start Time', timePicker('showcase_modal_start_time')),
                input(
                  'Event DateTime',
                  dateTimePicker('showcase_modal_event_datetime')
                ),
                input(
                  'Priority Level',
                  radioButtons(
                    'showcase_modal_priority',
                    options([
                      ['Low', 'low'],
                      ['Medium', 'medium'],
                      ['High', 'high'],
                    ])
                  )
                ),
                input(
                  'Notification Preferences',
                  checkboxes(
                    'showcase_modal_notifications',
                    options([
                      ['Email', 'email'],
                      ['SMS', 'sms'],
                      ['Push', 'push'],
                    ])
                  )
                ),
                input(
                  'Department',
                  staticSelect(
                    'showcase_modal_department',
                    options([
                      ['Engineering', 'engineering'],
                      ['Design', 'design'],
                      ['Marketing', 'marketing'],
                      ['Sales', 'sales'],
                    ]),
                    { placeholder: 'Select a department' }
                  )
                ),
                input(
                  'Skills',
                  multiStaticSelect(
                    'showcase_modal_skills',
                    options([
                      ['JavaScript', 'javascript'],
                      ['TypeScript', 'typescript'],
                      ['Python', 'python'],
                      ['Rust', 'rust'],
                      ['Go', 'go'],
                    ]),
                    { placeholder: 'Select your skills' }
                  )
                ),
                input(
                  'Attachments',
                  fileInput('showcase_modal_attachments', { max_files: 3 })
                ),
                input(
                  'Additional Notes',
                  textInput('showcase_modal_notes', {
                    multiline: true,
                    placeholder: 'Enter any additional notes here...',
                  }),
                  {
                    hint: 'Any extra details or comments',
                    optional: true,
                  }
                ),
              ],
            }),
          })
          slackLogger.info('Opened showcase modal')
        } catch (err) {
          slackLogger.error({ err }, 'Failed to open showcase modal')
        }
        break

      case 'help':
      case '':
        await postHelpMessage(client, command.channel_id, command.user_id)
        break

      default:
        await postHelpMessage(
          client,
          command.channel_id,
          command.user_id,
          'Unknown subcommand.'
        )
        break
    }
  })
}
