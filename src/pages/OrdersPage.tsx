import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { STAGES, stageDotClass, stageLabel, stageOf, type Stage } from '../lib/fulfilment'
import { navigate, useQueryState, useRoute } from '../lib/router'
import { formatDateTime, formatCount, pluralise } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, FilterChip, SearchInput, Select } from '../components/ui/Controls'
import { Card, Chip, EmptyState } from '../components/ui/Card'
import { DownloadIcon } from '../components/ui/Icons'
import { DataTable, type Column } from '../components/table/DataTable'
import { DensityToggle, TableStatus, useDensity } from '../components/table/TableToolbar'
import { SavedViews, type SavedView } from '../components/table/SavedViews'
import { BulkAction, BulkBar } from '../components/table/BulkBar'
import { useToast } from '../components/ui/Toast'
import { OrderDrawer } from '../components/panels/OrderDrawer'

type SortId = 'newest' | 'oldest' | 'largest' | 'smallest'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'largest', label: 'Largest total' },
  { id: 'smallest', label: 'Smallest total' },
]

const DEFAULTS = { q: '', stage: 'all', range: 'all', sort: 'newest' }

const VIEWS: SavedView[] = [
  { id: 'all', label: 'All orders', query: {} },
  { id: 'packing', label: 'Needs packing', query: { stage: 'new' }, hint: 'Received, not yet packed' },
  { id: 'transit', label: 'In transit', query: { stage: 'shipped' }, hint: 'Handed to the courier' },
  { id: 'week', label: 'This week', query: { range: '7d' }, hint: 'Placed in the last seven days' },
  { id: 'cancelled', label: 'Cancelled', query: { stage: 'cancelled' } },
]

export default function OrdersPage({ focusOrder }: { focusOrder?: string }) {
  const { orders, fulfilment, now, updateStages, undoStages, stageSnapshot } = useDataset()
  const route = useRoute()
  const notify = useToast()
  const [density, setDensity] = useDensity()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { values, set, clear } = useQueryState(DEFAULTS)

  const range = values.range as RangeId
  const stage = values.stage as Stage | 'all'
  const sort = values.sort as SortId

  /* The open order is the route (#/orders/ES-DEMO-1004?stage=new), not component
     state: the panel is deep-linkable, Back closes it, and – because the query
     rides along – closing it drops you back into the same filtered list. */
  const openOrder = (number: string) => navigate('orders', { param: number, query: route.query })
  const closeDrawer = () => navigate('orders', { query: route.query })

  const visible = useMemo(() => {
    const needle = values.q.trim().toLowerCase()
    const rows = filterByRange(orders, range, now).filter((order) => {
      if (stage !== 'all' && stageOf(fulfilment, order.number) !== stage) return false
      if (!needle) return true
      return [order.number, order.name, order.email, order.city, order.coupon ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
    const sorters: Record<SortId, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      newest: (a, b) => b.date.localeCompare(a.date),
      oldest: (a, b) => a.date.localeCompare(b.date),
      largest: (a, b) => b.total - a.total,
      smallest: (a, b) => a.total - b.total,
    }
    return [...rows].sort(sorters[sort])
  }, [orders, range, now, stage, values.q, sort, fulfilment])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.number === focusOrder) ?? null,
    [orders, focusOrder],
  )

  const viewCounts = useMemo(
    () =>
      VIEWS.map((view) => ({
        ...view,
        count:
          view.query.stage === undefined
            ? undefined
            : orders.filter((order) => stageOf(fulfilment, order.number) === view.query.stage).length,
      })),
    [orders, fulfilment],
  )

  /** Optimistic, then a toast holding the way back. No confirmation step. */
  const applyStage = (numbers: string[], next: Stage) => {
    const previous = stageSnapshot(numbers)
    if (!updateStages(numbers, next)) {
      notify('Storage refused the write – no stage was changed', 'error')
      return
    }
    setSelected(new Set())
    notify(`${pluralise(numbers.length, 'order')} marked ${stageLabel(next).toLowerCase()}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (undoStages(previous)) notify('Stage change undone')
          else notify('Storage refused the write – the change is still applied', 'error')
        },
      },
    })
  }

  const exportCsv = (rows: typeof visible) => {
    const columns = ['Order', 'Placed', 'Customer', 'Email', 'City', 'Packs', 'Goods', 'Discount', 'Shipping', 'GST', 'Total', 'Coupon', 'Stage']
    downloadFile(
      stampedName('orders', now),
      toCsv(
        columns,
        rows.map((order) => [
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
        ]),
      ),
    )
  }

  const columns: Column<(typeof visible)[number]>[] = [
    {
      id: 'number',
      header: 'Order',
      width: 156,
      render: (order) => (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openOrder(order.number)}
            className="truncate font-semibold text-ink hover:text-accent hover:underline"
            aria-label={`Open order ${order.number}`}
          >
            {order.number}
          </button>
          {order.coupon && <Chip tone="accent">{order.coupon}</Chip>}
        </span>
      ),
    },
    {
      id: 'placed',
      header: 'Placed',
      render: (order) => <span className="text-body">{formatDateTime(order.date)}</span>,
    },
    {
      id: 'customer',
      header: 'Customer',
      render: (order) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{order.name || ''}</span>
          <span className="block truncate text-xs text-muted">{order.email || ''}</span>
        </span>
      ),
    },
    {
      id: 'city',
      header: 'City',
      render: (order) => <span className="truncate text-body">{order.city || ''}</span>,
    },
    {
      id: 'packs',
      header: 'Packs',
      align: 'right',
      render: (order) => (
        <span className="text-body">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      render: (order) => <span className="font-semibold text-ink">{formatINR(order.total)}</span>,
    },
    {
      id: 'stage',
      header: 'Stage',
      width: 168,
      render: (order) => {
        const current = stageOf(fulfilment, order.number)
        return (
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${stageDotClass(current)}`} aria-hidden="true" />
            <select
              value={current}
              onChange={(event) => applyStage([order.number], event.target.value as Stage)}
              aria-label={`Stage for order ${order.number}`}
              className="h-7 w-full rounded-sm border border-transparent bg-transparent px-1 text-sm text-body hover:border-line hover:bg-surface"
            >
              {STAGES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </span>
        )
      },
    },
  ]

  const chips = [
    stage !== 'all' && { field: 'Stage', value: stageLabel(stage), key: 'stage' as const },
    range !== 'all' && {
      field: 'Placed',
      value: RANGES.find((entry) => entry.id === range)?.label ?? range,
      key: 'range' as const,
    },
    values.q && { field: 'Search', value: values.q, key: 'q' as const },
  ].filter(Boolean) as { field: string; value: string; key: 'stage' | 'range' | 'q' }[]

  return (
    <div className="flex flex-col gap-4 p-4">
      <SavedViews route="orders" views={viewCounts} current={route.query} />

      <FilterBar>
        <SearchInput
          value={values.q}
          onChange={(next) => set({ q: next }, true)}
          label="Search orders"
          placeholder="Order number, name, email, city or coupon"
        />
        <Select
          label="Placed"
          value={range}
          onChange={(next) => set({ range: next })}
          options={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select
          label="Stage"
          value={stage}
          onChange={(next) => set({ stage: next })}
          options={[
            { id: 'all' as const, label: 'All stages' },
            ...STAGES.map((entry) => ({ id: entry.id, label: entry.label })),
          ]}
        />
        <Select label="Sort" value={sort} onChange={(next) => set({ sort: next })} options={SORTS} />
        <DensityToggle density={density} onChange={setDensity} />
        <Button onClick={() => exportCsv(visible)} disabled={visible.length === 0}>
          <span className="h-3.5 w-3.5">
            <DownloadIcon />
          </span>
          Export
        </Button>
      </FilterBar>

      <TableStatus count={`${pluralise(visible.length, 'order')} of ${formatCount(orders.length)}`}>
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            field={chip.field}
            value={chip.value}
            onRemove={() => clear([chip.key])}
          />
        ))}
        {chips.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => clear()}>
            Clear all
          </Button>
        )}
      </TableStatus>

      <Card className="overflow-hidden">
        <DataTable
          rows={visible}
          columns={columns}
          getRowId={(order) => order.number}
          caption={`Orders, sorted by ${SORTS.find((entry) => entry.id === sort)?.label.toLowerCase()}`}
          density={density}
          activeId={focusOrder}
          onOpen={(order) => openOrder(order.number)}
          selection={{ selected, onChange: setSelected }}
          empty={
            <EmptyState
              title="No orders match"
              message="Try a wider date range, a different stage, or clear the search."
              action={<Button onClick={() => clear()}>Clear filters</Button>}
            />
          }
        />
      </Card>

      <p className="text-xs text-muted">
        Stages are recorded by this dashboard only – changing one does not notify the customer.
      </p>

      <BulkBar count={selected.size} noun="order" onClear={() => setSelected(new Set())}>
        {(['packed', 'shipped', 'delivered'] as Stage[]).map((next) => (
          <BulkAction key={next} onClick={() => applyStage([...selected], next)}>
            Mark {stageLabel(next).toLowerCase()}
          </BulkAction>
        ))}
        <BulkAction onClick={() => exportCsv(visible.filter((order) => selected.has(order.number)))}>
          Export
        </BulkAction>
      </BulkBar>

      <OrderDrawer
        order={selectedOrder}
        onClose={closeDrawer}
        onOpenProduct={(id) => navigate('catalog', { param: id })}
      />
    </div>
  )
}
