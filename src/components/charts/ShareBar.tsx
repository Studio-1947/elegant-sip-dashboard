import { shareColor, shareTextColor } from './chartUtils'

export interface Share {
  id: string
  label: string
  value: number
  /**
   * Fixed palette slot for this entity. Colour follows the product, never its
   * current rank – otherwise changing the date range repaints the survivors and
   * a reader who learned "Fannings is the pale one" is misled.
   */
  colorIndex?: number
}

/**
 * Part-to-whole as a single 100% bar rather than a donut: the segments here are
 * often close in size, and close values are exactly what a pie cannot show.
 *
 * Segments are separated by a 2px gap in the surface colour – never a stroke
 * around each fill, which would add ink that isn't data. An in-segment label is
 * only drawn when it measurably fits; otherwise the legend and the table carry it.
 */
export function ShareBar({
  shares,
  formatValue,
}: {
  shares: Share[]
  formatValue: (value: number) => string
}) {
  const total = shares.reduce((sum, share) => sum + share.value, 0)

  if (total <= 0) {
    return <p className="px-3 py-8 text-center text-sm text-body">No revenue to split in this period.</p>
  }

  return (
    <div className="px-3 py-2">
      <div className="flex h-9 w-full gap-[3px] overflow-hidden rounded-md bg-sunken p-[3px] neu-pressed-sm">
        {shares.map((share, index) => {
          const percent = (share.value / total) * 100
          if (percent <= 0) return null
          const slot = share.colorIndex ?? index
          return (
            <div
              key={share.id}
              className="flex items-center justify-center rounded-xs first:rounded-l-sm last:rounded-r-sm"
              style={{ width: `${percent}%`, background: shareColor(slot) }}
              title={`${share.label}: ${formatValue(share.value)} (${percent.toFixed(1)}%)`}
            >
              {/* ~4.5 characters per 10% at this height – anything tighter is
                  left to the legend rather than clipped. */}
              {percent >= 12 && (
                <span
                  className="px-1 text-xs font-semibold"
                  style={{ color: shareTextColor(slot) }}
                >
                  {percent.toFixed(0)}%
                </span>
              )}
            </div>
          )
        })}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5">
        {shares.map((share, index) => (
          <li key={share.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: shareColor(share.colorIndex ?? index) }}
                aria-hidden="true"
              />
              <span className="truncate text-body">{share.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-ink">
              {formatValue(share.value)}
              <span className="ml-2 font-normal text-muted">{((share.value / total) * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
