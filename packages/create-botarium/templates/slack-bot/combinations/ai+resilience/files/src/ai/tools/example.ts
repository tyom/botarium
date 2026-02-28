/**
 * Example tool — copy this pattern to add more tools.
 *
 * Demonstrates:
 * - AI SDK tool definition with typed input schema
 * - Structured result pattern (success/failure)
 * - Error boundary integration for resilience
 */
import { tool } from 'ai'
import { z } from 'zod'
import {
  success,
  failure,
  withToolLogging,
  type ToolResult,
} from '../../utils/tools'
import { withErrorBoundary } from '@botarium/resilience'
import { breakerRegistry } from '../../setup'

async function execute(input: {
  query: string
}): Promise<ToolResult<{ result: string }>> {
  // Replace with your actual tool logic
  // This is where you'd call an API, query a database, etc.
  const result = await withErrorBoundary(
    'example-service',
    async () => success({ result: `Processed: ${input.query}` }),
    { registry: breakerRegistry }
  )
  if (result.success) {
    return result.data
  }
  return failure(result.error)
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
