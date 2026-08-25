import { useMemo, useState } from 'react'
import { useDataset } from '../lib/datasetContext'
import { daysUntil, stockLines, coverBand, COVER_DOT, COVER_LABEL, COVER_SHORT } from '../lib/inventory'
import type { Lot } from '../lib/ops'
import { useQueryState, useRoute } from '../lib/router'
import { formatDate, formatCount, pluralise } from '../lib/format'
import { downloadFile, stampedName, toCsv } from '../lib/csv'
import { Button, FilterBar, FilterChip, SearchInput, Select } from '../components/ui/Controls'
import { Card, Chip, EmptyState } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { DownloadIcon } from '../components/ui/Icons'
import { DataTable, type Column } from '../components/table/DataTable'
import { DensityToggle, TableStatus, useDensity } from '../components/table/TableToolbar'
import { SavedViews, type SavedView } from '../components/table/SavedViews'
import { EditableCell, wholeUnits } from '../components/table/EditableCell'
import { BulkAction, BulkBar } from '../components/table/BulkBar'
import { useToast } from '../components/ui/Toast'

/* ────────────────────────────────────────────────────────────────────────────
 * Inventory, by LOT.
 *
 * A SKU-level stock number is a fiction for tea. Two hundred packs of first
 * flush is not one thing: it is a batch from last spring that has four months
 * left on it and a batch from this spring that has twenty, and the only correct
 * way to sell them is oldest first. Roll them into one number and you cannot see
 * the write-off coming.
 *
 * So the row here is a lot – code, garden, harvest, arrival, best-before – and
 * the default sort is FIFO, because that is the order the shelf should empty in.
 * ──────────────────────────────────────────────────────────────────────────── */

type SortId = 'fifo' | 'expiry' | 'units' | 'sku'

const SORTS: { id: SortId; label: string }[] = [
  { id: 'fifo', label: 'FIFO – oldest first' },
  { id: 'expiry', label: 'Expiring soonest' },
  { id: 'units', label: 'Fewest units' },
  { id: 'sku', label: 'SKU' },
]

const DEFAULTS = { q: '', garden: 'all', window: 'all', sort: 'fifo' }

const VIEWS: SavedView[] = [
  { id: 'all', label: 'All lots', query: {} },
  { id: 'expiring', label: 'Expiring in 90 days', query: { window: '90' }, hint: 'Best-before inside 90 days' },
  { id: 'urgent', label: 'Expiring in 30 days', query: { window: '30' } },
  { id: 'empty', label: 'Emptied', query: { window: 'empty' }, hint: 'Lots down to zero units' },
]

export default function InventoryPage() {
  const { ops, orders, now, updateLot } = useDataset()
  const route = useRoute()
  const notify = useToast()
  const [density, setDensity] = useDensity()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { values, set, clear } = useQueryState(DEFAULTS)

  const sort = values.sort as SortId
  const lines = useMemo(() => stockLines(ops, orders, now), [ops, orders, now])

  /** Lot rows, joined back to the SKU they belong to. */
  const rows = useMemo(() => {
    const byKey = new Map(lines.map((line) => [line.key, line]))
    const needle = values.q.trim().toLowerCase()

    return ops.lots
      .map((lot) => ({ lot, line: byKey.get(lot.key), left: daysUntil(lot.bestBefore, now) }))
      .filter((row): row is { lot: Lot; line: NonNullable<typeof row.line>; left: number | null } => Boolean(row.line))
      .filter((row) => {
        if (values.garden !== 'all' && row.lot.garden !== values.garden) return false
        if (values.window === 'empty' && row.lot.units > 0) return false
        if (values.window !== 'all' && values.window !== 'empty') {
          if (row.lot.units <= 0) return false
          if (row.left === null || row.left > Number(values.window)) return false
        }
        if (!needle) return true
        return [row.lot.code, row.lot.garden, row.line.variant.sku, row.line.product.name]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => {
        if (sort === 'expiry') return a.lot.bestBefore.localeCompare(b.lot.bestBefore)
        if (sort === 'units') return a.lot.units - b.lot.units
        if (sort === 'sku') return a.line.variant.sku.localeCompare(b.line.variant.sku)
        return a.lot.receivedAt.localeCompare(b.lot.receivedAt)
      })
  }, [ops.lots, lines, values.q, values.garden, values.window, sort, now])

  const gardens = useMemo(
    () => [...new Set(ops.lots.map((lot) => lot.garden))].sort((a, b) => a.localeCompare(b)),
    [ops.lots],
  )

  const summary = useMemo(() => {
    const held = ops.lots.reduce((sum, lot) => sum + lot.units, 0)
    const expiring = ops.lots.filter((lot) => {
      const left = daysUntil(lot.bestBefore, now)
      return lot.units > 0 && left !== null && left <= 90
    })
    const reorder = lines.filter((line) => ['out', 'critical', 'low'].includes(coverBand(line)))
    return { held, expiring, reorder }
  }, [ops.lots, lines, now])

  const editUnits = (lot: Lot, sku: string, next: string) => {
    const previous = lot.units
    if (!updateLot(lot.id, { units: Number(next) })) {
      notify('Storage refused the write – the lot is unchanged', 'error')
      return
    }
    notify(`${lot.code} (${sku}) set to ${next} packs`, {
      action: { label: 'Undo', onClick: () => updateLot(lot.id, { units: previous }) },
    })
  }

  const writeOff = (ids: string[]) => {
    const previous = ops.lots.filter((lot) => ids.includes(lot.id)).map((lot) => ({ id: lot.id, units: lot.units }))
    const ok = ids.every((id) => updateLot(id, { units: 0 }))
    setSelected(new Set())
    if (!ok) {
      notify('Storage refused the write – nothing was written off', 'error')
      return
    }
    notify(`${pluralise(ids.length, 'lot')} written off`, {
      action: {
        label: 'Undo',
        onClick: () => previous.forEach((entry) => updateLot(entry.id, { units: entry.units })),
      },
    })
  }

  const exportCsv = () => {
    downloadFile(
      stampedName('lots', now),
      toCsv(
        ['Lot', 'SKU', 'Tea', 'Size', 'Garden', 'Harvest', 'Received', 'Best before', 'Days left', 'Units'],
        rows.map((row) => [
          row.lot.code,
          row.line.variant.sku,
          row.line.product.name,
          row.line.variant.size,
          row.lot.garden,
          row.lot.harvestYear,
          row.lot.receivedAt.slice(0, 10),
          row.lot.bestBefore.slice(0, 10),
          row.left ?? '',
          row.lot.units,
        ]),
      ),
    )
  }

  const columns: Column<(typeof rows)[number]>[] = [
    {
      id: 'code',
      header: 'Lot',
      width: 148,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-ink">{row.lot.code}</span>
          <span className="block truncate text-xs text-muted">{row.line.variant.sku}</span>
        </span>
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
    { id: 'garden', header: 'Garden', render: (row) => <span className="truncate text-body">{row.lot.garden}</span> },
    {
      id: 'harvest',
      header: 'Harvest',
      align: 'right',
      width: 92,
      render: (row) => <span className="text-body">{row.lot.harvestYear}</span>,
    },
    {
      id: 'received',
      header: 'Received',
      width: 116,
      headerTitle: 'Arrival date – FIFO order is this, ascending',
      render: (row) => <span className="text-body">{formatDate(row.lot.receivedAt)}</span>,
    },
    {
      id: 'bestBefore',
      header: 'Best before',
      width: 168,
      render: (row) => {
        const left = row.left
        const tone = left === null ? 'neutral' : left < 0 ? 'critical' : left <= 30 ? 'critical' : left <= 90 ? 'warn' : 'neutral'
        return (
          <span className="flex items-center gap-1.5">
            <span className="text-body">{formatDate(row.lot.bestBefore)}</span>
            {left !== null && row.lot.units > 0 && tone !== 'neutral' && (
              <Chip tone={tone}>{left < 0 ? `${Math.abs(left)}d past` : `${left}d left`}</Chip>
            )}
          </span>
        )
      },
    },
    {
      id: 'units',
      header: 'Packs',
      align: 'right',
      width: 96,
      render: (row) => (
        <EditableCell
          value={String(row.lot.units)}
          display={formatCount(row.lot.units)}
          label={`Packs in lot ${row.lot.code}`}
          validate={wholeUnits('packs')}
          onCommit={(next) => editUnits(row.lot, row.line.variant.sku, next)}
        />
      ),
    },
    {
      id: 'cover',
      header: 'SKU cover',
      align: 'right',
      width: 140,
      headerTitle: 'Days of cover for the whole SKU, across all its lots',
      render: (row) => {
        const band = coverBand(row.line)
        return (
          <span
            className="inline-grid grid-cols-[0.5rem_4.5rem] items-center gap-2"
            title={COVER_LABEL[band]}
          >
            <span className={`h-2 w-2 rounded-full ${COVER_DOT[band]}`} aria-hidden="true" />
            <span className="text-right text-body">
              {row.line.daysOfCover === null ? COVER_SHORT[band] : `${row.line.daysOfCover} days`}
              <span className="sr-only"> – {COVER_LABEL[band]}</span>
            </span>
          </span>
        )
      },
    },
  ]

  const chips = [
    values.garden !== 'all' && { field: 'Garden', value: values.garden, key: 'garden' as const },
    values.window !== 'all' && {
      field: 'Best before',
      value: values.window === 'empty' ? 'Emptied' : `Within ${values.window} days`,
      key: 'window' as const,
    },
    values.q && { field: 'Search', value: values.q, key: 'q' as const },
  ].filter(Boolean) as { field: string; value: string; key: 'garden' | 'window' | 'q' }[]

  return (
    <div className="flex flex-col gap-4 p-4">
      <section aria-label="Stock at a glance" className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Packs held" value={formatCount(summary.held)} hint={`Across ${pluralise(ops.lots.length, 'lot')}`} />
        <StatTile
          label="Expiring within 90 days"
          value={formatCount(summary.expiring.length)}
          hint={`${formatCount(summary.expiring.reduce((sum, lot) => sum + lot.units, 0))} packs affected`}
        />
        <StatTile
          label="SKUs to reorder"
          value={formatCount(summary.reorder.length)}
          hint="30 days of cover or less"
        />
      </section>

      <SavedViews route="inventory" views={VIEWS} current={route.query} />

      <FilterBar>
        <SearchInput
          value={values.q}
          onChange={(next) => set({ q: next }, true)}
          label="Search lots"
          placeholder="Lot code, SKU, tea or garden"
        />
        <Select
          label="Garden"
          value={values.garden}
          onChange={(next) => set({ garden: next })}
          options={[{ id: 'all', label: 'All gardens' }, ...gardens.map((garden) => ({ id: garden, label: garden }))]}
        />
        <Select
          label="Best before"
          value={values.window}
          onChange={(next) => set({ window: next })}
          options={[
            { id: 'all', label: 'Any date' },
            { id: '30', label: 'Within 30 days' },
            { id: '90', label: 'Within 90 days' },
            { id: '180', label: 'Within 180 days' },
            { id: 'empty', label: 'Emptied lots' },
          ]}
        />
        <Select label="Sort" value={sort} onChange={(next) => set({ sort: next })} options={SORTS} />
        <DensityToggle density={density} onChange={setDensity} />
        <Button onClick={exportCsv} disabled={rows.length === 0}>
          <span className="h-3.5 w-3.5">
            <DownloadIcon />
          </span>
          Export
        </Button>
      </FilterBar>

      <TableStatus count={`${pluralise(rows.length, 'lot')} of ${formatCount(ops.lots.length)}`}>
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
          getRowId={(row) => row.lot.id}
          caption={`Lots, sorted by ${SORTS.find((entry) => entry.id === sort)?.label.toLowerCase()}`}
          density={density}
          selection={{ selected, onChange: setSelected }}
          empty={
            <EmptyState
              title="No lots match"
              message="Widen the best-before window, or clear the search."
              action={<Button onClick={() => clear()}>Clear filters</Button>}
            />
          }
        />
      </Card>

      <p className="text-xs text-muted">
        Lots are recorded by this dashboard, not by the storefront – see Settings. They were derived from
        the catalogue's own stock figures, so the packs held for a SKU always sum to what the shop
        publishes until you edit them here.
      </p>

      <BulkBar count={selected.size} noun="lot" onClear={() => setSelected(new Set())}>
        <BulkAction tone="danger" onClick={() => writeOff([...selected])}>
          Write off to zero
        </BulkAction>
      </BulkBar>
    </div>
  )
}
