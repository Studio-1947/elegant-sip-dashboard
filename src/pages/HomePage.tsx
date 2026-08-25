import { useMemo } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import {
  RANGES,
  dailySeries,
  filterByRange,
  percentChange,
  previousPeriod,
  summarise,
  type RangeId,
} from '../lib/metrics'
import { useQueryState } from '../lib/router'
import { compact, dayKeyLabel, formatCount } from '../lib/format'
import { FilterBar, SegmentedControl } from '../components/ui/Controls'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { TrendChart } from '../components/charts/TrendChart'
import { ExceptionsPanel } from '../components/panels/ExceptionsPanel'
import { RecentOrders } from '../components/panels/RecentOrders'

/* ────────────────────────────────────────────────────────────────────────────
 * Home.
 *
 * Answers one question, in this order: what needs me now, then how is it going.
 *
 * The exception list is the whole top of the screen. Trends sit below it,
 * behind a heading that says what they are — they are the thing you scroll to
 * on purpose, not the thing that greets you. The deep analysis moved to Reports;
 * what is left here is the shape of the last few weeks, which is as much as a
 * home screen should try to say.
 * ──────────────────────────────────────────────────────────────────────────── */

type Metric = 'revenue' | 'orders' | 'units'

const METRICS: { id: Metric; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'orders', label: 'Orders' },
  { id: 'units', label: 'Units' },
]

const DEFAULTS = { range: '30d', metric: 'revenue' }

const rupeesCompact = (value: number) => `₹${compact(value)}`

export default function HomePage() {
  const { orders, now } = useDataset()
  const { values, set } = useQueryState(DEFAULTS)

  const range = values.range as RangeId
  const metric = values.metric as Metric

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const earlier = useMemo(() => previousPeriod(orders, range, now), [orders, range, now])
  const totals = useMemo(() => summarise(scoped), [scoped])
  const earlierTotals = useMemo(() => (earlier ? summarise(earlier) : null), [earlier])
  const series = useMemo(() => dailySeries(scoped, range, now), [scoped, range, now])

  const rangeLabel = RANGES.find((entry) => entry.id === range)?.label ?? ''
  /** All-time has no earlier window, so those tiles show a hint instead of a delta. */
  const deltaFor = (current: number, previous: number | undefined) =>
    earlierTotals && previous !== undefined ? percentChange(current, previous) : undefined
  const deltaLabel = earlierTotals ? 'vs previous period' : undefined

  const trendPoints = series.map((point) => ({
    key: point.key,
    label: dayKeyLabel(point.key),
    value: point[metric],
  }))
  const sparkline = series.slice(-12).map((point) => point.revenue)

  return (
    <div className="flex flex-col gap-3 p-3">
      <ExceptionsPanel />

      <RecentOrders orders={scoped} />

      <section aria-labelledby="trends" className="flex flex-col gap-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <h2 id="trends" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Trends
          </h2>
          <FilterBar>
            <SegmentedControl
              label="Date range"
              value={range}
              onChange={(next) => set({ range: next })}
              segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
            />
            <SegmentedControl
              label="Trend metric"
              value={metric}
              onChange={(next) => set({ metric: next })}
              segments={METRICS}
            />
          </FilterBar>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={`Revenue · ${rangeLabel}`}
            value={formatINR(totals.revenue)}
            delta={deltaFor(totals.revenue, earlierTotals?.revenue)}
            deltaLabel={deltaLabel}
            trend={sparkline}
            hero
          />
          <StatTile
            label="Orders"
            value={formatCount(totals.orders)}
            delta={deltaFor(totals.orders, earlierTotals?.orders)}
            deltaLabel={deltaLabel}
          />
          <StatTile
            label="Average order"
            value={formatINR(totals.averageOrderValue)}
            delta={deltaFor(totals.averageOrderValue, earlierTotals?.averageOrderValue)}
            deltaLabel={deltaLabel}
          />
          <StatTile
            label="Units sold"
            value={formatCount(totals.units)}
            delta={deltaFor(totals.units, earlierTotals?.units)}
            deltaLabel={deltaLabel}
          />
        </div>

        <ChartCard
          title={`${METRICS.find((entry) => entry.id === metric)?.label} per day`}
          subtitle={`${rangeLabel} · every calendar day, including days with no orders`}
          table={{
            columns: ['Day', 'Revenue', 'Orders', 'Units'],
            rows: series.map((point) => [
              dayKeyLabel(point.key),
              formatINR(point.revenue),
              formatCount(point.orders),
              formatCount(point.units),
            ]),
          }}
        >
          <TrendChart
            points={trendPoints}
            formatValue={metric === 'revenue' ? rupeesCompact : formatCount}
            formatDetail={metric === 'revenue' ? formatINR : formatCount}
            seriesLabel={METRICS.find((entry) => entry.id === metric)?.label ?? 'Revenue'}
          />
        </ChartCard>

        <p className="text-xs text-muted">
          Product mix, best sellers, weekday patterns and review moderation live on Reports.
        </p>
      </section>
    </div>
  )
}
