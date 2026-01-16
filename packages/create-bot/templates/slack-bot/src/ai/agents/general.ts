import { createAgent, buildBaseGuidelines } from './base'
import { memoryTools } from '../tools'

/**
 * General agent - handles general conversation and questions.
 * Has memory tools for preference handling.
 */
export const generalAgent = createAgent({
  name: 'General',
  tools: memoryTools,
  systemPromptBuilder: (context, preferences) => {
    return `${buildBaseGuidelines(context, preferences)}
- Handle general questions and conversation naturally
- When the user expresses a preference, use setUserPreference to save it:
  - "keep it brief" -> setUserPreference(responseStyle: "concise")
  - "respond in Spanish" -> setUserPreference(language: "es")
  - "I'm in New York" -> setUserPreference(timezone: "America/New_York")`
  },
})
