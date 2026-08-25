import { formatINR } from '@storefront/lib/currency'
import type { ProductPerformance } from '../../lib/analysis'
import { formatCount, relativeDays } from '../../lib/format'
import { useDataset } from '../../lib/datasetContext'
import { stockLines, coverBand, COVER_DOT, COVER_LABEL } from '../../lib/inventory'
import { TEA_TYPES, variantKey, type TeaType } from '../../lib/ops'
import { navigate } from '../../lib/router'
import { Drawer } from '../ui/Drawer'
import { Chip } from '../ui/Card'
import { Button, Select } from '../ui/Controls'
import { EditableCell, rupees, wholeUnits } from '../table/EditableCell'
import { useToast } from '../ui/Toast'
import { StarIcon } from '../ui/Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * The product editor.
 *
 * The tiers used to be a stacked list — one block per variant, each repeating
 * the same five labels. That is the shape you reach for when there are two
 * variants and the shape that fails at six: you cannot compare a column of
 * numbers that never lines up, and comparing tiers is the entire reason to open
 * this panel.
 *
 * So it is a matrix. Rows are variants, columns are the fields, and the two
 * fields this dashboard owns — trade price and MOQ — are editable in place.
 * Retail and status stay read-only, because they live in the storefront's
 * catalogue and a second editable copy here would be a second truth.
 *
 * Cup profile and brewing notes are deliberately not shown. They are real, but
 * they are shop copy: nothing in packing, pricing or reordering a tea depends on
 * knowing its astringency is 2/5.
 * ──────────────────────────────────────────────────────────────────────────── */

export function ProductDrawer({ row, onClose }: { row: ProductPerformance | null; onClose: () => void }) {
  const { now, ops, orders, updateVariantOps, setTeaType } = useDataset()
  const notify = useToast()

  if (!row) return null

  const { product } = row
  const comingSoon = product.status === 'coming-soon'
  const type: TeaType = ops.teaTypes[product.id] ?? 'black'
  const lines = stockLines(ops, orders, now).filter((line) => line.product.id === product.id)

  const edit = (key: string, sku: string, field: 'wholesalePrice' | 'moq', next: string, label: string) => {
    const current = ops.variants[key]
    if (!current) return
    const previous = current[field]
    if (!updateVariantOps(key, { [field]: Number(next) })) {
      notify(`Storage refused the write — ${label} is unchanged`, 'error')
      return
    }
    notify(`${sku}: ${label} updated`, {
      action: { label: 'Undo', onClick: () => updateVariantOps(key, { [field]: previous }) },
    })
  }

  return (
    <Drawer open onClose={onClose} title={product.name} subtitle={product.category}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {comingSoon ? <Chip tone="warn">Coming soon</Chip> : <Chip tone="good">On sale</Chip>}
          <Select
            label="Type"
            value={type}
            onChange={(next) => {
              if (!setTeaType(product.id, next)) notify('Storage refused the write', 'error')
            }}
            options={TEA_TYPES}
          />
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Performance</h3>
          <dl className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Stat label="Revenue" value={formatINR(row.revenue)} />
            <Stat label="Packs" value={formatCount(row.units)} />
            <Stat label="Orders" value={formatCount(row.orders)} />
            <Stat label="Share" value={`${(row.share * 100).toFixed(1)}%`} />
          </dl>
          <p className="mt-1.5 text-xs text-muted">
            {row.lastSold ? `Last sold ${relativeDays(row.lastSold, now).toLowerCase()}.` : 'No sales recorded.'}
            {row.rating.count > 0 && (
              <span className="ml-1 inline-flex items-center gap-1">
                <span className="h-3 w-3 text-accent">
                  <StarIcon filled />
                </span>
                {row.rating.average.toFixed(1)} from {formatCount(row.rating.count)} review
                {row.rating.count === 1 ? '' : 's'}.
              </span>
            )}
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Variants</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('inventory', { query: { q: product.name } })}
            >
              Lots
            </Button>
          </div>

          <div className="mt-1.5 overflow-x-auto rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Variants of {product.name}: SKU, weight, retail and trade price, minimum order and stock
              </caption>
              <thead>
                <tr className="bg-sunken text-xs uppercase tracking-wider text-muted">
                  <th scope="col" className="px-2 py-1.5 font-semibold">SKU</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">Weight</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold" title="Storefront-owned">
                    Retail
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">Trade</th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold" title="Minimum order quantity">
                    MOQ
                  </th>
                  <th scope="col" className="px-2 py-1.5 text-right font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => {
                  const key = variantKey(product.id, variant.size)
                  const entry = ops.variants[key]
                  const line = lines.find((candidate) => candidate.key === key)
                  const sales = row.variants.find((candidate) => candidate.size === variant.size)
                  if (!entry) return null
                  const band = line ? coverBand(line) : 'unsold'
                  return (
                    <tr key={key} className="h-11 border-t border-line bg-surface">
                      <td className="px-2">
                        <span className="block font-semibold text-ink">{entry.sku}</span>
                        <span className="block text-xs text-muted">
                          {variant.size} · {formatCount(sales?.units ?? 0)} sold
                        </span>
                      </td>
                      <td className="px-2 text-right text-body">{entry.grams} g</td>
                      <td className="px-2 text-right text-body" title="Set in the storefront catalogue">
                        {variant.price > 0 ? formatINR(variant.price) : '—'}
                      </td>
                      <td className="px-2 text-right">
                        <EditableCell
                          value={String(entry.wholesalePrice)}
                          display={formatINR(entry.wholesalePrice)}
                          label={`Trade price for ${entry.sku}`}
                          validate={rupees}
                          prefix="₹"
                          onCommit={(next) => edit(key, entry.sku, 'wholesalePrice', next, 'trade price')}
                        />
                      </td>
                      <td className="px-2 text-right">
                        <EditableCell
                          value={String(entry.moq)}
                          display={String(entry.moq)}
                          label={`Minimum order quantity for ${entry.sku}`}
                          validate={wholeUnits('packs')}
                          onCommit={(next) => edit(key, entry.sku, 'moq', next, 'minimum order')}
                        />
                      </td>
                      <td className="px-2 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${COVER_DOT[band]}`}
                            aria-hidden="true"
                          />
                          <span className="text-ink">{formatCount(line?.onHand ?? 0)}</span>
                          <span className="text-xs text-muted">
                            {line?.daysOfCover === null || line === undefined
                              ? COVER_LABEL[band]
                              : `${line.daysOfCover}d`}
                          </span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-1.5 text-xs text-muted">
            Retail price and status are the storefront's. Trade price, MOQ, weight and tea type are
            recorded by this dashboard; stock is the sum of this SKU's lots.
          </p>
        </section>

        {product.origin && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Origin</h3>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-surface p-3 text-sm">
              <Field label="Garden" value={product.origin.estate} />
              <Field label="Elevation" value={product.origin.elevation} />
              <Field label="Harvest" value={product.origin.harvest} />
              <Field label="Cultivar" value={product.origin.cultivar} />
            </dl>
          </section>
        )}
      </div>
    </Drawer>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-2 py-1.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-body">{value}</dd>
    </div>
  )
}
