import { useCallback, useEffect, useState } from 'react'
import { hrefFor, type RouteId } from '../../lib/router'
import { readPreference, writePreference } from '../../lib/preferences'
import { ThemeToggle } from '../ui/ThemeToggle'
import {
  BoxIcon,
  ChartIcon,
  HomeIcon,
  LeafIcon,
  OrdersIcon,
  PanelIcon,
  PeopleIcon,
  SettingsIcon,
  TruckIcon,
} from '../ui/Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * The rail.
 *
 * Seven destinations, and seven is the ceiling: past that, a rail stops being
 * something you aim at from muscle memory and becomes something you read. The
 * two screens that used to sit here – Reviews and Data – moved inside Reports
 * and Settings rather than being allowed to push the count to nine.
 *
 * Neumorphically, the rail is not a dark slab beside the page. It is the same
 * surface as everything else, extruded out of it, and the CURRENT item is
 * pressed back in. That inversion is the whole state model: resting items sit
 * flush, hover lifts them slightly, the one you are on is pushed in. Colour is
 * only a reinforcement – depth carries the state, which is why it still reads
 * with the accent stripped out.
 *
 * The theme switch and Settings share the pinned footer, separated from the
 * seven by a rule. Both are things you visit on purpose rather than in the
 * course of work, and keeping them out of the block above lets the seven stay a
 * single scannable run.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface NavItem {
  id: RouteId
  label: string
  Icon: (props: { className?: string }) => React.JSX.Element
  count?: number
}

export const NAV: Omit<NavItem, 'count'>[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'orders', label: 'Orders', Icon: OrdersIcon },
  { id: 'catalog', label: 'Catalog', Icon: LeafIcon },
  { id: 'inventory', label: 'Inventory', Icon: BoxIcon },
  { id: 'customers', label: 'Customers', Icon: PeopleIcon },
  { id: 'wholesale', label: 'Wholesale', Icon: TruckIcon },
  { id: 'reports', label: 'Reports', Icon: ChartIcon },
]

const SETTINGS: Omit<NavItem, 'count'> = { id: 'settings', label: 'Settings', Icon: SettingsIcon }

export function Sidebar({
  current,
  counts,
}: {
  current: RouteId
  counts: Partial<Record<RouteId, number>>
}) {
  const [collapsed, setCollapsed] = useState(() => readPreference('rail.collapsed') === '1')

  const toggle = useCallback(() => {
    setCollapsed((value) => {
      writePreference('rail.collapsed', value ? '0' : '1')
      return !value
    })
  }, [])

  /* Ctrl/⌘-\ is the conventional binding for this and costs nothing to support;
     the button carries the same shortcut in its title so it is discoverable. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  const render = (item: Omit<NavItem, 'count'>) => {
    const active = item.id === current
    const count = counts[item.id]
    const badged = typeof count === 'number' && count > 0

    return (
      <a
        key={item.id}
        href={hrefFor(item.id)}
        aria-current={active ? 'page' : undefined}
        /* Collapsed, the label and the count are both gone from the rail, so the
           tooltip has to carry them or the number is simply lost. */
        title={collapsed ? (badged ? `${item.label} (${count})` : item.label) : undefined}
        className={`flex h-10 shrink-0 items-center overflow-hidden rounded-md px-2.5 text-sm font-medium transition-[gap,padding] duration-150 ease-out ${
          collapsed ? 'gap-2.5 lg:justify-center lg:gap-0 lg:px-0' : 'gap-2.5'
        } ${
          active
            ? 'bg-sunken text-accent neu-pressed'
            : 'text-muted neu-flat hover:text-ink hover:neu-raised-sm'
        }`}
      >
        <span className="h-4 w-4 shrink-0">
          <item.Icon />
        </span>

        {/* Clipped, not switched off. `display: none` has no in-between state,
            so a label that used `lg:hidden` could only pop. A max-width running
            to zero animates, and the item's `overflow-hidden` does the cropping
            while the opacity carries the last of it. */}
        <span
          className={`min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out ${
            collapsed ? 'lg:max-w-0 lg:opacity-0' : 'lg:max-w-40 lg:opacity-100'
          }`}
        >
          {item.label}
        </span>

        {/* ONE display utility per state, never two.
            This used to be `hidden ... lg:inline` with `lg:hidden` appended when
            collapsed — two competing `lg:` display rules of equal specificity,
            so which one won came down to Tailwind's emission order rather than
            intent. `lg:inline` won, the pill rendered inside a 40px rail, and
            the whole column blew out. Collapsed now resolves to plain `hidden`,
            which nothing contradicts. */}
        {badged && (
          <span
            className={`hidden min-w-0 overflow-hidden whitespace-nowrap rounded-full bg-sunken text-xs font-semibold text-muted transition-[max-width,opacity,padding,margin] duration-150 ease-out lg:inline-block ${
              collapsed
                ? 'lg:ml-0 lg:max-w-0 lg:px-0 lg:opacity-0'
                : 'lg:ml-auto lg:max-w-12 lg:px-1.5 lg:opacity-100 lg:neu-pressed-sm'
            }`}
          >
            {count}
          </span>
        )}
      </a>
    )
  }

  /* Sticky in both layouts: the rail stays put while the page scrolls under it.
     On lg it is a floating full-height panel; on narrow screens the same nav
     rides along as a bar above the content. */
  return (
    <nav
      aria-label="Sections"
      className={`sticky top-0 z-30 flex shrink-0 gap-1.5 overflow-x-auto bg-canvas px-2 py-2 transition-[width,padding] duration-150 ease-out lg:my-3 lg:ml-3 lg:h-[calc(100vh-1.5rem)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-2xl lg:py-4 lg:neu-raised ${
        collapsed ? 'lg:w-[68px] lg:px-3.5' : 'lg:w-56 lg:px-3'
      }`}
    >
      <div
        className={`hidden items-center pb-4 transition-[gap] duration-150 ease-out lg:flex ${
          collapsed ? 'gap-0 lg:justify-center' : 'gap-2'
        }`}
      >
        <div
          className={`min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-150 ease-out ${
            collapsed ? 'lg:max-w-0 lg:opacity-0' : 'lg:max-w-40 lg:opacity-100'
          }`}
        >
          <p className="truncate text-md font-semibold leading-tight text-ink">Elegant Sip</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+\\)`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface text-muted neu-raised-sm hover:text-ink active:neu-pressed-sm"
        >
          <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          <span className="h-4 w-4">
            <PanelIcon />
          </span>
        </button>
      </div>

      {NAV.map(render)}

      {/* Pinned footer: the theme switch sits directly above Settings, both
          separated from the seven destinations by a rule. */}
      <div className="mt-auto hidden w-full flex-col gap-1.5 pt-4 lg:flex">
        <div className="mb-0.5 h-px w-full bg-line-strong" />
        <ThemeToggle collapsed={collapsed} />
        {render(SETTINGS)}
      </div>

      {/* On the narrow layout the rail is a single scrolling row, so both ride
          along at its end rather than being pinned to a bottom the bar has not
          got. The switch keeps its icon-only form there. */}
      <span className="contents lg:hidden">
        <ThemeToggle collapsed />
        {render(SETTINGS)}
      </span>
    </nav>
  )
}
