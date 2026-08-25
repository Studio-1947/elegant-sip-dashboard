import { useState } from 'react'
import { Button } from './Controls'

/* ────────────────────────────────────────────────────────────────────────────
 * Type-to-confirm.
 *
 * Almost nothing in this app asks "are you sure?"  actions happen, and the
 * toast carries the undo. This is the exception, and it is reserved for the
 * narrow case where undo is not a thing that can exist: the data is gone and no
 * button can bring it back.
 *
 * Typing the word is not friction for its own sake. A confirm dialog is
 * dismissed by the same reflex that triggered it – the second click lands
 * before the first has been read. Typing "erase" cannot be done by reflex.
 * ──────────────────────────────────────────────────────────────────────────── */

export function TypeToConfirm({
  phrase,
  label,
  consequence,
  onConfirm,
  onCancel,
}: {
  /** The word to type. Short, lowercase, and never the name of the safe action. */
  phrase: string
  label: string
  /** What will be irreversibly lost. Stated plainly, before the field. */
  consequence: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  const armed = typed.trim().toLowerCase() === phrase.toLowerCase()

  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-critical-soft p-3.5 neu-pressed-sm">
      <p className="text-sm text-ink">
        <strong className="font-semibold">{label}</strong> {consequence}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-body">
          Type <code className="rounded-sm bg-surface px-1.5 py-0.5 font-semibold text-critical neu-raised-sm">{phrase}</code>
          <input
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && armed) onConfirm()
              if (event.key === 'Escape') onCancel()
            }}
            aria-label={`Type ${phrase} to confirm`}
            className="h-8 w-28 rounded-md bg-sunken px-2.5 text-sm text-ink neu-pressed-sm"
          />
        </label>
        <Button variant="danger" size="sm" disabled={!armed} onClick={onConfirm}>
          {label}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
