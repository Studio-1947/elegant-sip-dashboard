/* ────────────────────────────────────────────────────────────────────────────
 * Fulfilment stage — the dashboard's own field.
 *
 * `PlacedOrder` has no status: the storefront never had anywhere to put one.
 * Rather than write a new field into the storefront's order records (which the
 * storefront would then have to tolerate on read), the stage lives in a
 * separate dashboard key, joined by order number.
 *
 * This is a local operational note, not a shipping integration — nothing here
 * emails the customer or tells the storefront anything. The Orders page says so.
 * ──────────────────────────────────────────────────────────────────────────── */

import { DASHBOARD_KEYS, writeJson } from './storage'

export type Stage = 'new' | 'packed' | 'shipped' | 'delivered' | 'cancelled'

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Received, not yet packed' },
  { id: 'packed', label: 'Packed', hint: 'Weighed and sealed, awaiting pickup' },
  { id: 'shipped', label: 'Shipped', hint: 'Handed to the courier' },
  { id: 'delivered', label: 'Delivered', hint: 'Confirmed with the customer' },
  { id: 'cancelled', label: 'Cancelled', hint: 'Not fulfilled' },
]

const STAGE_IDS = STAGES.map((stage) => stage.id)

export const isStage = (value: unknown): value is Stage =>
  typeof value === 'string' && STAGE_IDS.includes(value as Stage)

export interface StageEntry {
  stage: Stage
  updatedAt: string
}

export type FulfilmentStore = Record<string, StageEntry>

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Storage disabled (private mode); no stages recorded is the honest answer.
    return null
  }
}

export function readFulfilment(): FulfilmentStore {
  const raw = readRaw(DASHBOARD_KEYS.fulfilment)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const clean: FulfilmentStore = {}
    for (const [number, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null) continue
      const { stage, updatedAt } = entry as Record<string, unknown>
      if (!isStage(stage)) continue
      clean[number] = { stage, updatedAt: typeof updatedAt === 'string' ? updatedAt : '' }
    }
    return clean
  } catch {
    return {}
  }
}

/** Orders with no recorded stage are New — that is what "just arrived" means. */
export const stageOf = (store: FulfilmentStore, orderNumber: string): Stage =>
  store[orderNumber]?.stage ?? 'new'

export function setStage(store: FulfilmentStore, orderNumber: string, stage: Stage): FulfilmentStore {
  const next: FulfilmentStore = { ...store, [orderNumber]: { stage, updatedAt: new Date().toISOString() } }
  writeJson(DASHBOARD_KEYS.fulfilment, next)
  return next
}

/** Tailwind class for a stage dot. The label always ships beside it — a stage
    is never communicated by colour alone. */
export const stageDotClass = (stage: Stage): string =>
  ({
    new: 'bg-stage-new',
    packed: 'bg-stage-packed',
    shipped: 'bg-stage-shipped',
    delivered: 'bg-stage-delivered',
    cancelled: 'bg-critical',
  })[stage]

export const stageLabel = (stage: Stage): string =>
  STAGES.find((entry) => entry.id === stage)?.label ?? 'New'
