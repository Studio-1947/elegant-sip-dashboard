import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { customerBreakdown, type CustomerRecord } from '../lib/analysis'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { navigate } from '../lib/router'
import { formatCount, formatDate, initials, pluralise, relativeDays } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, SearchInput, SegmentedControl, Select } from '../components/ui/Controls'
import { Card, CardHeader, EmptyState } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { ChartCard } from '../components/charts/ChartCard'
import { BarList } from '../components/charts/BarList'
import { Drawer } from '../components/ui/Drawer'
import { DownloadIcon } from '../components/ui/Icons'

type SortId = 'spend' | 'orders' | 'recent'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'spend', label: 'Lifetime spend' },
  { id: 'orders', label: 'Order count' },
  { id: 'recent', label: 'Most recent' },
]

export default function CustomersPage() {
  const { orders, subscribers, now } = useDataset()
  const [range, setRange] = useState<RangeId>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('spend')
  const [selected, setSelected] = useState<CustomerRecord | null>(null)

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const customers = useMemo(() => customerBreakdown(scoped), [scoped])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = customers.filter((customer) =>
      needle ? `${customer.name} ${customer.email} ${customer.city}`.toLowerCase().includes(needle) : true,
    )
    const sorters: Record<SortId, (a: CustomerRecord, b: CustomerRecord) => number> = {
      spend: (a, b) => b.spend - a.spend,
      orders: (a, b) => b.orders - a.orders,
      recent: (a, b) => b.lastOrder.localeCompare(a.lastOrder),
    }
    return [...filtered].sort(sorters[sort])
  }, [customers, query, sort])

  const repeat = customers.filter((customer) => customer.orders > 1)
  const repeatRate = customers.length === 0 ? 0 : (repeat.length / customers.length) * 100
  const lifetime =
    customers.length === 0
      ? 0
      : Math.round(customers.reduce((sum, customer) => sum + customer.spend, 0) / customers.length)

  const exportCsv = () => {
    const columns = ['Email', 'Name', 'City', 'Orders', 'Packs', 'Lifetime spend', 'First order', 'Last order']
    downloadFile(
      stampedName('customers', now),
      toCsv(
        columns,
        rows.map((customer) => [
          customer.email,
          customer.name,
          customer.city,
          customer.orders,
          customer.units,
          customer.spend,
          customer.firstOrder,
          customer.lastOrder,
        ]),
      ),
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <FilterBar>
        <SearchInput value={query} onChange={setQuery} label="Search customers" placeholder="Name, email or city" />
        <SegmentedControl
          label="Date range"
          value={range}
          onChange={setRange}
          segments={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select label="Sort by" value={sort} onChange={setSort} options={SORTS} />
        <Button onClick={exportCsv} disabled={rows.length === 0}>
          <span className="h-4 w-4">
            <DownloadIcon />
          </span>
          Export CSV
        </Button>
      </FilterBar>

      <section aria-label="Customer figures" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Customers" value={formatCount(customers.length)} hint="Unique email addresses" />
        <StatTile
          label="Repeat customers"
          value={formatCount(repeat.length)}
          hint={`${repeatRate.toFixed(0)}% of customers ordered more than once`}
        />
        <StatTile label="Average lifetime spend" value={formatINR(lifetime)} hint="Charged totals, per customer" />
        <StatTile
          label="Newsletter subscribers"
          value={formatCount(subscribers.length)}
          hint="Stored locally — no email service is connected"
        />
      </section>

      <ChartCard
        title="Top customers by spend"
        subtitle="Charged totals across the selected period"
        table={{
          columns: ['Customer', 'Spend', 'Orders'],
          rows: rows.map((customer) => [customer.name, formatINR(customer.spend), customer.orders]),
        }}
      >
        <BarList
          items={rows.slice(0, 6).map((customer) => ({
            id: customer.email,
            label: customer.name,
            secondary: `${pluralise(customer.orders, 'order')} · ${customer.city}`,
            value: customer.spend,
          }))}
          formatValue={formatINR}
          emptyMessage="No customers in this period."
        />
      </ChartCard>

      <Card>
        <CardHeader title="All customers" subtitle={`${pluralise(rows.length, 'customer')} shown`} />
        {rows.length === 0 ? (
          <EmptyState title="No customers yet" message="Orders create customers — there are none in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Customer</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">City</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Orders</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Packs</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Spend</th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">Last order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer.email} className="border-t border-ink/5 hover:bg-sunken">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(customer)}
                        className="flex items-center gap-2.5 text-left"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                          {initials(customer.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink hover:underline">{customer.name}</span>
                          <span className="block truncate text-xs text-muted">{customer.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-body">{customer.city}</td>
                    <td className="tnum px-3 py-3 text-right text-body">{customer.orders}</td>
                    <td className="tnum px-3 py-3 text-right text-body">{customer.units}</td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-ink">{formatINR(customer.spend)}</td>
                    <td className="px-5 py-3 text-body">{relativeDays(customer.lastOrder, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && (
        <Drawer open onClose={() => setSelected(null)} title={selected.name} subtitle={selected.email}>
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Lifetime spend" value={formatINR(selected.spend)} />
              <Stat label="Orders" value={formatCount(selected.orders)} />
              <Stat label="Packs" value={formatCount(selected.units)} />
              <Stat label="City" value={selected.city} />
              <Stat label="First order" value={formatDate(selected.firstOrder)} />
              <Stat label="Last order" value={formatDate(selected.lastOrder)} />
            </dl>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Orders</h3>
              <ul className="mt-2 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
                {selected.orderNumbers.map((number) => (
                  <li key={number}>
                    <button
                      type="button"
                      onClick={() => navigate('orders', { param: number })}
                      className="tnum flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-ink hover:bg-sunken"
                    >
                      {number}
                      <span className="text-xs font-normal text-accent">Open</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <p className="text-xs text-muted">
              Grouped by email address — the only stable identity a demo checkout collects.
            </p>
          </div>
        </Drawer>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}
