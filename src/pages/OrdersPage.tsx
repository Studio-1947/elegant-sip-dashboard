import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { STAGES, stageDotClass, stageLabel, stageOf, type Stage } from '../lib/fulfilment'
import { navigate, useNavigate } from '../lib/router'
import { formatDateTime, formatCount, pluralise } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, SearchInput, SegmentedControl, Select } from '../components/ui/Controls'
import { Card, DotLabel, EmptyState } from '../components/ui/Card'
import { DownloadIcon } from '../components/ui/Icons'
import { OrderDrawer } from '../components/panels/OrderDrawer'

type SortId = 'newest' | 'oldest' | 'largest' | 'smallest'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'largest', label: 'Largest total' },
  { id: 'smallest', label: 'Smallest total' },
]

export default function OrdersPage({ focusOrder }: { focusOrder?: string }) {
  const { orders, fulfilment, now } = useDataset()
  const go = useNavigate()
  const [range, setRange] = useState<RangeId>('all')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<Stage | 'all'>('all')
  const [sort, setSort] = useState<SortId>('newest')

  /* The open order is the route (#/orders/ES-DEMO-1004), not component state:
     the panel is then deep-linkable, and Back closes it. */
  const openOrder = (number: string) => go('orders', { param: number })

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = filterByRange(orders, range, now).filter((order) => {
      if (stage !== 'all' && stageOf(fulfilment, order.number) !== stage) return false
      if (!needle) return true
      return [order.number, order.name, order.email, order.city, order.coupon ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    const sorters: Record<SortId, (a: typeof rows[number], b: typeof rows[number]) => number> = {
      newest: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      largest: (a, b) => b.total - a.total,
      smallest: (a, b) => a.total - b.total,
    }
    return [...rows].sort(sorters[sort])
  }, [orders, range, now, stage, query, sort, fulfilment])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.number === focusOrder) ?? null,
    [orders, focusOrder],
  )

  const exportCsv = () => {
    const columns = ['Order', 'Placed', 'Customer', 'Email', 'City', 'Packs', 'Goods', 'Discount', 'Shipping', 'GST', 'Total', 'Coupon', 'Stage']
    const rows = visible.map((order) => [
      order.number,
      order.date,
      order.name,
      order.email,
      order.city,
      order.items.reduce((sum, item) => sum + item.quantity, 0),
      order.subtotal,
      order.discount,
      order.shippingFee,
      order.tax,
      order.total,
      order.coupon ?? '',
      stageLabel(stageOf(fulfilment, order.number)),
    ])
    downloadFile(stampedName('orders', now), toCsv(columns, rows))
  }

  const closeDrawer = () => go('orders')

  return (
    <div className="flex flex-col gap-3 p-3">
      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search orders"
          placeholder="Order number, name, email, city or coupon"
        />
        <SegmentedControl
          label="Date range"
          value={range}
          onChange={setRange}
          segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select
          label="Stage"
          value={stage}
          onChange={setStage}
          options={[{ id: 'all' as const, label: 'All stages' }, ...STAGES.map((entry) => ({ id: entry.id, label: entry.label }))]}
        />
        <Select label="Sort" value={sort} onChange={setSort} options={SORTS} />
        <Button onClick={exportCsv} disabled={visible.length === 0}>
          <span className="h-4 w-4">
            <DownloadIcon />
          </span>
          Export CSV
        </Button>
      </FilterBar>

      <p className="text-xs text-muted">
        Showing {pluralise(visible.length, 'order')} of {formatCount(orders.length)}.
        {' '}Stages are recorded by this dashboard only — changing one does not notify the customer.
      </p>

      <Card>
        {visible.length === 0 ? (
          <EmptyState
            title="No orders match"
            message="Try a wider date range, a different stage, or clear the search."
            action={
              <Button
                onClick={() => {
                  setQuery('')
                  setStage('all')
                  setRange('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Orders, sorted by {SORTS.find((entry) => entry.id === sort)?.label.toLowerCase()}
              </caption>
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Order</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Placed</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Customer</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Packs</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Stage</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const current = stageOf(fulfilment, order.number)
                  return (
                    <tr key={order.number} className="border-t border-ink/5 hover:bg-sunken">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => openOrder(order.number)}
                          className="tnum font-semibold text-ink hover:underline"
                          aria-label={`Open order ${order.number}`}
                        >
                          {order.number}
                        </button>
                        {order.coupon && (
                          <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                            {order.coupon}
                          </span>
                        )}
                      </td>
                      <td className="tnum px-3 py-3 text-body">{formatDateTime(order.date)}</td>
                      <td className="px-3 py-3">
                        <span className="block truncate text-body">{order.name || '—'}</span>
                        <span className="block truncate text-xs text-muted">{order.email || '—'}</span>
                      </td>
                      <td className="tnum px-3 py-3 text-right text-body">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                      <td className="tnum px-3 py-3 text-right font-semibold text-ink">{formatINR(order.total)}</td>
                      <td className="px-5 py-3 text-xs text-body">
                        <DotLabel colorClass={stageDotClass(current)}>{stageLabel(current)}</DotLabel>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OrderDrawer order={selectedOrder} onClose={closeDrawer} onOpenProduct={(id) => navigate('catalog', { param: id })} />
    </div>
  )
}
