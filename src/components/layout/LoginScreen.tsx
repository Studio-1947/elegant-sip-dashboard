import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { cryptoAvailable, signIn, type AuthFailure } from '../../lib/auth'
import { LockIcon, SunIcon, MoonIcon } from '../ui/Icons'
import { readTheme, setTheme, type Theme } from '../../lib/theme'

/* ────────────────────────────────────────────────────────────────────────────
 * The gate.
 *
 * It runs on every page load and keeps no session anywhere — not localStorage,
 * not sessionStorage, not a cookie. Closing the tab, reopening the link or
 * hitting reload all put you back here, because "signed in" lives only in this
 * component's state and state does not survive a page load.
 *
 * That is the literal ask, and it is also the only version that is not a lie:
 * a persisted "remember me" flag in localStorage would be one boolean for
 * anyone to flip, and it would be sitting in the same storage as the data it
 * claims to be protecting.
 *
 * The honesty note under the form is not boilerplate. This app's rule is that
 * the UI never claims something that did not happen, and a padlock over a
 * localStorage dashboard claims a great deal.
 * ──────────────────────────────────────────────────────────────────────────── */

const AuthContext = createContext<{ lock: () => void } | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthGate')
  return context
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  const lock = useCallback(() => setUnlocked(false), [])

  if (!unlocked) return <LoginScreen onUnlock={() => setUnlocked(true)} />

  return <AuthContext.Provider value={{ lock }}>{children}</AuthContext.Provider>
}

const MESSAGE: Record<AuthFailure, string> = {
  'bad-credentials': 'That username and password do not match. Check both, then try again.',
  'no-crypto':
    'This page is not on a secure origin, so the browser will not run the password check. Open it from http://localhost or over https and sign in there.',
}

function LoginScreen({ onUnlock }: { onUnlock: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const passwordRef = useRef<HTMLInputElement>(null)

  const flipTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    const result = await signIn(username, password)
    if (result.ok) {
      onUnlock()
      return
    }

    /* The password is cleared, the username is not: retyping a name you already
       got right is friction that catches only the honest. */
    setPassword('')
    setError(MESSAGE[result.reason])
    setBusy(false)
    passwordRef.current?.focus()
  }

  return (
    /* `dvh`, not `vh`. On a phone `100vh` is the viewport with the browser
       chrome RETRACTED, so while the address bar is showing the page is taller
       than the screen and scrolls even though nothing overflows – which is
       exactly what this was doing. `dvh` tracks the viewport you can actually
       see, and shrinks again when the keyboard opens over the password field.
       Still `min-h`, not `h`: on a short landscape phone the card genuinely is
       taller than the screen, and clipping the Sign in button to avoid a
       scrollbar would be the worse bug. */
    <div className="relative flex min-h-dvh items-center justify-center bg-canvas p-4">
      {/* The theme switch moves to the page corner rather than sitting beside
          the wordmark. A control in the same row as a centred title would drag
          that title off-centre by exactly half the control's width, and the
          usual fix - a matching invisible spacer on the other side - is a lie
          told to the layout engine. Out of the row, the wordmark is centred on
          the card and on the viewport at once. */}
      <button
        type="button"
        onClick={flipTheme}
        role="switch"
        aria-checked={theme === 'dark'}
        title={`${theme === 'dark' ? 'Dark' : 'Light'} theme - click to switch`}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-md bg-surface text-accent neu-raised-sm hover:text-ink active:neu-pressed-sm"
      >
        <span className="sr-only">Switch theme</span>
        <span className="h-4 w-4">{theme === 'dark' ? <MoonIcon /> : <SunIcon />}</span>
      </button>

      <div className="w-full max-w-sm">
        <p className="mb-5 text-center text-xl font-semibold leading-tight text-ink">Elegant Sip</p>

        <form onSubmit={submit} className="rounded-lg bg-surface p-5 neu-raised">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sunken text-accent neu-pressed-sm">
              <span className="h-4 w-4">
                <LockIcon />
              </span>
            </span>
            <div className="min-w-0">
              <h1 className="text-md font-semibold leading-tight text-ink">Sign in</h1>
              <p className="text-sm text-muted">Required every time this link is opened.</p>
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
              Username
            </span>
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              className="h-10 w-full rounded-md bg-sunken px-3 text-sm text-ink caret-accent neu-pressed-sm placeholder:text-faint"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
              Password
            </span>
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'signin-error' : undefined}
              className="h-10 w-full rounded-md bg-sunken px-3 text-sm text-ink caret-accent neu-pressed-sm placeholder:text-faint"
            />
          </label>

          {/* Beside the fields it belongs to, not in a toast at the bottom of
              the screen, and it says what to do rather than what broke. */}
          {error && (
            <p
              id="signin-error"
              role="alert"
              className="mt-3 rounded-md bg-critical-soft px-3 py-2 text-xs font-medium text-critical"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !cryptoAvailable()}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-on-accent neu-raised-sm hover:bg-accent-strong active:neu-pressed-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:neu-flat"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>

        {/* The whole point of this paragraph. */}
      
      </div>
    </div>
  )
}
