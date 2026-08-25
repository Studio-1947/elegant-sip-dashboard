import { useMemo } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { RANGES, filterByRange, type RangeId } from '../lib/metrics'
import { productBreakdown } from '../lib/analysis'
import { stockLines, coverBand, COVER_DOT, COVER_LABEL, COVER_SHORT } from '../lib/inventory'
import { TEA_TYPES, type TeaType } from '../lib/ops'
import { navigate, useQueryState, useRoute } from '../lib/router'
import { formatCount, pluralise } from '../lib/format'
import { Button, FilterBar, FilterChip, SearchInput, Select } from '../components/ui/Controls'
import { Card, Chip, EmptyState } from '../components/ui/Card'
import { TeaTypeChip } from '../components/ui/TeaTypeChip'
import { DataTable, type Column } from '../components/table/DataTable'
import { DensityToggle, TableStatus, useDensity } from '../components/table/TableToolbar'
import { SavedViews, type SavedView } from '../components/table/SavedViews'
import { EditableCell, rupees, wholeUnits } from '../components/table/EditableCell'
import { useToast } from '../components/ui/Toast'
import { ProductDrawer } from '../components/panels/ProductDrawer'

/* ────────────────────────────────────────────────────────────────────────────
 * The catalogue, at SKU level.
 *
 * The previous version of this screen was a grid of cards led by a 52px photo.
 * Six Darjeelings photograph identically at that size, so the picture was doing
 * no identifying work at all – it just looked like a shop. Rows are led by the
 * SKU and the tea type instead, which are the two things that actually tell you
 * which product you are looking at.
 *
 * One row per VARIANT, not per product: a tier is what has a price, a weight, a
 * stock level and a trade term, so it is what an ops table has to address.
 * ──────────────────────────────────────────────────────────────────────────── */

type SortId = 'sku' | 'revenue' | 'units' | 'stock'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'sku', label: 'SKU' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'units', label: 'Units sold' },
  { id: 'stock', label: 'Stock' },
]

const DEFAULTS = { q: '', type: 'all', range: 'all', sort: 'sku', status: 'all' }

const VIEWS: SavedView[] = [
  { id: 'all', label: 'All SKUs', query: {} },
  { id: 'sellable', label: 'On sale', query: { status: 'active' }, hint: 'Priced and buyable today' },
  { id: 'reorder', label: 'Needs reorder', query: { status: 'reorder' }, hint: '30 days of cover or less' },
  { id: 'unpriced', label: 'Not priced yet', query: { status: 'coming-soon' } },
]

export default function CatalogPage({ focusProduct }: { focusProduct?: string }) {
  const { orders, reviews, now, ops, updateVariantOps } = useDataset()
  const route = useRoute()
  const notify = useToast()
  const [density, setDensity] = useDensity()
  const { values, set, clear } = useQueryState(DEFAULTS)

  const range = values.range as RangeId
  const sort = values.sort as SortId

  const scoped = useMemo(() => filterByRange(orders, range, now), [orders, range, now])
  const breakdown = useMemo(() => productBreakdown(scoped, reviews), [scoped, reviews])
  const lines = useMemo(() => stockLines(ops, orders, now), [ops, orders, now])

  /** One row per variant: catalogue facts, ops fields, and what it has sold. */
  const rows = useMemo(() => {
    const needle = values.q.trim().toLowerCase()

    return lines
      .map((line) => {
        const performance = breakdown.performance.find((entry) => entry.product.id === line.product.id)
        const sales = performance?.variants.find((entry) => entry.size === line.variant.size)
        const type = ops.teaTypes[line.product.id] ?? 'black'
        return {
          line,
          type,
          band: coverBand(line),
          units: sales?.units ?? 0,
          revenue: sales?.revenue ?? 0,
          comingSoon: line.product.status === 'coming-soon',
        }
      })
      .filter((row) => {
        if (values.type !== 'all' && row.type !== values.type) return false
        if (values.status === 'active' && (row.comingSoon || row.line.retailPrice <= 0)) return false
        if (values.status === 'coming-soon' && !row.comingSoon && row.line.retailPrice > 0) return false
        if (values.status === 'reorder' && !['out', 'critical', 'low'].includes(row.band)) return false
        if (!needle) return true
        return [row.line.variant.sku, row.line.product.name, row.line.variant.size, row.line.product.origin?.estate ?? '']
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        if (sort === 'revenue') return b.revenue - a.revenue
        if (sort === 'units') return b.units - a.units
        if (sort === 'stock') return a.line.onHand - b.line.onHand
        return a.line.variant.sku.localeCompare(b.line.variant.sku)
      })
  }, [lines, breakdown, ops.teaTypes, values.q, values.type, values.status, sort])

  const selectedRow = breakdown.performance.find((row) => row.product.id === focusProduct) ?? null

  const editWholesale = (key: string, sku: string, next: string) => {
    const previous = ops.variants[key]?.wholesalePrice ?? 0
    if (!updateVariantOps(key, { wholesalePrice: Number(next) })) {
      notify('Storage refused the write – the price is unchanged', 'error')
      return
    }
    notify(`${sku} trade price set to ${formatINR(Number(next))}`, {
      action: {
        label: 'Undo',
        onClick: () => updateVariantOps(key, { wholesalePrice: previous }),
      },
    })
  }

  const editMoq = (key: string, sku: string, next: string) => {
    const previous = ops.variants[key]?.moq ?? 1
    if (!updateVariantOps(key, { moq: Number(next) })) {
      notify('Storage refused the write – the minimum is unchanged', 'error')
      return
    }
    notify(`${sku} minimum set to ${next}`, {
      action: { label: 'Undo', onClick: () => updateVariantOps(key, { moq: previous }) },
    })
  }

  const columns: Column<(typeof rows)[number]>[] = [
    {
      id: 'sku',
      header: 'SKU',
      width: 170,
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate('catalog', { param: row.line.product.id, query: route.query })}
          className="truncate font-semibold text-ink hover:text-accent hover:underline"
          aria-label={`Open ${row.line.product.name}, ${row.line.variant.size}`}
        >
          {row.line.variant.sku}
        </button>
      ),
    },
    {
      id: 'tea',
      header: 'Tea',
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{row.line.product.name}</span>
          <span className="block truncate text-xs text-muted">{row.line.variant.size}</span>
        </span>
      ),
    },
    { id: 'type', header: 'Type', width: 104, render: (row) => <TeaTypeChip type={row.type} /> },
    {
      id: 'grams',
      header: 'Weight',
      align: 'right',
      width: 88,
      render: (row) => <span className="text-body">{row.line.variant.grams} g</span>,
    },
    {
      id: 'retail',
      header: 'Retail',
      align: 'right',
      width: 104,
      headerTitle: 'Set in the storefront catalogue – read-only here',
      render: (row) =>
        row.line.retailPrice > 0 ? (
          <span className="text-ink">{formatINR(row.line.retailPrice)}</span>
        ) : (
          <span className="text-muted"></span>
        ),
    },
    {
      id: 'wholesale',
      header: 'Trade',
      align: 'right',
      width: 112,
      render: (row) => (
        <EditableCell
          value={String(row.line.variant.wholesalePrice)}
          display={formatINR(row.line.variant.wholesalePrice)}
          label={`Trade price for ${row.line.variant.sku}`}
          validate={rupees}
          prefix="₹"
          onCommit={(next) => editWholesale(row.line.key, row.line.variant.sku, next)}
        />
      ),
    },
    {
      id: 'moq',
      header: 'MOQ',
      align: 'right',
      width: 84,
      headerTitle: 'Minimum order quantity, wholesale',
      render: (row) => (
        <EditableCell
          value={String(row.line.variant.moq)}
          display={String(row.line.variant.moq)}
          label={`Minimum order quantity for ${row.line.variant.sku}`}
          validate={wholeUnits('packs')}
          onCommit={(next) => editMoq(row.line.key, row.line.variant.sku, next)}
        />
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      width: 152,
      /* Three FIXED tracks, not a right-aligned flex row. Flex sized each part
         to its own content, so a "150d" row and an "Out of stock" row pushed
         their dots to different x positions and the column lost its spine.
         Fixed tracks mean the dots line up, the pack counts line up, and the
         cover figures line up, whatever is in them. */
      render: (row) => (
        <span
          className="inline-grid grid-cols-[0.5rem_2.75rem_3.25rem] items-center gap-2"
          title={`${formatCount(row.line.onHand)} packs – ${COVER_LABEL[row.band]}`}
        >
          <span className={`h-2 w-2 rounded-full ${COVER_DOT[row.band]}`} aria-hidden="true" />
          <span className="text-right text-ink">{formatCount(row.line.onHand)}</span>
          <span className="text-right text-xs text-muted">
            {row.line.daysOfCover === null ? COVER_SHORT[row.band] : `${row.line.daysOfCover}d`}
            <span className="sr-only"> – {COVER_LABEL[row.band]}</span>
          </span>
        </span>
      ),
    },
    {
      id: 'sold',
      header: 'Sold',
      align: 'right',
      render: (row) => (
        <span className="block">
          <span className="block text-ink">{formatINR(row.revenue)}</span>
          <span className="block text-xs text-muted">{formatCount(row.units)} packs</span>
        </span>
      ),
    },
  ]

  const chips = [
    values.type !== 'all' && {
      field: 'Type',
      value: TEA_TYPES.find((entry) => entry.id === values.type)?.label ?? values.type,
      key: 'type' as const,
    },
    values.status !== 'all' && { field: 'Status', value: values.status, key: 'status' as const },
    range !== 'all' && {
      field: 'Sold in',
      value: RANGES.find((entry) => entry.id === range)?.label ?? range,
      key: 'range' as const,
    },
    values.q && { field: 'Search', value: values.q, key: 'q' as const },
  ].filter(Boolean) as { field: string; value: string; key: 'type' | 'status' | 'range' | 'q' }[]

  return (
    <div className="flex flex-col gap-4 p-4">
      <SavedViews route="catalog" views={VIEWS} current={route.query} />

      <FilterBar>
        <SearchInput
          value={values.q}
          onChange={(next) => set({ q: next }, true)}
          label="Search catalogue"
          placeholder="SKU, tea, tier or garden"
        />
        <Select
          label="Type"
          value={values.type as TeaType | 'all'}
          onChange={(next) => set({ type: next })}
          options={[{ id: 'all' as const, label: 'All types' }, ...TEA_TYPES]}
        />
        <Select
          label="Sold in"
          value={range}
          onChange={(next) => set({ range: next })}
          options={RANGES.map((entry) => ({ id: entry.id, label: entry.label }))}
        />
        <Select label="Sort" value={sort} onChange={(next) => set({ sort: next })} options={SORTS} />
        <DensityToggle density={density} onChange={setDensity} />
      </FilterBar>

      <TableStatus count={`${pluralise(rows.length, 'SKU')} of ${formatCount(lines.length)}`}>
        {chips.map((chip) => (
          <FilterChip key={chip.key} field={chip.field} value={chip.value} onRemove={() => clear([chip.key])} />
        ))}
        {chips.length > 1 && (
          <Button variant="ghost" size="sm" onClick={() => clear()}>
            Clear all
          </Button>
        )}
      </TableStatus>

      <Card className="overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(row) => row.line.key}
          caption="Catalogue by SKU, with trade terms and stock cover"
          density={density}
          /* On a phone the nine columns collapse to what identifies a tea and
             what you would act on: which one it is, what it costs, and whether
             there is any. The rest is one tap away in the drawer. The badge is
             initials rather than a photograph – six Darjeelings are one brown
             square at 40px, which is why the desktop table leads with the SKU
             too. */
          mobileCard={(row) => ({
            lead: (
              <span className="grid h-10 w-10 place-items-center rounded-md bg-sunken text-xs font-semibold text-accent neu-pressed-sm">
                {row.line.variant.sku.split('-')[1]?.slice(0, 2) ?? '??'}
              </span>
            ),
            title: row.line.product.name,
            meta: `${row.line.variant.sku} · ${
              row.line.retailPrice > 0 ? formatINR(row.line.retailPrice) : 'Unpriced'
            }`,
            trailing:
              row.comingSoon || row.line.retailPrice <= 0 ? (
                <Chip tone="warn">Unpriced</Chip>
              ) : row.band === 'out' ? (
                <Chip tone="critical">Out of stock</Chip>
              ) : row.band === 'critical' || row.band === 'low' ? (
                <Chip tone="warn">Low stock</Chip>
              ) : (
                <Chip tone="good">In stock</Chip>
              ),
          })}
          activeId={rows.find((row) => row.line.product.id === focusProduct)?.line.key}
          onOpen={(row) => navigate('catalog', { param: row.line.product.id, query: route.query })}
          empty={
            <EmptyState
              title="No SKUs match"
              message="Clear the search or widen the filters to see the full catalogue."
              action={<Button onClick={() => clear()}>Clear filters</Button>}
            />
          }
        />
      </Card>

      <p className="text-xs text-muted">
        Retail price and product status come from the storefront's{' '}
        <code className="rounded-sm bg-sunken px-1">data/products.ts</code> and are read-only here – they
        change with a build, not from this screen. Trade price, MOQ, weight and tea type are recorded by
        this dashboard.
      </p>

      {breakdown.orphans.length > 0 && (
        <Card>
          <div className="border-b border-line px-3 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Sold, but no longer in the catalogue
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {breakdown.orphans.map((orphan) => (
              <li key={orphan.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {orphan.name} <span className="text-muted">({orphan.id})</span>
                </span>
                <span className="shrink-0 text-body">
                  {formatCount(orphan.units)} packs · {formatINR(orphan.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ProductDrawer
        row={selectedRow}
        onClose={() => navigate('catalog', { query: route.query })}
      />
    </div>
  )
}

