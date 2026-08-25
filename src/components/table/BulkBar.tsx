import type { ReactNode } from 'react'
import { CloseIcon } from '../ui/Icons'
import { pluralise } from '../../lib/format'

/**
 * The floating action bar.
 *
 * It appears over the table rather than above it, because a toolbar that only
 * exists sometimes would otherwise push every row down the moment you tick a
 * box – and the row you are aiming at is the one that moves.
 *
 * It is one of the three things in this app allowed to float, so it is also one
 * of the three allowed a shadow – with the drawer and the toast. The command
 * palette used to be a fourth; it sits on a scrim, which does the separating
 * job on its own, so it is a plain panel now.
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
      <div className="pointer-events-auto flex animate-toast-in items-center gap-2 rounded-lg bg-surface py-2 pl-3.5 pr-2 text-sm text-ink neu-raised-lg">
        <span className="font-semibold">{pluralise(count, noun)} selected</span>
        <span className="h-5 w-px bg-line-strong" aria-hidden="true" />
        {children}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          title="Clear selection (Esc)"
          className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-critical active:neu-pressed-sm"
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-md bg-surface px-2.5 text-xs font-semibold neu-raised-sm active:neu-pressed-sm ${tone === 'danger' ? 'text-critical' : 'text-body hover:text-accent'
        }`}
    >
      {children}
    </button>
  )
}
