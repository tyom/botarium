/**
 * Keyboard shortcut utility for declarative shortcut handling.
 */

export interface KeyboardShortcut {
  /** The key to match (e.g., 'Escape', 'l', ',') */
  key: string
  /** Require Ctrl/Cmd modifier */
  ctrl?: boolean
  /** Require Shift modifier */
  shift?: boolean
  /** Require Alt modifier */
  alt?: boolean
  /** Optional condition - shortcut only triggers when this returns true */
  when?: () => boolean
  /** Action to execute when shortcut matches */
  action: () => void
}

/**
 * Creates a keydown event handler from a list of shortcuts.
 * Shortcuts are matched in order; first match wins.
 */
export function createKeydownHandler(
  shortcuts: KeyboardShortcut[]
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut)) {
        if (!shortcut.when || shortcut.when()) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    }
  }
}

function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // Match key (case-insensitive for letters)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false
  }

  // Match modifiers
  if (!!shortcut.ctrl !== (event.ctrlKey || event.metaKey)) {
    return false
  }
  if (!!shortcut.shift !== event.shiftKey) {
    return false
  }
  if (!!shortcut.alt !== event.altKey) {
    return false
  }

  return true
}
