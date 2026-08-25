import { useEffect, useMemo, useState } from 'react'
import { useDataset } from '../../lib/datasetContext'
import { actionableCount, exceptions } from '../../lib/exceptions'
import { navigate } from '../../lib/router'
import { initials } from '../../lib/format'
import { BellIcon, LockIcon, SearchIcon, UserIcon } from '../ui/Icons'
import { CommandPalette } from './CommandPalette'
import { useAuth } from './LoginScreen'

/* ────────────────────────────────────────────────────────────────────────────
 * The top bar holds three things, and nothing else: search, notifications,
 * account.
 *
 * It used to also carry the page title, the dataset switcher and a Refresh
 * button. The title moved into the page, where it scrolls away with the content
 * it names instead of occupying persistent chrome; the dataset switcher and
 * Refresh moved to Settings, which is where a thing you touch twice a week
 * belongs. What is left is the row you reach for from any screen.
 *
 * The bell and the Home screen read the same `exceptions()`  a bell showing a
 * different number from the list underneath it would make both untrustworthy.
 * ──────────────────────────────────────────────────────────────────────────── */

export function TopBar({ title }: { title: string; description: string }) {
  const { orders, fulfilment, ops, now, user, mode } = useDataset()
  const [searchOpen, setSearchOpen] = useState(false)
  const { lock } = useAuth()

  const pending = useMemo(
    () => actionableCount(exceptions({ orders, fulfilment, ops, now })),
    [orders, fulfilment, ops, now],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const account = user?.name ?? (mode === 'demo' ? 'Demo dataset' : 'No signed-in visitor')

  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 bg-canvas px-3 lg:pr-4">
      {/* A button, not an input: the field itself lives in the palette, where it
          can own the keyboard. Clicking here and pressing the shortcut land in
          the same place, which is the point. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        title="Search orders, SKUs and customers (⌘K or Ctrl+K)"
        className="flex h-9 min-w-0 max-w-lg flex-1 items-center gap-2 rounded-full bg-sunken px-3.5 text-sm text-muted neu-pressed-sm hover:text-body"
      >
        <span className="h-3.5 w-3.5 shrink-0 text-faint">
          <SearchIcon />
        </span>
        <span className="truncate">Search orders, SKUs and customers</span>
        {/* Both, because the handler genuinely accepts both (metaKey || ctrlKey)
            and this app is opened on Windows and macOS alike. Each is written in
            its own platform's convention - Apple omits the plus, Windows keeps
            it - rather than forcing one house style onto the other. The pair is
            aria-hidden: it is a picture of the keys, and the button's title says
            the same thing in words. */}
        <span className="ml-auto hidden shrink-0 items-center gap-1 sm:flex" aria-hidden="true">
          <kbd className="rounded-sm bg-surface px-1.5 text-xs text-muted neu-raised-sm">⌘K</kbd>
          <span className="text-xs text-faint">/</span>
          <kbd className="rounded-sm bg-surface px-1.5 text-xs text-muted neu-raised-sm">Ctrl+K</kbd>
        </span>
      </button>

      <span className="sr-only" aria-live="polite">
        {title}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => navigate('home')}
          title={pending === 0 ? 'Nothing needs attention' : `${pending} things need attention`}
          className="relative grid h-9 w-9 place-items-center rounded-full bg-surface text-body neu-raised-sm hover:text-accent active:neu-pressed-sm"
        >
          <span className="sr-only">
            {pending === 0 ? 'Notifications: nothing needs attention' : `Notifications: ${pending} items`}
          </span>
          <span className="h-4 w-4">
            <BellIcon />
          </span>
          {pending > 0 && (
            /* The count is the signal, not the colour – a bare red dot would say
               "something" and make you go and look to find out what. */
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-xs font-semibold leading-none text-canvas">
              {pending > 9 ? '9+' : pending}
            </span>
          )}
        </button>

        {/* Locking is the one thing you want to do WITHOUT putting the mouse
            down, so it sits in the bar rather than three clicks into Settings.
            It drops straight back to the sign-in screen; nothing is persisted,
            so there is no session to expire. */}
        <button
          type="button"
          onClick={lock}
          title="Lock the dashboard"
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-body neu-raised-sm hover:text-accent active:neu-pressed-sm"
        >
          <span className="sr-only">Lock the dashboard</span>
          <span className="h-4 w-4">
            <LockIcon />
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('settings')}
          title={`${account}  open Settings`}
          className="flex h-9 items-center gap-2 rounded-full bg-surface pl-1 pr-3 text-sm text-body neu-raised-sm hover:text-ink active:neu-pressed-sm"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-body neu-pressed-sm">
            {user ? initials(user.name) : <span className="h-3.5 w-3.5"><UserIcon /></span>}
          </span>
          <span className="hidden max-w-32 truncate sm:block">{account}</span>
        </button>
      </div>

      {searchOpen && <CommandPalette open onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
