import type { ReactNode } from 'react'

/* ────────────────────────────────────────────────────────────────────────────
 * Surfaces.
 *
 * Near-flat: a card is a white panel separated from the canvas by one hairline
 * in one colour (`--color-line`) and a 4px radius. No shadow — elevation in this
 * app means "floating above the page", and a card does not float. Nothing here
 * carries a gradient, a tint or a second border weight.
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
  return <Tag className={`rounded-lg border border-line bg-surface ${className}`}>{children}</Tag>
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
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-3 py-2.5">
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
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-body">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}

/**
 * A dot + label pair. Colour never carries the meaning on its own — the label
 * beside it is the meaning, and the dot is only a scanning aid.
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
 * A chip. The status tones map to the four reserved hues, and every one of them
 * carries its own text — a chip is never a bare colour. `icon` is for the cases
 * where a chip sits among several others and the tone deserves a second,
 * non-colour signal at a glance.
 */
export function Chip({
  children,
  tone = 'neutral',
  icon,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'critical' | 'info'
  icon?: ReactNode
}) {
  const tones = {
    neutral: 'border-line bg-sunken text-body',
    accent: 'border-accent-line bg-accent-soft text-accent',
    good: 'border-good/25 bg-good-soft text-good',
    warn: 'border-warn/25 bg-warn-soft text-warn',
    critical: 'border-critical/25 bg-critical-soft text-critical',
    info: 'border-info/25 bg-info-soft text-info',
  }
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-sm border px-1.5 text-xs font-semibold ${tones[tone]}`}
    >
      {icon && <span className="h-3 w-3 shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
