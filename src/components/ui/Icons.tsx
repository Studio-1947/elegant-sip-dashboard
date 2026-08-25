/* Inline stroke icons. The storefront bans emoji in UI and this app follows the
   same rule – an emoji renders differently on every platform and carries an
   announced name screen readers were never meant to read out as a button. */

interface IconProps {
  className?: string
}

const base = 'h-full w-full'

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? base}
    >
      {children}
    </svg>
  )
}

export const OverviewIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
)

export const OrdersIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" />
    <path d="M8.5 7V5.5a3.5 3.5 0 1 1 7 0V7" />
  </Svg>
)

export const LeafIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 4c0 8-4.5 13-11 13H5c0-8 4.5-13 11-13z" />
    <path d="M5 20c1.5-4 4-7 8-9" />
  </Svg>
)

export const PeopleIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 6" />
    <path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20" />
  </Svg>
)

/** `filled` earns its keyword: an earned star must differ from an empty one by
    more than hue, or the rating is carried by colour alone. */
export const StarIcon = ({ className, filled = false }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className ?? base}
  >
    <path d="m12 3.6 2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z" />
  </svg>
)

export const DatabaseIcon = (props: IconProps) => (
  <Svg {...props}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
    <path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13" />
    <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </Svg>
)

export const SearchIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
)

export const CloseIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)

export const RefreshIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 12a8 8 0 1 1-2.5-5.8" />
    <path d="M20 4v4.5h-4.5" />
  </Svg>
)

export const DownloadIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4v10" />
    <path d="m8 10.5 4 4 4-4" />
    <path d="M4.5 19.5h15" />
  </Svg>
)

export const AlertIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4.5 21 20H3z" />
    <path d="M12 10.5v4" />
    <path d="M12 17.2h.01" />
  </Svg>
)

export const CheckIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)

export const ArrowUpIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 19V5" />
    <path d="m6.5 10.5 5.5-5.5 5.5 5.5" />
  </Svg>
)

export const ArrowDownIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 5v14" />
    <path d="m6.5 13.5 5.5 5.5 5.5-5.5" />
  </Svg>
)

export const TableIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M9.5 10v9.5" />
  </Svg>
)

export const ChevronIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
)

export const TrashIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7l.9 12.1a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
  </Svg>
)

export const UndoIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 9h10a5 5 0 0 1 0 10h-3" />
    <path d="M7.5 5.5 4 9l3.5 3.5" />
  </Svg>
)

export const HomeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9.5V20h12V9.5" />
  </Svg>
)

/** Inventory – a sealed carton, not a warehouse. Lots ship in boxes. */
export const BoxIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 3 4 7v10l8 4 8-4V7z" />
    <path d="m4 7 8 4 8-4" />
    <path d="M12 11v10" />
  </Svg>
)

export const TruckIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M2.5 6.5h11v10h-11z" />
    <path d="M13.5 10h4l3 3v3.5h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Svg>
)

export const ChartIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 4v16h16" />
    <path d="M8 15.5V11M12.5 15.5V7.5M17 15.5v-3" />
  </Svg>
)

/**
 * A gear, and it has to be a real one.
 *
 * This used to be a hub with six radiating spokes, which is the same drawing as
 * SunIcon — and SunIcon is the light-theme marker sitting directly above it in
 * the rail. Two adjacent controls rendering as the same glyph is not a style
 * problem, it is a wrong click waiting to happen.
 *
 * What separates a gear from a sun is that its teeth are part of a CONTINUOUS
 * rim, not detached rays. So this is one closed path: eight teeth, each an arc
 * across the tip, a flank down, and an arc across the valley. Generated rather
 * than eyeballed, so the teeth are evenly spaced and the flanks are symmetric.
 * Tip radius 9.5 leaves 1.7px of margin at stroke 1.6, so nothing clips.
 */
export const SettingsIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M10.19 2.67 A9.5 9.5 0 0 1 13.81 2.67 L14.05 5.31 A7 7 0 0 1 15.29 5.82 L17.31 4.12 A9.5 9.5 0 0 1 19.88 6.69 L18.18 8.71 A7 7 0 0 1 18.69 9.95 L21.33 10.19 A9.5 9.5 0 0 1 21.33 13.81 L18.69 14.05 A7 7 0 0 1 18.18 15.29 L19.88 17.31 A9.5 9.5 0 0 1 17.31 19.88 L15.29 18.18 A7 7 0 0 1 14.05 18.69 L13.81 21.33 A9.5 9.5 0 0 1 10.19 21.33 L9.95 18.69 A7 7 0 0 1 8.71 18.18 L6.69 19.88 A9.5 9.5 0 0 1 4.12 17.31 L5.82 15.29 A7 7 0 0 1 5.31 14.05 L2.67 13.81 A9.5 9.5 0 0 1 2.67 10.19 L5.31 9.95 A7 7 0 0 1 5.82 8.71 L4.12 6.69 A9.5 9.5 0 0 1 6.69 4.12 L8.71 5.82 A7 7 0 0 1 9.95 5.31 Z" />
    <circle cx="12" cy="12" r="3.4" />
  </Svg>
)

export const BellIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z" />
    <path d="M10.2 18.5a2 2 0 0 0 3.6 0" />
  </Svg>
)

export const UserIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
)

/** The rail's collapse handle – a panel with its edge pushed in. */
export const PanelIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
  </Svg>
)

export const ClockIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

/** Horizontal ellipsis - "there is more behind this". */
export const MoreIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)

export const LockIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.5v2.5" />
  </Svg>
)

export const SunIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
  </Svg>
)

export const MoonIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Svg>
)

export const RupeeIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7 5h10M7 9.5h10M7 19l7-7.5a3.5 3.5 0 0 0-2.5-6H7" />
  </Svg>
)
