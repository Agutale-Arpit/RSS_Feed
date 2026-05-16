# RSS Feed

Minimal Next.js 16 starter configured with:

- TypeScript
- App Router
- ESLint
- Tailwind CSS
- src directory layout
- @/* import alias

No authentication, database, or state management libraries are included.

## RSS Parsing

The project includes `rss-parser` and a reusable helper in `src/lib/rss.ts`.

```ts
import { parseRssFeed, parseRssXml } from "@/lib/rss";

const feed = await parseRssFeed("https://example.com/feed.xml");
const parsedXml = await parseRssXml(xmlString);
```

The helper fetches RSS XML with the standard server-side `fetch` API, applies a timeout, follows redirects, sends request headers, and then parses the XML with `rss-parser`. This keeps the API route compatible with Vercel's Node.js serverless runtime while preserving consistent parsing behavior.

## Feed API

The project exposes a feed endpoint at `GET /api/feed`.

- `GET /api/feed` returns the latest 100 items by default.
- `GET /api/feed?limit=25` returns the latest 25 items after normalization and descending publish-date sorting.
- The `limit` query parameter must be a positive integer.

## Deployment

The RSS API route runs on the Node.js runtime and sets a route `maxDuration` so deployment platforms like Vercel can apply an execution limit.

For production, verify the project with:

```bash
npm run build
npm run start
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run start
```

## Development

Start the dev server with `npm run dev`, then edit `src/app/page.tsx`.
