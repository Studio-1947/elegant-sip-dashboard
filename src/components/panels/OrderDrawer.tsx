import type { PlacedOrder } from '@storefront/lib/orders'
import { formatINR } from '@storefront/lib/currency'
import { SHIPPING_METHODS, getOrderPricing } from '@storefront/lib/pricing'
import { useDataset } from '../../lib/datasetContext'
import { STAGES, stageDotClass, stageOf } from '../../lib/fulfilment'
import { formatDateTime } from '../../lib/format'
import { Drawer } from '../ui/Drawer'
import { Button } from '../ui/Controls'
import { Thumb } from '../ui/Thumb'
import { Chip } from '../ui/Card'
import { useToast } from '../ui/Toast'
import { AlertIcon } from '../ui/Icons'

/** Detail panel for one order: what was bought, what was charged, where it goes. */
export function OrderDrawer({
  order,
  onClose,
  onOpenProduct,
}: {
  order: PlacedOrder | null
  onClose: () => void
  onOpenProduct: (productId: string) => void
}) {
  const { fulfilment, updateStage } = useDataset()
  const notify = useToast()

  if (!order) return null

  const current = stageOf(fulfilment, order.number)
  const goods = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const expected = getOrderPricing(goods, order.discount, order.shippingMethod)
  const mismatch = expected.finalTotal !== order.total
  const method = SHIPPING_METHODS.find((entry) => entry.id === order.shippingMethod)

  return (
    <Drawer
      open
      onClose={onClose}
      title={order.number}
      subtitle={`Placed ${formatDateTime(order.date)}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Stage is a local note — nothing is emailed.</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const address = [order.name, order.address, `${order.city} ${order.zip}`.trim(), order.country]
                  .filter(Boolean)
                  .join('\n')
                navigator.clipboard
                  ?.writeText(address)
                  .then(() => notify('Address copied'))
                  .catch(() => notify('Could not copy — the browser blocked clipboard access', 'error'))
              }}
            >
              Copy address
            </Button>
            {order.email && (
              <a
                href={`mailto:${order.email}?subject=${encodeURIComponent(`Your Elegant Sip order ${order.number}`)}`}
                className="inline-flex min-h-11 items-center rounded-md border border-ink bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
              >
                Email customer
              </a>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Fulfilment stage</h3>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Set fulfilment stage">
            {STAGES.map((entry) => {
              const active = entry.id === current
              return (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={active}
                  title={entry.hint}
                  onClick={() => {
                    updateStage(order.number, entry.id)
                    notify(`${order.number} marked ${entry.label.toLowerCase()}`)
                  }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
                    active ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-body hover:bg-sunken'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${stageDotClass(entry.id)}`} aria-hidden="true" />
                  {entry.label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {STAGES.find((entry) => entry.id === current)?.hint}
          </p>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Items</h3>
          <ul className="mt-2 flex flex-col divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
            {order.items.map((item) => (
              <li key={`${item.id}__${item.size}`} className="flex items-center gap-3 p-3">
                <Thumb imageSrc={item.imageSrc} name={item.name} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenProduct(item.id)}
                    className="block truncate text-sm font-semibold text-ink hover:underline"
                  >
                    {item.name}
                  </button>
                  <p className="truncate text-xs text-muted">
                    {item.size || 'Unspecified size'} · {formatINR(item.price)} each
                  </p>
                </div>
                <p className="tnum shrink-0 text-sm text-body">×{item.quantity}</p>
                <p className="tnum w-24 shrink-0 text-right text-sm font-semibold text-ink">
                  {formatINR(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Charged</h3>
          <dl className="mt-2 flex flex-col gap-1.5 rounded-lg border border-ink/10 bg-white p-4 text-sm">
            <Row label="Goods" value={formatINR(order.subtotal)} />
            {order.discount > 0 && (
              <Row label={`Discount${order.coupon ? ` · ${order.coupon}` : ''}`} value={`−${formatINR(order.discount)}`} />
            )}
            <Row
              label={`Shipping · ${method?.label ?? order.shippingMethod}`}
              value={order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
            />
            <Row label="GST (5%)" value={formatINR(order.tax)} />
            <div className="mt-1 flex items-baseline justify-between border-t border-ink/10 pt-2">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="tnum text-base font-bold text-ink">{formatINR(order.total)}</dd>
            </div>
          </dl>

          {/* Orders live in editable localStorage, so the stored total is not
              taken on trust — it is re-derived from the line items. */}
          {mismatch && (
            <p className="mt-2 flex items-start gap-2 rounded-md border border-warn/35 bg-warn-soft p-3 text-xs text-ink">
              <span className="mt-0.5 h-4 w-4 shrink-0">
                <AlertIcon />
              </span>
              <span>
                The stored total does not match the current pricing rules. Re-derived from the line
                items it would be <strong>{formatINR(expected.finalTotal)}</strong>. Either the record
                was edited, or it was placed under different rates.
              </span>
            </p>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Ship to</h3>
          <address className="mt-2 rounded-lg border border-ink/10 bg-white p-4 text-sm not-italic text-body">
            <p className="font-semibold text-ink">{order.name || 'Name not recorded'}</p>
            <p>{order.address || '—'}</p>
            <p>
              {order.city}
              {order.zip ? ` ${order.zip}` : ''}
            </p>
            <p>{order.country || '—'}</p>
            {order.email && <p className="mt-2 break-all text-muted">{order.email}</p>}
          </address>
          {order.notes && (
            <div className="mt-3">
              <Chip tone="accent">Customer note</Chip>
              <p className="mt-1.5 text-sm text-body">{order.notes}</p>
            </div>
          )}
        </section>
      </div>
    </Drawer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-body">{label}</dt>
      <dd className="tnum text-ink">{value}</dd>
    </div>
  )
}
