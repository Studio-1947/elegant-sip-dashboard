import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { productBreakdown } from '../lib/analysis'
import { useNavigate } from '../lib/router'
import { formatCount, relativeDays } from '../lib/format'
import { Button, FilterBar, SearchInput, SegmentedControl, Select } from '../components/ui/Controls'
import { Card, Chip, EmptyState } from '../components/ui/Card'
import { Thumb } from '../components/ui/Thumb'
import { StarIcon } from '../components/ui/Icons'
import { ProductDrawer } from '../components/panels/ProductDrawer'

type SortId = 'revenue' | 'units' | 'name'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'units', label: 'Units sold' },
  { id: 'name', label: 'Name' },
]

export default function CataloguePage({ focusProduct }: { focusProduct?: string }) {
  const { orders, reviews, now } = useDataset()
  const go = useNavigate()
  const [range, setRange] = useState<RangeId>('all')
  const [sort, setSort] = useState<SortId>('revenue')
  const [query, setQuery] = useState('')

  /* Like the orders panel, the open tea is the route — so an order line can
     link straight to #/catalogue/first-flush-fannings. */

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const breakdown = useMemo(() => productBreakdown(scoped, reviews), [scoped, reviews])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = breakdown.performance.filter((row) =>
      needle
        ? [row.product.name, row.product.category, row.product.origin?.estate ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle)
        : true,
    )
    const sorters: Record<SortId, (a: typeof filtered[number], b: typeof filtered[number]) => number> = {
      revenue: (a, b) => b.revenue - a.revenue,
      units: (a, b) => b.units - a.units,
      name: (a, b) => a.product.name.localeCompare(b.product.name),
    }
    return [...filtered].sort(sorters[sort])
  }, [breakdown, query, sort])

  const selectedRow =
    breakdown.performance.find((row) => row.product.id === focusProduct) ?? null
  const maxRevenue = rows.reduce((peak, row) => Math.max(peak, row.revenue), 0)

  return (
    <div className="flex flex-col gap-3 p-3">
      <FilterBar>
        <SearchInput value={query} onChange={setQuery} label="Search catalogue" placeholder="Tea, grade or garden" />
        <SegmentedControl
          label="Date range"
          value={range}
          onChange={setRange}
          segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select label="Sort by" value={sort} onChange={setSort} options={SORTS} />
      </FilterBar>

      <p className="text-xs text-muted">
        The catalogue itself is defined in the storefront's <code>data/products.ts</code> and is read-only
        here — prices, stock and status change by editing that file, not this screen.
      </p>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No teas match" message="Clear the search to see the full catalogue." />
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const comingSoon = row.product.status === 'coming-soon'
            const prices = row.product.variants.map((variant) => variant.price)
            const low = Math.min(...prices)
            const high = Math.max(...prices)
            return (
              <li key={row.product.id}>
                <Card as="article" className="flex h-full flex-col p-4">
                  <div className="flex items-start gap-3">
                    <Thumb imageSrc={row.product.imageSrc} name={row.product.name} size={52} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-ink">{row.product.name}</h2>
                      <p className="truncate text-xs text-muted">
                        {row.product.category}
                        {row.product.origin?.estate ? ` · ${row.product.origin.estate}` : ''}
                      </p>
                    </div>
                    {comingSoon ? (
                      <Chip tone="warn">Coming soon</Chip>
                    ) : (
                      <Chip tone="accent">Active</Chip>
                    )}
                  </div>

                  {/* A coming-soon tea has no price to show — the storefront
                      refuses to print one, and so does this. */}
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {comingSoon
                      ? 'Not priced yet'
                      : low === high
                        ? formatINR(low)
                        : `${formatINR(low)} – ${formatINR(high)}`}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {row.product.variants.length} tier{row.product.variants.length === 1 ? '' : 's'} · 100 g
                    </span>
                  </p>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Metric label="Revenue" value={formatINR(row.revenue)} />
                    <Metric label="Packs" value={formatCount(row.units)} />
                    <Metric label="Orders" value={formatCount(row.orders)} />
                  </dl>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-accent/10">
                    <div
                      className="h-full rounded-r-sm bg-accent"
                      style={{ width: `${maxRevenue === 0 ? 0 : (row.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {row.lastSold ? `Last sold ${relativeDays(row.lastSold, now).toLowerCase()}` : 'Never sold'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {row.rating.count > 0 ? (
                        <>
                          <span className="h-3 w-3 text-accent">
                            <StarIcon filled />
                          </span>
                          <span className="tnum">
                            {row.rating.average.toFixed(1)} ({row.rating.count})
                          </span>
                        </>
                      ) : (
                        'No reviews'
                      )}
                    </span>
                  </div>

                  <div className="mt-4 pt-1">
                    <Button onClick={() => go('catalog', { param: row.product.id })}>Details</Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {breakdown.orphans.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-bold text-ink">Sold, but no longer in the catalogue</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-body">
            {breakdown.orphans.map((orphan) => (
              <li key={orphan.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {orphan.name} <span className="text-muted">({orphan.id})</span>
                </span>
                <span className="tnum shrink-0">
                  {formatCount(orphan.units)} packs · {formatINR(orphan.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ProductDrawer row={selectedRow} onClose={() => go('catalog')} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-sunken px-2 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}
