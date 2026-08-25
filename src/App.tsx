import { Suspense, lazy, useMemo } from 'react'
import { useRoute, type RouteId } from './lib/router'
import { useDataset } from './lib/datasetContext'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { ModeBanner } from './components/layout/ModeBanner'
import { flattenReviews } from './lib/analysis'
import { EmptyState } from './components/ui/Card'
import { SkeletonRows } from './components/ui/Skeleton'

/* Pages are lazy for the same reason the storefront's are: nobody opening the
   Home screen should download the reviews table. */
const HomePage = lazy(() => import('./pages/OverviewPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CatalogPage = lazy(() => import('./pages/CataloguePage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const ReportsPage = lazy(() => import('./pages/ReviewsPage'))
const SettingsPage = lazy(() => import('./pages/DataPage'))

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar current={route.id} counts={counts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={meta.title} description={meta.description} />
        <ModeBanner />

        <main className="min-w-0 flex-1">
          <Suspense fallback={<SkeletonRows rows={8} />}>
            {route.id === 'home' && <HomePage />}
            {route.id === 'orders' && <OrdersPage focusOrder={route.param} />}
            {route.id === 'catalog' && <CatalogPage focusProduct={route.param} />}
            {route.id === 'customers' && <CustomersPage />}
            {route.id === 'reports' && <ReportsPage />}
            {route.id === 'settings' && <SettingsPage />}
            {(route.id === 'inventory' || route.id === 'wholesale') && (
              <EmptyState
                title={`${meta.title} is not built yet`}
                message="This screen is part of the ops overlay work and has no data behind it so far. It is not linked from the rail until it does."
              />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
