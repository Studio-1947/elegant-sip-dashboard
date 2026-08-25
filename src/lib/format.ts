/* ────────────────────────────────────────────────────────────────────────────
 * Display formatting. Money is NOT here – `formatINR` lives in the storefront
 * and is imported from there, so the two apps can never disagree about what
 * ₹1,25,000 looks like.
 * ──────────────────────────────────────────────────────────────────────────── */

const dayFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' })
const fullFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** An unparseable ISO string is a real possibility – localStorage is editable. */
export function parseDate(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

const safe = (iso: string, formatter: Intl.DateTimeFormat, fallback = '') => {
  const date = parseDate(iso)
  return date ? formatter.format(date) : fallback
}

export const formatDay = (iso: string) => safe(iso, dayFormatter)
export const formatDate = (iso: string) => safe(iso, fullFormatter)
export const formatDateTime = (iso: string) => safe(iso, timeFormatter)

/** `2026-08-24`  the key time series are bucketed by. Local time, not UTC. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const dayKeyLabel = (key: string) => formatDay(`${key}T00:00:00`)

/** Compact figures for stat tiles: 1,284 → "1,284"; 12,900 → "12.9K". */
export function compact(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value) < 10_000) return value.toLocaleString('en-IN')
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export const formatCount = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString('en-IN') : '0'

/** Signed percentage for period-over-period deltas. */
export function formatDelta(value: number): string {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

export function relativeDays(iso: string, now: Date): string {
  const date = parseDate(iso)
  if (!date) return ''
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return months === 1 ? 'A month ago' : `${months} months ago`
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const pluralise = (count: number, singular: string, plural = `${singular}s`) =>
  `${formatCount(count)} ${count === 1 ? singular : plural}`
