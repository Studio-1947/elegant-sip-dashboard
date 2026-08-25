export interface BarItem {
  id: string
  label: string
  secondary?: string
  value: number
}

/**
 * Ranked horizontal bars — one series, so one colour for every bar. Colouring
 * them by size would double-encode the length as hue and burn the only free
 * channel on information the bar already shows.
 *
 * Values sit at the tip of every bar, so nothing here is gated behind a hover.
 */
export function BarList({
  items,
  formatValue,
  emptyMessage = 'Nothing sold in this period.',
}: {
  items: BarItem[]
  formatValue: (value: number) => string
  emptyMessage?: string
}) {
  const max = items.reduce((peak, item) => Math.max(peak, item.value), 0)

  if (items.length === 0 || max === 0) {
    return <p className="px-3 py-8 text-center text-sm text-body">{emptyMessage}</p>
  }

  return (
    <ul className="flex flex-col gap-3 px-3 py-1">
      {items.map((item) => (
        <li key={item.id} className="group rounded-lg px-2 py-1.5 hover:bg-sunken">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
              {item.secondary && <p className="truncate text-xs text-muted">{item.secondary}</p>}
            </div>
            <p className="tnum shrink-0 text-sm font-semibold text-ink">{formatValue(item.value)}</p>
          </div>
          {/* The track is a lighter step of the bar's own hue, so the unfilled
              remainder still reads as part of the same measure. */}
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-sm bg-accent/10">
            <div
              className="h-full rounded-r-sm bg-accent"
              style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
