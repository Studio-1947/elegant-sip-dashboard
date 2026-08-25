import { useCallback, useState } from 'react'
import { readTheme, setTheme, type Theme } from '../../lib/theme'
import { MoonIcon, SunIcon } from './Icons'

/* ────────────────────────────────────────────────────────────────────────────
 * The theme switch, in the rail directly above Settings.
 *
 * A neumorphic switch: the track is PRESSED into the surface and the knob is
 * RAISED out of it. The two depths are the affordance, so it still reads as a
 * switch with the colour stripped out – which matters here, because the one
 * thing a theme control must survive is being looked at in both themes.
 *
 * The knob slides. That is the one piece of motion this app allows outside
 * overlays, and it earns it: a knob that teleports reads as a repaint rather
 * than a state change, and the whole screen is repainting at the same moment.
 * ──────────────────────────────────────────────────────────────────────────── */

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const isDark = theme === 'dark'

  const flip = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      setTheme(next)
      return next
    })
  }, [])

  const label = isDark ? 'Dark' : 'Light'
  const title = `${label} theme – switch to ${isDark ? 'light' : 'dark'}`

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={flip}
        role="switch"
        aria-checked={isDark}
        title={title}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface text-accent neu-raised-sm hover:text-ink active:neu-pressed-sm lg:w-full"
      >
        <span className="sr-only">{title}</span>
        <span className="h-4 w-4">{isDark ? <MoonIcon /> : <SunIcon />}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={flip}
      role="switch"
      aria-checked={isDark}
      title={title}
      className="flex h-10 w-full shrink-0 items-center gap-2.5 rounded-md bg-surface px-2.5 text-sm font-medium text-body neu-raised-sm hover:text-ink"
    >
      <span className="h-4 w-4 shrink-0 text-accent">{isDark ? <MoonIcon /> : <SunIcon />}</span>

      <span className="min-w-0 flex-1 truncate text-left">{label}</span>

      {/* OFF: an empty well – track pressed into the surface, knob raised out of
          it, state carried by depth alone.
          ON: the well fills with the brand gradient and the knob becomes the
          dark theme itself, oversized so it breaks the track's outline. The
          knob is 1.4x the track height and overhangs both ends, which is what
          stops a filled pill from reading as a progress bar. */}
      <span
        className={`relative h-5 w-11 shrink-0 rounded-full ${isDark ? '' : 'bg-sunken neu-pressed-sm'}`}
        style={isDark ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
        aria-hidden="true"
      >
        <span
          className={`absolute -top-1 h-7 w-7 rounded-full transition-[left] duration-150 ease-out ${
            isDark ? 'left-[22px]' : 'left-[-5px] bg-surface neu-raised-sm'
          }`}
          style={isDark ? { background: 'var(--knob-on)', boxShadow: 'var(--shadow-knob)' } : undefined}
        />
      </span>
    </button>
  )
}
