/**
 * Router agent — delegates requests to specialist tools.
 *
 * Add more delegation tools here as you build specialist agents.
 * Each tool wraps a specialist and describes when to delegate to it.
 */
import { tool } from 'ai'
import { z } from 'zod'
import { createAgent } from './agent'
import { exampleTool } from './tools/example'

const ROUTER_INSTRUCTIONS = `You are a request router. Analyze the user's message and delegate to the appropriate specialist tool.

Available specialists:
- delegateToExample: For general queries and demonstrations

Always delegate to exactly one specialist. Do not answer directly.`

/**
 * Delegation tool — wraps the example specialist agent.
 * Copy this pattern to add more specialists.
 */
const delegateToExample = tool({
  description:
    'Delegate to the example specialist for general queries and demonstrations.',
  inputSchema: z.object({
    request: z.string().describe('The user request to delegate'),
  }),
  execute: async ({ request }) => {
    const agent = createAgent({
      tools: { exampleTool },
      instructions:
        'You are a helpful specialist. Use the exampleTool when appropriate, or answer directly.',
    })
    const result = await agent.generate({
      messages: [{ role: 'user', content: request }],
    })
    // Extract text from the agent's response
    return result.text || 'No response from specialist.'
  },
})

/**
 * Create a router agent for handling a user message.
 * The router delegates to specialist tools based on the request.
 */
export function createRouter() {
  return createAgent({
    tools: { delegateToExample },
    instructions: ROUTER_INSTRUCTIONS,
  })
}
