# Elegant Sip – Operations Dashboard

An internal dashboard for the [Elegant Sip](../Elegantsip) storefront: revenue and
order metrics, an order list with fulfilment stages, catalogue performance,
customers, and review moderation.

It is a separate app from the shop. It ships `noindex`, is never linked from the
storefront, and is meant to be opened by the brand – not by customers.

## Signing in

The dashboard opens on a sign-in screen, every time the link is loaded. Username
`admin`; the password is not in this repository.

**It is a privacy screen, not a security boundary, and the screen says so.**
There is no server. Every figure lives in this browser's localStorage on this
origin, and anyone sitting at the machine can read all of it from the DevTools
console without signing in – a gate written in the same JavaScript it guards can
always be walked around. What it buys is real but narrow: the numbers are not on
screen when you step away, and a colleague who opens the link does not land in
the middle of the books.

No session is stored anywhere – not localStorage, not sessionStorage, not a
cookie. "Signed in" lives only in React state, so a reload, a new tab or a
reopened link all return to the gate. A persisted flag would be one boolean for
anyone to flip, sitting in the same storage as the data it claimed to protect.
There is a lock button in the top bar for stepping away without closing the tab.

`src/lib/auth.ts` stores a **PBKDF2-HMAC-SHA256 digest** – random 16-byte salt,
210,000 iterations, 256-bit output – never the password. Writing the password
into the source would put it one Ctrl+U away, which is worse than no gate: it
would look like protection while handing over the secret. To rotate it:

```python
import hashlib, os, base64
salt = os.urandom(16)
dk = hashlib.pbkdf2_hmac('sha256', b'<new password>', salt, 210_000, dklen=32)
print(base64.b64encode(salt).decode(), base64.b64encode(dk).decode())
```

Paste both into `SALT_B64` / `HASH_B64`. Web Crypto's PBKDF2 derives bit-identical
output, so the two always agree.

Web Crypto needs a **secure context**. `http://localhost` is one, which is how
XAMPP serves this; a plain-http LAN address is not, and there the gate reports
that plainly and refuses to sign anyone in rather than falling back to a weaker
check that still says "Welcome".

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
- **An empty chart explains itself.** Live mode with no orders says *why*  usually
  a different browser origin – rather than leaving a flat line to be read as a
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

Vite 7 + React 19 + TypeScript (strict) + Tailwind CSS v4  the storefront's
stack, minus GSAP and Lenis, which an ops tool has no use for. Two runtime
dependencies: `react` and `react-dom`. **Charts are hand-drawn SVG**, not a
charting library.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5180 |
| `npm run build` | `tsc --noEmit` then bundle to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint (same rules as the storefront) |
| `npm test` | Vitest – metrics, aggregation and integrity math |

Full verification: `npm run build && npm test && npm run lint`.

## Where the data comes from

Elegant Sip has no backend. The storefront writes orders, reviews and newsletter
sign-ups to **localStorage**, which a browser keeps **per origin** (scheme + host
+ port).

So the dashboard reads the shop's real orders **only when both are served from the
same origin**  e.g. both under `http://localhost/` on XAMPP:

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
review, which happens immediately and offers undo in the toast rather than
asking first.

Fulfilment stage (New → Packed → Shipped → Delivered, or Cancelled) is the
dashboard's own field – `PlacedOrder` has no status, and adding one would mean the
storefront had to tolerate it on read. It is a local operational note: nothing is
emailed to the customer.

## The operations overlay

The storefront's `Product` has no SKU, no weight as a number, no trade price, no
minimum order quantity and no concept of a **lot**. A shop does not need them; a
back office cannot work without them. Rather than fork the catalogue, those
fields live in the dashboard's own `elegant_sip_dash_ops` key and join to the
storefront's records by product id – the same move `fulfilment.ts` already makes
for order stages.

It seeds itself on first run, **derived, never invented**: SKUs are built from
product ids and sizes (`ES-FFWL-CLS-100`), trade prices start at 60% of retail,
and each variant's published stock is split into two lots – so the packs held for
a SKU sum to exactly what the shop publishes until someone edits them here. Every
screen that shows overlay data says it is the dashboard's record, not the shop's,
and Settings can reseed it behind a type-to-confirm.

`inventory.ts` joins the overlay to real orders to answer the questions a raw
stock number cannot: days of cover (units ÷ trailing 30-day velocity, `null` when
a SKU has never sold – never Infinity, which would look like comfort), FIFO order
across lots, and what expires within 90 days.

## Design system

**Neumorphic, in two themes.** Surfaces are not drawn with borders and fills;
they are extruded out of the background with a shadow pair – light from the
top-left, dark from the bottom-right. The rule that makes it work is that an
element and the surface behind it are **the same colour**, which is why
`--color-surface` deliberately equals `--color-canvas`. If a card looks like it
wants a lighter background, it wants a shadow.

State is **depth, not colour**:

| | |
|---|---|
| `neu-raised` | you can press this – buttons, selects, cards, chips |
| `neu-pressed` | you are inside it, or it is currently chosen – text fields, the active nav item, the current saved view |
| `neu-flat` | it is only text – ghost buttons at rest |

Pressing a raised control inverts it. That is the one piece of feedback the
metaphor gives away for free, and it beats a colour flash because it matches the
gesture. Borders nearly vanish; `--color-line` survives only where shadow cannot
do the job – separating table rows, which cannot each be extruded without the
whole table turning to quilting.

**Theme** is light or dark – two states, no third. See `theme.ts`. The OS is
consulted exactly once, to pick the first-run default so a person on a dark
machine is not handed a white screen; after that it is a stored choice and stops
tracking the OS. `data-theme` on `<html>` is therefore always present, and there
is no `prefers-color-scheme` block to disagree with it. `initTheme()` runs in
`main.tsx` before React renders, so the page never paints light and then flips.
The switch sits in the rail directly above Settings, and the choice is a
per-browser preference – it must not ride along in a shared link.

Everything else is unchanged and enforced by `index.css` clearing Tailwind's
`--text-*` and `--color-*` namespaces before defining the system, so `text-2xl`
and `bg-blue-500` are not classes in this app:

- **Typeface** – Google Sans, loaded as a variable font across 400–700.
  **It is not in the public Google Fonts catalogue and is not OFL-licensed.**
  The `css2` endpoint serves it and it renders correctly, but the licence
  covers Google-branded products, so this is a deliberate call taken for an
  internal, `noindex`, never-public tool – not a pattern to copy onto the
  storefront. Two practical consequences: it can be withdrawn without notice,
  so the fallback stack matters more than usual (Inter sits second, being
  metrically closest), and it must never be self-hosted out of this repo.
  Verified before adopting: the face carries `tnum`, so every price and
  quantity column still aligns. A face without it would have broken every
  table in the app, silently.
- **One scale** – 12/13/14/16/20/24. Body is 13–14px.
- **One accent**  teal, and it inverts per theme: `#0d6e6a` (5.1:1) on the light
  canvas, `#45c8c0` (6.4:1) on the dark one. It has to be that deep on light
  because the accent is overwhelmingly TEXT  26 `text-accent` usages against 5
  fills – so the bright end of the brand gradient only appears in dark mode.
  Anything FILLED with the accent takes `text-canvas`, never `text-white`.
- **Green, amber and red are status only**, never decoration, and never used
  without an icon or a text label beside them. Blue was reserved once as
  `--info`; nothing used it and it was deleted. `--good` is a *yellow*-green
  (`#38700f` / `#7cc93f`) rather than a blue-green, because at 8px a blue-green
  status dot and a teal accent are the same dot.
- **Tabular figures are inherited from `body`**, not opted into per cell.
- **Motion is 120–180ms ease-out** on drawers, toasts and the theme knob.
  Nothing animates on data load – skeleton rows are static.
- `--scrim` is dark in **both** themes. It is shade, not a surface, so it must
  not invert with `--ink` the way a naive `bg-ink/35` would.

Neumorphism's known failure is contrast – soft shadows tempt you into soft text.
Every text token is checked against its own theme's canvas and the ratios are in
the comments beside them.

## Charts

Colour is assigned by the method in the `dataviz` skill:

- **Single-series marks** (revenue trend, best sellers, weekday columns) wear the
  accent. One series, one colour: a value-ramp across nominal categories would
  double-encode length as hue.
- **Part-to-whole slots are an accent ramp, not six hues.** The four status hues
  are spoken for and the system allows one accent, so the share bar separates by
  **lightness**  which is also more robust than a rainbow, staying legible in
  greyscale and under every form of colour blindness. The ramp **inverts between
  themes** (on a dark ground the pale end is the one that shows), so each slot
  carries a paired `--share-on-N` label colour rather than a hard-coded
  "slots 1–3 take white" rule that would be right in one theme only.
- **Category chips are the liquor colour**  black darkest, white palest, on
  their own `--liquor-*` ramp. Oxidation is what the categories are really about,
  so this codes them more truthfully than "green tea in green" would, and it
  keeps green free to mean "good". They are deliberately NOT the share ramp:
  liquor is representational and must not move when the brand does.
- **Colour follows the entity, not the rank.** A tea's slot comes from its
  catalogue position, so changing the date range never repaints the survivors.
- **Every chart has a table twin** (the "Table" toggle) and every trend chart is
  keyboard-readable with arrow keys. A tooltip never gates a value.

## Conventions

Same as the storefront: max 300 lines per file, Tailwind utilities inline, inline
stroke SVG icons (**no emoji in UI**) and **never `focus:outline-none`**  it
out-specifies the global `:focus-visible` ring.

Controls are **36px, not the storefront's 44px**. This is a pointer-first tool at
desk density; 36px still clears the WCAG 2.2 target-size minimum comfortably, and
the saving compounds across a toolbar of six. Table rows are 44px, or 32px in
compact mode – a per-browser preference, not a filter, so it never rides along in
a shared link.

**View state lives in the URL** (`#/orders?stage=new&q=darjeeling`) and interface
preferences live in `preferences.ts`. The split is: the URL is *what you are
looking at*, preferences are *how you like to look at it*. Saved views are just
named query strings, which is why they cost nothing.

## What this dashboard deliberately cannot do

- Edit **retail** prices or product status. Those live in the storefront's
  `data/products.ts` and change with a build, not from this screen. Trade prices,
  minimums, weights, tea types and lots are the dashboard's own and are editable
  inline.
- Notify a customer. Stages and moderation are local records.
- See orders from another device, browser or origin – there is no server.
- Decrement stock when an order is placed. Lots are adjusted by hand; the
  storefront never tells this app that a sale happened.
- Verify a payment, process a refund, or see a subscription. The Home screen
  names those four gaps out loud rather than letting an all-clear be read as
  "nothing is wrong" when whole categories were never checked.

All of it is a wiring job once the first API exists: the aggregation layer in
`src/lib/` is pure functions over an order array, and only `storage.ts` and
`datasetContext.tsx` know that the array came from localStorage.
