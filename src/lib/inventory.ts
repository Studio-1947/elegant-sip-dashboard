/* ────────────────────────────────────────────────────────────────────────────
 * Stock, as an operations question rather than a catalogue one.
 *
 * The storefront answers "can I buy this?" with a single number per variant.
 * The back office has to answer three harder ones:
 *
 *   How long will this last?      → days of cover, not raw units
 *   What do I sell first?         → FIFO across lots
 *   What is about to be worthless? → best-before, per lot
 *
 * "47 units" is not actionable on its own. Forty-seven units of a tea that
 * moves twice a month is nearly a year of cover; forty-seven of the one that
 * moves daily is a fortnight, and only one of those is a reorder. So the unit
 * of measure on every stock screen is DAYS, with the raw count secondary.
 *
 * Velocity is measured over a trailing window of real orders. When a tea has
 * never sold, cover is `null` — not Infinity, and certainly not a large number
 * that would look like comfort.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import { PRODUCTS, type Product } from '@storefront/data/products'
import { variantKey, type Lot, type OpsStore, type VariantOps } from './ops'
import { parseDate } from './format'

/** Long enough to survive a quiet week, short enough to notice a trend turn. */
export const VELOCITY_WINDOW_DAYS = 30

export interface StockLine {
  key: string
  variant: VariantOps
  product: Product
  /** Lots holding this variant, oldest first — the order to sell them in. */
  lots: Lot[]
  /** Sum of lot units. The figure the office stands behind. */
  onHand: number
  /** What the storefront currently publishes, for comparison. */
  catalogueStock: number
  /** Units per day over the trailing window. */
  velocity: number
  /** Days until `onHand` runs out, or null when it has never sold. */
  daysOfCover: number | null
  /** Best-before of the lot that will expire first. */
  nearestBestBefore: string | null
  retailPrice: number
}

export type CoverBand = 'out' | 'critical' | 'low' | 'healthy' | 'unsold'

/**
 * Bands, so a table can be scanned rather than read. The thresholds are a
 * judgement about tea logistics: a Darjeeling reorder is a phone call to a
 * garden and a fortnight of shipping, so two weeks of cover is already late.
 */
export function coverBand(line: StockLine): CoverBand {
  if (line.onHand <= 0) return 'out'
  if (line.daysOfCover === null) return 'unsold'
  if (line.daysOfCover <= 14) return 'critical'
  if (line.daysOfCover <= 30) return 'low'
  return 'healthy'
}

export const COVER_LABEL: Record<CoverBand, string> = {
  out: 'Out of stock',
  critical: 'Reorder now',
  low: 'Reorder soon',
  healthy: 'Healthy',
  unsold: 'Never sold',
}

export const COVER_DOT: Record<CoverBand, string> = {
  out: 'bg-critical',
  critical: 'bg-critical',
  low: 'bg-warn',
  healthy: 'bg-good',
  unsold: 'bg-n-400',
}

/** Units sold per variant key, per day, across the trailing window. */
export function velocityByVariant(orders: PlacedOrder[], now: Date): Map<string, number> {
  const cutoff = now.getTime() - VELOCITY_WINDOW_DAYS * 86_400_000
  const units = new Map<string, number>()

  for (const order of orders) {
    const placed = parseDate(order.date)
    if (!placed || placed.getTime() < cutoff) continue
    for (const item of order.items) {
      const key = variantKey(item.id, item.size)
      units.set(key, (units.get(key) ?? 0) + item.quantity)
    }
  }

  const perDay = new Map<string, number>()
  for (const [key, total] of units) perDay.set(key, total / VELOCITY_WINDOW_DAYS)
  return perDay
}

export function stockLines(ops: OpsStore, orders: PlacedOrder[], now: Date): StockLine[] {
  const velocity = velocityByVariant(orders, now)
  const lotsByKey = new Map<string, Lot[]>()
  for (const lot of ops.lots) {
    const list = lotsByKey.get(lot.key)
    if (list) list.push(lot)
    else lotsByKey.set(lot.key, [lot])
  }

  const lines: StockLine[] = []
  for (const product of PRODUCTS) {
    for (const variant of product.variants) {
      const key = variantKey(product.id, variant.size)
      const ops_ = ops.variants[key]
      if (!ops_) continue

      // FIFO: oldest arrival first. Ties break on lot code so the order is
      // stable between renders rather than dependent on insertion.
      const lots = (lotsByKey.get(key) ?? [])
        .slice()
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.code.localeCompare(b.code))

      const onHand = lots.reduce((sum, lot) => sum + lot.units, 0)
      const perDay = velocity.get(key) ?? 0
      const dated = lots.filter((lot) => lot.units > 0 && lot.bestBefore)

      lines.push({
        key,
        variant: ops_,
        product,
        lots,
        onHand,
        catalogueStock: variant.stock,
        velocity: perDay,
        daysOfCover: perDay > 0 ? Math.floor(onHand / perDay) : null,
        nearestBestBefore:
          dated.length > 0
            ? dated.reduce((soonest, lot) => (lot.bestBefore < soonest ? lot.bestBefore : soonest), dated[0].bestBefore)
            : null,
        retailPrice: variant.price,
      })
    }
  }

  return lines
}

/** Days until a date, negative once it has passed. */
export function daysUntil(iso: string, now: Date): number | null {
  const date = parseDate(iso)
  if (!date) return null
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000)
}

/** Lots whose best-before falls inside `days` — including ones already past. */
export function expiringLots(ops: OpsStore, now: Date, days = 90): Lot[] {
  return ops.lots
    .filter((lot) => {
      if (lot.units <= 0) return false
      const left = daysUntil(lot.bestBefore, now)
      return left !== null && left <= days
    })
    .sort((a, b) => a.bestBefore.localeCompare(b.bestBefore))
}
