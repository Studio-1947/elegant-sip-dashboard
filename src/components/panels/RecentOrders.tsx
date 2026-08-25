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
        actions={<Button onClick={() => navigate('orders')}>All orders</Button>}
      />
      {recent.length === 0 ? (
        <EmptyState
          title="No orders in this period"
          message="Widen the date range, or switch datasets from the header."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted">
                <th scope="col" className="px-5 py-2 font-semibold">Order</th>
                <th scope="col" className="px-3 py-2 font-semibold">Placed</th>
                <th scope="col" className="px-3 py-2 font-semibold">Customer</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Packs</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total</th>
                <th scope="col" className="px-5 py-2 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => {
                const stage = stageOf(fulfilment, order.number)
                const packs = order.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <tr key={order.number} className="border-t border-ink/5 hover:bg-sunken">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => navigate('orders', { param: order.number })}
                        className="tnum font-semibold text-ink hover:underline"
                      >
                        {order.number}
                      </button>
                    </td>
                    <td className="tnum px-3 py-3 text-body">{formatDateTime(order.date)}</td>
                    <td className="px-3 py-3 text-body">
                      <span className="block truncate">{order.name || '—'}</span>
                      <span className="block truncate text-xs text-muted">{order.city || '—'}</span>
                    </td>
                    <td className="tnum px-3 py-3 text-right text-body">{packs}</td>
                    <td className="tnum px-3 py-3 text-right font-semibold text-ink">
                      {formatINR(order.total)}
                    </td>
                    <td className="px-5 py-3 text-xs text-body">
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
