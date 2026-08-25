import type { ReactNode } from 'react'

/* ────────────────────────────────────────────────────────────────────────────
 * Surfaces.
 *
 * A card is the same colour as the page it sits on, extruded by a shadow pair
 * rather than outlined. That is the neumorphic contract: no fill difference, no
 * border, just depth. Adding a lighter background here would flatten the effect
 * instantly – the shadow only reads because the two surfaces match.
 *
 * Rules inside a card are the exception. Table rows and header dividers still
 * use `--color-line`, because forty rows each extruded out of the page is not a
 * table, it is quilting.
 * ──────────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return <Tag className={`rounded-lg bg-surface neu-raised ${className}`}>{children}</Tag>
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-3.5 py-3">
      <div className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-body">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/** Section label inside a card or drawer. Informational, not decorative. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</p>
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-body">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/**
 * A dot + label pair. Colour never carries the meaning on its own – the label
 * beside it is the meaning, and the dot is only a scanning aid. The dot is
 * pressed rather than raised: a status marker is a reading, not a control, and
 * nothing you cannot press should look pressable.
 */
export function DotLabel({ colorClass, children }: { colorClass: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} aria-hidden="true" />
      <span>{children}</span>
    </span>
  )
}

/**
 * A chip. Status tones map to the three reserved hues, and every one of them
 * carries its own text – a chip is never a bare colour. Neutral chips are
 * extruded; toned ones take a soft tint instead, because a coloured shadow pair
 * would need its own light source and there is only one in this room.
 */
export function Chip({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'critical'
  icon?: ReactNode
}) {
  const tones = {
    neutral: 'bg-surface text-body neu-raised-sm',
    accent: 'bg-accent-soft text-accent',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    critical: 'bg-critical-soft text-critical',
  }
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-semibold ${tones[tone]}`}
    >
      {icon && <span className="h-3 w-3 shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
