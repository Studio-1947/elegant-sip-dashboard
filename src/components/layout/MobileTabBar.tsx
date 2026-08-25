import { useState } from 'react'
import { hrefFor, type RouteId } from '../../lib/router'
import { useDialog } from '../../lib/useDialog'
import {
  BoxIcon,
  ChartIcon,
  ChevronIcon,
  HomeIcon,
  LeafIcon,
  MoreIcon,
  OrdersIcon,
  PeopleIcon,
  SettingsIcon,
  TruckIcon,
} from '../ui/Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * The mobile navigation.
 *
 * The rail does not shrink into a phone. A seven-item vertical column becomes a
 * horizontally scrolling strip, and a nav you have to scroll to see is a nav
 * whose back half nobody visits. So below `lg` the rail is gone entirely and
 * this takes over: four destinations at the bottom of the screen, in reach of a
 * thumb, plus More for the rest.
 *
 * Which four is not arbitrary. Home, Orders and Catalog are the screens opened
 * every day; Reports is the one opened every week. Inventory, Customers,
 * Wholesale and Settings are all real work, but they are the errands, and an
 * errand can afford one extra tap.
 *
 * More is a real tab, not a menu button: it lights up when you are on one of
 * the screens behind it, so the bar never claims you are nowhere.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Tab {
  id: RouteId
  label: string
  Icon: (props: { className?: string }) => React.JSX.Element
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'orders', label: 'Orders', Icon: OrdersIcon },
  { id: 'catalog', label: 'Catalog', Icon: LeafIcon },
  { id: 'reports', label: 'Reports', Icon: ChartIcon },
]

const MORE: Tab[] = [
  { id: 'inventory', label: 'Inventory', Icon: BoxIcon },
  { id: 'customers', label: 'Customers', Icon: PeopleIcon },
  { id: 'wholesale', label: 'Wholesale', Icon: TruckIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

const MORE_IDS = new Set(MORE.map((tab) => tab.id))

export function MobileTabBar({ current }: { current: RouteId }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const moreActive = MORE_IDS.has(current)

  return (
    <>
      <nav
        aria-label="Sections"
        /* `pb-[env(safe-area-inset-bottom)]` keeps the labels off the home
           indicator on a notched phone, where the last 34px of the screen is
           not really yours. */
        className="fixed inset-x-0 bottom-0 z-40 flex shrink-0 items-stretch gap-1 bg-canvas px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 neu-raised-lg lg:hidden"
      >
        {TABS.map((tab) => (
          <TabLink key={tab.id} tab={tab} active={tab.id === current} href={hrefFor(tab.id)} />
        ))}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          className={`flex flex-1 flex-col items-center gap-1 rounded-md px-1 pb-2 pt-1.5 text-xs font-medium ${
            moreActive ? 'text-accent' : 'text-muted'
          }`}
        >
          <span
            className={`grid h-7 w-12 place-items-center rounded-full ${
              moreActive ? 'bg-sunken neu-pressed-sm' : ''
            }`}
          >
            <span className="h-4 w-4">
              <MoreIcon />
            </span>
          </span>
          More
        </button>
      </nav>

      {sheetOpen && <MoreSheet current={current} onClose={() => setSheetOpen(false)} />}
    </>
  )
}

function TabLink({ tab, active, href }: { tab: Tab; active: boolean; href: string }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-1 rounded-md px-1 pb-2 pt-1.5 text-xs font-medium ${
        active ? 'text-accent' : 'text-muted'
      }`}
    >
      {/* The active pill is PRESSED, matching the rail's current item on
          desktop. Same state, same depth, whichever size the screen is. */}
      <span
        className={`grid h-7 w-12 place-items-center rounded-full ${
          active ? 'bg-sunken neu-pressed-sm' : ''
        }`}
      >
        <span className="h-4 w-4">
          <tab.Icon />
        </span>
      </span>
      {tab.label}
    </a>
  )
}

function MoreSheet({ current, onClose }: { current: RouteId; onClose: () => void }) {
  const ref = useDialog<HTMLDivElement>(true, onClose)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full animate-overlay-in cursor-default bg-scrim"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="More sections"
        className="relative animate-sheet-in rounded-t-3xl bg-canvas px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      >
        {/* The grab handle is the affordance that says this came from the
            bottom edge and goes back to it. */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />

        <ul className="flex flex-col gap-1.5 pb-2">
          {MORE.map((tab) => {
            const active = tab.id === current
            return (
              <li key={tab.id}>
                <a
                  href={hrefFor(tab.id)}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-12 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                    active ? 'bg-sunken text-accent neu-pressed-sm' : 'text-body neu-flat'
                  }`}
                >
                  <span className={`h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-muted'}`}>
                    <tab.Icon />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                  <span className="h-3.5 w-3.5 shrink-0 text-faint">
                    <ChevronIcon />
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
