export const EMOJI_MAP: Record<string, string> = {
  '+1': '\u{1F44D}',
  '-1': '\u{1F44E}',
  thumbsup: '\u{1F44D}',
  thumbsdown: '\u{1F44E}',
  heart: '\u2764\uFE0F',
  smile: '\u{1F604}',
  laughing: '\u{1F606}',
  blush: '\u{1F60A}',
  grinning: '\u{1F600}',
  wink: '\u{1F609}',
  joy: '\u{1F602}',
  sob: '\u{1F62D}',
  cry: '\u{1F622}',
  thinking_face: '\u{1F914}',
  white_check_mark: '\u2705',
  heavy_check_mark: '\u2714\uFE0F',
  x: '\u274C',
  warning: '\u26A0\uFE0F',
  fire: '\u{1F525}',
  rocket: '\u{1F680}',
  tada: '\u{1F389}',
  party_popper: '\u{1F389}',
  eyes: '\u{1F440}',
  wave: '\u{1F44B}',
  pray: '\u{1F64F}',
  clap: '\u{1F44F}',
  muscle: '\u{1F4AA}',
  star: '\u2B50',
  sparkles: '\u2728',
  bulb: '\u{1F4A1}',
  memo: '\u{1F4DD}',
  point_right: '\u{1F449}',
  point_left: '\u{1F448}',
  raised_hands: '\u{1F64C}',
  ok_hand: '\u{1F44C}',
  100: '\u{1F4AF}',
  rotating_light: '\u{1F6A8}',
  zap: '\u26A1',
  boom: '\u{1F4A5}',
  bug: '\u{1F41B}',
  gear: '\u2699\uFE0F',
  lock: '\u{1F512}',
  key: '\u{1F511}',
  calendar: '\u{1F4C5}',
  link: '\u{1F517}',
  speech_balloon: '\u{1F4AC}',
}

/**
 * Render an emoji shortcode to an HTML span with tooltip.
 * Returns null if the emoji name is not in EMOJI_MAP.
 */
export function renderEmoji(name: string): string | null {
  const emoji = EMOJI_MAP[name]
  if (!emoji) return null
  return `<span class="s-emoji">${emoji}<span class="s-emoji-tip"><span class="s-emoji-big">${emoji}</span><span class="s-emoji-code">:${name}:</span></span></span>`
}
