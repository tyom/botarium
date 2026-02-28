/**
 * Example tool — copy this pattern to add more tools.
 *
 * Demonstrates:
 * - AI SDK tool definition with typed input schema
 * - Structured result pattern (success/failure)
 */
import { tool } from 'ai'
import { z } from 'zod'
import { success, withToolLogging } from '../../utils/tools'

async function execute(input: { query: string }) {
  // Replace with your actual tool logic
  // This is where you'd call an API, query a database, etc.
  return success({ result: `Processed: ${input.query}` })
}

export const exampleTool = tool({
  description: 'An example tool. Copy this pattern to add more tools.',
  inputSchema: z.object({
    query: z.string().describe('The query to process'),
  }),
  execute: withToolLogging(
    'example',
    (input) => `Query: "${input.query}"`,
    execute
  ),
})
