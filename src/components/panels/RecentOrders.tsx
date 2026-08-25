import type { PlacedOrder } from '@storefront/lib/orders'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../../lib/datasetContext'
import { stageDotClass, stageLabel, stageOf } from '../../lib/fulfilment'
import { navigate } from '../../lib/router'
import { formatDateTime, formatCount } from '../../lib/format'
import { Card, CardHeader, DotLabel, EmptyState } from '../ui/Card'
import { Button } from '../ui/Controls'

const RECENT = 8

export function RecentOrders({ orders }: { orders: PlacedOrder[] }) {
  const { fulfilment } = useDataset()
  const recent = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT)

  return (
    <Card>
      <CardHeader
        title="Latest orders"
        subtitle={`Most recent ${Math.min(RECENT, recent.length)} of ${formatCount(orders.length)} in this period`}
        actions={<Button size="sm" onClick={() => navigate('orders')}>All orders</Button>}
      />
      {recent.length === 0 ? (
        <EmptyState
          title="No orders in this period"
          message="Widen the date range under Trends, or switch datasets in Settings."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-sunken text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-3 py-1.5 font-semibold">Order</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Placed</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Customer</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Packs</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Total</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => {
                const stage = stageOf(fulfilment, order.number)
                const packs = order.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <tr key={order.number} className="h-11 border-t border-line hover:bg-sunken">
                    <td className="px-3">
                      <button
                        type="button"
                        onClick={() => navigate('orders', { param: order.number })}
                        className="font-semibold text-ink hover:text-accent hover:underline"
                      >
                        {order.number}
                      </button>
                    </td>
                    <td className="px-3 text-body">{formatDateTime(order.date)}</td>
                    <td className="px-3 text-body">
                      <span className="block truncate">{order.name || '—'}</span>
                      <span className="block truncate text-xs text-muted">{order.city || '—'}</span>
                    </td>
                    <td className="px-3 text-right text-body">{packs}</td>
                    <td className="px-3 text-right font-semibold text-ink">
                      {formatINR(order.total)}
                    </td>
                    <td className="px-3 text-xs text-body">
                      <DotLabel colorClass={stageDotClass(stage)}>{stageLabel(stage)}</DotLabel>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
