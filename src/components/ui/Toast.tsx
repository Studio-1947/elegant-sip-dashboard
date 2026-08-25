import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertIcon, CheckIcon, UndoIcon } from './Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * Toasts, and the undo they carry.
 *
 * This app does not ask "are you sure?". An action happens immediately, and the
 * toast that reports it carries the way back. That is faster for the common case
 * (the action was intended) and no worse for the rare one – with the single
 * exception of genuinely destructive work, which uses type-to-confirm instead.
 *
 * A toast with an undo lives longer than one without: four seconds is enough to
 * read a confirmation, but not enough to notice a mistake and reach for the
 * button. Hovering the stack pauses every countdown for the same reason.
 * ──────────────────────────────────────────────────────────────────────────── */

export type ToastTone = 'ok' | 'error'

export interface ToastOptions {
  tone?: ToastTone
  /** The way back. Its presence extends the toast's life to 10 seconds. */
  action?: { label: string; onClick: () => void }
}

interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
}

type Notify = (text: string, options?: ToastTone | ToastOptions) => void

const ToastContext = createContext<Notify | undefined>(undefined)

const PLAIN_MS = 4200
const UNDO_MS = 10_000

/** Confirmations for actions that actually happened – a write that failed
    (storage quota, private mode) reports the failure rather than a tick. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const timers = useRef(new Map<number, number>())
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.current.delete(id)
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  const notify = useCallback<Notify>(
    (text, options) => {
      const resolved: ToastOptions = typeof options === 'string' ? { tone: options } : (options ?? {})
      const id = (nextId.current += 1)
      const message: ToastMessage = { id, text, tone: resolved.tone ?? 'ok', action: resolved.action }
      setMessages((current) => [...current, message])
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), message.action ? UNDO_MS : PLAIN_MS),
      )
    },
    [dismiss],
  )

  /* Pointing at the stack stops every countdown; leaving it restarts each one
     from full. Restarting from full rather than from what was left is the
     forgiving direction to round in – the cost is a toast that lingers, and the
     alternative cost is an undo that vanishes while it is being read. */
  const pause = useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer)
    timers.current.clear()
  }, [])

  const resume = useCallback(() => {
    setMessages((current) => {
      for (const message of current) {
        if (timers.current.has(message.id)) continue
        timers.current.set(
          message.id,
          window.setTimeout(() => dismiss(message.id), message.action ? UNDO_MS : PLAIN_MS),
        )
      }
      return current
    })
  }, [dismiss])

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1.5"
        role="status"
        aria-live="polite"
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`pointer-events-auto flex animate-toast-in items-center gap-2 rounded-lg bg-surface py-2 pl-3.5 text-sm neu-raised-lg ${message.action ? 'pr-2' : 'pr-3.5'
              } ${message.tone === 'error' ? 'text-critical' : 'text-ink'}`}
          >
            <span className="h-3.5 w-3.5 shrink-0">
              {message.tone === 'error' ? <AlertIcon /> : <CheckIcon />}
            </span>
            {message.text}
            {message.action && (
              <button
                type="button"
                onClick={() => {
                  message.action?.onClick()
                  dismiss(message.id)
                }}
                className="ml-1 inline-flex h-7 items-center gap-1 rounded-md bg-surface px-2.5 text-xs font-semibold text-accent neu-raised-sm active:neu-pressed-sm"
              >
                <span className="h-3 w-3">
                  <UndoIcon />
                </span>
                {message.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
