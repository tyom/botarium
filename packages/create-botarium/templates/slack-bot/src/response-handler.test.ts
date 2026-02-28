import { describe, test, expect } from 'bun:test'
import { responseHandler } from './response-handler'

describe('responseHandler', () => {
  test('has systemPrompt defined', () => {
    expect(responseHandler.systemPrompt).toBeDefined()
  })

  test('has suggestedPrompts defined', () => {
    expect(responseHandler.suggestedPrompts).toBeDefined()
    expect(Array.isArray(responseHandler.suggestedPrompts)).toBe(true)
  })

  test('ping command returns pong', async () => {
    const context = {
      channelId: 'test',
      threadTs: '123',
      userId: 'user',
      teamId: 'team',
      history: [],
    }

    const chunks: string[] = []
    for await (const chunk of responseHandler.generateResponse('ping', context)) {
      chunks.push(chunk)
    }

    expect(chunks.join('')).toBe('pong')
  })
})
