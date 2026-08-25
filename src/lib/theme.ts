/* ────────────────────────────────────────────────────────────────────────────
 * Light or dark. Two states, no third.
 *
 * The operating system is consulted exactly ONCE, to pick the first-run
 * default – someone on a dark machine should not be handed a white screen the
 * first time they open this. After that it is a stored choice like any other
 * and stops tracking the OS, which is the behaviour "no system mode" means: the
 * toggle is the only thing that changes the theme.
 *
 * The choice is written to the same per-browser preference store as row density
 * and the collapsed rail, for the same reason – it describes this person's
 * screen, not what they are looking at, so it must not ride along in a shared
 * link.
 *
 * `data-theme` on <html> drives everything, and is ALWAYS present: index.css
 * defines the light values on `:root` and the dark ones on
 * `:root[data-theme='dark']`, with no media query in between.
 * ──────────────────────────────────────────────────────────────────────────── */

import { readPreference, writePreference } from './preferences'

export type Theme = 'light' | 'dark'

function firstRunDefault(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function readTheme(): Theme {
  const stored = readPreference('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return firstRunDefault()
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Returns false when storage refused the write – the session still switches. */
export function setTheme(theme: Theme): boolean {
  applyTheme(theme)
  return writePreference('theme', theme)
}

/**
 * Called from main.tsx before React renders. Without it the page paints light
 * and then flips – a flash of the wrong theme, which is especially ugly in a
 * tool someone opens at 6am specifically because they chose dark.
 */
export function initTheme() {
  applyTheme(readTheme())
}
