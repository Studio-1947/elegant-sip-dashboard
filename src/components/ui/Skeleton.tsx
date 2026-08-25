/* ────────────────────────────────────────────────────────────────────────────
 * Loading placeholders.
 *
 * Skeleton rows, never a spinner: a spinner says "something is happening
 * somewhere", a skeleton says "eight rows of table are arriving here, at this
 * width". The second one lets you aim the pointer before the data lands.
 *
 * And they do NOT shimmer. A pulsing placeholder is motion on data load, which
 * this app does not do — it pulls the eye to the thing that is least worth
 * looking at, and it keeps pulling for as long as the load takes. A flat block
 * in the row colour is quieter and reads as "not yet" just as clearly.
 * ──────────────────────────────────────────────────────────────────────────── */

/** One grey block. `width` is a percentage so rows can vary believably. */
function Bar({ width }: { width: number }) {
  return <span className="block h-3 rounded-sm bg-n-200" style={{ width: `${width}%` }} />
}

/* Fixed, not random: a placeholder that reshuffles on every render is itself a
   kind of motion, and these have to be stable across a re-render mid-load. */
const WIDTHS = [72, 46, 61, 38, 55, 67, 43, 58, 50, 64]

export function SkeletonRows({ rows = 8, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div className="p-3" aria-hidden="true">
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 border-b border-line px-3 last:border-b-0 ${
              compact ? 'h-8' : 'h-11'
            }`}
          >
            <Bar width={WIDTHS[index % WIDTHS.length]} />
            <Bar width={WIDTHS[(index + 3) % WIDTHS.length] / 2} />
            <Bar width={WIDTHS[(index + 6) % WIDTHS.length] / 3} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Row placeholders that slot into an existing `<tbody>`, keeping the columns. */
export function SkeletonTableRows({
  rows,
  columns,
  height,
}: {
  rows: number
  columns: number
  height: number
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="border-t border-line" style={{ height }} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-3">
              <Bar width={WIDTHS[(row + column) % WIDTHS.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
