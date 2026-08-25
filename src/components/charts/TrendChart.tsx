import { useState } from 'react'
import { ACCENT, GRID, RULE, areaPath, labelStride, linePath, niceTicks, useMeasuredWidth } from './chartUtils'

export interface TrendPoint {
  key: string
  label: string
  value: number
}

const PAD = { top: 16, right: 18, bottom: 26, left: 56 }

/* Width of a rendered axis date ("27 Jul") at 12px, in px. Measuring each label
   properly would mean a DOM round-trip per tick for a value that never varies –
   every label on this axis is the same shape. */
const LABEL_W = 42

/**
 * One series over time: 2px line, a 10% wash beneath it, hairline grid, and a
 * crosshair on hover. Segments are straight – a smoothed curve would draw
 * values between two days that never happened.
 */
export function TrendChart({
  points,
  height = 240,
  formatValue,
  formatDetail = formatValue,
  seriesLabel,
}: {
  points: TrendPoint[]
  height?: number
  /** Axis ticks – keep this one short (compact figures). */
  formatValue: (value: number) => string
  /** Tooltip and direct labels, where the exact figure is worth the space. */
  formatDetail?: (value: number) => string
  seriesLabel: string
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const plotWidth = Math.max(80, width - PAD.left - PAD.right)
  const plotHeight = height - PAD.top - PAD.bottom
  const max = points.reduce((peak, point) => Math.max(peak, point.value), 0)
  const { ticks, top } = niceTicks(max)

  const xFor = (index: number) =>
    PAD.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
  const yFor = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight

  const coords = points.map((point, index) => ({ x: xFor(index), y: yFor(point.value) }))
  const stride = labelStride(points.length, plotWidth)
  const peakIndex = points.reduce((best, point, index) => (point.value > points[best].value ? index : best), 0)
  const lastIndex = points.length - 1

  const move = (delta: number) =>
    setActive((current) => {
      const next = (current ?? lastIndex) + delta
      return Math.min(lastIndex, Math.max(0, next))
    })

  const activePoint = active === null ? null : points[active]

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={height}
        role="img"
        tabIndex={0}
        aria-label={`${seriesLabel} by day. ${points.length} days, peak ${formatDetail(max)}. Use the arrow keys to read each day, or switch to the table view.`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            move(1)
            event.preventDefault()
          }
          if (event.key === 'ArrowLeft') {
            move(-1)
            event.preventDefault()
          }
          if (event.key === 'Escape') setActive(null)
        }}
        onBlur={() => setActive(null)}
        className="block touch-pan-y"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotWidth}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke={tick === 0 ? RULE : GRID}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={yFor(tick) + 4}
              textAnchor="end"
              className="tnum fill-muted text-xs"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {points.length > 1 && (
          <>
            <path d={areaPath(coords, PAD.top + plotHeight)} fill={ACCENT} opacity={0.1} />
            <path
              d={linePath(coords)}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {points.length === 1 && <circle cx={coords[0].x} cy={coords[0].y} r={4} fill={ACCENT} />}

        {points.map((point, index) => {
          /* Which labels survive, and why the old rule was not enough.
             A date like "27 Jul" is about {LABEL_W}px at 12px. An interior label is
             centre-anchored, so it reaches half that each way; the FIRST and
             LAST are anchored start/end, so they reach their FULL width inwards.
             The old guard compared against 46px – roughly one label width – which
             is the right number for two centred labels and far too small next to
             an end-anchored one. It needed half-of-mine plus all-of-theirs.
             On a desktop the gap happened to be wide enough to hide the error;
             on a phone the plot is a third as wide and it printed "20 Au25 Aug".
             Interior collisions are already handled upstream by `stride`. */
          const clearsEdge = (edgeIndex: number) =>
            Math.abs(xFor(index) - xFor(edgeIndex)) > LABEL_W + LABEL_W / 2 + 4

          const show =
            index === 0 ||
            index === lastIndex ||
            (index % stride === 0 && clearsEdge(0) && clearsEdge(lastIndex))
          if (!show) return null
          return (
            <text
              key={point.key}
              x={xFor(index)}
              y={height - 8}
              textAnchor={index === lastIndex ? 'end' : index === 0 ? 'start' : 'middle'}
              className="tnum fill-muted text-xs"
            >
              {point.label}
            </text>
          )
        })}

        {/* Direct labels, sparingly: the peak and the latest day. Everything
            else is carried by the axis, the crosshair and the table. */}
        {max > 0 && (
          <PointLabel
            x={coords[peakIndex].x}
            y={coords[peakIndex].y}
            width={width}
            text={formatDetail(points[peakIndex].value)}
          />
        )}
        {max > 0 && lastIndex !== peakIndex && points[lastIndex].value > 0 && (
          <PointLabel
            x={coords[lastIndex].x}
            y={coords[lastIndex].y}
            width={width}
            text={formatDetail(points[lastIndex].value)}
          />
        )}

        {active !== null && (
          <g>
            <line
              x1={coords[active].x}
              x2={coords[active].x}
              y1={PAD.top}
              y2={PAD.top + plotHeight}
              stroke={RULE}
              strokeWidth={1}
            />
            <circle
              cx={coords[active].x}
              cy={coords[active].y}
              r={5}
              fill={ACCENT}
              /* The card colour, not white &mdash; on a dark theme a white ring
                 round the hover dot is a halo the design never asked for. */
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          </g>
        )}

        {/* One wide hit target per day – a 2px line is impossible to hover. */}
        {points.map((point, index) => (
          <rect
            key={`hit-${point.key}`}
            x={xFor(index) - Math.max(12, plotWidth / points.length / 2)}
            y={PAD.top}
            width={Math.max(24, plotWidth / points.length)}
            height={plotHeight}
            fill="transparent"
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive((current) => (current === index ? null : current))}
          />
        ))}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-surface px-3 py-2 text-xs neu-raised"
          style={{
            left: Math.min(Math.max(xFor(active ?? 0), 70), width - 70),
            top: yFor(activePoint.value) - 10,
          }}
        >
          <p className="font-semibold text-ink">{activePoint.label}</p>
          <p className="tnum text-body">{formatDetail(activePoint.value)}</p>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {activePoint ? `${activePoint.label}: ${formatDetail(activePoint.value)}` : ''}
      </p>
    </div>
  )
}

/** Keeps a direct label inside the plot instead of letting it clip the edge. */
function PointLabel({ x, y, width, text }: { x: number; y: number; width: number; text: string }) {
  const anchor = x > width - 60 ? 'end' : x < 60 ? 'start' : 'middle'
  return (
    <text x={x} y={Math.max(12, y - 10)} textAnchor={anchor} className="tnum fill-ink text-xs font-semibold">
      {text}
    </text>
  )
}
