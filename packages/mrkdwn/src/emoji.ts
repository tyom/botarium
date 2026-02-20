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
 * Returns null if the emoji name is not recognized.
 */
export function renderEmoji(name: string): string | null {
  const emoji = resolveEmoji(name)
  if (!emoji) return null
  return `<span class="s-emoji">${emoji}<span class="s-emoji-tip"><span class="s-emoji-big">${emoji}</span><span class="s-emoji-code">:${name}:</span></span></span>`
}
