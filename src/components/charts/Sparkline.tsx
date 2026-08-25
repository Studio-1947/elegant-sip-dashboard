import { linePath } from './chartUtils'

/**
 * A 12-point trend for a stat tile. Decorative in the strict sense — it carries
 * shape, not values — so it is aria-hidden and the tile's number stays the
 * accessible content.
 */
export function Sparkline({
  values,
  width = 84,
  height = 26,
}: {
  values: number[]
  width?: number
  height?: number
}) {
  if (values.length < 2) return null

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * (width - 2) + 1,
    y: height - 3 - ((value - min) / span) * (height - 6),
  }))
  const last = points[points.length - 1]

  return (
    <svg width={width} height={height} aria-hidden="true" className="block overflow-visible">
      <path
        d={linePath(points)}
        fill="none"
        stroke="var(--color-accent)"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill="var(--color-accent)" stroke="#ffffff" strokeWidth={1.5} />
    </svg>
  )
}
