import type { ReactNode } from 'react'
import { CloseIcon, SearchIcon } from './Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * Toolbar controls.
 *
 * Two deliberate departures from the storefront's kit:
 *
 * - Nothing here transitions. Motion in this app is reserved for things that
 *   enter and leave — drawers, toasts, the palette. A hover colour that eases
 *   in makes a dense toolbar feel soft, and soft is the opposite of the goal.
 * - Controls are 36px, not the storefront's 44px. This is a pointer-first tool
 *   at desk density; 36px still clears the WCAG 2.2 target-size minimum
 *   comfortably, and the saving compounds across a toolbar of six.
 *
 * The global :focus-visible ring still applies to every one of them — nothing
 * in this app sets `focus:outline-none`.
 * ──────────────────────────────────────────────────────────────────────────── */

const CONTROL = 'h-9 rounded-md border border-line bg-surface text-sm'

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
    primary: 'border-accent bg-accent text-white hover:border-accent-strong hover:bg-accent-strong',
    secondary: 'border-line bg-surface text-ink hover:bg-sunken',
    ghost: 'border-transparent bg-transparent text-body hover:bg-sunken hover:text-ink',
    danger: 'border-critical/30 bg-surface text-critical hover:bg-critical-soft',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm'
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
 * buttons so arrow keys work and the current choice is announced.
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
      className="inline-flex h-9 items-center gap-0.5 rounded-md border border-line bg-surface p-0.5"
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
            className={`h-8 rounded-sm px-2.5 text-xs font-semibold ${
              active ? 'bg-ink text-white' : 'text-body hover:bg-sunken hover:text-ink'
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
      <span className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-faint">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${CONTROL} w-full pl-8 pr-2.5 text-ink placeholder:text-faint`}
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
        className={`${CONTROL} px-2 font-normal text-ink`}
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
 * — one dismissible chip each — rather than as the state of a dropdown you have
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
    <span className="inline-flex h-7 items-center gap-1 rounded-sm border border-accent-line bg-accent-soft pl-2 pr-1 text-xs">
      <span className="text-muted">{field}</span>
      <span className="font-semibold text-accent">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${field} ${value}`}
        className="grid h-5 w-5 place-items-center rounded-sm text-accent hover:bg-accent/15"
      >
        <span className="h-3 w-3">
          <CloseIcon />
        </span>
      </button>
    </span>
  )
}

/** One filter row above everything it scopes — never a filter inside a chart card. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

/** The row of active constraints, directly under the toolbar that set them. */
export function FilterChips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5">{children}</div>
}
