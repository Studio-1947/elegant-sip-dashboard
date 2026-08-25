import { useEffect, useRef, useState } from 'react'

/* ────────────────────────────────────────────────────────────────────────────
 * A cell you can type into.
 *
 * Editing stock or a price should not cost a drawer, a form and a Save button —
 * it is one number, and the table is where you are already looking. Click it,
 * or focus the row and press Enter.
 *
 * Two rules it enforces:
 *
 * - Commit is optimistic. There is no confirmation step and no pending state;
 *   the caller applies the change immediately and offers undo in the toast.
 * - An invalid entry never silently reverts. The message appears beside the
 *   field, says what to DO ("Enter a whole number of packs, 0 or more") rather
 *   than what broke ("Invalid input"), and focus stays put so the fix is one
 *   keystroke away.
 *
 * Escape abandons the edit, which is the one case where reverting silently is
 * right — the user just said so.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface EditableCellProps {
  /** Current committed value, as text. */
  value: string
  /** What the cell shows when it is not being edited. */
  display: string
  /** Accessible name — "Stock for ES-FF-WL-100" reads better than "Stock". */
  label: string
  onCommit: (next: string) => void
  /** Return a fix-it message, or null when the value is good. */
  validate?: (next: string) => string | null
  prefix?: string
  align?: 'left' | 'right'
  disabled?: boolean
  /** Set by DataTable so a focused row's Enter opens the row's first editor. */
  editKey?: string
}

export function EditableCell({
  value,
  display,
  label,
  onCommit,
  validate,
  prefix,
  align = 'right',
  disabled = false,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const start = () => {
    if (disabled) return
    setDraft(value)
    setError(null)
    setEditing(true)
  }

  const commit = () => {
    const trimmed = draft.trim()
    const message = validate?.(trimmed) ?? null
    if (message) {
      setError(message)
      inputRef.current?.focus()
      return
    }
    setEditing(false)
    setError(null)
    if (trimmed !== value) onCommit(trimmed)
  }

  const abandon = () => {
    setEditing(false)
    setError(null)
    setDraft(value)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        aria-label={`${label}: ${display}. Click to edit.`}
        className={`-mx-1 flex w-full items-center rounded-sm px-1 py-0.5 hover:bg-accent-soft disabled:cursor-not-allowed disabled:hover:bg-transparent ${
          align === 'right' ? 'justify-end' : 'justify-start'
        } ${disabled ? 'text-muted' : 'text-ink'}`}
      >
        {display}
      </button>
    )
  }

  return (
    <span className="relative block">
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          if (error) setError(null)
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            abandon()
          }
          // Arrow keys belong to the input while typing, not to row navigation.
          if (event.key.startsWith('Arrow')) event.stopPropagation()
        }}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'cell-error' : undefined}
        inputMode={validate ? 'decimal' : undefined}
        className={`h-7 w-full rounded-sm border bg-surface px-1.5 text-sm text-ink ${
          align === 'right' ? 'text-right' : 'text-left'
        } ${error ? 'border-critical' : 'border-accent'}`}
        style={prefix ? { paddingLeft: '1.1rem' } : undefined}
      />
      {prefix && (
        <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-sm text-muted">
          {prefix}
        </span>
      )}
      {error && (
        /* Beside the field, not in a toast at the bottom of the screen: the
           thing to fix and the thing telling you to fix it belong together. */
        <span
          id="cell-error"
          role="alert"
          className="absolute left-0 top-full z-20 mt-1 w-max max-w-56 rounded-sm border border-critical/30 bg-critical-soft px-1.5 py-1 text-xs font-medium text-critical shadow-overlay"
        >
          {error}
        </span>
      )}
    </span>
  )
}

/* ── Validators ──────────────────────────────────────────────────────────────
   Each returns the instruction, never the diagnosis. */

export const wholeUnits =
  (noun = 'packs') =>
  (next: string): string | null => {
    if (next === '') return `Enter a number of ${noun} — use 0 for none.`
    const parsed = Number(next)
    if (!Number.isFinite(parsed)) return `Enter a whole number of ${noun}, like 24.`
    if (!Number.isInteger(parsed)) return `Enter a whole number of ${noun} — half a pack cannot ship.`
    if (parsed < 0) return `Enter 0 or more ${noun}. To mark a lot gone, set it to 0.`
    if (parsed > 100_000) return `Enter ${noun} under 100,000 — anything larger is probably a typo.`
    return null
  }

export const rupees = (next: string): string | null => {
  if (next === '') return 'Enter a price in rupees, or 0 while the tea is unpriced.'
  const parsed = Number(next)
  if (!Number.isFinite(parsed)) return 'Enter a price in rupees, like 600 or 649.50.'
  if (parsed < 0) return 'Enter 0 or more. A negative price would invert the order total.'
  if (Math.round(parsed * 100) !== parsed * 100) return 'Round to the paisa — two decimal places at most.'
  if (parsed > 1_000_000) return 'Enter a price under ₹10,00,000 — check for an extra zero.'
  return null
}
