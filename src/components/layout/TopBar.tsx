import { useEffect, useMemo, useState } from 'react'
import { useDataset } from '../../lib/datasetContext'
import { actionableCount, exceptions } from '../../lib/exceptions'
import { navigate } from '../../lib/router'
import { initials } from '../../lib/format'
import { BellIcon, SearchIcon, UserIcon } from '../ui/Icons'
import { CommandPalette } from './CommandPalette'

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
 * The bell and the Home screen read the same `exceptions()` — a bell showing a
 * different number from the list underneath it would make both untrustworthy.
 * ──────────────────────────────────────────────────────────────────────────── */

export function TopBar({ title }: { title: string; description: string }) {
  const { orders, fulfilment, ops, now, user, mode } = useDataset()
  const [searchOpen, setSearchOpen] = useState(false)

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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
      {/* A button, not an input: the field itself lives in the palette, where it
          can own the keyboard. Clicking here and pressing ⌘K land in the same
          place, which is the point. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-8 min-w-0 flex-1 max-w-lg items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-sm text-muted hover:bg-sunken hover:text-body"
      >
        <span className="h-3.5 w-3.5 shrink-0 text-faint">
          <SearchIcon />
        </span>
        <span className="truncate">Search orders, SKUs and customers</span>
        <kbd className="ml-auto hidden shrink-0 rounded-sm border border-line px-1.5 text-xs text-muted sm:block">
          ⌘K
        </kbd>
      </button>

      <span className="sr-only" aria-live="polite">
        {title}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => navigate('home')}
          title={pending === 0 ? 'Nothing needs attention' : `${pending} things need attention`}
          className="relative grid h-8 w-8 place-items-center rounded-md text-body hover:bg-sunken hover:text-ink"
        >
          <span className="sr-only">
            {pending === 0 ? 'Notifications: nothing needs attention' : `Notifications: ${pending} items`}
          </span>
          <span className="h-4 w-4">
            <BellIcon />
          </span>
          {pending > 0 && (
            /* The count is the signal, not the colour — a bare red dot would say
               "something" and make you go and look to find out what. */
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-xs font-semibold leading-none text-white">
              {pending > 9 ? '9+' : pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('settings')}
          title={`${account} — open Settings`}
          className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface pl-1 pr-2 text-sm text-body hover:bg-sunken hover:text-ink"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-sm bg-sunken text-xs font-semibold text-body">
            {user ? initials(user.name) : <span className="h-3.5 w-3.5"><UserIcon /></span>}
          </span>
          <span className="hidden max-w-32 truncate sm:block">{account}</span>
        </button>
      </div>

      {searchOpen && <CommandPalette open onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
