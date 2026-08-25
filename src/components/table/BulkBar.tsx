import type { ReactNode } from 'react'
import { CloseIcon } from '../ui/Icons'
import { pluralise } from '../../lib/format'

/**
 * The floating action bar.
 *
 * It appears over the table rather than above it, because a toolbar that only
 * exists sometimes would otherwise push every row down the moment you tick a
 * box — and the row you are aiming at is the one that moves.
 *
 * It is one of the four things in this app allowed to float, so it is also one
 * of the four things allowed a shadow.
 */
export function BulkBar({
  count,
  noun,
  onClear,
  children,
}: {
  count: number
  noun: string
  onClear: () => void
  children: ReactNode
}) {
  if (count === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex animate-toast-in items-center gap-2 rounded-md border border-ink bg-ink py-1.5 pl-3 pr-1.5 text-sm text-white shadow-overlay">
        <span className="font-semibold">{pluralise(count, noun)} selected</span>
        <span className="h-4 w-px bg-white/20" aria-hidden="true" />
        {children}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          title="Clear selection (Esc)"
          className="grid h-7 w-7 place-items-center rounded-sm text-white/70 hover:bg-white/15 hover:text-white"
        >
          <span className="h-3.5 w-3.5">
            <CloseIcon />
          </span>
        </button>
      </div>
    </div>
  )
}

/** An action inside the bar. Dark-surface styling, so it cannot use `Button`. */
export function BulkAction({
  children,
  onClick,
  tone = 'default',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold ${
        tone === 'danger' ? 'text-critical-soft hover:bg-critical/30' : 'text-white hover:bg-white/15'
      }`}
    >
      {children}
    </button>
  )
}
