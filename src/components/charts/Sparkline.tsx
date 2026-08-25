import { linePath, useMeasuredWidth } from './chartUtils'

/**
 * A 12-point trend for a stat tile. Decorative in the strict sense – it carries
 * shape, not values – so it is aria-hidden and the tile's number stays the
 * accessible content.
 *
 * It MEASURES its container rather than taking a fixed width. It used to be a
 * hard 84px inside a `shrink-0` wrapper, which was fine while a stat tile was
 * a full row and wrong the moment the tiles went two-up on a phone: the tile
 * is then about 150px, "₹67,129" at 24px eats most of that, and 84 unshrinkable
 * pixels had nowhere to go. The SVG also carried `overflow-visible`, so instead
 * of being clipped the overflow escaped the card entirely and the end dot
 * floated outside it.
 *
 * Measuring is better than a viewBox stretched with `preserveAspectRatio:none`,
 * which would have squashed the stroke and turned the end dot into an ellipse.
 * The container is the only thing that knows how much room there is, so it is
 * the thing that gets asked.
 */
export function Sparkline({ values, height = 26 }: { values: number[]; height?: number }) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(84)

  return (
    <div ref={ref} className="w-full">
      {values.length > 1 && <Plot values={values} width={width} height={height} />}
    </div>
  )
}

function Plot({ values, width, height }: { values: number[]; width: number; height: number }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1

  /* Inset by the end dot's radius plus its ring, on every side. The old inset
     was 1px, which is why the dot needed `overflow-visible` to show at all. */
  const pad = 4
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * Math.max(1, width - pad * 2) + pad,
    y: height - pad - ((value - min) / span) * Math.max(1, height - pad * 2),
  }))
  const last = points[points.length - 1]

  return (
    <svg width={width} height={height} aria-hidden="true" className="block">
      <path
        d={linePath(points)}
        fill="none"
        stroke="var(--color-accent)"
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The ring was hardcoded #ffffff, which is a white halo on a dark card.
          The surface token is white in light and the card colour in dark. */}
      <circle
        cx={last.x}
        cy={last.y}
        r={2.5}
        fill="var(--color-accent)"
        stroke="var(--color-surface)"
        strokeWidth={1.5}
      />
    </svg>
  )
}
