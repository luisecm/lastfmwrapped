# Last.fm Wrapped

Spotify-Wrapped-style, year-to-date listening stats generated from a Last.fm
username, with shareable Instagram Story card export (1080x1920 PNG).

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — a Postgres connection string. For local dev, the easiest
  option is a disposable local Prisma Postgres server:
  ```bash
  npx prisma dev --detach
  ```
  It prints a connection string — paste that in as `DATABASE_URL`.
- `LASTFM_API_KEY` — free, instant signup at
  https://www.last.fm/api/account/create.

Then push the schema and start the app:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000, enter any public Last.fm username, and wait for
the year-to-date scrobble fetch to finish (this can take a while for heavy
listeners — Last.fm data is paginated 200 scrobbles at a time).

## How it works

- `src/lib/lastfm.ts` — thin wrapper around the Last.fm HTTP API.
- `src/lib/aggregate.ts` — pure functions that fold raw scrobbles into
  year-to-date stats (top artists/tracks/albums, monthly trend, listening
  heatmap, etc.). Good candidates for unit tests if you add a test runner.
- `src/lib/statsJob.ts` — orchestrates ingestion as a resumable, chunked job
  (`StatsJob` in `prisma/schema.prisma`) so a single request never has to
  paginate a whole year of scrobbles in one shot. The frontend polls
  `POST /api/stats/[username]` until the job is `done`.
- `src/components/story/*` — the exportable Instagram Story cards, authored
  at 270x480 and rasterized at 4x (`src/lib/storyExport.ts`) to land exactly
  on Instagram's native 1080x1920 canvas.

Only Last.fm is supported — see the project discussion for why most other
streaming services don't expose a usable listening-history API.
