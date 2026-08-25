import type { TeaType } from '../../lib/ops'

/* ────────────────────────────────────────────────────────────────────────────
 * The category chip.
 *
 * A colour-coded chip per tea type, with one constraint the obvious version
 * breaks: green, amber, red and blue are reserved for status in this app, so
 * "green tea in green" would spend a status hue on decoration — and a green
 * chip beside a green "healthy stock" dot teaches the eye the wrong lesson.
 *
 * So the swatches are the LIQUOR: the colour the tea actually brews, which runs
 * dark-to-pale along the same copper ramp the rest of the app uses. That is not
 * a workaround — oxidation is what the categories are really about, so a black
 * tea being darkest and a white tea palest is the more truthful coding of the
 * two. The label always ships with it; the swatch is a scanning aid.
 * ──────────────────────────────────────────────────────────────────────────── */

const LIQUOR: Record<TeaType, { swatch: string; label: string }> = {
  black: { swatch: 'var(--color-share-1)', label: 'Black' },
  chai: { swatch: 'var(--color-share-2)', label: 'Chai' },
  oolong: { swatch: 'var(--color-share-3)', label: 'Oolong' },
  herbal: { swatch: 'var(--color-share-4)', label: 'Herbal' },
  green: { swatch: 'var(--color-share-5)', label: 'Green' },
  white: { swatch: 'var(--color-n-200)', label: 'White' },
}

export function TeaTypeChip({ type }: { type: TeaType }) {
  const { swatch, label } = LIQUOR[type]
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-sm border border-line bg-surface px-1.5 text-xs font-semibold text-body">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
        style={{ background: swatch }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
