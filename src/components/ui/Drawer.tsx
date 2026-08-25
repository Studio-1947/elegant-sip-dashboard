import type { ReactNode } from 'react'
import { useDialog } from '../../lib/useDialog'
import { CloseIcon } from './Icons'

/**
 * A right-hand detail panel. On narrow screens it becomes a full-height sheet.
 *
 * The full record opens here rather than on its own route-swapped page so that
 * the list behind it keeps its filters, its sort and its scroll position — you
 * can open six orders in a row and never lose your place in the table.
 *
 * This and the toast are the only two things in the app that animate: 160ms
 * ease-out, and the backdrop fades in 140ms behind it. Everything the drawer
 * *contains* renders instantly.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-overlay-in cursor-default bg-ink/35"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-2xl animate-drawer-in flex-col border-l border-line bg-canvas shadow-overlay"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-md font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            title="Close (Esc)"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-body hover:bg-sunken hover:text-ink"
          >
            <span className="h-3.5 w-3.5">
              <CloseIcon />
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && <footer className="border-t border-line bg-surface px-4 py-3">{footer}</footer>}
      </div>
    </div>
  )
}
