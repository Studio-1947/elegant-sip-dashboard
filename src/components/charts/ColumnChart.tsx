import { useState } from 'react'
import { ACCENT, GRID, RULE, niceTicks, useMeasuredWidth } from './chartUtils'

export interface Column {
  label: string
  value: number
  /** Extra line for the tooltip – e.g. revenue beside an order count. */
  detail?: string
}

const PAD = { top: 18, right: 12, bottom: 24, left: 44 }
const MAX_BAR = 24

/** Columns capped at 24px with a 2px surface gap between neighbours, value on
    the tallest cap only – the axis and the tooltip carry the rest. */
export function ColumnChart({
  columns,
  height = 200,
  formatValue,
  seriesLabel,
}: {
  columns: Column[]
  height?: number
  formatValue: (value: number) => string
  seriesLabel: string
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const plotWidth = Math.max(80, width - PAD.left - PAD.right)
  const plotHeight = height - PAD.top - PAD.bottom
  const max = columns.reduce((peak, column) => Math.max(peak, column.value), 0)
  const { ticks, top } = niceTicks(max, 3)
  const band = plotWidth / Math.max(1, columns.length)
  const barWidth = Math.min(MAX_BAR, Math.max(6, band - 12))
  const peakIndex = columns.reduce((best, column, index) => (column.value > columns[best].value ? index : best), 0)

  const yFor = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight
  const centreOf = (index: number) => PAD.left + band * index + band / 2

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={`${seriesLabel}  ${columns.length} columns. Switch to the table view for every value.`} className="block">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={PAD.left + plotWidth} y1={yFor(tick)} y2={yFor(tick)} stroke={tick === 0 ? RULE : GRID} strokeWidth={1} />
            <text x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end" className="tnum fill-muted text-xs">
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {columns.map((column, index) => {
          const barHeight = column.value === 0 ? 0 : Math.max(2, plotHeight - (yFor(column.value) - PAD.top))
          return (
            <g
              key={column.label}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() => setActive((current) => (current === index ? null : current))}
            >
              {/* Hit target spans the whole band, not just the bar. */}
              <rect x={PAD.left + band * index} y={PAD.top} width={band} height={plotHeight} fill="transparent" />
              {barHeight > 0 && (
                <rect
                  x={centreOf(index) - barWidth / 2}
                  y={PAD.top + plotHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={ACCENT}
                  opacity={active === null || active === index ? 1 : 0.55}
                />
              )}
              <text x={centreOf(index)} y={height - 7} textAnchor="middle" className="fill-muted text-xs">
                {column.label}
              </text>
              {index === peakIndex && column.value > 0 && (
                <text x={centreOf(index)} y={PAD.top + plotHeight - barHeight - 6} textAnchor="middle" className="tnum fill-ink text-xs font-semibold">
                  {formatValue(column.value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {active !== null && columns[active] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-surface px-3 py-2 text-xs neu-raised"
          style={{ left: Math.min(Math.max(centreOf(active), 60), width - 60), top: yFor(columns[active].value) - 6 }}
        >
          <p className="font-semibold text-ink">{columns[active].label}</p>
          <p className="tnum text-body">{formatValue(columns[active].value)}</p>
          {columns[active].detail && <p className="tnum text-muted">{columns[active].detail}</p>}
        </div>
      )}
    </div>
  )
}
