import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { customerBreakdown, type CustomerRecord } from '../lib/analysis'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { navigate, useQueryState, useRoute } from '../lib/router'
import { formatCount, formatDate, initials, pluralise, relativeDays } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, FilterChip, SearchInput, Select } from '../components/ui/Controls'
import { Card, EmptyState } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { Drawer } from '../components/ui/Drawer'
import { DownloadIcon } from '../components/ui/Icons'
import { DataTable, type Column } from '../components/table/DataTable'
import { DensityToggle, TableStatus, useDensity } from '../components/table/TableToolbar'
import { SavedViews, type SavedView } from '../components/table/SavedViews'
import { BulkAction, BulkBar } from '../components/table/BulkBar'

type SortId = 'spend' | 'orders' | 'recent'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'spend', label: 'Lifetime spend' },
  { id: 'orders', label: 'Order count' },
  { id: 'recent', label: 'Most recent' },
]

const DEFAULTS = { q: '', range: 'all', sort: 'spend', segment: 'all' }

const VIEWS: SavedView[] = [
  { id: 'all', label: 'Everyone', query: {} },
  { id: 'repeat', label: 'Repeat customers', query: { segment: 'repeat' }, hint: 'More than one order' },
  { id: 'once', label: 'Ordered once', query: { segment: 'once' }, hint: 'Worth a second-order nudge' },
]

export default function CustomersPage() {
  const { orders, subscribers, now } = useDataset()
  const route = useRoute()
  const [density, setDensity] = useDensity()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { values, set, clear } = useQueryState(DEFAULTS)

  const range = values.range as RangeId
  const sort = values.sort as SortId

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const customers = useMemo(() => customerBreakdown(scoped), [scoped])

  const rows = useMemo(() => {
    const needle = values.q.trim().toLowerCase()
    const filtered = customers.filter((customer) => {
      if (values.segment === 'repeat' && customer.orders <= 1) return false
      if (values.segment === 'once' && customer.orders !== 1) return false
      if (!needle) return true
      return `${customer.name} ${customer.email} ${customer.city}`.toLowerCase().includes(needle)
    })
    const sorters: Record<SortId, (a: CustomerRecord, b: CustomerRecord) => number> = {
      spend: (a, b) => b.spend - a.spend,
      orders: (a, b) => b.orders - a.orders,
      recent: (a, b) => b.lastOrder.localeCompare(a.lastOrder),
    }
    return [...filtered].sort(sorters[sort])
  }, [customers, values.q, values.segment, sort])

  /* The open customer is the route, like orders and SKUs — so a link to a
     customer is a link to a customer, and a reload keeps the panel open. */
  const focused = route.param
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.email === focused) ?? null,
    [customers, focused],
  )
  const openCustomer = (email: string) => navigate('customers', { param: email, query: route.query })

  const repeat = customers.filter((customer) => customer.orders > 1)
  const repeatRate = customers.length === 0 ? 0 : (repeat.length / customers.length) * 100
  const lifetime =
    customers.length === 0
      ? 0
      : Math.round(customers.reduce((sum, customer) => sum + customer.spend, 0) / customers.length)

  const exportCsv = (list: CustomerRecord[]) => {
    downloadFile(
      stampedName('customers', now),
      toCsv(
        ['Email', 'Name', 'City', 'Orders', 'Packs', 'Lifetime spend', 'First order', 'Last order'],
        list.map((customer) => [
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

  const columns: Column<CustomerRecord>[] = [
    {
      id: 'customer',
      header: 'Customer',
      width: 240,
      render: (customer) => (
        <button
          type="button"
          onClick={() => openCustomer(customer.email)}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-sunken text-xs font-semibold text-body">
            {initials(customer.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink hover:text-accent hover:underline">
              {customer.name || customer.email}
            </span>
            <span className="block truncate text-xs text-muted">{customer.email}</span>
          </span>
        </button>
      ),
    },
    { id: 'city', header: 'City', render: (customer) => <span className="truncate text-body">{customer.city || '—'}</span> },
    {
      id: 'orders',
      header: 'Orders',
      align: 'right',
      width: 92,
      render: (customer) => <span className="text-body">{customer.orders}</span>,
    },
    {
      id: 'packs',
      header: 'Packs',
      align: 'right',
      width: 92,
      render: (customer) => <span className="text-body">{customer.units}</span>,
    },
    {
      id: 'spend',
      header: 'Spend',
      align: 'right',
      width: 120,
      render: (customer) => <span className="font-semibold text-ink">{formatINR(customer.spend)}</span>,
    },
    {
      id: 'last',
      header: 'Last order',
      width: 136,
      render: (customer) => <span className="text-body">{relativeDays(customer.lastOrder, now)}</span>,
    },
  ]

  const chips = [
    values.segment !== 'all' && {
      field: 'Segment',
      value: values.segment === 'repeat' ? 'Repeat' : 'Ordered once',
      key: 'segment' as const,
    },
    range !== 'all' && {
      field: 'Ordered in',
      value: RANGES.find((entry) => entry.id === range)?.label ?? range,
      key: 'range' as const,
    },
    values.q && { field: 'Search', value: values.q, key: 'q' as const },
  ].filter(Boolean) as { field: string; value: string; key: 'segment' | 'range' | 'q' }[]

  return (
    <div className="flex flex-col gap-3 p-3">
      <section aria-label="Customer figures" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Customers" value={formatCount(customers.length)} hint="Unique email addresses" />
        <StatTile
          label="Repeat customers"
          value={formatCount(repeat.length)}
          hint={`${repeatRate.toFixed(0)}% ordered more than once`}
        />
        <StatTile label="Average lifetime spend" value={formatINR(lifetime)} hint="Charged totals, per customer" />
        <StatTile
          label="Newsletter subscribers"
          value={formatCount(subscribers.length)}
          hint="Stored locally — no email service is connected"
        />
      </section>

      <SavedViews route="customers" views={VIEWS} current={route.query} />

      <FilterBar>
        <SearchInput
          value={values.q}
          onChange={(next) => set({ q: next }, true)}
          label="Search customers"
          placeholder="Name, email or city"
        />
        <Select
          label="Ordered in"
          value={range}
          onChange={(next) => set({ range: next })}
          options={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select label="Sort" value={sort} onChange={(next) => set({ sort: next })} options={SORTS} />
        <DensityToggle density={density} onChange={setDensity} />
        <Button onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
          <span className="h-3.5 w-3.5">
            <DownloadIcon />
          </span>
          Export
        </Button>
      </FilterBar>

      <TableStatus count={`${pluralise(rows.length, 'customer')} of ${formatCount(customers.length)}`}>
        {chips.map((chip) => (
          <FilterChip key={chip.key} field={chip.field} value={chip.value} onRemove={() => clear([chip.key])} />
        ))}
        {chips.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => clear()}>
            Clear all
          </Button>
        )}
      </TableStatus>

      <Card className="overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(customer) => customer.email}
          caption={`Customers, sorted by ${SORTS.find((entry) => entry.id === sort)?.label.toLowerCase()}`}
          density={density}
          activeId={focused}
          onOpen={(customer) => openCustomer(customer.email)}
          selection={{ selected, onChange: setSelected }}
          empty={
            <EmptyState
              title="No customers match"
              message="Orders create customers — widen the range or clear the search."
              action={<Button onClick={() => clear()}>Clear filters</Button>}
            />
          }
        />
      </Card>

      <p className="text-xs text-muted">
        Grouped by email address — the only stable identity a demo checkout collects.
      </p>

      <BulkBar count={selected.size} noun="customer" onClear={() => setSelected(new Set())}>
        <BulkAction onClick={() => exportCsv(rows.filter((customer) => selected.has(customer.email)))}>
          Export selection
        </BulkAction>
      </BulkBar>

      {selectedCustomer && (
        <Drawer
          open
          onClose={() => navigate('customers', { query: route.query })}
          title={selectedCustomer.name || selectedCustomer.email}
          subtitle={selectedCustomer.email}
        >
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <Stat label="Lifetime spend" value={formatINR(selectedCustomer.spend)} />
              <Stat label="Orders" value={formatCount(selectedCustomer.orders)} />
              <Stat label="Packs" value={formatCount(selectedCustomer.units)} />
              <Stat label="City" value={selectedCustomer.city || '—'} />
              <Stat label="First order" value={formatDate(selectedCustomer.firstOrder)} />
              <Stat label="Last order" value={formatDate(selectedCustomer.lastOrder)} />
            </dl>
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Orders</h3>
              <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line bg-surface">
                {selectedCustomer.orderNumbers.map((number) => (
                  <li key={number}>
                    <button
                      type="button"
                      onClick={() => navigate('orders', { param: number })}
                      className="flex h-9 w-full items-center justify-between px-3 text-left text-sm font-semibold text-ink hover:bg-sunken"
                    >
                      {number}
                      <span className="text-xs font-normal text-accent">Open</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Drawer>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-2 py-1.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold text-ink">{value}</dd>
    </div>
  )
}
