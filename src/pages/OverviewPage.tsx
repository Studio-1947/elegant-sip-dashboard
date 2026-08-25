import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { PRODUCTS } from '@storefront/data/products'
import { useDataset } from '../lib/datasetContext'
import {
  RANGES,
  byWeekday,
  dailySeries,
  filterByRange,
  percentChange,
  previousPeriod,
  summarise,
  type RangeId,
} from '../lib/metrics'
import { productBreakdown } from '../lib/analysis'
import { compact, dayKeyLabel, formatCount } from '../lib/format'
import { FilterBar, SegmentedControl } from '../components/ui/Controls'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { TrendChart } from '../components/charts/TrendChart'
import { ColumnChart } from '../components/charts/ColumnChart'
import { BarList } from '../components/charts/BarList'
import { ShareBar } from '../components/charts/ShareBar'
import { AttentionPanel } from '../components/panels/AttentionPanel'
import { RecentOrders } from '../components/panels/RecentOrders'

type Metric = 'revenue' | 'orders' | 'units'

const METRICS: { id: Metric; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'orders', label: 'Orders' },
  { id: 'units', label: 'Units' },
]

const rupeesCompact = (value: number) => `₹${compact(value)}`

export default function OverviewPage() {
  const { orders, reviews, now } = useDataset()
  const [range, setRange] = useState<RangeId>('30d')
  const [metric, setMetric] = useState<Metric>('revenue')

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const earlier = useMemo(() => previousPeriod(orders, range, now), [orders, range, now])
  const totals = useMemo(() => summarise(scoped), [scoped])
  const earlierTotals = useMemo(() => (earlier ? summarise(earlier) : null), [earlier])
  const series = useMemo(() => dailySeries(scoped, range, now), [scoped, range, now])
  const weekdays = useMemo(() => byWeekday(scoped), [scoped])
  const breakdown = useMemo(() => productBreakdown(scoped, reviews), [scoped, reviews])

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

  const sold = breakdown.performance.filter((row) => row.revenue > 0)
  const topFive = sold.slice(0, 5)
  const rest = sold.slice(5)
  const shares = [
    ...topFive.map((row) => ({
      id: row.product.id,
      label: row.product.name,
      value: row.revenue,
      // Slot by catalogue position, so a tea keeps its colour when the ranking
      // changes between date ranges.
      colorIndex: PRODUCTS.findIndex((product) => product.id === row.product.id),
    })),
    ...(rest.length > 0
      ? [
          {
            id: 'other',
            label: `Other (${rest.length})`,
            value: rest.reduce((sum, row) => sum + row.revenue, 0),
            colorIndex: 5,
          },
        ]
      : []),
  ]

  const metricFormat = metric === 'revenue' ? rupeesCompact : formatCount
  const metricDetail = metric === 'revenue' ? formatINR : formatCount

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* One filter row above everything it scopes — every tile and chart on
          this page reads the same slice. */}
      <FilterBar>
        <SegmentedControl
          label="Date range"
          value={range}
          onChange={setRange}
          segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <SegmentedControl label="Trend metric" value={metric} onChange={setMetric} segments={METRICS} />
        <p className="text-xs text-muted">
          {formatCount(scoped.length)} of {formatCount(orders.length)} orders in {rangeLabel.toLowerCase()}
        </p>
      </FilterBar>

      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label={`Revenue · ${rangeLabel}`}
          value={formatINR(totals.revenue)}
          delta={deltaFor(totals.revenue, earlierTotals?.revenue)}
          deltaLabel={deltaLabel}
          trend={sparkline}
          hint="Charged total — goods less discount, plus shipping and GST"
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
          hint="100 g packs"
        />
        <StatTile
          label="GST collected"
          value={formatINR(totals.tax)}
          hint="5% on goods and shipping"
        />
        <StatTile
          label="Discounts given"
          value={formatINR(totals.discount)}
          hint={`${formatINR(totals.shipping)} shipping charged`}
        />
      </section>

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
          formatValue={metricFormat}
          formatDetail={metricDetail}
          seriesLabel={METRICS.find((entry) => entry.id === metric)?.label ?? 'Revenue'}
        />
      </ChartCard>

      <div className="grid gap-3 xl:grid-cols-2">
        <ChartCard
          title="Best sellers"
          subtitle="Goods revenue by tea — excludes shipping and GST"
          table={{
            columns: ['Tea', 'Revenue', 'Units', 'Orders'],
            rows: sold.map((row) => [
              row.product.name,
              formatINR(row.revenue),
              formatCount(row.units),
              formatCount(row.orders),
            ]),
          }}
        >
          <BarList
            items={sold.slice(0, 6).map((row) => ({
              id: row.product.id,
              label: row.product.name,
              secondary: `${formatCount(row.units)} packs · ${formatCount(row.orders)} orders`,
              value: row.revenue,
            }))}
            formatValue={formatINR}
          />
        </ChartCard>

        <ChartCard
          title="Revenue mix"
          subtitle="Share of goods revenue"
          table={{
            columns: ['Tea', 'Revenue', 'Share'],
            rows: shares.map((share) => [
              share.label,
              formatINR(share.value),
              `${((share.value / (breakdown.goodsRevenue || 1)) * 100).toFixed(1)}%`,
            ]),
          }}
        >
          <ShareBar shares={shares} formatValue={formatINR} />
        </ChartCard>

        <ChartCard
          title="Orders by weekday"
          subtitle={`When customers buy · ${rangeLabel.toLowerCase()}`}
          table={{
            columns: ['Day', 'Orders', 'Revenue'],
            rows: weekdays.map((day) => [day.label, formatCount(day.orders), formatINR(day.revenue)]),
          }}
          footnote="Counts every order in the period, so a longer range weights each weekday more evenly."
        >
          <ColumnChart
            columns={weekdays.map((day) => ({
              label: day.label,
              value: day.orders,
              detail: formatINR(day.revenue),
            }))}
            formatValue={formatCount}
            seriesLabel="Orders by weekday"
          />
        </ChartCard>

        <AttentionPanel scoped={scoped} breakdown={breakdown} rangeLabel={rangeLabel} />
      </div>

      <RecentOrders orders={scoped} />
    </div>
  )
}
