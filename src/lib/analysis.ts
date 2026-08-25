/* ────────────────────────────────────────────────────────────────────────────
 * Aggregations that join orders to the catalogue and to customers.
 *
 * Product revenue here is GOODS revenue – unit price × quantity. It is
 * deliberately not a share of `order.total`: shipping and GST belong to the
 * order, not to any one tea, and apportioning them would invent a number.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import type { Product, Review } from '@storefront/data/products'
import { PRODUCTS } from '@storefront/data/products'
import type { ReviewStore } from './storage'
import { parseDate } from './format'

export interface VariantSales {
  size: string
  units: number
  revenue: number
}

export interface ProductPerformance {
  product: Product
  units: number
  revenue: number
  /** Orders containing this product – not line count. */
  orders: number
  variants: VariantSales[]
  lastSold: string | null
  /** Share of total goods revenue, 0–1. */
  share: number
  rating: { average: number; count: number }
}

export interface OrphanLine {
  id: string
  name: string
  units: number
  revenue: number
}

export interface ProductBreakdown {
  performance: ProductPerformance[]
  /** Sold lines whose product id is no longer in the catalogue. */
  orphans: OrphanLine[]
  goodsRevenue: number
}

export function ratingFor(store: ReviewStore, productId: string): { average: number; count: number } {
  const list: Review[] = store[productId] ?? []
  if (list.length === 0) return { average: 0, count: 0 }
  const average = list.reduce((sum, review) => sum + review.rating, 0) / list.length
  return { average: Math.round(average * 10) / 10, count: list.length }
}

export function productBreakdown(orders: PlacedOrder[], reviews: ReviewStore): ProductBreakdown {
  const rows = new Map<string, ProductPerformance>()
  for (const product of PRODUCTS) {
    rows.set(product.id, {
      product,
      units: 0,
      revenue: 0,
      orders: 0,
      variants: product.variants.map((variant) => ({ size: variant.size, units: 0, revenue: 0 })),
      lastSold: null,
      share: 0,
      rating: ratingFor(reviews, product.id),
    })
  }

  const orphans = new Map<string, OrphanLine>()
  let goodsRevenue = 0

  for (const order of orders) {
    const counted = new Set<string>()
    for (const item of order.items) {
      const value = item.price * item.quantity
      goodsRevenue += value
      const row = rows.get(item.id)
      if (!row) {
        // A line for a product that has since left the catalogue. It still
        // happened, so it is reported rather than dropped.
        const orphan = orphans.get(item.id) ?? { id: item.id, name: item.name, units: 0, revenue: 0 }
        orphan.units += item.quantity
        orphan.revenue += value
        orphans.set(item.id, orphan)
        continue
      }
      row.units += item.quantity
      row.revenue += value
      if (!counted.has(item.id)) {
        row.orders += 1
        counted.add(item.id)
      }
      const variant = row.variants.find((entry) => entry.size === item.size)
      if (variant) {
        variant.units += item.quantity
        variant.revenue += value
      } else {
        row.variants.push({ size: item.size || 'Unspecified', units: item.quantity, revenue: value })
      }
      const date = parseDate(order.date)
      const previous = row.lastSold ? parseDate(row.lastSold) : null
      if (date && (!previous || date > previous)) row.lastSold = order.date
    }
  }

  const performance = [...rows.values()]
  for (const row of performance) row.share = goodsRevenue === 0 ? 0 : row.revenue / goodsRevenue

  performance.sort((a, b) => b.revenue - a.revenue || a.product.name.localeCompare(b.product.name))
  return { performance, orphans: [...orphans.values()], goodsRevenue }
}

export interface CustomerRecord {
  email: string
  name: string
  orders: number
  spend: number
  units: number
  firstOrder: string
  lastOrder: string
  city: string
  orderNumbers: string[]
}

/**
 * Customers are grouped by lower-cased email, which is the only stable identity
 * a demo checkout collects. Two people sharing a device and an address but not
 * an email are two customers here; that is the honest reading of the data.
 */
export function customerBreakdown(orders: PlacedOrder[]): CustomerRecord[] {
  const rows = new Map<string, CustomerRecord>()
  for (const order of orders) {
    const email = order.email.trim().toLowerCase()
    if (!email) continue
    const existing = rows.get(email)
    const units = order.items.reduce((sum, item) => sum + item.quantity, 0)
    if (!existing) {
      rows.set(email, {
        email,
        name: order.name || '',
        orders: 1,
        spend: order.total,
        units,
        firstOrder: order.date,
        lastOrder: order.date,
        city: order.city || '',
        orderNumbers: [order.number],
      })
      continue
    }
    existing.orders += 1
    existing.spend += order.total
    existing.units += units
    existing.orderNumbers.push(order.number)
    const date = parseDate(order.date)
    const first = parseDate(existing.firstOrder)
    const last = parseDate(existing.lastOrder)
    if (date && (!last || date > last)) {
      existing.lastOrder = order.date
      // The most recent order carries the current name and city.
      if (order.name) existing.name = order.name
      if (order.city) existing.city = order.city
    }
    if (date && (!first || date < first)) existing.firstOrder = order.date
  }
  return [...rows.values()].sort((a, b) => b.spend - a.spend)
}

export interface ReviewRow {
  productId: string
  productName: string
  review: Review
}

export function flattenReviews(store: ReviewStore): ReviewRow[] {
  const rows: ReviewRow[] = []
  for (const [productId, list] of Object.entries(store)) {
    const product = PRODUCTS.find((entry) => entry.id === productId)
    for (const review of list) {
      rows.push({ productId, productName: product?.name ?? `Unknown product (${productId})`, review })
    }
  }
  return rows
}

/** Counts for ratings 1–5, index 0 = one star. */
export function ratingDistribution(rows: ReviewRow[]): number[] {
  const counts = [0, 0, 0, 0, 0]
  for (const row of rows) {
    const index = Math.min(5, Math.max(1, Math.round(row.review.rating))) - 1
    counts[index] += 1
  }
  return counts
}
