import type { ReactNode } from 'react'
import { Sparkline } from '../charts/Sparkline'
import { ArrowDownIcon, ArrowUpIcon } from './Icons'
import { formatDelta } from '../../lib/format'

/**
 * Stat tile: label · value · optional delta · optional 12-point sparkline.
 *
 * Figures are tabular, inherited from `body`  a column of tiles whose digits
 * do not line up is a column you have to read twice. The value tops out at 24px
 * even for the hero: this is a dense tool, and a 36px number buys nothing that
 * a 24px number in a quiet row does not already say.
 *
 * Deltas pair the colour with an arrow, so direction never rests on colour
 * alone, and a null delta renders as "no earlier period" rather than a
 * misleading 0%.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  trend,
  hint,
  hero = false,
}: {
  label: string
  value: string
  delta?: number | null
  deltaLabel?: string
  trend?: number[]
  hint?: ReactNode
  hero?: boolean
}) {
  const up = typeof delta === 'number' && delta > 0
  const down = typeof delta === 'number' && delta < 0

  return (
    <div className="flex flex-col justify-between rounded-lg bg-surface neu-raised px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>

      {/* Two-up on a phone, a tile is about 150px wide and the figure alone
          fills it - so the trend drops to its own row underneath and takes the
          full width. From `sm` there is room to sit them side by side again,
          and the sparkline is capped so the number keeps the space it needs. */}
      <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <p className={`font-semibold leading-none text-ink ${hero ? 'text-xl' : 'text-lg'}`}>{value}</p>
        {trend && trend.length > 1 && (
          <div className="w-full sm:w-20 sm:shrink-0 sm:pb-0.5">
            <Sparkline values={trend} />
          </div>
        )}
      </div>

      <div className="mt-2 min-h-4 text-xs">
        {delta === undefined ? (
          hint && <span className="text-muted">{hint}</span>
        ) : delta === null ? (
          <span className="text-muted">No earlier period to compare</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${up ? 'text-good' : down ? 'text-critical' : 'text-muted'
                }`}
            >
              {(up || down) && (
                <span className="h-3 w-3">{up ? <ArrowUpIcon /> : <ArrowDownIcon />}</span>
              )}
              {formatDelta(delta)}
            </span>
            {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
          </span>
        )}
      </div>
    </div>
  )
}
