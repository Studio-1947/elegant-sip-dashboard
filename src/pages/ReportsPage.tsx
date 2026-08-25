import { lazy, Suspense, useMemo } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { PRODUCTS } from '@storefront/data/products'
import { useDataset } from '../lib/datasetContext'
import { RANGES, byWeekday, filterByRange, summarise, type RangeId } from '../lib/metrics'
import { productBreakdown } from '../lib/analysis'
import { hrefFor, useQueryState, useRoute } from '../lib/router'
import { formatCount } from '../lib/format'
import { FilterBar, SegmentedControl } from '../components/ui/Controls'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { ColumnChart } from '../components/charts/ColumnChart'
import { BarList } from '../components/charts/BarList'
import { ShareBar } from '../components/charts/ShareBar'
import { SkeletonRows } from '../components/ui/Skeleton'

/* ────────────────────────────────────────────────────────────────────────────
 * Reports – the analysis that used to crowd the Home screen, plus review
 * moderation, which is reporting on the product by another name.
 *
 * Two tabs rather than two rail entries: the rail holds seven destinations and
 * neither of these earns one of them. The tab is in the URL like every other bit
 * of view state, so a link to the reviews tab is a link to the reviews tab.
 * ──────────────────────────────────────────────────────────────────────────── */

const ReviewsPage = lazy(() => import('./ReviewsPage'))

const TABS = [
  { id: 'performance', label: 'Performance' },
  { id: 'reviews', label: 'Reviews' },
]

const DEFAULTS = { range: '30d', tab: 'performance' }

export default function ReportsPage() {
  const { orders, reviews, now } = useDataset()
  const route = useRoute()
  const { values, set } = useQueryState(DEFAULTS)

  const range = values.range as RangeId
  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const totals = useMemo(() => summarise(scoped), [scoped])
  const weekdays = useMemo(() => byWeekday(scoped), [scoped])
  const breakdown = useMemo(() => productBreakdown(scoped, reviews), [scoped, reviews])

  const rangeLabel = RANGES.find((entry) => entry.id === range)?.label ?? ''
  const sold = breakdown.performance.filter((row) => row.revenue > 0)
  const topFive = sold.slice(0, 5)
  const rest = sold.slice(5)

  const shares = [
    ...topFive.map((row) => ({
      id: row.product.id,
      label: row.product.name,
      value: row.revenue,
      // Slot by catalogue position, so a tea keeps its shade when the ranking
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <div role="tablist" aria-label="Reports" className="flex items-center gap-1">
        {TABS.map((tab) => {
          const selected = values.tab === tab.id
          return (
            <a
              key={tab.id}
              role="tab"
              aria-selected={selected}
              href={hrefFor('reports', { query: { ...route.query, tab: tab.id } })}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold ${selected
                  ? 'bg-sunken text-accent neu-pressed-sm'
                  : 'bg-surface text-muted neu-raised-sm hover:text-ink'
                }`}
            >
              {tab.label}
            </a>
          )
        })}
      </div>

      {values.tab === 'reviews' ? (
        <Suspense fallback={<SkeletonRows rows={6} />}>
          <ReviewsPage />
        </Suspense>
      ) : (
        <>
          <FilterBar>
            <SegmentedControl
              label="Date range"
              value={range}
              onChange={(next) => set({ range: next })}
              segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
            />
            <p className="text-xs text-muted">
              {formatCount(scoped.length)} of {formatCount(orders.length)} orders in{' '}
              {rangeLabel.toLowerCase()}
            </p>
          </FilterBar>

          <section aria-label="Period totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Goods revenue" value={formatINR(breakdown.goodsRevenue)} hint="Excludes shipping and GST" />
            <StatTile label="GST collected" value={formatINR(totals.tax)} hint="5% on goods and shipping" />
            <StatTile label="Discounts given" value={formatINR(totals.discount)} hint={`${formatINR(totals.shipping)} shipping charged`} />
            <StatTile label="Units sold" value={formatCount(totals.units)} hint="100 g packs" />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Best sellers"
              subtitle="Goods revenue by tea – excludes shipping and GST"
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
          </div>
        </>
      )}
    </div>
  )
}
