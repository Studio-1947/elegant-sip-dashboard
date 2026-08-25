import { useMemo } from 'react'
import type { PlacedOrder } from '@storefront/lib/orders'
import { formatINR } from '@storefront/lib/currency'
import { PRODUCTS } from '@storefront/data/products'
import { checkIntegrity } from '../../lib/metrics'
import type { ProductBreakdown } from '../../lib/analysis'
import { useDataset } from '../../lib/datasetContext'
import { stageOf } from '../../lib/fulfilment'
import { navigate } from '../../lib/router'
import { formatCount, pluralise } from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'
import { AlertIcon, ChevronIcon } from '../ui/Icons'

interface Item {
  id: string
  text: string
  tone: 'info' | 'warning'
  action?: { label: string; onClick: () => void }
}

/**
 * The "what needs a human" list. Everything here is derived, never invented —
 * if there is nothing to do it says so, rather than padding the panel with
 * generic advice.
 */
export function AttentionPanel({
  scoped,
  breakdown,
  rangeLabel,
}: {
  scoped: PlacedOrder[]
  breakdown: ProductBreakdown
  rangeLabel: string
}) {
  const { orders, fulfilment } = useDataset()

  const items = useMemo<Item[]>(() => {
    const list: Item[] = []

    // Scoped to the selected period, so this line can never disagree with the
    // order count in the panel's own subtitle.
    const awaiting = scoped.filter((order) => stageOf(fulfilment, order.number) === 'new')
    if (awaiting.length > 0) {
      const older = orders.length - scoped.length
      list.push({
        id: 'awaiting',
        tone: 'warning',
        text: `${pluralise(awaiting.length, 'order')} in this period still marked New — not yet packed.${
          older > 0 ? ` ${formatCount(older)} more sit outside the date range.` : ''
        }`,
        action: { label: 'Open orders', onClick: () => navigate('orders') },
      })
    }

    const issues = checkIntegrity(scoped)
    if (issues.length > 0) {
      list.push({
        id: 'integrity',
        tone: 'warning',
        text: `${pluralise(issues.length, 'order')} in this period have a stored total that does not match the current pricing rules.`,
        action: { label: 'Inspect', onClick: () => navigate('settings') },
      })
    }

    const unsold = breakdown.performance.filter(
      (row) => row.product.status !== 'coming-soon' && row.revenue === 0,
    )
    if (unsold.length > 0) {
      list.push({
        id: 'unsold',
        tone: 'info',
        text: `No sales in ${rangeLabel.toLowerCase()}: ${unsold.map((row) => row.product.name).join(', ')}.`,
        action: { label: 'Catalogue', onClick: () => navigate('catalog') },
      })
    }

    if (breakdown.orphans.length > 0) {
      list.push({
        id: 'orphans',
        tone: 'warning',
        text: `${pluralise(breakdown.orphans.length, 'sold line')} reference a product that is no longer in the catalogue.`,
        action: { label: 'Catalogue', onClick: () => navigate('catalog') },
      })
    }

    const comingSoon = PRODUCTS.filter((product) => product.status === 'coming-soon')
    if (comingSoon.length > 0) {
      list.push({
        id: 'coming-soon',
        tone: 'info',
        text: `${comingSoon.map((product) => product.name).join(' and ')} are still marked coming soon — they cannot be bought until a real price and stock are set in the catalogue.`,
      })
    }

    const unitsSold = breakdown.performance.reduce((sum, row) => sum + row.units, 0)
    list.push({
      id: 'stock',
      tone: 'info',
      text: `${formatCount(unitsSold)} packs sold in this period. The catalogue's stock figures are static and never decrement, so no reorder alert can be trusted yet.`,
    })

    return list
  }, [orders, fulfilment, scoped, breakdown, rangeLabel])

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Needs attention"
        subtitle={`Derived from ${pluralise(scoped.length, 'order')} · ${formatINR(breakdown.goodsRevenue)} of goods`}
      />
      <ul className="flex flex-1 flex-col divide-y divide-ink/5">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
            {/* A tick beside "these teas are still coming soon" would read as
                "handled". Informational rows get a neutral marker instead. */}
            {item.tone === 'warning' ? (
              <span className="mt-0.5 h-4 w-4 shrink-0 text-warn">
                <AlertIcon />
              </span>
            ) : (
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rule" />
              </span>
            )}
            <p className="min-w-0 flex-1 text-sm text-body">{item.text}</p>
            {item.action && (
              <button
                type="button"
                onClick={item.action.onClick}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline"
              >
                {item.action.label}
                <span className="h-3 w-3">
                  <ChevronIcon />
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
