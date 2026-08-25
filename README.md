# Elegant Sip — Operations Dashboard

An internal dashboard for the [Elegant Sip](../Elegantsip) storefront: revenue and
order metrics, an order list with fulfilment stages, catalogue performance,
customers, and review moderation.

It is a separate app from the shop. It ships `noindex`, is never linked from the
storefront, and is meant to be opened by the brand — not by customers.

## The honesty rules, carried over

The storefront's design rule is that the UI never claims something that did not
happen. The same rule shapes this app, and it is the reason for several
decisions that would otherwise look like missing features:

- **Demo data is labelled everywhere it appears.** A banner sits on every page in
  demo mode, order numbers start `ES-DEMO-`, and every address uses `example.com`.
  A dashboard showing ₹67,129 of invented revenue must never be mistakable for a
  trading figure.
- **Demo data never touches the storefront's keys.** It is written to
  `elegant_sip_dash_demo_*`, so it cannot appear in a customer's order history.
- **An empty chart explains itself.** Live mode with no orders says *why* — usually
  a different browser origin — rather than leaving a flat line to be read as a
  bad month.
- **A missing baseline is not 0%.** A delta with no previous period renders as
  "No earlier period to compare".
- **Totals are re-derived, not trusted.** localStorage is user-editable, so each
  order's stored total is recomputed from its line items with the storefront's own
  `getOrderPricing`. Mismatches are reported on the order and on the Data page.
- **Stock is not reported as live.** Catalogue lot sizes are static and never
  decrement, so the app says so instead of drawing a reorder alert it cannot back.
- **Coming-soon teas show no price**, exactly as on the storefront.

## One source of truth for the catalogue

The dashboard does **not** keep its own copy of the products or the money math.
`@storefront/*` is a Vite/TypeScript alias into `../Elegantsip/src`, so prices,
GST, the free-shipping threshold and every product record are imported from the
shop itself:

```ts
import { PRODUCTS } from '@storefront/data/products'
import { getOrderPricing } from '@storefront/lib/pricing'
import { formatINR } from '@storefront/lib/currency'
```

**The storefront must sit beside this folder.** `vite.config.ts` throws at config
time with a clear message if it does not.

## Stack

Vite 7 + React 19 + TypeScript (strict) + Tailwind CSS v4 — the storefront's
stack, minus GSAP and Lenis, which an ops tool has no use for. Two runtime
dependencies: `react` and `react-dom`. **Charts are hand-drawn SVG**, not a
charting library.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5180 |
| `npm run build` | `tsc --noEmit` then bundle to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (same rules as the storefront) |
| `npm test` | Vitest — metrics, aggregation and integrity math |

Full verification: `npm run build && npm test && npm run lint`.

## Where the data comes from

Elegant Sip has no backend. The storefront writes orders, reviews and newsletter
sign-ups to **localStorage**, which a browser keeps **per origin** (scheme + host
+ port).

So the dashboard reads the shop's real orders **only when both are served from the
same origin** — e.g. both under `http://localhost/` on XAMPP:

```
http://localhost/Elegantsip/dist/            ← shop
http://localhost/Elegantsip-dashboard/dist/  ← this dashboard
```

Two Vite dev servers on different ports each keep their own separate storage, and
nothing is shared between devices or browsers. The **Data** page states the origin
it is reading and explains this, rather than showing an empty chart.

The app uses a **hash router** (`#/orders/ES-DEMO-1019`) precisely so it needs no
SPA rewrite rule and drops into any sub-path or static host.

### Keys it reads

| Key | Owner | Written by |
|---|---|---|
| `elegant_sip_orders` | storefront | checkout |
| `elegant_sip_reviews` | storefront | product-page review form |
| `elegant_sip_subscribers` | storefront | newsletter fallback |
| `elegant_sip_cart` / `_wishlist` / `_user` | storefront | shop UI |
| `elegant_sip_dash_demo_orders` / `_reviews` / `_subscribers` | **dashboard** | demo seed |
| `elegant_sip_dash_fulfilment` | **dashboard** | fulfilment stages |
| `elegant_sip_dash_mode` | **dashboard** | live/demo preference |

The dashboard writes to storefront keys in exactly **one** place: deleting a
review on the Reviews page, which asks first.

Fulfilment stage (New → Packed → Shipped → Delivered, or Cancelled) is the
dashboard's own field — `PlacedOrder` has no status, and adding one would mean the
storefront had to tolerate it on read. It is a local operational note: nothing is
emailed to the customer.

## Charts

Colour is assigned by the method in the `dataviz` skill, and the categorical
palette was **validated, not eyeballed**:

- **Single-series marks** (revenue trend, best sellers, weekday columns, ratings)
  wear the brand accent `#4a7333` — 5.29:1 on white. One series, one colour: a
  value-ramp across nominal categories would double-encode length as hue.
- **The categorical order** `#008300 · #2a78d6 · #eb6834 · #4a3aa7 · #eda100 · #e87ba4`
  clears every adjacent gate on the light surface (worst adjacent CVD ΔE 16.3,
  normal-vision ΔE 19.6). **The order is the safety mechanism** — green beside
  orange fails protan separation at ΔE 3.2. Do not reorder or extend it without
  re-running the validator.
- **Colour follows the entity, not the rank.** A tea's slot comes from its
  catalogue position, so changing the date range never repaints the survivors.
- **Every chart has a table twin** (the "Table" toggle) and every trend chart is
  keyboard-readable with arrow keys. A tooltip never gates a value.
- `#8bb56e` is 2.24:1 on paper and is used only as a decorative fill, never for
  text on a light background.

## Conventions

Same as the storefront: max 300 lines per file, Tailwind utilities inline, inline
stroke SVG icons (**no emoji in UI**), 44×44px minimum touch targets, and
**never `focus:outline-none`** — it out-specifies the global `:focus-visible` ring.

## What this dashboard deliberately cannot do

- Edit prices, stock or product status. Those live in the storefront's
  `data/products.ts` and change with a build, not from this screen.
- Notify a customer. Stages and moderation are local records.
- See orders from another device, browser or origin — there is no server.
- Report stock on hand, or verify a payment.

All of it is a wiring job once the first API exists: the aggregation layer in
`src/lib/` is pure functions over an order array, and only `storage.ts` and
`datasetContext.tsx` know that the array came from localStorage.
