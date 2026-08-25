/* ────────────────────────────────────────────────────────────────────────────
 * Chart primitives: scales, ticks, and the width measurement every SVG needs.
 *
 * Charts are hand-drawn SVG rather than a charting library – the whole app has
 * two runtime dependencies, and a dashboard of six chart types does not justify
 * a third.
 * ──────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react'

/**
 * Part-to-whole slots.
 *
 * Not six hues – one. Green, amber and red are reserved for status in this app
 * and may never be spent on decoration, and the design system allows a single
 * accent, so the slots separate by LIGHTNESS along the accent ramp instead of
 * by hue. That also makes them robust in a way a rainbow is not:
 * they stay distinguishable in greyscale, on a bad projector, and under every
 * form of colour blindness.
 *
 * The cost is that a slot's text has to switch, and which way it switches
 * depends on the theme – see `shareTextColor`.
 */
export const SHARE = [
  'var(--color-share-1)',
  'var(--color-share-2)',
  'var(--color-share-3)',
  'var(--color-share-4)',
  'var(--color-share-5)',
  'var(--color-share-6)',
] as const

/** Single-series marks wear the accent  5.6:1 on white. */
export const ACCENT = 'var(--color-accent)'
export const GRID = 'var(--color-grid)'
export const RULE = 'var(--color-rule)'

/** Slot for `index`; past the last slot the caller must fold to "Other". */
export const shareColor = (index: number): string => SHARE[Math.min(index, SHARE.length - 1)]

/**
 * Readable label colour for a slot.
 *
 * Each slot carries its own paired `--share-on-N`, rather than a rule like
 * "slots 1-3 take white". The crossover point MOVES between themes: on the
 * light canvas the ramp runs dark-to-pale and the first slots take white, on
 * the dark canvas it inverts and they take ink. A hard-coded index would be
 * right in one theme and unreadable in the other.
 */
export const shareTextColor = (index: number): string =>
  `var(--share-on-${Math.min(index, SHARE.length - 1) + 1})`

/**
 * Round a maximum up to a clean axis top (1 / 2 / 5 × 10ⁿ) and return evenly
 * spaced ticks, so the y-axis reads 0 / 1,000 / 2,000 rather than 0 / 1,137.
 */
export function niceTicks(max: number, count = 4): { ticks: number[]; top: number } {
  if (!Number.isFinite(max) || max <= 0) return { ticks: [0, 1], top: 1 }
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised > 5 ? 10 : normalised > 2 ? 5 : normalised > 1 ? 2 : 1) * magnitude
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(Math.round(value))
  return { ticks, top }
}

/** Straight-segment path – no curve smoothing, which would invent values
    between two days that never existed. */
export function linePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
}

export function areaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath(points)} L${last.x} ${baseline} L${first.x} ${baseline} Z`
}

/**
 * Container width, tracked with a ResizeObserver. An SVG chart needs a real
 * pixel width to place labels; a percentage viewBox would stretch the type.
 */
export function useMeasuredWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next && Math.abs(next - width) > 1) setWidth(next)
    })
    observer.observe(node)
    return () => observer.disconnect()
    // `width` is deliberately absent: including it would tear down and rebuild
    // the observer on every resize frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, width }
}

/** Thin out x labels until they stop colliding, keeping first and last. */
export function labelStride(count: number, available: number, perLabel = 56): number {
  const fits = Math.max(1, Math.floor(available / perLabel))
  return Math.max(1, Math.ceil(count / fits))
}
