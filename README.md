# TreasureHunt

Tracks vintage watches posted online: save searches that poll the eBay Browse API,
keep a manual catalog of watches you own or are watching, and see price history
for both.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres via [Drizzle ORM](https://orm.drizzle.team/) (`postgres.js` driver — works
  against any Postgres, including [Neon](https://neon.tech)/Vercel Postgres in production)
- eBay Browse API for live listing search
- No auth — single-user app

## Local setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (any Postgres instance).
2. Install dependencies: `npm install`
3. Push the schema: `npm run db:push`
4. Run the dev server: `npm run dev`

The app works without eBay credentials — saved searches and the manual catalog
both work, but searches won't return live results until eBay is configured.

## eBay API setup

1. Create a developer account and a **Production** keyset at
   https://developer.ebay.com/my/keys.
2. Set `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` in `.env` (or your Vercel project's
   environment variables). The app requests an OAuth application token itself —
   no further setup needed.

## Deploying to Vercel

1. Provision a Postgres database (Vercel Postgres / Neon) and set `DATABASE_URL`.
2. Run `npm run db:push` once (locally, pointed at the production `DATABASE_URL`,
   or via a one-off script) to create the tables.
3. Set `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, and `CRON_SECRET` as environment
   variables in the Vercel project.
4. `vercel.json` defines a cron job that hits `/api/cron/poll` every 6 hours to
   refresh all active saved searches. Vercel automatically sends
   `Authorization: Bearer $CRON_SECRET` on cron requests when `CRON_SECRET` is
   set, which the route checks.

## Data model

- **saved_searches** — a standing keyword search + price range, polled periodically.
- **listings** — marketplace items matched by a saved search, deduped by
  `(marketplace, external_id)`.
- **catalog_items** — watches you manually track (owned / watching / sold), with
  purchase price and a running value estimate.
- **price_snapshots** — a price observed at a point in time, for either a listing
  (price changes across polls) or a catalog item (value estimates you log by hand).
