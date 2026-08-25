/* ────────────────────────────────────────────────────────────────────────────
 * Per-person interface preferences.
 *
 * The line between this and the URL query is worth stating, because getting it
 * wrong is what makes a dashboard annoying:
 *
 *   URL    what you are looking AT. Filters, sort, the open record. Shareable,
 *           bookmarkable, and different every time you send someone a link.
 *   Here   how YOU like to look at it. Row density, a collapsed rail, light or
 *           dark. Follows you between screens and survives a reload, and would
 *           be noise in a link: sending someone a table should not resize their
 *           rows or turn their screen black.
 *
 * "Per user" means per browser – this app has no accounts. Everything lives in
 * one JSON blob under the dashboard's own namespace, and every read tolerates
 * storage being unavailable, because private mode should cost you a preference,
 * not the screen.
 * ──────────────────────────────────────────────────────────────────────────── */

import { DASHBOARD_KEYS } from './storage'

export type PreferenceKey =
  | 'rail.collapsed'
  | 'table.density'
  | 'theme'
  | 'orders.view'
  | 'inventory.view'

type Store = Partial<Record<PreferenceKey, string>>

function read(): Store {
  try {
    const raw = localStorage.getItem(DASHBOARD_KEYS.preferences)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const clean: Store = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') clean[key as PreferenceKey] = value
    }
    return clean
  } catch {
    return {}
  }
}

export function readPreference(key: PreferenceKey): string | undefined {
  return read()[key]
}

/** Returns false when storage refused the write – callers may say so, or shrug. */
export function writePreference(key: PreferenceKey, value: string): boolean {
  try {
    localStorage.setItem(DASHBOARD_KEYS.preferences, JSON.stringify({ ...read(), [key]: value }))
    return true
  } catch {
    return false
  }
}
