import { useMemo } from 'react'
import { formatINR } from '@storefront/lib/currency'
import { useDataset } from '../lib/datasetContext'
import { stockLines } from '../lib/inventory'
import { TEA_TYPES, type TeaType } from '../lib/ops'
import { useQueryState, useRoute } from '../lib/router'
import { formatCount, formatDate, pluralise } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, FilterChip, SearchInput, Select } from '../components/ui/Controls'
import { Card, EmptyState } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { TeaTypeChip } from '../components/ui/TeaTypeChip'
import { DownloadIcon } from '../components/ui/Icons'
import { DataTable, type Column } from '../components/table/DataTable'
import { DensityToggle, TableStatus, useDensity } from '../components/table/TableToolbar'
import { SavedViews, type SavedView } from '../components/table/SavedViews'
import { EditableCell, rupees, wholeUnits } from '../components/table/EditableCell'
import { useToast } from '../components/ui/Toast'

/* ────────────────────────────────────────────────────────────────────────────
 * The trade price list.
 *
 * Wholesale is not "retail with a discount field"  it is a second price world
 * with its own list, its own minimums and its own arithmetic. What a trade buyer
 * asks is never "what is the unit price"; it is "what does a case cost me and
 * how many must I take", so those are columns here, not something to work out.
 *
 * Margin is shown against the storefront's retail price so a trade price can be
 * sanity-checked without leaving the row. It is a gross figure – this app knows
 * nothing about cost of goods, and says so rather than implying it does.
 * ──────────────────────────────────────────────────────────────────────────── */

type SortId = 'sku' | 'trade' | 'margin' | 'case'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'sku', label: 'SKU' },
  { id: 'trade', label: 'Trade price' },
  { id: 'margin', label: 'Margin' },
  { id: 'case', label: 'Case value' },
]

const DEFAULTS = { q: '', type: 'all', sort: 'sku', margin: 'all' }

const VIEWS: SavedView[] = [
  { id: 'all', label: 'Full list', query: {} },
  { id: 'thin', label: 'Thin margin', query: { margin: 'thin' }, hint: 'Under 30% against retail' },
  { id: 'unpriced', label: 'No trade price', query: { margin: 'zero' } },
]

export default function WholesalePage() {
  const { orders, now, ops, updateVariantOps } = useDataset()
  const route = useRoute()
  const notify = useToast()
  const [density, setDensity] = useDensity()
  const { values, set, clear } = useQueryState(DEFAULTS)

  const sort = values.sort as SortId
  const lines = useMemo(() => stockLines(ops, orders, now), [ops, orders, now])

  const rows = useMemo(() => {
    const needle = values.q.trim().toLowerCase()

    return lines
      .map((line) => {
        const trade = line.variant.wholesalePrice
        const retail = line.retailPrice
        // Gross margin against RETAIL, not cost – this app has no cost of goods.
        const margin = retail > 0 ? ((retail - trade) / retail) * 100 : null
        return {
          line,
          type: (ops.teaTypes[line.product.id] ?? 'black') as TeaType,
          trade,
          margin,
          caseValue: trade * line.variant.moq,
        }
      })
      .filter((row) => {
        if (values.type !== 'all' && row.type !== values.type) return false
        if (values.margin === 'thin' && (row.margin === null || row.margin >= 30)) return false
        if (values.margin === 'zero' && row.trade > 0) return false
        if (!needle) return true
        return [row.line.variant.sku, row.line.product.name, row.line.variant.size]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        if (sort === 'trade') return b.trade - a.trade
        if (sort === 'margin') return (b.margin ?? -1) - (a.margin ?? -1)
        if (sort === 'case') return b.caseValue - a.caseValue
        return a.line.variant.sku.localeCompare(b.line.variant.sku)
      })
  }, [lines, ops.teaTypes, values.q, values.type, values.margin, sort])

  const edit = (key: string, sku: string, field: 'wholesalePrice' | 'moq', next: string, label: string) => {
    const current = ops.variants[key]
    if (!current) return
    const previous = current[field]
    if (!updateVariantOps(key, { [field]: Number(next) })) {
      notify(`Storage refused the write – ${label} is unchanged`, 'error')
      return
    }
    notify(`${sku}: ${label} updated`, {
      action: { label: 'Undo', onClick: () => updateVariantOps(key, { [field]: previous }) },
    })
  }

  const exportCsv = () => {
    downloadFile(
      stampedName('trade-price-list', now),
      toCsv(
        ['SKU', 'Tea', 'Size', 'Weight (g)', 'Retail', 'Trade', 'Margin %', 'MOQ', 'Case value'],
        rows.map((row) => [
          row.line.variant.sku,
          row.line.product.name,
          row.line.variant.size,
          row.line.variant.grams,
          row.line.retailPrice,
          row.trade,
          row.margin === null ? '' : row.margin.toFixed(1),
          row.line.variant.moq,
          row.caseValue,
        ]),
      ),
    )
  }

  const columns: Column<(typeof rows)[number]>[] = [
    {
      id: 'sku',
      header: 'SKU',
      width: 170,
      render: (row) => <span className="truncate font-semibold text-ink">{row.line.variant.sku}</span>,
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
      id: 'retail',
      header: 'Retail',
      align: 'right',
      width: 104,
      headerTitle: 'Storefront price – read-only here',
      render: (row) =>
        row.line.retailPrice > 0 ? (
          <span className="text-body">{formatINR(row.line.retailPrice)}</span>
        ) : (
          <span className="text-muted"></span>
        ),
    },
    {
      id: 'trade',
      header: 'Trade',
      align: 'right',
      width: 112,
      render: (row) => (
        <EditableCell
          value={String(row.trade)}
          display={formatINR(row.trade)}
          label={`Trade price for ${row.line.variant.sku}`}
          validate={rupees}
          prefix="₹"
          onCommit={(next) => edit(row.line.key, row.line.variant.sku, 'wholesalePrice', next, 'trade price')}
        />
      ),
    },
    {
      id: 'margin',
      header: 'Margin',
      align: 'right',
      width: 92,
      headerTitle: 'Gross, against retail. This app has no cost of goods.',
      render: (row) =>
        row.margin === null ? (
          <span className="text-muted"></span>
        ) : (
          <span className={row.margin < 30 ? 'font-semibold text-warn' : 'text-body'}>
            {row.margin.toFixed(0)}%
          </span>
        ),
    },
    {
      id: 'moq',
      header: 'MOQ',
      align: 'right',
      width: 84,
      headerTitle: 'Minimum order quantity, in packs',
      render: (row) => (
        <EditableCell
          value={String(row.line.variant.moq)}
          display={String(row.line.variant.moq)}
          label={`Minimum order quantity for ${row.line.variant.sku}`}
          validate={wholeUnits('packs')}
          onCommit={(next) => edit(row.line.key, row.line.variant.sku, 'moq', next, 'minimum order')}
        />
      ),
    },
    {
      id: 'case',
      header: 'Case value',
      align: 'right',
      width: 116,
      headerTitle: 'Trade price × minimum order quantity',
      render: (row) => <span className="font-semibold text-ink">{formatINR(row.caseValue)}</span>,
    },
    {
      id: 'cover',
      header: 'Stock',
      align: 'right',
      width: 104,
      render: (row) => (
        <span className="text-body">
          {formatCount(Math.floor(row.line.onHand / Math.max(1, row.line.variant.moq)))} cases
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
    values.margin !== 'all' && {
      field: 'Margin',
      value: values.margin === 'thin' ? 'Under 30%' : 'No trade price',
      key: 'margin' as const,
    },
    values.q && { field: 'Search', value: values.q, key: 'q' as const },
  ].filter(Boolean) as { field: string; value: string; key: 'type' | 'margin' | 'q' }[]

  const listed = rows.filter((row) => row.trade > 0)
  const averageMargin =
    listed.length === 0
      ? 0
      : listed.reduce((sum, row) => sum + (row.margin ?? 0), 0) / listed.length

  return (
    <div className="flex flex-col gap-4 p-4">
      <section aria-label="Trade list at a glance" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="SKUs on the trade list" value={formatCount(listed.length)} hint={`of ${pluralise(lines.length, 'SKU')} in the catalogue`} />
        <StatTile label="Average gross margin" value={`${averageMargin.toFixed(0)}%`} hint="Against retail – not against cost" />
        <StatTile
          label="Smallest case"
          value={
            listed.length === 0
              ? ''
              : formatINR(Math.min(...listed.map((row) => row.caseValue)))
          }
          hint="Lowest minimum a buyer can place"
        />
      </section>

      <SavedViews route="wholesale" views={VIEWS} current={route.query} />

      <FilterBar>
        <SearchInput
          value={values.q}
          onChange={(next) => set({ q: next }, true)}
          label="Search the trade list"
          placeholder="SKU, tea or tier"
        />
        <Select
          label="Type"
          value={values.type as TeaType | 'all'}
          onChange={(next) => set({ type: next })}
          options={[{ id: 'all' as const, label: 'All types' }, ...TEA_TYPES]}
        />
        <Select label="Sort" value={sort} onChange={(next) => set({ sort: next })} options={SORTS} />
        <DensityToggle density={density} onChange={setDensity} />
        <Button variant="primary" onClick={exportCsv} disabled={rows.length === 0}>
          <span className="h-3.5 w-3.5">
            <DownloadIcon />
          </span>
          Price list CSV
        </Button>
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
          caption={`Trade price list, sorted by ${SORTS.find((entry) => entry.id === sort)?.label.toLowerCase()}`}
          density={density}
          empty={
            <EmptyState
              title="No SKUs match"
              message="Clear the filters to see the whole trade list."
              action={<Button onClick={() => clear()}>Clear filters</Button>}
            />
          }
        />
      </Card>

      <Card className="px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Terms</h2>
        <p className="mt-1 text-sm text-body">
          This list is recorded by the dashboard, not by the storefront – the shop has one price world and
          it is retail. It was seeded at 60% of retail on {formatDate(ops.seededAt)} and shows your edits
          since. Payment terms and lead times are not modelled here: there is no supplier or account
          record to hang them on, and a term this app invented would be a term nobody agreed to.
        </p>
      </Card>
    </div>
  )
}
