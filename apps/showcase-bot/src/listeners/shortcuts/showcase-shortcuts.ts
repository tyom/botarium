import type { App, MessageShortcut } from '@slack/bolt'
import type { KnownBlock } from '@slack/types'
import { slackLogger } from '../../utils/logger'

export function register(app: App) {
  app.shortcut<MessageShortcut>(
    { callback_id: 'showcase_message_context', type: 'message_action' },
    async ({ shortcut, ack, client }) => {
      await ack()

      const { message, channel, user } = shortcut

      const fields = [
        ['Timestamp', message.ts],
        ['Channel', channel.id],
        ['User', user.id],
        ['Text', message.text ? `\`\`\`${message.text}\`\`\`` : '_empty_'],
      ]

      const blocks: KnownBlock[] = fields.map(([label, value]) => ({
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*${label}*\n${value}`,
        },
      }))

      // Show attached files
      const files = message.files as
        | Array<{ url_private?: string; mimetype?: string }>
        | undefined
      if (files?.length) {
        for (const file of files) {
          if (file.url_private && file.mimetype?.startsWith('image/')) {
            blocks.push({
              type: 'image',
              image_url: file.url_private,
              alt_text: 'Attached image',
            })
          }
        }
      }

      // Show images from Block Kit blocks
      const msgBlocks = message.blocks as
        | Array<{
            type: string
            image_url?: string
            alt_text?: string
            title?: { text?: string }
          }>
        | undefined
      if (msgBlocks?.length) {
        for (const block of msgBlocks) {
          if (block.type === 'image' && block.image_url) {
            blocks.push({
              type: 'image',
              image_url: block.image_url,
              alt_text: block.alt_text || block.title?.text || 'Image',
            })
          }
        }
      }

      try {
        await client.views.open({
          trigger_id: shortcut.trigger_id,
          view: {
            type: 'modal',
            title: { type: 'plain_text', text: 'Message Context' },
            close: { type: 'plain_text', text: 'Close' },
            blocks,
          },
        })
        slackLogger.info('Opened message context modal')
      } catch (err) {
        slackLogger.error({ err }, 'Failed to open message context modal')
      }
    }
  )
}
