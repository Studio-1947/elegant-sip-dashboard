/* ────────────────────────────────────────────────────────────────────────────
 * Order analytics – pure functions over PlacedOrder[], so they are unit
 * testable and hold no opinion about where the orders came from.
 *
 * Revenue means `order.total`: goods, minus discount, plus shipping, plus GST 
 * the amount actually charged. Every tile that means something narrower says so
 * in its label (Goods, GST collected, Shipping charged).
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import { getOrderPricing } from '@storefront/lib/pricing'
import { dayKey, parseDate } from './format'

export type RangeId = '7d' | '30d' | '90d' | 'all'

export const RANGES: { id: RangeId; label: string; days: number | null }[] = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
]

export interface Totals {
  orders: number
  revenue: number
  goods: number
  discount: number
  shipping: number
  tax: number
  units: number
  averageOrderValue: number
}

export interface DayPoint {
  key: string
  revenue: number
  orders: number
  units: number
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

/** Inclusive window start for a range, or null for "all time". */
export function rangeStart(range: RangeId, now: Date): Date | null {
  const days = RANGES.find((entry) => entry.id === range)?.days
  if (!days) return null
  const start = startOfDay(now)
  start.setDate(start.getDate() - (days - 1))
  return start
}

export function withinRange(order: PlacedOrder, from: Date | null, to: Date | null): boolean {
  const date = parseDate(order.date)
  if (!date) return false
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

export function filterByRange(orders: PlacedOrder[], range: RangeId, now: Date): PlacedOrder[] {
  const from = rangeStart(range, now)
  return orders.filter((order) => withinRange(order, from, null))
}

/**
 * The equally-long window immediately before the current one, used for the
 * "vs previous period" deltas. All-time has no previous period, by definition.
 */
export function previousPeriod(orders: PlacedOrder[], range: RangeId, now: Date): PlacedOrder[] | null {
  const days = RANGES.find((entry) => entry.id === range)?.days
  if (!days) return null
  const currentStart = rangeStart(range, now)
  if (!currentStart) return null
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - days)
  return orders.filter((order) => withinRange(order, previousStart, currentStart))
}

export const unitsIn = (order: PlacedOrder): number =>
  order.items.reduce((sum, item) => sum + item.quantity, 0)

export function summarise(orders: PlacedOrder[]): Totals {
  const totals = orders.reduce<Totals>(
    (acc, order) => ({
      orders: acc.orders + 1,
      revenue: acc.revenue + order.total,
      goods: acc.goods + order.subtotal,
      discount: acc.discount + order.discount,
      shipping: acc.shipping + order.shippingFee,
      tax: acc.tax + order.tax,
      units: acc.units + unitsIn(order),
      averageOrderValue: 0,
    }),
    { orders: 0, revenue: 0, goods: 0, discount: 0, shipping: 0, tax: 0, units: 0, averageOrderValue: 0 },
  )
  totals.averageOrderValue = totals.orders === 0 ? 0 : Math.round(totals.revenue / totals.orders)
  return totals
}

/**
 * Percentage change, or null when there is no baseline to compare against.
 * Returning null rather than 0 or 100 matters: "no previous orders" is not the
 * same claim as "flat", and the tile renders the two differently.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * One point per calendar day across the whole window – including days with no
 * orders. Skipping empty days would draw a line that implies steady trade
 * through a quiet week.
 */
export function dailySeries(orders: PlacedOrder[], range: RangeId, now: Date): DayPoint[] {
  const buckets = new Map<string, DayPoint>()
  const dated = orders
    .map((order) => ({ order, date: parseDate(order.date) }))
    .filter((entry): entry is { order: PlacedOrder; date: Date } => entry.date !== null)

  const from = rangeStart(range, now) ?? (dated.length ? startOfDay(new Date(Math.min(...dated.map((e) => e.date.getTime())))) : startOfDay(now))
  const to = startOfDay(now)

  for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    buckets.set(dayKey(cursor), { key: dayKey(cursor), revenue: 0, orders: 0, units: 0 })
  }

  for (const { order, date } of dated) {
    const bucket = buckets.get(dayKey(date))
    if (!bucket) continue
    bucket.revenue += order.total
    bucket.orders += 1
    bucket.units += unitsIn(order)
  }

  return [...buckets.values()]
}

/** Bucket order counts by weekday, Monday first – reads better for a tea shop. */
export function byWeekday(orders: PlacedOrder[]): { label: string; orders: number; revenue: number }[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const buckets = labels.map((label) => ({ label, orders: 0, revenue: 0 }))
  for (const order of orders) {
    const date = parseDate(order.date)
    if (!date) continue
    const index = (date.getDay() + 6) % 7
    buckets[index].orders += 1
    buckets[index].revenue += order.total
  }
  return buckets
}

export interface IntegrityIssue {
  number: string
  storedTotal: number
  expectedTotal: number
}

/**
 * Re-run the storefront's own pricing over each order and compare. Because
 * orders live in editable localStorage, a mismatch means the record was hand
 * -edited or written by a build with different rates – either way the figure
 * should not silently feed a revenue chart. Surfaced on the Data page.
 */
export function checkIntegrity(orders: PlacedOrder[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  for (const order of orders) {
    const goods = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const { finalTotal } = getOrderPricing(goods, order.discount, order.shippingMethod)
    if (finalTotal !== order.total) {
      issues.push({ number: order.number, storedTotal: order.total, expectedTotal: finalTotal })
    }
  }
  return issues
}

export function couponUsage(orders: PlacedOrder[]): { code: string; orders: number; discount: number }[] {
  const buckets = new Map<string, { code: string; orders: number; discount: number }>()
  for (const order of orders) {
    if (!order.coupon) continue
    const entry = buckets.get(order.coupon) ?? { code: order.coupon, orders: 0, discount: 0 }
    entry.orders += 1
    entry.discount += order.discount
    buckets.set(order.coupon, entry)
  }
  return [...buckets.values()].sort((a, b) => b.orders - a.orders)
}
