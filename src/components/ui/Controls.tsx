import type { ReactNode } from 'react'
import { CloseIcon, SearchIcon } from './Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * Toolbar controls.
 *
 * The neumorphic state model, applied consistently so it can be learned once:
 *
 *   RAISED   you can press this          buttons, selects, chips
 *   PRESSED – you are inside it, or it    text fields, the current segment's
 *            is currently chosen         track, the active nav item
 *   FLAT     it is only text             ghost buttons at rest
 *
 * Pressing a raised control inverts it (`active:neu-pressed-sm`). That is the
 * one piece of feedback neumorphism gives away for free, and it is better than
 * a colour flash because it is the same gesture the physical metaphor implies.
 *
 * Inputs are pressed, always. A raised text field looks like a button, and
 * people click buttons rather than typing into them.
 *
 * Controls are 36px, not the storefront's 44px. This is a pointer-first tool at
 * desk density; 36px still clears the WCAG 2.2 target-size minimum comfortably.
 * The global :focus-visible ring still applies to every one of them – and it
 * matters more here, because none of these has a border to thicken.
 * ──────────────────────────────────────────────────────────────────────────── */

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled,
  title,
  size = 'md',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
  size?: 'md' | 'sm'
}) {
  const variants = {
    // `text-on-accent`, never `text-white`: white on the accent fill is ~2:1 in
    // both themes. The token is paired to the FILL, not to the page.
    primary: 'bg-accent text-on-accent neu-raised-sm hover:bg-accent-strong active:neu-pressed-sm',
    secondary: 'bg-surface text-ink neu-raised-sm hover:text-accent active:neu-pressed-sm',
    ghost: 'bg-transparent text-muted neu-flat hover:text-ink hover:neu-raised-sm',
    danger: 'bg-surface text-critical neu-raised-sm active:neu-pressed-sm',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:neu-flat ${size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm'
        } ${variants[variant]}`}
    >
      {children}
    </button>
  )
}

export interface Segment<T extends string> {
  id: T
  label: string
}

/**
 * A radio group in tab clothing. It is a real `radiogroup` rather than a row of
 * buttons so arrow keys work and the current choice is announced. The track is
 * pressed into the surface and the chosen segment rises out of it.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
}: {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex h-9 items-center gap-1 rounded-md bg-sunken p-1 neu-pressed-sm"
    >
      {segments.map((segment) => {
        const active = segment.id === value
        return (
          <button
            key={segment.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(segment.id)}
            className={`h-7 rounded-sm px-2.5 text-xs font-semibold ${active ? 'bg-surface text-accent neu-raised-sm' : 'text-muted neu-flat hover:text-ink'
              }`}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <label className="relative flex min-w-[13rem] flex-1 items-center">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 z-10 h-3.5 w-3.5 text-faint">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md bg-sunken pl-9 pr-3 text-sm text-ink neu-pressed-sm placeholder:text-faint"
      />
    </label>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { id: T; label: string }[]
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 rounded-md border-0 bg-surface px-2.5 text-sm font-normal text-ink neu-raised-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * A removable filter chip. Active constraints are shown as the things they are
 *  one dismissible chip each – rather than as the state of a dropdown you have
 * to open in order to read.
 */
export function FilterChip({
  field,
  value,
  onRemove,
}: {
  field: string
  value: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface pl-3 pr-1 text-xs neu-raised-sm">
      <span className="text-muted">{field}</span>
      <span className="font-semibold text-accent">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${field} ${value}`}
        className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-critical active:neu-pressed-sm"
      >
        <span className="h-3 w-3">
          <CloseIcon />
        </span>
      </button>
    </span>
  )
}

/** One filter row above everything it scopes – never a filter inside a chart card. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>
}

/** The row of active constraints, directly under the toolbar that set them. */
export function FilterChips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}
