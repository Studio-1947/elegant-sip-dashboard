import { useId, useState, type ReactNode } from 'react'
import { Card } from '../ui/Card'
import { TableIcon } from '../ui/Icons'

export interface TableView {
  columns: string[]
  rows: (string | number)[][]
}

export interface LegendItem {
  label: string
  color: string
}

/**
 * Every chart ships with a table twin. A tooltip is an enhancement, never the
 * only route to a value — so each card carries a toggle that swaps the plot for
 * the same numbers as text.
 */
export function ChartCard({
  title,
  subtitle,
  legend,
  table,
  footnote,
  children,
}: {
  title: string
  subtitle?: string
  legend?: LegendItem[]
  table: TableView
  footnote?: string
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  const regionId = useId()

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-body">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((current) => !current)}
          aria-pressed={showTable}
          aria-controls={regionId}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-ink/10 px-2.5 text-xs font-semibold text-body transition-colors hover:bg-sunken"
        >
          <span className="h-3.5 w-3.5">
            <TableIcon />
          </span>
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {/* A legend for two or more series, always — identity never rests on
          colour matching alone. A single series is named by the title. */}
      {legend && legend.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 pt-3">
          {legend.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-2 text-xs text-body">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <div id={regionId} className="min-w-0 flex-1 px-2 pb-2 pt-3">
        {showTable ? <DataTable table={table} /> : children}
      </div>

      {footnote && <p className="px-5 pb-4 text-xs text-muted">{footnote}</p>}
    </Card>
  )
}

export function DataTable({ table }: { table: TableView }) {
  if (table.rows.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-body">No data in this period.</p>
  }
  return (
    <div className="max-h-80 overflow-auto px-3">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-white">
          <tr>
            {table.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={`border-b border-ink/10 py-2 text-xs font-semibold uppercase tracking-wider text-muted ${
                  index === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={String(row[0])} className="border-b border-ink/5 last:border-0">
              {row.map((cell, index) => (
                <td
                  key={index}
                  className={`py-2 ${
                    index === 0 ? 'pr-3 text-ink' : 'tnum text-right text-body'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
