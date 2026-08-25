import { formatINR } from '@storefront/lib/currency'
import { getGardenByEstate } from '@storefront/data/products'
import type { ProductPerformance } from '../../lib/analysis'
import { formatCount, relativeDays } from '../../lib/format'
import { useDataset } from '../../lib/datasetContext'
import { Drawer } from '../ui/Drawer'
import { Chip } from '../ui/Card'
import { Thumb } from '../ui/Thumb'
import { StarIcon } from '../ui/Icons'

const PROFILE_LABELS: { key: keyof NonNullable<ProductPerformance['product']['flavorProfile']>; label: string }[] = [
  { key: 'strength', label: 'Strength' },
  { key: 'astringency', label: 'Astringency' },
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'floral', label: 'Floral' },
  { key: 'caffeine', label: 'Caffeine' },
]

/** Everything the catalogue records about one tea, joined to what it has sold. */
export function ProductDrawer({ row, onClose }: { row: ProductPerformance | null; onClose: () => void }) {
  const { now } = useDataset()
  if (!row) return null

  const { product } = row
  const comingSoon = product.status === 'coming-soon'
  const garden = product.origin ? getGardenByEstate(product.origin.estate) : undefined

  return (
    <Drawer open onClose={onClose} title={product.name} subtitle={product.category}>
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <Thumb imageSrc={product.imageSrc} name={product.name} size={76} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {comingSoon ? <Chip tone="warn">Coming soon</Chip> : <Chip tone="accent">Active</Chip>}
              {product.tastingNotes?.map((note) => <Chip key={note}>{note}</Chip>)}
            </div>
            <p className="mt-2 text-sm text-body">{product.description}</p>
          </div>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Performance</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Revenue" value={formatINR(row.revenue)} />
            <Stat label="Packs" value={formatCount(row.units)} />
            <Stat label="Orders" value={formatCount(row.orders)} />
            <Stat label="Share" value={`${(row.share * 100).toFixed(1)}%`} />
          </dl>
          <p className="mt-2 text-xs text-muted">
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Tiers</h3>
          <ul className="mt-2 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-white">
            {row.variants.map((variant) => {
              const catalogue = product.variants.find((entry) => entry.size === variant.size)
              return (
                <li key={variant.size} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{variant.size}</p>
                    <p className="text-xs text-muted">
                      {catalogue
                        ? catalogue.price > 0
                          ? `${formatINR(catalogue.price)} · lot of ${formatCount(catalogue.stock)}`
                          : 'Not priced yet'
                        : 'No longer in the catalogue'}
                    </p>
                  </div>
                  <p className="tnum shrink-0 text-right text-sm text-body">
                    {formatCount(variant.units)} sold
                    <span className="block text-xs text-muted">{formatINR(variant.revenue)}</span>
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Lot sizes are static in the catalogue and never decrement — treat them as a note, not a
            live stock count.
          </p>
        </section>

        {product.flavorProfile && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Cup profile</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {PROFILE_LABELS.map((entry) => {
                const value = product.flavorProfile?.[entry.key] ?? 0
                return (
                  <li key={entry.key} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-body">{entry.label}</span>
                    {/* Track is a lighter step of the fill's own hue, so the
                        unfilled remainder still reads as the same measure. */}
                    <span className="h-2 flex-1 overflow-hidden rounded-sm bg-accent/10">
                      <span
                        className="block h-full rounded-r-sm bg-accent"
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </span>
                    <span className="tnum w-8 shrink-0 text-right text-xs text-muted">{value}/5</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {product.origin && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Origin</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-ink/10 bg-white p-4 text-sm">
              <Field label="Garden" value={product.origin.estate} />
              <Field label="Elevation" value={product.origin.elevation} />
              <Field label="Harvest" value={product.origin.harvest} />
              <Field label="Cultivar" value={product.origin.cultivar} />
            </dl>
            {garden && (
              <p className="mt-2 text-xs text-muted">
                Garden profile on the storefront lists {garden.productIds.length} tea
                {garden.productIds.length === 1 ? '' : 's'} from {garden.name}.
              </p>
            )}
          </section>
        )}

        {product.brewingGuide && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Brewing</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-ink/10 bg-white p-4 text-sm">
              <Field label="Water" value={product.brewingGuide.temperature} />
              <Field label="Time" value={product.brewingGuide.time} />
              <Field label="Steeps" value={product.brewingGuide.steeps} />
              <Field label="Leaf" value={product.brewingGuide.leafAmount} />
            </dl>
          </section>
        )}
      </div>
    </Drawer>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{value}</dd>
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
