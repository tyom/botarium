import { nameToEmoji } from 'gemoji'

/** Slack shortcodes that differ from gemoji's naming */
const SLACK_ALIASES: Record<string, string> = {
  thinking_face: 'thinking',
  party_popper: 'tada',
  person_with_pouting_face: 'pouting_face',
  person_frowning: 'frowning_person',
  person_with_blond_hair: 'blond_haired_person',
}

// Slack custom image emoji with no unicode equivalent (will render as :name: text):
// bowtie, simple_smile, neckbeard, feelsgood, finnadie, goberserk, godmode,
// hurtrealbad, rage1, rage2, rage3, rage4, suspect, trollface, octocat,
// squirrel, shipit

/** Resolve a shortcode name to a unicode emoji character. */
export function resolveEmoji(name: string): string | undefined {
  return nameToEmoji[name] ?? nameToEmoji[SLACK_ALIASES[name] ?? '']
}

/**
 * Render an emoji shortcode to an HTML span with tooltip.
 * Uses Slack's `c-emoji` class naming convention.
 * Pass `large: true` for emoji-only sections (no surrounding text).
 * Returns null if the emoji name is not recognized.
 */
export function renderEmoji(
  name: string,
  options?: { large?: boolean }
): string | null {
  const emoji = resolveEmoji(name)
  if (!emoji) return null
  const cls = options?.large ? 'c-emoji c-emoji__large' : 'c-emoji'
  return `<span class="${cls}" data-stringify-type="emoji" aria-label=":${name}:">${emoji}<span class="c-emoji__tooltip"><span class="c-emoji__tooltip-big">${emoji}</span><span class="c-emoji__tooltip-code">:${name}:</span></span></span>`
}
