/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { assertStorefrontPresent } from './scripts/check-storefront.mjs'

/* ────────────────────────────────────────────────────────────────────────────
 * The dashboard is a separate app, but it is NOT allowed a second copy of the
 * catalogue or the money math. `@storefront/*` resolves into the storefront's
 * own `src/`, so prices, GST, shipping thresholds and product records have
 * exactly one source of truth  the same rule the storefront applies to
 * seoRoutes.ts. If the sibling checkout is missing, fail loudly at config time
 * rather than at a red squiggle deep in a component.
 * ──────────────────────────────────────────────────────────────────────────── */
const storefrontSrc = assertStorefrontPresent()

export default defineConfig({
  // Relative asset URLs so the built app works from any sub-path  XAMPP serves
  // this at /Elegantsip-dashboard/dist/, not at a domain root.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@storefront': storefrontSrc },
  },
  server: { port: 5180 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
