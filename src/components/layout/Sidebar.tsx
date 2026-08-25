import { useCallback, useEffect, useState } from 'react'
import { hrefFor, type RouteId } from '../../lib/router'
import { readPreference, writePreference } from '../../lib/preferences'
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
 * two screens that used to sit here — Reviews and Data — moved inside Reports
 * and Settings rather than being allowed to push the count to nine.
 *
 * Settings is pinned to the bottom behind a rule. It is the only item you visit
 * on purpose rather than in the course of work, and separating it means the
 * seven above it stay a single scannable block.
 *
 * Collapsed, the rail is 52px of icons. The choice persists per browser, because
 * it is a statement about this person's screen, not about this session.
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
    return (
      <a
        key={item.id}
        href={hrefFor(item.id)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={`flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium ${
          collapsed ? 'lg:w-9 lg:justify-center lg:px-0' : ''
        } ${active ? 'bg-white/12 text-white' : 'text-rail-muted hover:bg-white/8 hover:text-white'}`}
      >
        <span className="h-4 w-4 shrink-0">
          <item.Icon />
        </span>
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
        {typeof count === 'number' && count > 0 && (
          <span
            className={`ml-auto hidden rounded-sm bg-white/10 px-1.5 text-xs font-semibold text-white lg:inline ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            {count}
          </span>
        )}
      </a>
    )
  }

  /* Sticky in both layouts: the rail stays put while the page scrolls under it.
     On lg it is a full-height column pinned to the top of the viewport; on
     narrow screens the same nav rides along as a bar above the content. */
  return (
    <nav
      aria-label="Sections"
      className={`sticky top-0 z-30 flex shrink-0 gap-1 overflow-x-auto bg-rail px-2 py-1.5 lg:h-screen lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:overflow-x-visible lg:py-3 ${
        collapsed ? 'lg:w-[60px] lg:items-center lg:px-2' : 'lg:w-56 lg:px-2.5'
      }`}
    >
      <div className={`hidden items-center gap-2 pb-4 lg:flex ${collapsed ? 'lg:justify-center' : 'px-1'}`}>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs uppercase tracking-wider text-rail-muted">Elegant Sip</p>
            <p className="truncate text-md font-semibold leading-tight text-white">Operations</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+\\)`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-rail-muted hover:bg-white/8 hover:text-white"
        >
          <span className="sr-only">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          <span className="h-4 w-4">
            <PanelIcon />
          </span>
        </button>
      </div>

      {NAV.map(render)}

      <div className="mt-auto hidden w-full pt-3 lg:block">
        <div className="mb-1.5 h-px w-full bg-white/12" />
        {render(SETTINGS)}
      </div>

      {/* On the narrow layout the rail is a single scrolling row, so Settings
          rides along at its end rather than being pinned to a bottom that the
          horizontal bar does not have. */}
      <span className="contents lg:hidden">{render(SETTINGS)}</span>
    </nav>
  )
}
