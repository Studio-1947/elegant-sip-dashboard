/* ────────────────────────────────────────────────────────────────────────────
 * The operations overlay.
 *
 * The storefront's `Product` knows what a customer needs to know: name, price,
 * tasting notes, a stock number. It has no SKU, no weight as a number, no trade
 * price, no minimum order quantity, and no concept of a LOT — which is the unit
 * tea is actually bought, stored and sold out of. A shop can ship without those.
 * A back office cannot.
 *
 * Rather than fork the catalogue — the one thing this app has always refused to
 * do — those fields live here, in the dashboard's own namespace, joined to the
 * storefront's records by id. It is the same move `fulfilment.ts` already makes
 * for order stages, for the same reason: the storefront should not have to
 * tolerate fields it never asked for.
 *
 * TWO HONESTY RULES apply, and the UI enforces both:
 *
 * 1. This data is dashboard-owned, and every screen that shows it says so. A
 *    lot code here is a note this office keeps, not a fact the shop agrees to.
 * 2. The seed is DERIVED, never invented from nothing. SKUs are built from the
 *    catalogue's own ids and sizes, lots split the catalogue's own stock
 *    figures, and gardens come from `product.origin.estate`. Nothing in here
 *    claims a quantity the storefront does not already claim.
 * ──────────────────────────────────────────────────────────────────────────── */

import { PRODUCTS, type Product, type ProductVariant } from '@storefront/data/products'
import { DASHBOARD_KEYS, writeJson } from './storage'

/** The spec's category vocabulary. The catalogue is six Darjeelings, so every
    one of them seeds as `black` — the field exists for when it stops being. */
export type TeaType = 'black' | 'green' | 'oolong' | 'white' | 'herbal' | 'chai'

export const TEA_TYPES: { id: TeaType; label: string }[] = [
  { id: 'black', label: 'Black' },
  { id: 'green', label: 'Green' },
  { id: 'oolong', label: 'Oolong' },
  { id: 'white', label: 'White' },
  { id: 'herbal', label: 'Herbal' },
  { id: 'chai', label: 'Chai' },
]

export interface VariantOps {
  /** `${productId}::${size}` — the join key back to the catalogue. */
  key: string
  productId: string
  size: string
  /** Human-readable identifier. This, not a 40px photo, leads every row. */
  sku: string
  /** Net weight in grams, pulled out of the size string as a real number. */
  grams: number
  /** Trade price. A separate world from retail: different list, different terms. */
  wholesalePrice: number
  /** Minimum order quantity, wholesale only. */
  moq: number
}

export interface Lot {
  id: string
  /** The variant this lot is stock OF. */
  key: string
  code: string
  harvestYear: number
  garden: string
  /** Arrival date. FIFO order is this, ascending — oldest sells first. */
  receivedAt: string
  bestBefore: string
  units: number
}

export interface OpsStore {
  version: 1
  /** Seed timestamp, so the UI can say how old these figures are. */
  seededAt: string
  teaTypes: Record<string, TeaType>
  variants: Record<string, VariantOps>
  lots: Lot[]
}

export const variantKey = (productId: string, size: string) => `${productId}::${size}`

/* ── SKU ────────────────────────────────────────────────────────────────────
   Built, not stored, so it is stable across a reseed and legible on sight:
   ES-FFWL-CLS-100 is First Flush Whole Leaf, Classic tier, 100g. */

const TIERS: Record<string, string> = { basic: 'BSC', classic: 'CLS', premium: 'PRM' }

export function buildSku(product: Product, variant: ProductVariant): string {
  const stem = product.id
    .split('-')
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4)
  const [tierPart] = variant.size.split('·')
  const tier = TIERS[tierPart.trim().toLowerCase()] ?? 'STD'
  return `ES-${stem}-${tier}-${grams(variant.size)}`
}

/** "Classic · 100 g" → 100. Weight is a number here, not a fragment of a label. */
export function grams(size: string): number {
  const match = /(\d+(?:\.\d+)?)\s*g/i.exec(size)
  return match ? Math.round(Number(match[1])) : 100
}

/* ── Reading ────────────────────────────────────────────────────────────────
   Every value is user-editable localStorage, so nothing is trusted. A record
   that fails its shape check is dropped rather than allowed to skew a count. */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)

const TYPE_IDS = new Set(TEA_TYPES.map((entry) => entry.id))

function toVariantOps(value: unknown): VariantOps | null {
  if (!isRecord(value)) return null
  const key = str(value.key)
  if (!key.includes('::')) return null
  return {
    key,
    productId: str(value.productId, key.split('::')[0]),
    size: str(value.size, key.split('::')[1]),
    sku: str(value.sku),
    grams: Math.max(1, Math.round(num(value.grams, 100))),
    wholesalePrice: Math.max(0, num(value.wholesalePrice)),
    moq: Math.max(1, Math.round(num(value.moq, 1))),
  }
}

function toLot(value: unknown): Lot | null {
  if (!isRecord(value)) return null
  const id = str(value.id)
  const key = str(value.key)
  if (!id || !key.includes('::')) return null
  return {
    id,
    key,
    code: str(value.code, id),
    harvestYear: Math.round(num(value.harvestYear, new Date().getFullYear())),
    garden: str(value.garden, 'Unrecorded'),
    receivedAt: str(value.receivedAt),
    bestBefore: str(value.bestBefore),
    units: Math.max(0, Math.round(num(value.units))),
  }
}

export function readOps(): OpsStore | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(DASHBOARD_KEYS.ops)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null

    const teaTypes: Record<string, TeaType> = {}
    for (const [id, type] of Object.entries(isRecord(parsed.teaTypes) ? parsed.teaTypes : {})) {
      if (typeof type === 'string' && TYPE_IDS.has(type as TeaType)) teaTypes[id] = type as TeaType
    }

    const variants: Record<string, VariantOps> = {}
    for (const entry of Object.values(isRecord(parsed.variants) ? parsed.variants : {})) {
      const variant = toVariantOps(entry)
      if (variant) variants[variant.key] = variant
    }

    const lots = (Array.isArray(parsed.lots) ? parsed.lots : [])
      .map(toLot)
      .filter((lot): lot is Lot => lot !== null)

    return { version: 1, seededAt: str(parsed.seededAt), teaTypes, variants, lots }
  } catch {
    return null
  }
}

export const writeOps = (store: OpsStore): boolean => writeJson(DASHBOARD_KEYS.ops, store)

/* ── Seeding ────────────────────────────────────────────────────────────────
   Derived from the catalogue, deterministic given a date. The lot split is the
   one modelling choice here: catalogue stock is one static number per variant,
   and real stock arrives in batches, so it is halved into an older lot and a
   newer one. That invents no units — the two lots always sum to the figure the
   storefront already publishes. */

const MONTH = 30 * 86_400_000

function harvestYearOf(product: Product, fallback: number): number {
  const match = /(20\d{2})/.exec(product.origin?.harvest ?? product.harvestLabel ?? '')
  return match ? Number(match[1]) : fallback
}

export function buildOpsSeed(now: Date): OpsStore {
  const variants: Record<string, VariantOps> = {}
  const teaTypes: Record<string, TeaType> = {}
  const lots: Lot[] = []

  for (const product of PRODUCTS) {
    teaTypes[product.id] = 'black'
    const garden = product.origin?.estate ?? 'Unrecorded'
    const year = harvestYearOf(product, now.getFullYear())

    product.variants.forEach((variant, index) => {
      const key = variantKey(product.id, variant.size)
      const sku = buildSku(product, variant)
      variants[key] = {
        key,
        productId: product.id,
        size: variant.size,
        sku,
        grams: grams(variant.size),
        // Trade at 60% of retail, rounded to the rupee — a starting list, meant
        // to be edited, not a claim about what anyone has been charged.
        wholesalePrice: Math.round(variant.price * 0.6),
        moq: variant.price >= 1000 ? 6 : 12,
      }

      if (variant.stock <= 0) return

      /* Two lots: one landed a while ago, one recent. Their ages differ per
         variant index so a product's tiers do not all expire on the same day. */
      const older = Math.ceil(variant.stock / 2)
      const newer = variant.stock - older
      const ageMonths = [14, 11, 8][index % 3]

      lots.push({
        id: `${sku}-A`,
        key,
        code: `${garden.slice(0, 3).toUpperCase()}-${year}-${String(index * 2 + 1).padStart(3, '0')}`,
        harvestYear: year,
        garden,
        receivedAt: new Date(now.getTime() - ageMonths * MONTH).toISOString(),
        // Loose-leaf black tea keeps about two years sealed.
        bestBefore: new Date(now.getTime() + (24 - ageMonths) * MONTH).toISOString(),
        units: older,
      })

      if (newer > 0) {
        lots.push({
          id: `${sku}-B`,
          key,
          code: `${garden.slice(0, 3).toUpperCase()}-${year}-${String(index * 2 + 2).padStart(3, '0')}`,
          harvestYear: year,
          garden,
          receivedAt: new Date(now.getTime() - 2 * MONTH).toISOString(),
          bestBefore: new Date(now.getTime() + 22 * MONTH).toISOString(),
          units: newer,
        })
      }
    })
  }

  // FIFO is the storage order, not a sort applied at read time.
  lots.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))

  return { version: 1, seededAt: now.toISOString(), teaTypes, variants, lots }
}
