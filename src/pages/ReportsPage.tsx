import { lazy, Suspense, useMemo } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { PRODUCTS } from '@storefront/data/products'
import { useDataset } from '../lib/datasetContext'
import { RANGES, byWeekday, filterByRange, summarise, type RangeId } from '../lib/metrics'
import { productBreakdown } from '../lib/analysis'
import { hrefFor, useQueryState, useRoute } from '../lib/router'
import { formatCount } from '../lib/format'
import { SegmentedControl } from '../components/ui/Controls'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { ColumnChart } from '../components/charts/ColumnChart'
import { BarList } from '../components/charts/BarList'
import { ShareBar } from '../components/charts/ShareBar'
import { SkeletonRows } from '../components/ui/Skeleton'
import { ChevronIcon } from '../components/ui/Icons'

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

/* On a phone Reports is a menu, not a page.
   Four charts stacked on a 390px screen is four things you scroll past to reach
   the fifth, and none of them is readable without turning the handset. So the
   small layout lists what is in here and lets you pick one; the chosen section
   then gets the whole screen to itself. On `lg` all of it renders at once, as
   before – the room exists there. */
const SECTIONS = [
  { id: 'mix', label: 'Product mix', hint: 'Revenue share by tea and pack size' },
  { id: 'sellers', label: 'Best sellers', hint: 'Top SKUs by units and revenue' },
  { id: 'weekday', label: 'Weekday patterns', hint: 'When orders actually come in' },
  { id: 'reviews', label: 'Review moderation', hint: 'Pending storefront reviews' },
]

const DEFAULTS = { range: '30d', tab: 'performance', section: '' }

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

  /* Below `lg`, a block is shown only when its section is the chosen one; from
     `lg` every block is shown regardless, because the screen can hold them. */
  const onlyOnMobileWhen = (id: string) => (values.section === id ? '' : 'hidden lg:block')
  /* The controls and the totals belong to a section, not to the menu. */
  const chromeVisibility = values.section ? '' : 'hidden lg:flex'
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
      {/* The menu owns the small screen until a section is picked. */}
      {!values.section && values.tab !== 'reviews' && (
        <ul className="flex flex-col gap-2 lg:hidden">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={hrefFor('reports', {
                  query:
                    section.id === 'reviews'
                      ? { ...route.query, tab: 'reviews' }
                      : { ...route.query, section: section.id },
                })}
                className="flex items-center gap-3 rounded-lg bg-surface px-3.5 py-3 neu-raised"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{section.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{section.hint}</span>
                </span>
                <span className="h-3.5 w-3.5 shrink-0 text-faint">
                  <ChevronIcon />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {values.section && (
        <a
          href={hrefFor('reports', { query: { ...route.query, section: '' } })}
          className="inline-flex h-9 w-max items-center gap-1.5 rounded-md bg-surface px-3 text-xs font-semibold text-accent neu-raised-sm lg:hidden"
        >
          <span className="h-3 w-3 rotate-180">
            <ChevronIcon />
          </span>
          All reports
        </a>
      )}

      <div role="tablist" aria-label="Reports" className="hidden items-center gap-1 lg:flex">
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
          <div className={`${chromeVisibility} flex-wrap items-center gap-2.5`}>
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
          </div>

          <section
            aria-label="Period totals"
            className={`${values.section ? 'grid' : 'hidden lg:grid'} grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4`}
          >
            <StatTile label="Goods revenue" value={formatINR(breakdown.goodsRevenue)} hint="Excludes shipping and GST" />
            <StatTile label="GST collected" value={formatINR(totals.tax)} hint="5% on goods and shipping" />
            <StatTile label="Discounts given" value={formatINR(totals.discount)} hint={`${formatINR(totals.shipping)} shipping charged`} />
            <StatTile label="Units sold" value={formatCount(totals.units)} hint="100 g packs" />
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              className={onlyOnMobileWhen('sellers')}
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
              className={onlyOnMobileWhen('mix')}
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
              className={onlyOnMobileWhen('weekday')}
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
