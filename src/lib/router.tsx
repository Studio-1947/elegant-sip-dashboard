/* ────────────────────────────────────────────────────────────────────────────
 * A hash router, deliberately.
 *
 * The storefront uses real paths because every route there must be a distinct
 * indexable URL. This app is the opposite: `noindex`, internal, and often
 * served from a sub-folder on XAMPP. A hash route needs no rewrite rule, so the
 * dashboard drops into any static host — including a plain file copy — without
 * a matching .htaccess.
 *
 * Everything that scopes a screen lives in the URL:
 *
 *     #/orders/ES-1042?stage=new&q=darjeeling&density=compact
 *      └ page  └ record  └────────── view state ──────────┘
 *
 * That is not decoration. A filtered table is the unit of work people actually
 * pass to each other ("the unfulfilled wholesale ones"), and view state that
 * lives in `useState` cannot be sent, bookmarked, reloaded or stepped back
 * through. Because the query is the source of truth, saved views are just
 * pre-baked query strings and cost nothing extra.
 *
 * Typing in a search box uses `replace`, so a filter session leaves ONE history
 * entry rather than thirty; discrete changes push, so Back genuinely undoes the
 * last thing you chose.
 * ──────────────────────────────────────────────────────────────────────────── */

import { useCallback, useSyncExternalStore } from 'react'

export type RouteId =
  | 'home'
  | 'orders'
  | 'catalog'
  | 'inventory'
  | 'customers'
  | 'wholesale'
  | 'reports'
  | 'settings'

export type Query = Record<string, string>

export interface Route {
  id: RouteId
  /** Second path segment, e.g. the order number in #/orders/ES-1042. */
  param?: string
  /** Everything after `?` — filters, sort, density, saved view. */
  query: Query
}

const ROUTE_IDS: RouteId[] = [
  'home',
  'orders',
  'catalog',
  'inventory',
  'customers',
  'wholesale',
  'reports',
  'settings',
]

/* Bookmarks and links from before the rail was reorganised still resolve. */
const LEGACY: Record<string, RouteId> = {
  overview: 'home',
  catalogue: 'catalog',
  reviews: 'reports',
  data: 'settings',
}

/* `location.hash` alone is not enough as a snapshot: a `replaceState` update
   does not fire `hashchange`, so the store emits to its own listeners too. */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('hashchange', onChange)
  }
}

const readHash = () => window.location.hash
/** The server render never runs, but useSyncExternalStore still wants a snapshot. */
const serverHash = () => '#/'

export function parseHash(hash: string): Route {
  const [path, search = ''] = hash.replace(/^#/, '').split('?')
  const [, head, param] = path.split('/')
  const id = ROUTE_IDS.find((candidate) => candidate === head) ?? LEGACY[head ?? '']

  const query: Query = {}
  for (const [key, value] of new URLSearchParams(search)) {
    // An empty param is the same as an absent one — it keeps `?stage=` out of
    // URLs when a filter is cleared.
    if (value) query[key] = value
  }

  return { id: id ?? 'home', param: param ? decodeURIComponent(param) : undefined, query }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  return parseHash(hash)
}

export interface Target {
  param?: string
  query?: Query
}

export function hrefFor(id: RouteId, target: Target = {}): string {
  const path = target.param ? `#/${id}/${encodeURIComponent(target.param)}` : `#/${id}`
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(target.query ?? {})) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

/**
 * `replace` rewrites the current entry instead of adding one — for changes a
 * user makes continuously (typing) rather than deliberately (choosing).
 */
export function navigate(id: RouteId, target: Target = {}, replace = false) {
  const href = hrefFor(id, target)
  if (href === window.location.hash) return
  if (replace) {
    window.history.replaceState(null, '', href)
    for (const listener of listeners) listener()
  } else {
    window.location.hash = href
  }
}

/** Stable callback for the many "open this order / product" handlers. */
export function useNavigate() {
  return useCallback(
    (id: RouteId, target: Target = {}, replace = false) => navigate(id, target, replace),
    [],
  )
}

/**
 * Read and write one screen's view state through the URL.
 *
 * `defaults` does double duty: it types the state, and a value equal to its
 * default is omitted from the URL — so the address bar shows the constraints
 * that are actually on, and a link carries no noise.
 */
export function useQueryState<T extends Query>(defaults: T) {
  const route = useRoute()

  const values = { ...defaults } as T
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const found = route.query[key as string]
    if (found !== undefined) values[key] = found as T[keyof T]
  }

  const set = useCallback(
    (patch: Partial<T>, replace = false) => {
      const next: Query = { ...route.query }
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === defaults[key]) delete next[key]
        else next[key] = String(value)
      }
      navigate(route.id, { param: route.param, query: next }, replace)
    },
    // `route` is read fresh on every render; the callback closes over the
    // current one deliberately so a patch always merges into what is on screen.
    [route.id, route.param, route.query, defaults],
  )

  const clear = useCallback(
    (keys?: (keyof T)[]) => {
      if (!keys) {
        navigate(route.id, { param: route.param })
        return
      }
      const next: Query = { ...route.query }
      for (const key of keys) delete next[key as string]
      navigate(route.id, { param: route.param, query: next })
    },
    [route.id, route.param, route.query],
  )

  return { values, set, clear, query: route.query }
}
