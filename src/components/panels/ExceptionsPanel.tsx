import { useMemo } from 'react'
import { useDataset } from '../../lib/datasetContext'
import { exceptions, type Severity } from '../../lib/exceptions'
import { hrefFor } from '../../lib/router'
import { Card } from '../ui/Card'
import { AlertIcon, CheckIcon, ChevronIcon, ClockIcon } from '../ui/Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * The exception list – the first thing on the Home screen, above every trend.
 *
 * The ordering is the argument. A revenue sparkline is interesting; four orders
 * that have sat unpacked since Friday are the job. Trends tell you how last week
 * went, and you cannot do anything about last week, so they go below.
 *
 * Each row is: what is true, what to do about it, and the link that lands you
 * where you can do it – pre-filtered, because "go to Orders and filter to New"
 * is a step this screen already knows how to take for you.
 * ──────────────────────────────────────────────────────────────────────────── */

const TONE: Record<Severity, { icon: typeof AlertIcon; className: string; label: string }> = {
  critical: { icon: AlertIcon, className: 'text-critical', label: 'Needs attention now' },
  warn: { icon: ClockIcon, className: 'text-warn', label: 'Worth doing soon' },
  info: { icon: CheckIcon, className: 'text-muted', label: 'For information' },
}

export function ExceptionsPanel() {
  const { orders, fulfilment, ops, now } = useDataset()

  const list = useMemo(
    () => exceptions({ orders, fulfilment, ops, now }),
    [orders, fulfilment, ops, now],
  )

  const actionable = list.filter((entry) => entry.severity !== 'info')

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Needs attention</h2>
        <p className="text-sm text-body">
          {actionable.length === 0
            ? 'Nothing waiting on you.'
            : `${actionable.length} to act on, worst first.`}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="flex items-center gap-2.5 px-3 py-4">
          <span className="h-4 w-4 shrink-0 text-good">
            <CheckIcon />
          </span>
          <p className="text-sm text-body">
            Every order is packed or beyond, no SKU is inside a month of cover, and no lot expires within
            90 days.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((entry) => {
            const tone = TONE[entry.severity]
            const Icon = tone.icon
            return (
              <li key={entry.id} className="flex items-start gap-2.5 px-3 py-2.5">
                <span className={`mt-0.5 h-4 w-4 shrink-0 ${tone.className}`} title={tone.label}>
                  <Icon />
                  <span className="sr-only">{tone.label}: </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{entry.title}</span>
                  <span className="block text-sm text-body">{entry.detail}</span>
                </span>
                <a
                  href={hrefFor(entry.route, { query: entry.query })}
                  className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-accent hover:bg-accent-soft"
                >
                  {entry.action}
                  <span className="h-3 w-3">
                    <ChevronIcon />
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}

      {/* An all-clear that hides what was never checked is worse than no
          all-clear at all. */}
      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        Not checked here: failed payments, orders on hold, pending refunds and subscription renewals.
        This dashboard reads the storefront's browser storage, which records none of them – they need a
        payment provider and a server before they can appear on this list.
      </p>
    </Card>
  )
}
