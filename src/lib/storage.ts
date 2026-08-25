/* ────────────────────────────────────────────────────────────────────────────
 * Reading the storefront's localStorage.
 *
 * Two honesty rules govern this file:
 *
 * 1. Every value is user-editable, so nothing is trusted. A record that fails
 *    its shape check is dropped and counted — the Data page reports how many,
 *    rather than letting a malformed row quietly skew revenue.
 * 2. The dashboard NEVER writes to a storefront key as a side effect. Demo data
 *    goes to its own `elegant_sip_dash_*` namespace, as does fulfilment status,
 *    which the storefront has no concept of. The single deliberate exception is
 *    review moderation on the Reviews page, which asks first.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import type { Review } from '@storefront/data/products'
import type { ShippingMethodId } from '@storefront/lib/pricing'

export const STOREFRONT_KEYS = {
  orders: 'elegant_sip_orders',
  reviews: 'elegant_sip_reviews',
  subscribers: 'elegant_sip_subscribers',
  user: 'elegant_sip_user',
  cart: 'elegant_sip_cart',
  wishlist: 'elegant_sip_wishlist',
  coupon: 'elegant_sip_coupon',
  consent: 'elegant_sip_consent',
  orderNotes: 'elegant_sip_order_notes',
} as const

/** The dashboard's own namespace — never read by the storefront. */
export const DASHBOARD_KEYS = {
  demoOrders: 'elegant_sip_dash_demo_orders',
  demoReviews: 'elegant_sip_dash_demo_reviews',
  demoSubscribers: 'elegant_sip_dash_demo_subscribers',
  fulfilment: 'elegant_sip_dash_fulfilment',
  mode: 'elegant_sip_dash_mode',
  /** Interface preferences — row density, collapsed rail. See preferences.ts. */
  preferences: 'elegant_sip_dash_prefs',
  /** Operational fields the storefront's catalogue has no place for: SKUs, tea
      type, wholesale prices, MOQ and lots. See ops.ts. */
  ops: 'elegant_sip_dash_ops',
} as const

export type ReviewStore = Record<string, Review[]>

export interface ReadResult<T> {
  value: T
  /** Records present in storage but rejected by the shape check. */
  rejected: number
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Private mode or storage disabled entirely.
    return null
  }
}

function parse(key: string): unknown {
  const raw = readRaw(key)
  if (!raw) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const SHIPPING_IDS: ShippingMethodId[] = ['standard', 'express']

function isOrderItem(value: unknown): boolean {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && typeof value.name === 'string'
}

/**
 * A record counts as an order when it has an identity (number), a date, and a
 * line-item array. Money fields are coerced rather than required: an order
 * written by an older build may be missing `discount`, and dropping a real
 * order over a missing zero would understate revenue.
 */
export function toOrder(value: unknown): PlacedOrder | null {
  if (!isRecord(value)) return null
  if (typeof value.number !== 'string' || typeof value.date !== 'string') return null
  if (!Array.isArray(value.items) || !value.items.every(isOrderItem)) return null
  const method = value.shippingMethod
  return {
    number: value.number,
    date: value.date,
    items: value.items.map((item) => {
      const line = item as Record<string, unknown>
      return {
        id: String(line.id),
        size: typeof line.size === 'string' ? line.size : '',
        name: String(line.name),
        price: num(line.price),
        imageSrc: typeof line.imageSrc === 'string' ? line.imageSrc : '',
        quantity: Math.max(1, Math.round(num(line.quantity)) || 1),
      }
    }),
    subtotal: num(value.subtotal),
    discount: num(value.discount),
    coupon: typeof value.coupon === 'string' ? value.coupon : null,
    shippingFee: num(value.shippingFee),
    tax: num(value.tax),
    total: num(value.total),
    shippingMethod: SHIPPING_IDS.includes(method as ShippingMethodId)
      ? (method as ShippingMethodId)
      : 'standard',
    email: typeof value.email === 'string' ? value.email : '',
    name: typeof value.name === 'string' ? value.name : '',
    address: typeof value.address === 'string' ? value.address : '',
    city: typeof value.city === 'string' ? value.city : '',
    zip: typeof value.zip === 'string' ? value.zip : '',
    country: typeof value.country === 'string' ? value.country : '',
    ...(typeof value.notes === 'string' && value.notes ? { notes: value.notes } : {}),
  }
}

export function readOrders(key: string): ReadResult<PlacedOrder[]> {
  const parsed = parse(key)
  if (!Array.isArray(parsed)) return { value: [], rejected: 0 }
  const value: PlacedOrder[] = []
  let rejected = 0
  const seen = new Set<string>()
  for (const entry of parsed) {
    const order = toOrder(entry)
    // A duplicate order number would double-count revenue and make the order
    // page ambiguous, so later duplicates are rejected, not merged.
    if (!order || seen.has(order.number)) {
      rejected += 1
      continue
    }
    seen.add(order.number)
    value.push(order)
  }
  return { value, rejected }
}

function isReview(value: unknown): value is Review {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.author === 'string' &&
    typeof value.text === 'string' &&
    typeof value.date === 'string' &&
    typeof value.rating === 'number' &&
    value.rating >= 1 &&
    value.rating <= 5
  )
}

export function readReviews(key: string): ReadResult<ReviewStore> {
  const parsed = parse(key)
  if (!isRecord(parsed)) return { value: {}, rejected: 0 }
  const value: ReviewStore = {}
  let rejected = 0
  for (const [productId, list] of Object.entries(parsed)) {
    if (!Array.isArray(list)) {
      rejected += 1
      continue
    }
    const valid = list.filter(isReview)
    rejected += list.length - valid.length
    if (valid.length > 0) value[productId] = valid
  }
  return { value, rejected }
}

export function readSubscribers(key: string): ReadResult<string[]> {
  const parsed = parse(key)
  if (!Array.isArray(parsed)) return { value: [], rejected: 0 }
  const value = parsed.filter((entry): entry is string => typeof entry === 'string' && entry.includes('@'))
  return { value: [...new Set(value)], rejected: parsed.length - value.length }
}

export function readUser(): { name: string; email: string } | null {
  const parsed = parse(STOREFRONT_KEYS.user)
  if (!isRecord(parsed)) return null
  const { name, email } = parsed
  return typeof name === 'string' && typeof email === 'string' ? { name, email } : null
}

export function readStringArray(key: string): string[] {
  const parsed = parse(key)
  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
}

/** Approximate footprint of one key, in bytes — shown on the Data page. */
export function keyBytes(key: string): number {
  const raw = readRaw(key)
  return raw ? new Blob([raw]).size : 0
}

export const keyExists = (key: string): boolean => readRaw(key) !== null

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded, or storage disabled. Callers surface this as a toast
    // rather than pretending the write landed.
    return false
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to clean up if storage is unavailable */
  }
}
