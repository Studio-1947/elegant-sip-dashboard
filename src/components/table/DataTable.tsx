import { useCallback, useRef, useState, type ReactNode } from 'react'
import { SkeletonTableRows } from '../ui/Skeleton'

/* ────────────────────────────────────────────────────────────────────────────
 * The table.
 *
 * This is the screen people actually live in, so it gets the detail:
 *
 * - The header sticks, and so does the first column. Scroll right through
 *   fifteen columns of an order and you can still see whose order it is.
 * - Rows are 44px, or 32px compact. The choice is a preference, not a filter 
 *   it follows the person between screens instead of riding along in links.
 * - Every list is fully keyboard operable: ↑/↓ move, Home/End jump, Enter opens
 *   the record, Space selects, Shift+Space extends a range. One tab stop for
 *   the whole table, so Tab still gets you out of it in one press.
 * - Loading shows rows, not a spinner, at the height the real rows will be.
 *
 * Sticky cells use `background: inherit` so they pick up the row's own hover and
 * selection colour instead of needing to duplicate that logic.
 * ──────────────────────────────────────────────────────────────────────────── */

export type Density = 'comfortable' | 'compact'

export const ROW_HEIGHT: Record<Density, number> = { comfortable: 44, compact: 32 }

export interface Column<T> {
  id: string
  header: string
  align?: 'left' | 'right'
  /** Fixed px width. Required on the first column so the sticky offset is exact. */
  width?: number
  render: (row: T) => ReactNode
  /** Excluded from the CSV the page exports, e.g. a row-action column. */
  headerTitle?: string
}

export interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  caption: string
  density?: Density
  loading?: boolean
  empty?: ReactNode
  /** Opening a record – Enter, or a click on the first cell's own control. */
  onOpen?: (row: T) => void
  /** Bulk selection. Omit entirely to render a table with no checkbox column. */
  selection?: {
    selected: Set<string>
    onChange: (next: Set<string>) => void
  }
  /** Highlighted because it is the record currently open in the drawer. */
  activeId?: string
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  caption,
  density = 'comfortable',
  loading = false,
  empty,
  onOpen,
  selection,
  activeId,
}: DataTableProps<T>) {
  const [focused, setFocused] = useState(0)
  const [anchor, setAnchor] = useState(0)
  const bodyRef = useRef<HTMLTableSectionElement>(null)
  const height = ROW_HEIGHT[density]

  /* A filter that shortens the list must not leave the tab stop past its end.
     Clamped as it is read rather than corrected in an effect: the stored index
     is still the row the person was on, so widening the filter again puts them
     back where they were instead of at the top. */
  const cursor = Math.min(focused, Math.max(0, rows.length - 1))

  const focusRow = useCallback((index: number) => {
    setFocused(index)
    const node = bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]')[index]
    node?.focus()
    node?.scrollIntoView({ block: 'nearest' })
  }, [])

  const toggle = useCallback(
    (id: string, extend: boolean, index: number) => {
      if (!selection) return
      const next = new Set(selection.selected)
      if (extend) {
        const [from, to] = index < anchor ? [index, anchor] : [anchor, index]
        for (let step = from; step <= to; step += 1) next.add(getRowId(rows[step]))
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setAnchor(index)
      }
      selection.onChange(next)
    },
    [selection, anchor, rows, getRowId],
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, index: number, row: T) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusRow(Math.min(index + 1, rows.length - 1)),
      ArrowUp: () => focusRow(Math.max(index - 1, 0)),
      Home: () => focusRow(0),
      End: () => focusRow(rows.length - 1),
      PageDown: () => focusRow(Math.min(index + 10, rows.length - 1)),
      PageUp: () => focusRow(Math.max(index - 10, 0)),
      Enter: () => onOpen?.(row),
      ' ': () => toggle(getRowId(row), event.shiftKey, index),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  const allSelected = selection && rows.length > 0 && rows.every((row) => selection.selected.has(getRowId(row)))
  const someSelected = selection && rows.some((row) => selection.selected.has(getRowId(row)))

  if (!loading && rows.length === 0 && empty) return <>{empty}</>

  const columnCount = columns.length + (selection ? 1 : 0)

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        style={{ minWidth: `${columnCount * 7}rem` }}
      >
        <caption className="sr-only">{caption}</caption>

        <thead>
          <tr className="bg-sunken text-xs uppercase tracking-wider text-muted">
            {selection && (
              <th
                scope="col"
                className="sticky left-0 top-0 z-30 w-9 bg-sunken px-2 py-1.5 font-semibold"
              >
                <input
                  type="checkbox"
                  checked={allSelected ?? false}
                  ref={(node) => {
                    if (node) node.indeterminate = !allSelected && (someSelected ?? false)
                  }}
                  onChange={() => {
                    if (!selection) return
                    selection.onChange(allSelected ? new Set() : new Set(rows.map(getRowId)))
                  }}
                  aria-label={allSelected ? 'Clear selection' : 'Select all rows shown'}
                  className="h-3.5 w-3.5 accent-accent"
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={column.id}
                scope="col"
                title={column.headerTitle}
                style={column.width ? { width: column.width } : undefined}
                className={`sticky top-0 z-20 whitespace-nowrap border-b border-line-strong bg-sunken px-3 py-1.5 font-semibold ${column.align === 'right' ? 'text-right' : 'text-left'
                  } ${index === 0 && !selection
                    ? 'left-0 z-30 border-r border-line'
                    : index === 0
                      ? 'left-9 z-30 border-r border-line'
                      : ''
                  }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody ref={bodyRef}>
          {loading ? (
            <SkeletonTableRows rows={8} columns={columnCount} height={height} />
          ) : (
            rows.map((row, index) => {
              const id = getRowId(row)
              const isSelected = selection?.selected.has(id) ?? false
              const isActive = activeId === id
              return (
                <tr
                  key={id}
                  data-row
                  tabIndex={index === cursor ? 0 : -1}
                  aria-selected={selection ? isSelected : undefined}
                  onKeyDown={(event) => onKeyDown(event, index, row)}
                  onFocus={() => setFocused(index)}
                  style={{ height }}
                  className={`border-b border-line outline-offset-[-2px] ${isSelected
                      ? 'bg-accent-soft'
                      : isActive
                        ? 'bg-sunken'
                        : 'bg-surface hover:bg-sunken'
                    }`}
                >
                  {selection && (
                    <td className="sticky left-0 z-10 w-9 bg-inherit px-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) =>
                          toggle(id, (event.nativeEvent as MouseEvent).shiftKey, index)
                        }
                        aria-label={`Select row ${index + 1}`}
                        className="h-3.5 w-3.5 accent-accent"
                      />
                    </td>
                  )}
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.id}
                      style={column.width ? { width: column.width } : undefined}
                      className={`px-3 ${column.align === 'right' ? 'text-right' : ''} ${columnIndex === 0
                          ? `sticky z-10 border-r border-line bg-inherit ${selection ? 'left-9' : 'left-0'}`
                          : ''
                        }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
