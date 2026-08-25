/* ────────────────────────────────────────────────────────────────────────────
 * Is the storefront actually beside us?
 *
 * This dashboard deliberately keeps no copy of the catalogue or the money math:
 * `@storefront/*` resolves into ../Elegantsip/src so prices, GST, shipping
 * thresholds and product records have exactly one source of truth. The cost of
 * that decision is a hard dependency on a sibling checkout, and the failure mode
 * when it is missing used to be miserable.
 *
 * `npm run build` is `tsc --noEmit && vite build`. Vite's config throws a clear,
 * actionable error when the sibling is absent - but tsc runs FIRST, so what you
 * actually got was twenty-one TS2307s about modules nobody has ever heard of,
 * and Vite's explanation never printed at all. The diagnosis was sitting right
 * there in the codebase and the build made sure you never saw it.
 *
 * So the check moved in front of tsc, and vite.config.ts imports it from here
 * rather than keeping a second copy - the same one-source-of-truth rule that
 * created the dependency in the first place.
 * ──────────────────────────────────────────────────────────────────────────── */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const STOREFRONT_SRC = fileURLToPath(new URL('../../Elegantsip/src', import.meta.url))

export function assertStorefrontPresent(dir = STOREFRONT_SRC) {
  if (existsSync(dir)) return dir

  throw new Error(
    [
      '',
      'Storefront source not found.',
      '',
      `  looked in: ${dir}`,
      '',
      'This dashboard imports the catalogue and the pricing rules straight from',
      'the Elegantsip storefront rather than keeping its own copy, so that folder',
      'has to sit beside this one:',
      '',
      '    <parent>/Elegantsip/            <- the shop',
      '    <parent>/Elegantsip-dashboard/  <- you are here',
      '',
      'Locally: clone the storefront next to this repo.',
      '',
      'On CI or Vercel: the platform clones ONE repo, so the sibling is never',
      'there by default. vercel.json handles it by cloning the storefront in the',
      'install step - if you are on another platform, do the equivalent:',
      '',
      '    git clone --depth 1 https://github.com/Studio-1947/elegant-sip.git ../Elegantsip',
      '',
      'See README.md, "One source of truth for the catalogue".',
      '',
    ].join('\n'),
  )
}

/* Run directly (`node scripts/check-storefront.mjs`) as the build's preflight. */
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-storefront.mjs')) {
  try {
    assertStorefrontPresent()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
