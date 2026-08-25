/* ────────────────────────────────────────────────────────────────────────────
 * The one place that decides what "the data" is.
 *
 * Live mode reads the storefront's own localStorage keys. That only sees real
 * orders when the two apps share an origin — a browser keeps storage per
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
import { readFulfilment, setStage as persistStage, type FulfilmentStore, type Stage } from './fulfilment'

export type DataMode = 'live' | 'demo'

interface Snapshot {
  orders: PlacedOrder[]
  reviews: ReviewStore
  subscribers: string[]
  rejected: { orders: number; reviews: number; subscribers: number }
  /** Live-only signals — the signed-in demo account and its open cart. */
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
  updateStage: (orderNumber: string, stage: Stage) => void
  deleteReview: (productId: string, reviewId: string) => boolean
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

  // A checkout completed in another tab fires `storage` here — so placing a
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

  const updateStage = useCallback((orderNumber: string, stage: Stage) => {
    setFulfilment((current) => persistStage(current, orderNumber, stage))
  }, [])

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
      deleteReview,
    }),
    [snapshot, mode, setMode, now, refresh, demoPresent, seedDemo, clearDemo, fulfilment, updateStage, deleteReview],
  )

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset(): DatasetValue {
  const context = useContext(DatasetContext)
  if (!context) throw new Error('useDataset must be used within a DatasetProvider')
  return context
}
