import { useMemo, useState } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../../lib/datasetContext'
import { customerBreakdown } from '../../lib/analysis'
import { stockLines } from '../../lib/inventory'
import { navigate, type RouteId } from '../../lib/router'
import { useDialog } from '../../lib/useDialog'
import { formatDate } from '../../lib/format'
import { BoxIcon, OrdersIcon, PeopleIcon, SearchIcon } from '../ui/Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * ⌘K — one field over orders, SKUs and customers.
 *
 * The point is that you do not have to know which screen a thing lives on. An
 * order number, half a customer's email and a SKU fragment all go in the same
 * box, and the answer is the record, not a filtered list you then have to read.
 *
 * Results are capped per group rather than globally, so a common surname cannot
 * crowd out the one matching SKU. Everything is a plain substring match over
 * data already in memory — no index to build, and no reason for this to take
 * longer than a keystroke.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Hit {
  id: string
  group: 'Orders' | 'SKUs' | 'Customers'
  title: string
  detail: string
  route: RouteId
  param?: string
  Icon: (props: { className?: string }) => React.JSX.Element
}

const PER_GROUP = 5

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { orders, ops, now } = useDataset()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const ref = useDialog<HTMLDivElement>(open, onClose)

  /* No effect resets the query on close: the top bar mounts this only while it
     is open, so closing unmounts it and the state goes with it. */

  const hits = useMemo<Hit[]>(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []

    const matchedOrders = orders
      .filter((order) =>
        [order.number, order.name, order.email, order.city].join(' ').toLowerCase().includes(needle),
      )
      .slice(0, PER_GROUP)
      .map<Hit>((order) => ({
        id: `order:${order.number}`,
        group: 'Orders',
        title: order.number,
        detail: `${order.name || 'No name'} · ${formatDate(order.date)} · ${formatINR(order.total)}`,
        route: 'orders',
        param: order.number,
        Icon: OrdersIcon,
      }))

    const matchedSkus = stockLines(ops, orders, now)
      .filter((line) =>
        [line.variant.sku, line.product.name, line.variant.size].join(' ').toLowerCase().includes(needle),
      )
      .slice(0, PER_GROUP)
      .map<Hit>((line) => ({
        id: `sku:${line.key}`,
        group: 'SKUs',
        title: line.variant.sku,
        detail: `${line.product.name} · ${line.variant.size} · ${line.onHand} in stock`,
        route: 'catalog',
        param: line.product.id,
        Icon: BoxIcon,
      }))

    const matchedCustomers = customerBreakdown(orders)
      .filter((customer) => `${customer.name} ${customer.email} ${customer.city}`.toLowerCase().includes(needle))
      .slice(0, PER_GROUP)
      .map<Hit>((customer) => ({
        id: `customer:${customer.email}`,
        group: 'Customers',
        title: customer.name || customer.email,
        detail: `${customer.email} · ${customer.orders} orders · ${formatINR(customer.spend)}`,
        route: 'customers',
        param: customer.email,
        Icon: PeopleIcon,
      }))

    return [...matchedOrders, ...matchedSkus, ...matchedCustomers]
  }, [query, orders, ops, now])

  if (!open) return null

  const choose = (hit: Hit) => {
    navigate(hit.route, { param: hit.param })
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => Math.min(value + 1, hits.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => Math.max(value - 1, 0))
    } else if (event.key === 'Enter' && hits[cursor]) {
      event.preventDefault()
      choose(hits[cursor])
    }
  }

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-50 flex justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-overlay-in cursor-default bg-ink/35"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Search orders, SKUs and customers"
        className="relative flex h-max max-h-[70vh] w-full max-w-xl animate-drawer-in flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <span className="h-4 w-4 shrink-0 text-faint">
            <SearchIcon />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Order number, SKU, customer…"
            aria-label="Search orders, SKUs and customers"
            className="h-11 w-full bg-transparent text-md text-ink placeholder:text-faint focus-visible:outline-none"
          />
          <kbd className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Type at least two characters. Orders, SKUs and customers are all in this one field.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Nothing matches “{query.trim()}”. Order numbers, SKUs, names, emails and cities are searched.
            </p>
          ) : (
            hits.map((hit, index) => {
              const header = hit.group === lastGroup ? null : hit.group
              lastGroup = hit.group
              return (
                <div key={hit.id}>
                  {header && (
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => choose(hit)}
                    onMouseEnter={() => setCursor(index)}
                    aria-current={index === cursor}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${
                      index === cursor ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <span className="h-4 w-4 shrink-0 text-faint">
                      <hit.Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{hit.title}</span>
                      <span className="block truncate text-xs text-muted">{hit.detail}</span>
                    </span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
