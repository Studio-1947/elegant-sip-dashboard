/* ────────────────────────────────────────────────────────────────────────────
 * Product imagery.
 *
 * `Product.imageSrc` is a root-relative path into the storefront's own public
 * folder ("/morningdew.webp"). This app is served from a different sub-path, so
 * that URL would resolve to the wrong host root. The three catalogue images are
 * therefore copied into this app's public/ at their 640px size — a thumbnail in
 * an ops table has no use for the 1440px original.
 *
 * A path we do not have a copy of returns null, and the caller renders the
 * initial-letter tile rather than a broken image.
 * ──────────────────────────────────────────────────────────────────────────── */

const AVAILABLE = new Set(['morningdew.webp', 'origin.webp', 'summerbreeze.webp'])

export function assetUrl(imageSrc: string | undefined): string | null {
  if (!imageSrc) return null
  const name = imageSrc.replace(/^\//, '')
  if (!AVAILABLE.has(name)) return null
  return `${import.meta.env.BASE_URL}${name}`
}
