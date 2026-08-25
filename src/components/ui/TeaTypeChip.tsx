import type { TeaType } from '../../lib/ops'

/* ────────────────────────────────────────────────────────────────────────────
 * The category chip.
 *
 * A colour-coded chip per tea type, with one constraint the obvious version
 * breaks: green, amber and red are reserved for status in this app, so "green
 * tea in green" would spend a status hue on decoration – and a green chip beside
 * a green "healthy stock" dot teaches the eye the wrong lesson.
 *
 * So the swatches are the LIQUOR: the colour the tea actually brews, running
 * dark-to-pale with oxidation. That is not a workaround – oxidation is what the
 * categories are really about, so a black tea being darkest and a white tea
 * palest is the more truthful coding of the two.
 *
 * These have their own tokens rather than borrowing the share-of-total ramp,
 * which they used to. The share ramp follows the ACCENT, and when the accent
 * went blue it started rendering black tea as a blue dot. Liquor is
 * representational – it refers to a real thing and must not move with the brand.
 * The label always ships with it; the swatch is a scanning aid.
 * ──────────────────────────────────────────────────────────────────────────── */

const LIQUOR: Record<TeaType, { swatch: string; label: string }> = {
  black: { swatch: 'var(--liquor-black)', label: 'Black' },
  chai: { swatch: 'var(--liquor-chai)', label: 'Chai' },
  oolong: { swatch: 'var(--liquor-oolong)', label: 'Oolong' },
  herbal: { swatch: 'var(--liquor-herbal)', label: 'Herbal' },
  green: { swatch: 'var(--liquor-green)', label: 'Green' },
  white: { swatch: 'var(--liquor-white)', label: 'White' },
}

export function TeaTypeChip({ type }: { type: TeaType }) {
  const { swatch, label } = LIQUOR[type]
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full bg-surface px-2 text-xs font-semibold text-body neu-raised-sm">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
        style={{ background: swatch }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
