/* ────────────────────────────────────────────────────────────────────────────
 * "What needs me now?"
 *
 * One derivation, two consumers: the Home screen's exception list and the
 * notification count in the top bar. They must never disagree — a bell showing
 * 3 above a screen listing 5 destroys trust in both.
 *
 * Everything here is DERIVED. Nothing is a reminder someone typed in, and
 * nothing is padded with generic advice: when there is nothing wrong, this
 * returns an empty array and the screen says so.
 *
 * What is deliberately absent, because this app has no source for it:
 * failed payments, orders on hold, pending refunds, and subscription renewals.
 * The Home screen names that gap out loud rather than letting an all-clear be
 * read as "nothing is wrong" when four whole categories were never checked.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import { PRODUCTS } from '@storefront/data/products'
import type { Query, RouteId } from './router'
import type { FulfilmentStore } from './fulfilment'
import { stageOf } from './fulfilment'
import { checkIntegrity } from './metrics'
import { coverBand, daysUntil, stockLines } from './inventory'
import type { OpsStore } from './ops'
import { pluralise } from './format'

export type Severity = 'critical' | 'warn' | 'info'

export interface Exception {
  id: string
  severity: Severity
  /** What is true. */
  title: string
  /** What to do about it. */
  detail: string
  count: number
  route: RouteId
  query?: Query
  action: string
}

/** Sorted worst-first, so the top of the list is the top of the list. */
const ORDER: Record<Severity, number> = { critical: 0, warn: 1, info: 2 }

export interface ExceptionInput {
  orders: PlacedOrder[]
  fulfilment: FulfilmentStore
  ops: OpsStore
  now: Date
}

export function exceptions({ orders, fulfilment, ops, now }: ExceptionInput): Exception[] {
  const list: Exception[] = []
  const lines = stockLines(ops, orders, now)

  /* ── Orders waiting on a human ── */
  const unpacked = orders.filter((order) => stageOf(fulfilment, order.number) === 'new')
  if (unpacked.length > 0) {
    list.push({
      id: 'unpacked',
      severity: unpacked.length > 5 ? 'critical' : 'warn',
      title: `${pluralise(unpacked.length, 'order')} not yet packed`,
      detail: 'Received and still marked New. Pack them, then set the stage so the count clears.',
      count: unpacked.length,
      route: 'orders',
      query: { stage: 'new' },
      action: 'Open orders',
    })
  }

  /* ── Stock, in days rather than units ── */
  const out = lines.filter((line) => coverBand(line) === 'out')
  if (out.length > 0) {
    list.push({
      id: 'out-of-stock',
      severity: 'critical',
      title: `${pluralise(out.length, 'SKU')} out of stock`,
      detail: `No packs in any lot: ${out.map((line) => line.variant.sku).slice(0, 3).join(', ')}${
        out.length > 3 ? ` and ${out.length - 3} more` : ''
      }. The storefront will show these as sold out.`,
      count: out.length,
      route: 'catalog',
      query: { status: 'reorder' },
      action: 'Review SKUs',
    })
  }

  const critical = lines.filter((line) => coverBand(line) === 'critical')
  if (critical.length > 0) {
    list.push({
      id: 'reorder-now',
      severity: 'critical',
      title: `${pluralise(critical.length, 'SKU')} with under two weeks of cover`,
      detail: `A garden reorder takes longer than the cover left — ${critical
        .map((line) => `${line.variant.sku} (${line.daysOfCover}d)`)
        .slice(0, 3)
        .join(', ')}. Place the order now.`,
      count: critical.length,
      route: 'catalog',
      query: { status: 'reorder' },
      action: 'Review SKUs',
    })
  }

  const low = lines.filter((line) => coverBand(line) === 'low')
  if (low.length > 0) {
    list.push({
      id: 'reorder-soon',
      severity: 'warn',
      title: `${pluralise(low.length, 'SKU')} with under a month of cover`,
      detail: 'Not urgent yet. Worth folding into the next order to the garden rather than a second shipment.',
      count: low.length,
      route: 'catalog',
      query: { status: 'reorder' },
      action: 'Review SKUs',
    })
  }

  /* ── Lots against the calendar ── */
  const expired = ops.lots.filter((lot) => {
    const left = daysUntil(lot.bestBefore, now)
    return lot.units > 0 && left !== null && left < 0
  })
  if (expired.length > 0) {
    list.push({
      id: 'expired',
      severity: 'critical',
      title: `${pluralise(expired.length, 'lot')} past best-before`,
      detail: `${expired.reduce((sum, lot) => sum + lot.units, 0)} packs are still counted as sellable stock. Write them off so cover figures stop counting them.`,
      count: expired.length,
      route: 'inventory',
      query: { window: '30' },
      action: 'Open lots',
    })
  }

  const expiring = ops.lots.filter((lot) => {
    const left = daysUntil(lot.bestBefore, now)
    return lot.units > 0 && left !== null && left >= 0 && left <= 90
  })
  if (expiring.length > 0) {
    list.push({
      id: 'expiring',
      severity: 'warn',
      title: `${pluralise(expiring.length, 'lot')} expiring within 90 days`,
      detail: `${expiring.reduce((sum, lot) => sum + lot.units, 0)} packs. Sell these first — FIFO order on the Inventory screen already puts them at the top.`,
      count: expiring.length,
      route: 'inventory',
      query: { window: '90' },
      action: 'Open lots',
    })
  }

  /* ── Data that does not add up ── */
  const mismatched = checkIntegrity(orders)
  if (mismatched.length > 0) {
    list.push({
      id: 'integrity',
      severity: 'warn',
      title: `${pluralise(mismatched.length, 'order')} with a total that does not recompute`,
      detail: 'The stored total disagrees with the current pricing rules. Check them before trusting revenue for the period.',
      count: mismatched.length,
      route: 'settings',
      action: 'Inspect',
    })
  }

  const comingSoon = PRODUCTS.filter((product) => product.status === 'coming-soon')
  if (comingSoon.length > 0) {
    list.push({
      id: 'unpriced',
      severity: 'info',
      title: `${pluralise(comingSoon.length, 'tea')} still unpriced`,
      detail: `${comingSoon.map((product) => product.name).join(' and ')} cannot be bought until a price and stock are set in the storefront catalogue.`,
      count: comingSoon.length,
      route: 'catalog',
      query: { status: 'coming-soon' },
      action: 'Open catalog',
    })
  }

  return list.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.count - a.count)
}

/** The bell counts things that need doing — informational rows are not a task. */
export const actionableCount = (list: Exception[]): number =>
  list.filter((entry) => entry.severity !== 'info').length
