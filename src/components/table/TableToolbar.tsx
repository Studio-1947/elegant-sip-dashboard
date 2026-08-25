import { useCallback, useState, type ReactNode } from 'react'
import { readPreference, writePreference } from '../../lib/preferences'
import type { Density } from './DataTable'

/**
 * Row density, and the row that carries it.
 *
 * The toggle is deliberately not a filter: it says how this person reads a
 * table, not what the table contains, so it persists per browser and stays out
 * of the URL. Someone who works at 32px keeps 32px on every screen and after
 * every reload, and the link they send you does not resize your rows.
 */
export function useDensity(): [Density, (next: Density) => void] {
  const [density, setDensity] = useState<Density>(() =>
    readPreference('table.density') === 'compact' ? 'compact' : 'comfortable',
  )

  const set = useCallback((next: Density) => {
    setDensity(next)
    writePreference('table.density', next)
  }, [])

  return [density, set]
}

export function DensityToggle({
  density,
  onChange,
}: {
  density: Density
  onChange: (next: Density) => void
}) {
  const compact = density === 'compact'
  return (
    <button
      type="button"
      onClick={() => onChange(compact ? 'comfortable' : 'compact')}
      aria-pressed={compact}
      title={compact ? 'Switch to 44px rows' : 'Switch to 32px rows'}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-body hover:bg-sunken hover:text-ink"
    >
      <span className="flex h-3.5 w-3.5 flex-col justify-between" aria-hidden="true">
        <span className="h-px w-full bg-current" />
        <span className="h-px w-full bg-current" />
        <span className="h-px w-full bg-current" />
        {compact && <span className="h-px w-full bg-current" />}
      </span>
      {compact ? 'Compact' : 'Comfortable'}
    </button>
  )
}

/** The strip between the toolbar and the table: chips on the left, count right. */
export function TableStatus({ children, count }: { children?: ReactNode; count: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      <p className="text-xs text-muted">{count}</p>
    </div>
  )
}
