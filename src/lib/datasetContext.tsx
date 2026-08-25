/* ────────────────────────────────────────────────────────────────────────────
 * The one place that decides what "the data" is.
 *
 * Live mode reads the storefront's own localStorage keys. That only sees real
 * orders when the two apps share an origin – a browser keeps storage per
 * scheme+host+port, so the dashboard on http://localhost/Elegantsip-dashboard/
 * reads the same storage as the shop on http://localhost/Elegantsip/, while the
 * two Vite dev servers on different ports each have their own. The Data page
 * states this outright instead of showing an empty chart and letting you guess.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PlacedOrder } from '@storefront/lib/orders'
import type { Review } from '@storefront/data/products'
import {
  DASHBOARD_KEYS,
  STOREFRONT_KEYS,
  readOrders,
  readReviews,
  readStringArray,
  readSubscribers,
  readUser,
  removeKey,
  writeJson,
  type ReviewStore,
} from './storage'
import { buildDemoDataset } from './demoData'
import {
  readFulfilment,
  restoreStages,
  setStage as persistStage,
  setStages as persistStages,
  type FulfilmentStore,
  type Stage,
  type StageEntry,
} from './fulfilment'
import { buildOpsSeed, readOps, writeOps, type Lot, type OpsStore, type TeaType, type VariantOps } from './ops'

export type DataMode = 'live' | 'demo'

interface Snapshot {
  orders: PlacedOrder[]
  reviews: ReviewStore
  subscribers: string[]
  rejected: { orders: number; reviews: number; subscribers: number }
  /** Live-only signals – the signed-in demo account and its open cart. */
  user: { name: string; email: string } | null
  cartLines: number
  wishlist: string[]
}

interface DatasetValue extends Snapshot {
  mode: DataMode
  setMode: (mode: DataMode) => void
  /** Timestamp the current figures were computed against. */
  now: Date
  refresh: () => void
  demoPresent: boolean
  seedDemo: () => boolean
  clearDemo: () => void
  fulfilment: FulfilmentStore
  /** All of these report whether the write landed – never assume it did. */
  updateStage: (orderNumber: string, stage: Stage) => boolean
  updateStages: (orderNumbers: string[], stage: Stage) => boolean
  /** Puts back exactly what a bulk change replaced. Powers the undo toast. */
  undoStages: (previous: Record<string, StageEntry | undefined>) => boolean
  stageSnapshot: (orderNumbers: string[]) => Record<string, StageEntry | undefined>
  deleteReview: (productId: string, reviewId: string) => boolean
  restoreReview: (productId: string, review: Review, index: number) => boolean

  /* ── The operations overlay (see ops.ts) ── */
  ops: OpsStore
  updateVariantOps: (key: string, patch: Partial<VariantOps>) => boolean
  updateLot: (id: string, patch: Partial<Lot>) => boolean
  setTeaType: (productId: string, type: TeaType) => boolean
  reseedOps: () => boolean
}

const EMPTY: Snapshot = {
  orders: [],
  reviews: {},
  subscribers: [],
  rejected: { orders: 0, reviews: 0, subscribers: 0 },
  user: null,
  cartLines: 0,
  wishlist: [],
}

function readSnapshot(mode: DataMode): Snapshot {
  const keys =
    mode === 'demo'
      ? {
        orders: DASHBOARD_KEYS.demoOrders,
        reviews: DASHBOARD_KEYS.demoReviews,
        subscribers: DASHBOARD_KEYS.demoSubscribers,
      }
      : {
        orders: STOREFRONT_KEYS.orders,
        reviews: STOREFRONT_KEYS.reviews,
        subscribers: STOREFRONT_KEYS.subscribers,
      }

  const orders = readOrders(keys.orders)
  const reviews = readReviews(keys.reviews)
  const subscribers = readSubscribers(keys.subscribers)

  return {
    orders: orders.value,
    reviews: reviews.value,
    subscribers: subscribers.value,
    rejected: { orders: orders.rejected, reviews: reviews.rejected, subscribers: subscribers.rejected },
    // The signed-in visitor and their cart are storefront state; a demo dataset
    // has no business inventing one.
    user: mode === 'live' ? readUser() : null,
    cartLines: mode === 'live' ? readStringArray(STOREFRONT_KEYS.cart).length : 0,
    wishlist: mode === 'live' ? readStringArray(STOREFRONT_KEYS.wishlist) : [],
  }
}

function readMode(): DataMode {
  try {
    return localStorage.getItem(DASHBOARD_KEYS.mode) === 'demo' ? 'demo' : 'live'
  } catch {
    return 'live'
  }
}

const DatasetContext = createContext<DatasetValue | undefined>(undefined)

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(readMode)
  const [now, setNow] = useState(() => new Date())
  const [snapshot, setSnapshot] = useState<Snapshot>(() => (typeof localStorage === 'undefined' ? EMPTY : readSnapshot(readMode())))
  const [fulfilment, setFulfilment] = useState<FulfilmentStore>(readFulfilment)
  const [demoPresent, setDemoPresent] = useState(() => readOrders(DASHBOARD_KEYS.demoOrders).value.length > 0)

  const refresh = useCallback(() => {
    setSnapshot(readSnapshot(mode))
    setFulfilment(readFulfilment())
    setNow(new Date())
  }, [mode])

  const setMode = useCallback((next: DataMode) => {
    setModeState(next)
    try {
      localStorage.setItem(DASHBOARD_KEYS.mode, next)
    } catch {
      /* the session still switches; only the preference fails to stick */
    }
    setSnapshot(readSnapshot(next))
  }, [])

  // A checkout completed in another tab fires `storage` here – so placing a
  // demo order on the storefront updates the dashboard without a manual reload.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && !event.key.startsWith('elegant_sip_')) return
      setSnapshot(readSnapshot(mode))
      setFulfilment(readFulfilment())
      setDemoPresent(readOrders(DASHBOARD_KEYS.demoOrders).value.length > 0)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mode])

  const seedDemo = useCallback((): boolean => {
    const dataset = buildDemoDataset(new Date())
    const ok =
      writeJson(DASHBOARD_KEYS.demoOrders, dataset.orders) &&
      writeJson(DASHBOARD_KEYS.demoReviews, dataset.reviews) &&
      writeJson(DASHBOARD_KEYS.demoSubscribers, dataset.subscribers)
    if (!ok) return false
    setDemoPresent(true)
    setModeState('demo')
    try {
      localStorage.setItem(DASHBOARD_KEYS.mode, 'demo')
    } catch {
      /* preference only */
    }
    setSnapshot(readSnapshot('demo'))
    setNow(new Date())
    return true
  }, [])

  const clearDemo = useCallback(() => {
    removeKey(DASHBOARD_KEYS.demoOrders)
    removeKey(DASHBOARD_KEYS.demoReviews)
    removeKey(DASHBOARD_KEYS.demoSubscribers)
    setDemoPresent(false)
    setModeState('live')
    try {
      localStorage.setItem(DASHBOARD_KEYS.mode, 'live')
    } catch {
      /* preference only */
    }
    setSnapshot(readSnapshot('live'))
  }, [])

  /* Optimistic by construction: the write is synchronous, so the screen and the
     store move together and there is no pending state to render. What the
     caller gets back is whether it actually landed. */
  const updateStage = useCallback((orderNumber: string, stage: Stage): boolean => {
    const result = persistStage(readFulfilment(), orderNumber, stage)
    setFulfilment(result.store)
    return result.ok
  }, [])

  const updateStages = useCallback((orderNumbers: string[], stage: Stage): boolean => {
    const result = persistStages(readFulfilment(), orderNumbers, stage)
    setFulfilment(result.store)
    return result.ok
  }, [])

  const undoStages = useCallback((previous: Record<string, StageEntry | undefined>): boolean => {
    const result = restoreStages(readFulfilment(), previous)
    setFulfilment(result.store)
    return result.ok
  }, [])

  /** What the stages were, so undo restores rather than guesses. */
  const stageSnapshot = useCallback(
    (orderNumbers: string[]): Record<string, StageEntry | undefined> => {
      const current = readFulfilment()
      const snapshot: Record<string, StageEntry | undefined> = {}
      for (const number of orderNumbers) snapshot[number] = current[number]
      return snapshot
    },
    [],
  )

  /* The overlay seeds itself on first run rather than presenting an empty
     Inventory screen with no way in. Everything it contains is derived from the
     catalogue, and every screen that shows it says where it came from. */
  const [ops, setOps] = useState<OpsStore>(() => {
    const existing = readOps()
    if (existing) return existing
    const seeded = buildOpsSeed(new Date())
    writeOps(seeded)
    return seeded
  })

  const commitOps = useCallback((next: OpsStore): boolean => {
    if (!writeOps(next)) return false
    setOps(next)
    return true
  }, [])

  const updateVariantOps = useCallback(
    (key: string, patch: Partial<VariantOps>): boolean => {
      const current = ops.variants[key]
      if (!current) return false
      return commitOps({ ...ops, variants: { ...ops.variants, [key]: { ...current, ...patch } } })
    },
    [ops, commitOps],
  )

  const updateLot = useCallback(
    (id: string, patch: Partial<Lot>): boolean =>
      commitOps({ ...ops, lots: ops.lots.map((lot) => (lot.id === id ? { ...lot, ...patch } : lot)) }),
    [ops, commitOps],
  )

  const setTeaType = useCallback(
    (productId: string, type: TeaType): boolean =>
      commitOps({ ...ops, teaTypes: { ...ops.teaTypes, [productId]: type } }),
    [ops, commitOps],
  )

  const reseedOps = useCallback((): boolean => commitOps(buildOpsSeed(new Date())), [commitOps])

  /* The one write that touches customer-facing data. The Reviews page confirms
     first, and the storefront will simply stop showing the review. */
  const deleteReview = useCallback(
    (productId: string, reviewId: string): boolean => {
      const key = mode === 'demo' ? DASHBOARD_KEYS.demoReviews : STOREFRONT_KEYS.reviews
      const store = readReviews(key).value
      const list = (store[productId] ?? []).filter((review) => review.id !== reviewId)
      if (list.length === 0) delete store[productId]
      else store[productId] = list
      if (!writeJson(key, store)) return false
      setSnapshot(readSnapshot(mode))
      return true
    },
    [mode],
  )

  /* The other half of the review delete. Because this can put a review back
     exactly where it was, deleting one does not need a confirmation step – it
     needs an undo, which is faster in the common case and safer in the rare
     one. The index is carried so a restore does not silently reorder the list. */
  const restoreReview = useCallback(
    (productId: string, review: Review, index: number): boolean => {
      const key = mode === 'demo' ? DASHBOARD_KEYS.demoReviews : STOREFRONT_KEYS.reviews
      const store = readReviews(key).value
      const list = [...(store[productId] ?? [])]
      if (!list.some((entry) => entry.id === review.id)) {
        list.splice(Math.min(Math.max(index, 0), list.length), 0, review)
      }
      store[productId] = list
      if (!writeJson(key, store)) return false
      setSnapshot(readSnapshot(mode))
      return true
    },
    [mode],
  )

  const value = useMemo<DatasetValue>(
    () => ({
      ...snapshot,
      mode,
      setMode,
      now,
      refresh,
      demoPresent,
      seedDemo,
      clearDemo,
      fulfilment,
      updateStage,
      updateStages,
      undoStages,
      stageSnapshot,
      deleteReview,
      restoreReview,
      ops,
      updateVariantOps,
      updateLot,
      setTeaType,
      reseedOps,
    }),
    [
      snapshot,
      mode,
      setMode,
      now,
      refresh,
      demoPresent,
      seedDemo,
      clearDemo,
      fulfilment,
      updateStage,
      updateStages,
      undoStages,
      stageSnapshot,
      deleteReview,
      restoreReview,
      ops,
      updateVariantOps,
      updateLot,
      setTeaType,
      reseedOps,
    ],
  )

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset(): DatasetValue {
  const context = useContext(DatasetContext)
  if (!context) throw new Error('useDataset must be used within a DatasetProvider')
  return context
}
