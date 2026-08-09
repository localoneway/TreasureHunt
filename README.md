# TreasureHunt

Tracks vintage watches posted online: save searches that poll eBay and
r/Watchexchange, keep a manual catalog of watches you own or are watching, see
price history for both, and get emailed when a new listing matches a saved search.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres via [Drizzle ORM](https://orm.drizzle.team/) (`postgres.js` driver — works
  against any Postgres, including [Neon](https://neon.tech)/Vercel Postgres in production)
- eBay Browse API and r/Watchexchange (public JSON feed) for live listing search
- [Resend](https://resend.com/) for email alerts on new matches (optional)
- No auth — single-user app

## Local setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (any Postgres instance).
2. Install dependencies: `npm install`
3. Push the schema: `npm run db:push`
4. Run the dev server: `npm run dev`

The app works without any of the optional integrations below — saved searches and
the manual catalog both work regardless, but eBay search won't return live results
until it's configured, and no alert emails go out until Resend is configured.
r/Watchexchange search works out of the box (no credentials required).

## eBay API setup

1. Create a developer account and a **Production** keyset at
   https://developer.ebay.com/my/keys.
2. Set `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` in `.env` (or your Vercel project's
   environment variables). The app requests an OAuth application token itself —
   no further setup needed.

## Email alerts setup

1. Create a [Resend](https://resend.com/) account, verify a sending domain, and
   generate an API key.
2. Set `RESEND_API_KEY`, `ALERT_EMAIL_FROM` (a verified sender), and
   `ALERT_EMAIL_TO` (where alerts should land) in `.env` / Vercel.
3. All three must be set for alerts to send; leaving any blank disables alerts
   silently — polling and search still work.
4. Alerts are a digest email per poll run (all newly-seen listings across every
   active saved search), sent from the `/api/cron/poll` route — not from manual
   "Run now" clicks in the Watchlist UI.

## Deploying to Vercel

1. Provision a Postgres database (Vercel Postgres / Neon) and set `DATABASE_URL`.
2. Run `npm run db:push` once (locally, pointed at the production `DATABASE_URL`,
   or via a one-off script) to create the tables.
3. Set `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `CRON_SECRET`, and (optionally)
   the Resend alert variables as environment variables in the Vercel project.
4. `vercel.json` defines a cron job that hits `/api/cron/poll` every 6 hours to
   refresh all active saved searches. Vercel automatically sends
   `Authorization: Bearer $CRON_SECRET` on cron requests when `CRON_SECRET` is
   set, which the route checks.

## Data model

- **saved_searches** — a standing keyword search + price range + marketplace,
  polled periodically.
- **listings** — marketplace items matched by a saved search, deduped by
  `(marketplace, external_id)`.
- **catalog_items** — watches you manually track (owned / watching / sold), with
  purchase price and a running value estimate.
- **price_snapshots** — a price observed at a point in time, for either a listing
  (price changes across polls) or a catalog item (value estimates you log by hand).

## Marketplaces

- **eBay** — via the Browse API, requires credentials (see above).
- **r/Watchexchange** — via Reddit's public JSON feed, no credentials needed.
  Price is parsed from a `$1,234` pattern in the post title on a best-effort
  basis; listings without a detectable price still show up, just without a
  price value. `[WTB]` (want-to-buy) posts are filtered out.

Add a new source by implementing `NormalizedListing`-returning search logic
under `src/lib/marketplaces/`, then registering it in `src/lib/marketplaces/index.ts`.
