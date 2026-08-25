/* ────────────────────────────────────────────────────────────────────────────
 * The demo dataset.
 *
 * A dashboard with no orders in it teaches you nothing about the dashboard, so
 * this generates a plausible 90 days of trade. Three rules keep it honest:
 *
 * 1. It is written to `elegant_sip_dash_demo_*`, never to the storefront's own
 *    keys, so it cannot leak into the customer-facing order history.
 * 2. Every record is self-identifying: order numbers start `ES-DEMO-`, and all
 *    email addresses use example.com, the RFC 2606 reserved domain.
 * 3. The money is real arithmetic — prices come from the live catalogue and
 *    totals run through the storefront's own getOrderPricing, so GST, the
 *    ₹4,000 free-shipping threshold and coupon discounts behave exactly as they
 *    would in a genuine order.
 *
 * The generator is seeded, so the same `now` always yields the same dataset —
 * reloading the page must not silently redraw yesterday's revenue.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { PlacedOrder } from '@storefront/lib/orders'
import type { Review } from '@storefront/data/products'
import { PRODUCTS } from '@storefront/data/products'
import { getOrderPricing, type ShippingMethodId } from '@storefront/lib/pricing'
import type { ReviewStore } from './storage'

export interface DemoDataset {
  orders: PlacedOrder[]
  reviews: ReviewStore
  subscribers: string[]
}

/** mulberry32 — small, fast, and deterministic from a fixed seed. */
function makeRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PEOPLE = [
  ['Ananya Bose', 'Kolkata', '700019'],
  ['Rohan Mehta', 'Mumbai', '400050'],
  ['Priya Nair', 'Bengaluru', '560034'],
  ['Imtiaz Alam', 'Hyderabad', '500034'],
  ['Sneha Rao', 'Pune', '411001'],
  ['Vikram Sethi', 'New Delhi', '110016'],
  ['Meera Iyer', 'Chennai', '600020'],
  ['Arjun Gurung', 'Darjeeling', '734101'],
  ['Farah Qureshi', 'Lucknow', '226001'],
  ['Deepak Rana', 'Siliguri', '734001'],
  ['Kavya Menon', 'Kochi', '682016'],
  ['Tashi Lama', 'Gangtok', '737101'],
  ['Nilanjana Ghosh', 'Kolkata', '700029'],
  ['Sameer Kulkarni', 'Nagpur', '440010'],
  ['Ritu Chawla', 'Chandigarh', '160009'],
  ['Joseph Thomas', 'Thiruvananthapuram', '695001'],
]

const STREETS = [
  '12 Lake Terrace',
  '4B Gariahat Road',
  '88 Hill Cart Road',
  '221 Linking Road',
  '17 Residency Road',
  '9 Model Town',
  '35 Chowringhee Lane',
  '6 Nehru Marg',
]

const NOTES = [
  'Please pack the tins separately — this is a gift.',
  'Leave with the building security if I am out.',
  'Would love a brewing card in the parcel if you have one.',
]

const REVIEW_TEXTS = [
  'Bright and clean in the cup — exactly the spring character I was hoping for. Brewed it a minute shorter than the card suggests and it opened up beautifully.',
  'Arrived quickly and well sealed. The aroma when the packet opens is the best part; the second steep is nearly as good as the first.',
  'Good everyday Darjeeling. Takes a splash of milk without falling apart, which is what I wanted it for.',
  'Delicate — you have to pay attention to the water temperature or it goes flat. Worth the care.',
  'Reordering. Nothing at this price locally comes close to it.',
]

/** Active, purchasable variants only — a demo order for a coming-soon tea at ₹0
    would contradict the catalogue's own rule that it cannot be bought. */
function sellableLines() {
  return PRODUCTS.filter((product) => product.status !== 'coming-soon').flatMap((product) =>
    product.variants
      .filter((variant) => variant.stock > 0 && variant.price > 0)
      .map((variant) => ({ product, variant })),
  )
}

const pick = <T,>(random: () => number, list: T[]): T => list[Math.floor(random() * list.length)]

export function buildDemoDataset(now: Date, orderCount = 64): DemoDataset {
  const random = makeRandom(0x5eed_71a)
  const catalogue = sellableLines()
  const orders: PlacedOrder[] = []

  for (let index = 0; index < orderCount; index += 1) {
    // Skew towards recent days so the trend line has a shape rather than noise.
    const daysAgo = Math.floor(Math.pow(random(), 1.6) * 90)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(8 + Math.floor(random() * 12), Math.floor(random() * 60), 0, 0)

    const [name, city, zip] = pick(random, PEOPLE)
    const lineCount = 1 + Math.floor(random() * 3)
    const items: PlacedOrder['items'] = []
    for (let line = 0; line < lineCount; line += 1) {
      const { product, variant } = pick(random, catalogue)
      if (items.some((entry) => entry.id === product.id && entry.size === variant.size)) continue
      items.push({
        id: product.id,
        size: variant.size,
        name: product.name,
        price: variant.price,
        imageSrc: product.imageSrc,
        quantity: 1 + Math.floor(random() * 3),
      })
    }
    if (items.length === 0) continue

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const coupon = random() < 0.22 ? (random() < 0.5 ? 'SIP10' : 'WELCOME10') : null
    const discount = coupon ? Math.round(subtotal * 0.1) : 0
    const shippingMethod: ShippingMethodId = random() < 0.25 ? 'express' : 'standard'
    const { shippingFee, estimatedTax, finalTotal } = getOrderPricing(subtotal, discount, shippingMethod)
    const notes = random() < 0.2 ? pick(random, NOTES) : undefined

    orders.push({
      number: `ES-DEMO-${String(1000 + index)}`,
      date: date.toISOString(),
      items,
      subtotal,
      discount,
      coupon,
      shippingFee,
      tax: estimatedTax,
      total: finalTotal,
      shippingMethod,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`,
      name,
      address: pick(random, STREETS),
      city,
      zip,
      country: 'India',
      ...(notes ? { notes } : {}),
    })
  }

  orders.sort((a, b) => b.date.localeCompare(a.date))

  /* Reviews only for teas the demo customers actually bought, so the
     "Verified purchase" badge means the same thing it means on the storefront. */
  const purchased = [...new Set(orders.flatMap((order) => order.items.map((item) => item.id)))]
  const reviews: ReviewStore = {}
  purchased.forEach((productId, productIndex) => {
    const count = 1 + Math.floor(random() * 4)
    const list: Review[] = []
    for (let index = 0; index < count; index += 1) {
      const [author] = pick(random, PEOPLE)
      const date = new Date(now)
      date.setDate(date.getDate() - Math.floor(random() * 80))
      list.push({
        id: `demo-${productId}-${productIndex}-${index}`,
        author,
        rating: random() < 0.68 ? 5 : random() < 0.7 ? 4 : 3,
        text: pick(random, REVIEW_TEXTS),
        date: date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        verified: true,
      })
    }
    reviews[productId] = list
  })

  const subscribers = PEOPLE.slice(0, 11).map(
    ([name]) => `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@example.com`,
  )

  return { orders, reviews, subscribers }
}
