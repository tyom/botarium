import type { App } from '@slack/bolt'
import { slackLogger } from '../../utils/logger'

const SHOWCASE_CHANNEL = 'C_SHOWCASE'

export function register(app: App) {
  // Catch all showcase_ prefixed actions
  app.action(/^showcase_/, async ({ action, ack, body, client }) => {
    await ack()

    // Build a readable summary of the action payload
    const actionSummary = JSON.stringify(action, null, 2)

    // Truncate if very long (e.g., large selected_options arrays)
    const displaySummary =
      actionSummary.length > 1500
        ? actionSummary.substring(0, 1500) + '\n...(truncated)'
        : actionSummary

    // Determine channel from body (block_actions payloads include channel)
    const channel =
      (body as { channel?: { id: string } }).channel?.id ?? SHOWCASE_CHANNEL

    await client.chat.postMessage({
      channel,
      text: `Action: ${(action as { action_id: string }).action_id}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Received \`block_actions\`* from \`${(action as { action_id: string }).action_id}\``,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${displaySummary}\`\`\``,
          },
        },
      ],
    })

    slackLogger.info(
      { actionId: (action as { action_id: string }).action_id },
      'Echoed block_action'
    )
  })

  // Handle modal submission
  app.view('showcase_modal', async ({ view, ack, client }) => {
    await ack()

    const valuesSummary = JSON.stringify(view.state.values, null, 2)
    const displaySummary =
      valuesSummary.length > 2000
        ? valuesSummary.substring(0, 2000) + '\n...(truncated)'
        : valuesSummary

    // Send the submission echo to #showcase channel
    await client.chat.postMessage({
      channel: SHOWCASE_CHANNEL,
      text: 'Modal submitted',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Received `view_submission`* for `showcase_modal`',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${displaySummary}\`\`\``,
          },
        },
      ],
    })

    slackLogger.info('Echoed view_submission')
  })
}
