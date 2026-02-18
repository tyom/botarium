import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { KnownBlock } from '@slack/types'

export interface ShowcaseMessage {
  fallbackText: string
  blocks: KnownBlock[]
}

function resolveTemplates(raw: string): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayDate = `${yyyy}-${mm}-${dd}`

  const noonUtc = new Date(`${todayDate}T12:00:00Z`)
  const noonUnix = Math.floor(noonUtc.getTime() / 1000)

  return raw
    .replaceAll('{{TODAY_DATE}}', todayDate)
    .replaceAll('"{{TODAY_NOON_UNIX}}"', String(noonUnix))
}

const blocksDir = join(import.meta.dir, 'blocks')
const files = readdirSync(blocksDir).filter(f => f.endsWith('.json')).sort()

export const showcaseMessages: ShowcaseMessage[] = files.map(file => {
  const raw = readFileSync(join(blocksDir, file), 'utf-8')
  return JSON.parse(resolveTemplates(raw))
})
