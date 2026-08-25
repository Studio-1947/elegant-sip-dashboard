import { Suspense, lazy, useMemo } from 'react'
import { useRoute, type RouteId } from './lib/router'
import { useDataset } from './lib/datasetContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { ModeBanner } from './components/layout/ModeBanner'
import { flattenReviews } from './lib/analysis'
import { SkeletonRows } from './components/ui/Skeleton'

/* Pages are lazy for the same reason the storefront's are: nobody opening the
   Home screen should download the reviews table. */
const HomePage = lazy(() => import('./pages/HomePage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const WholesalePage = lazy(() => import('./pages/WholesalePage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const PAGE_META: Record<RouteId, { title: string; description: string }> = {
  home: {
    title: 'Home',
    description: 'What needs a human right now, then how the week is going.',
  },
  orders: {
    title: 'Orders',
    description: 'Every order in this dataset, with a fulfilment stage you can track locally.',
  },
  catalog: {
    title: 'Catalog',
    description: 'The six teas on sale, joined to what each one has actually sold.',
  },
  inventory: {
    title: 'Inventory',
    description: 'Stock by lot — harvest, garden, best-before and days of cover.',
  },
  customers: {
    title: 'Customers',
    description: 'Everyone who has ordered, grouped by email address.',
  },
  wholesale: {
    title: 'Wholesale',
    description: 'Trade price list, minimum order quantities and terms.',
  },
  reports: {
    title: 'Reports',
    description: 'Trends, product performance and review moderation.',
  },
  settings: {
    title: 'Settings',
    description: 'Where these numbers come from, what was rejected, and how to export them.',
  },
}

export default function App() {
  const route = useRoute()
  const { orders, reviews } = useDataset()
  const meta = PAGE_META[route.id]

  const counts = useMemo(
    () => ({ orders: orders.length, reports: flattenReviews(reviews).length }),
    [orders, reviews],
  )

  return (
    /* The shell owns the viewport and `main` is the only thing that scrolls.
       That is what makes a sticky table header stick to the top of the DATA
       rather than to the top of the browser window — the rail, the top bar and
       the mode banner stay put above it, and the header lands just under them. */
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      <Sidebar current={route.id} counts={counts} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title={meta.title} description={meta.description} />
        <ModeBanner />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* The heading scrolls with the content it names. Persistent chrome is
              for things you reach for from anywhere; a page title is not one. */}
          <div className="border-b border-line bg-surface px-3 py-2.5">
            <h1 className="text-lg font-semibold leading-tight text-ink">{meta.title}</h1>
            <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
          </div>

          <Suspense fallback={<SkeletonRows rows={8} />}>
            {route.id === 'home' && <HomePage />}
            {route.id === 'orders' && <OrdersPage focusOrder={route.param} />}
            {route.id === 'catalog' && <CatalogPage focusProduct={route.param} />}
            {route.id === 'inventory' && <InventoryPage />}
            {route.id === 'customers' && <CustomersPage />}
            {route.id === 'wholesale' && <WholesalePage />}
            {route.id === 'reports' && <ReportsPage />}
            {route.id === 'settings' && <SettingsPage />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
