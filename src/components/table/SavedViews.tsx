import { hrefFor, type Query, type RouteId } from '../../lib/router'

/* ────────────────────────────────────────────────────────────────────────────
 * Saved views, as pinned tabs.
 *
 * A saved view is not a feature so much as a consequence: because every filter
 * already lives in the URL, a view is just a named query string. "Unfulfilled
 * wholesale" is `?stage=new&channel=wholesale` with a label on it.
 *
 * They sit directly above the table they scope, and the active one is decided by
 * comparing the query – not by remembering which tab was clicked. That means
 * arriving from a shared link lights up the matching tab, and hand-editing a
 * filter until it matches a view lights it up too.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SavedView {
  id: string
  label: string
  query: Query
  /** Live count, when the page can compute one cheaply. */
  count?: number
  hint?: string
}

/** A view matches when every constraint it names is currently on. */
function matches(view: SavedView, current: Query): boolean {
  const keys = new Set([...Object.keys(view.query), ...Object.keys(current)])
  for (const key of keys) {
    // `q` is free-text search, not part of a view's identity – typing in the
    // search box should narrow the view you are in, not knock you out of it.
    if (key === 'q' || key === 'density') continue
    if ((view.query[key] ?? '') !== (current[key] ?? '')) return false
  }
  return true
}

export function SavedViews({
  route,
  views,
  current,
}: {
  route: RouteId
  views: SavedView[]
  current: Query
}) {
  const active = views.find((view) => matches(view, current))

  return (
    <div role="tablist" aria-label="Saved views" className="flex flex-wrap items-center gap-1">
      {views.map((view) => {
        const selected = view.id === active?.id
        return (
          <a
            key={view.id}
            role="tab"
            aria-selected={selected}
            href={hrefFor(route, { query: { ...view.query, ...(current.q ? { q: current.q } : {}) } })}
            title={view.hint}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ${selected
                ? 'bg-sunken text-accent neu-pressed-sm'
                : 'bg-surface text-muted neu-raised-sm hover:text-ink'
              }`}
          >
            {view.label}
            {typeof view.count === 'number' && (
              <span className={selected ? 'text-accent/70' : 'text-faint'}>{view.count}</span>
            )}
          </a>
        )
      })}
    </div>
  )
}
